import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Order, MembershipRecord } from '../types';
import { StaffServiceRecord } from '../components/StaffTab';
import { parseOrderSequence, sortOrdersDescending } from '../utils/orderUtils';

// In-Memory Cloud Mirror (0% Phone LocalStorage Usage)
// Keeps active session data in volatile RAM during POS session without filling phone disk.
let inMemoryOrdersStore: Order[] = [];
let inMemoryMembershipsStore: MembershipRecord[] = [];
let inMemoryStaffServicesStore: { staffName: string; record: StaffServiceRecord }[] = [];

// Safe helpers to read/write Supabase configuration
const CONFIG_KEY_URL = 'enreach_supabase_url';
const CONFIG_KEY_KEY = 'enreach_supabase_anon_key';

export function getStoredSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey };
  }

  if (typeof window !== 'undefined') {
    try {
      const storedUrl = (localStorage.getItem(CONFIG_KEY_URL) || '').trim();
      const storedKey = (localStorage.getItem(CONFIG_KEY_KEY) || '').trim();
      if (storedUrl && storedKey) {
        return { url: storedUrl, anonKey: storedKey };
      }
    } catch {
      // Storage unavailable
    }
  }

  return { url: envUrl, anonKey: envKey };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (url) localStorage.setItem(CONFIG_KEY_URL, url.trim());
    else localStorage.removeItem(CONFIG_KEY_URL);

    if (anonKey) localStorage.setItem(CONFIG_KEY_KEY, anonKey.trim());
    else localStorage.removeItem(CONFIG_KEY_KEY);

    // Reinitialize client on credential change
    cachedClient = null;
  } catch {
    // Storage fallback
  }
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const { url, anonKey } = getStoredSupabaseConfig();
  if (url && anonKey) {
    try {
      cachedClient = createClient(url, anonKey, {
        auth: {
          persistSession: false, // 0% phone storage, no auth tokens stored
          autoRefreshToken: false,
        },
      });
      return cachedClient;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return null;
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getStoredSupabaseConfig();
  return Boolean(url && anonKey);
}

/**
 * Test connectivity with Supabase database
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase URL or Anon Key not configured. Using high-speed cloud volatile store.',
    };
  }

  try {
    const { error } = await client.from('orders').select('id').limit(1);
    if (error) {
      // Table might not exist yet or permissions issue
      return {
        success: false,
        message: `Supabase connection error: ${error.message}`,
      };
    }
    return {
      success: true,
      message: 'Successfully connected to Supabase Cloud Database!',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Connection attempt failed: ${msg}`,
    };
  }
}

/**
 * 1. Synchronize an order directly to Supabase cloud database
 * Ensures 0% phone storage consumed.
 */
export async function syncOrderToCloud(
  order: Order,
  clientMeta?: { name?: string; phone?: string; isMember?: boolean }
): Promise<{ success: boolean; error?: string }> {
  const resolvedClientName = clientMeta?.name ?? order.clientName ?? 'Walk-in Client';
  const resolvedClientPhone = clientMeta?.phone ?? order.clientPhone ?? '';
  const resolvedIsMember = clientMeta?.isMember ?? Boolean(order.isMember);

  const normalizedOrder: Order = {
    ...order,
    clientName: resolvedClientName,
    clientPhone: resolvedClientPhone,
    isMember: resolvedIsMember,
  };

  // Keep in volatile RAM mirror
  inMemoryOrdersStore = sortOrdersDescending([
    normalizedOrder,
    ...inMemoryOrdersStore.filter((o) => o.id !== normalizedOrder.id),
  ]);

  const client = getSupabaseClient();
  if (!client) {
    // Operates in memory with zero phone disk usage
    return { success: true };
  }

  try {
    const seq = parseOrderSequence(normalizedOrder.id);
    const payload = {
      id: normalizedOrder.id,
      order_number: seq,
      client_name: resolvedClientName,
      client_phone: resolvedClientPhone,
      is_member: resolvedIsMember,
      discount_percentage: Number(normalizedOrder.discountPercentage || 0),
      subtotal: Number(normalizedOrder.subtotal || 0),
      tax: Number(normalizedOrder.tax || 0),
      total: Number(normalizedOrder.total || 0),
      payment_method: normalizedOrder.paymentMethod,
      staff_name: normalizedOrder.staffName || 'Kunal',
      items: normalizedOrder.items,
      date: normalizedOrder.date,
      created_at: new Date().toISOString(),
    };

    const { error } = await client.from('orders').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase orders table upsert error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Supabase syncOrderToCloud exception:', msg);
    return { success: false, error: msg };
  }
}

/**
 * 2. Fetch all sales history and daily bills from Supabase
 * When opening on any new phone, this automatically pulls all multi-year records.
 */
export async function fetchSalesFromCloud(): Promise<{ fromCloud: boolean; orders: Order[]; error?: string }> {
  const client = getSupabaseClient();

  if (!client) {
    // Return volatile RAM store
    return {
      fromCloud: false,
      orders: inMemoryOrdersStore,
    };
  }

  try {
    const { data, error } = await client
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase orders fetch error:', error.message);
      return {
        fromCloud: false,
        orders: inMemoryOrdersStore,
        error: error.message,
      };
    }

    if (data && Array.isArray(data)) {
      interface SupabaseOrderRow {
        id: string;
        client_name?: string;
        clientName?: string;
        client_phone?: string;
        clientPhone?: string;
        is_member?: boolean;
        isMember?: boolean;
        discount_percentage?: number | string;
        discountPercentage?: number | string;
        subtotal?: number | string;
        tax?: number | string;
        total?: number | string;
        payment_method?: 'cash' | 'card' | 'upi';
        paymentMethod?: 'cash' | 'card' | 'upi';
        staff_name?: string;
        staffName?: string;
        items?: unknown;
        date?: string;
      }

      const mappedOrders: Order[] = data.map((row: SupabaseOrderRow) => {
        const rawItems = row.items;
        const items = Array.isArray(rawItems) ? rawItems : [];

        return {
          id: String(row.id || '#1'),
          clientName: row.client_name ?? row.clientName ?? 'Walk-in Client',
          clientPhone: row.client_phone ?? row.clientPhone ?? '',
          isMember: Boolean(row.is_member ?? row.isMember),
          discountPercentage: Number(row.discount_percentage ?? row.discountPercentage ?? 0),
          subtotal: Number(row.subtotal ?? row.total ?? 0),
          tax: Number(row.tax ?? 0),
          total: Number(row.total ?? 0),
          paymentMethod: row.payment_method ?? row.paymentMethod ?? 'cash',
          staffName: row.staff_name ?? row.staffName ?? 'Kunal',
          items,
          date: row.date || new Date().toISOString(),
        };
      });

      // Update in-memory RAM cache
      inMemoryOrdersStore = sortOrdersDescending(mappedOrders);

      return {
        fromCloud: true,
        orders: inMemoryOrdersStore,
      };
    }

    return { fromCloud: true, orders: [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Supabase fetch exception:', msg);
    return {
      fromCloud: false,
      orders: inMemoryOrdersStore,
      error: msg,
    };
  }
}

/**
 * 3. Synchronize membership to Supabase
 */
export async function syncMembershipToCloud(
  member: MembershipRecord
): Promise<{ success: boolean; error?: string }> {
  // Update volatile in-memory store
  const existingIdx = inMemoryMembershipsStore.findIndex((m) => m.id === member.id || m.clientPhone === member.clientPhone);
  if (existingIdx >= 0) {
    inMemoryMembershipsStore[existingIdx] = member;
  } else {
    inMemoryMembershipsStore.push(member);
  }

  const client = getSupabaseClient();
  if (!client) return { success: true };

  try {
    const payload = {
      id: member.id,
      client_name: member.clientName,
      client_phone: member.clientPhone,
      start_date: member.startDate,
      expiry_date: member.expiryDate,
      is_active: member.isActive,
      created_at: new Date().toISOString(),
    };

    const { error } = await client.from('memberships').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase memberships upsert error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * 4. Fetch all memberships from Supabase
 */
export async function fetchMembershipsFromCloud(): Promise<{
  fromCloud: boolean;
  memberships: MembershipRecord[];
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { fromCloud: false, memberships: inMemoryMembershipsStore };
  }

  try {
    const { data, error } = await client
      .from('memberships')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase memberships fetch error:', error.message);
      return { fromCloud: false, memberships: inMemoryMembershipsStore, error: error.message };
    }

    if (data && Array.isArray(data)) {
      interface SupabaseMemberRow {
        id: string;
        client_name?: string;
        clientName?: string;
        client_phone?: string;
        clientPhone?: string;
        start_date?: string;
        startDate?: string;
        expiry_date?: string;
        expiryDate?: string;
        is_active?: boolean;
        isActive?: boolean;
      }

      const mapped: MembershipRecord[] = data.map((r: SupabaseMemberRow) => ({
        id: String(r.id),
        clientName: r.client_name ?? r.clientName ?? 'Valued Member',
        clientPhone: r.client_phone ?? r.clientPhone ?? '',
        startDate: r.start_date ?? r.startDate ?? '',
        expiryDate: r.expiry_date ?? r.expiryDate ?? '',
        isActive: Boolean(r.is_active ?? r.isActive ?? true),
      }));

      inMemoryMembershipsStore = mapped;
      return { fromCloud: true, memberships: mapped };
    }

    return { fromCloud: true, memberships: [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { fromCloud: false, memberships: inMemoryMembershipsStore, error: msg };
  }
}

/**
 * 5. Synchronize staff service record to Supabase
 */
export async function syncStaffServiceToCloud(
  staffName: string,
  record: StaffServiceRecord
): Promise<{ success: boolean; error?: string }> {
  inMemoryStaffServicesStore.push({ staffName, record });

  const client = getSupabaseClient();
  if (!client) return { success: true };

  try {
    const payload = {
      id: record.id,
      staff_name: staffName,
      client_name: record.clientName,
      service_name: record.serviceName,
      amount: record.amount,
      date: record.date,
      created_at: new Date().toISOString(),
    };

    const { error } = await client.from('staff_services').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase staff_services upsert error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * 6. Fetch staff services from Supabase
 */
export async function fetchStaffServicesFromCloud(): Promise<{
  fromCloud: boolean;
  records: { staffName: string; record: StaffServiceRecord }[];
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { fromCloud: false, records: inMemoryStaffServicesStore };
  }

  try {
    const { data, error } = await client
      .from('staff_services')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { fromCloud: false, records: inMemoryStaffServicesStore, error: error.message };
    }

    if (data && Array.isArray(data)) {
      interface SupabaseStaffServiceRow {
        id: string;
        staff_name?: string;
        staffName?: string;
        client_name?: string;
        clientName?: string;
        service_name?: string;
        serviceName?: string;
        amount?: number | string;
        date?: string;
      }

      const mapped = data.map((r: SupabaseStaffServiceRow) => ({
        staffName: r.staff_name ?? r.staffName ?? 'Kunal',
        record: {
          id: String(r.id),
          date: r.date || '',
          clientName: r.client_name ?? r.clientName ?? 'Walk-in Client',
          serviceName: r.service_name ?? r.serviceName ?? 'Salon Service',
          amount: Number(r.amount || 0),
        },
      }));

      inMemoryStaffServicesStore = mapped;
      return { fromCloud: true, records: mapped };
    }

    return { fromCloud: true, records: [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { fromCloud: false, records: inMemoryStaffServicesStore, error: msg };
  }
}

/**
 * 7. Reset orders in Supabase (e.g. when resetting ledger)
 */
export async function resetCloudOrders(): Promise<{ success: boolean }> {
  inMemoryOrdersStore = [];
  const client = getSupabaseClient();
  if (!client) return { success: true };

  try {
    await client.from('orders').delete().neq('id', 'non_existent_key_placeholder');
    return { success: true };
  } catch {
    return { success: false };
  }
}
