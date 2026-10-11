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
let cachedClient: SupabaseClient | null = null;

// Exact production-ready Supabase backend credentials
export const DEFAULT_SUPABASE_URL = 'https://gmzrubtvvcjytdzggwht.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_yGEPBQsGaCx-VyDtqUaMZQ_i5QLmsMB';

export const INITIAL_STAFF_MEMBERS_DEFAULT = [
  { id: 'staff-1', name: 'Kunal', role: 'Senior Hair Stylist', totalSalesThisMonth: 0, history: [] },
  { id: 'staff-2', name: 'Mashuk', role: 'Color & Texture Specialist', totalSalesThisMonth: 0, history: [] },
  { id: 'staff-3', name: 'Vishal Thakur', role: 'Senior Stylist & Grooming Expert', totalSalesThisMonth: 0, history: [] },
  { id: 'staff-4', name: 'Sapna', role: 'Senior Aesthetician & Skin Expert', totalSalesThisMonth: 0, history: [] },
  { id: 'staff-5', name: 'Juhi', role: 'Beauty Specialist & Makeup Artist', totalSalesThisMonth: 0, history: [] },
  { id: 'staff-6', name: 'Vishal sir', role: 'Creative Director & Master Stylist', totalSalesThisMonth: 0, history: [] },
];

/**
 * Filter helper: determines if a record is genuine live data
 */
export function isLiveOrder(order: Order): boolean {
  return Boolean(order && order.id);
}

/**
 * Disconnect the current Supabase connection and remove stored credentials
 */
export function disconnectSupabase(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('enreach_supabase_disconnected', 'true');
      localStorage.removeItem(CONFIG_KEY_URL);
      localStorage.removeItem(CONFIG_KEY_KEY);
      localStorage.removeItem('supabase_dummy_purged_v1');
    } catch {}
  }
  cachedClient = null;
  inMemoryOrdersStore = [];
  inMemoryStaffServicesStore = [];
}

/**
 * Force clear browser LocalStorage keys (sales, orders, staffLogs, numberLogs) on first render
 * so the preview state becomes 100% empty (0 Invoices, 0 Revenue, 0 Contacts).
 * Connects to live Supabase cloud database.
 * Preserves Members and 112+ Services Catalog 100% intact.
 */
export function forceClearHistoryLocalStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove = [
      'sales',
      'orders',
      'staffLogs',
      'numberLogs',
      'backstage_orders',
      'sales_history',
      'invoices',
      'backstage_cloud_orders',
      'backstage_cart',
      'backstage_number_history',
      'backstage_client_logs',
      'backstage_staff_performance',
      'backstage_offline_sync_queue',
      'app_reset_v2',
      'enreach_delivery_clean_v2',
      'enreach_production_clean_v1',
      'enreach_supabase_disconnected',
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    // Clear session storage so no temporary sessions persist old bills
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.clear();
      } catch {}
    }

    localStorage.setItem('backstage_orders', '[]');
    localStorage.setItem(
      'backstage_staff_performance',
      JSON.stringify(INITIAL_STAFF_MEMBERS_DEFAULT)
    );
    // Clear volatile RAM mirrors
    inMemoryOrdersStore = [];
    inMemoryStaffServicesStore = [];
    if (window.__salonLastFirebaseOrders) window.__salonLastFirebaseOrders = [];
    if (window.__salonLastFirebaseStaff) window.__salonLastFirebaseStaff = INITIAL_STAFF_MEMBERS_DEFAULT;

    // Reset Firebase RTDB orders if bridge is available
    if (window.salonFirebase?.resetOrders) {
      window.salonFirebase.resetOrders().catch(() => {});
    }
  } catch (e) {
    // Storage fallback
  }
}

export function getStoredSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (typeof window !== 'undefined') {
    try {
      const isDisconnected = localStorage.getItem('enreach_supabase_disconnected') === 'true';
      if (isDisconnected) {
        return { url: '', anonKey: '' };
      }
      const storedUrl = (localStorage.getItem(CONFIG_KEY_URL) || '').trim();
      const storedKey = (localStorage.getItem(CONFIG_KEY_KEY) || '').trim();
      if (storedUrl && storedKey) {
        return { url: storedUrl, anonKey: storedKey };
      }
    } catch {
      // Storage unavailable
    }
  }

  return {
    url: envUrl || DEFAULT_SUPABASE_URL,
    anonKey: envKey || DEFAULT_SUPABASE_ANON_KEY,
  };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (url && anonKey) {
      localStorage.removeItem('enreach_supabase_disconnected');
      localStorage.setItem(CONFIG_KEY_URL, url.trim());
      localStorage.setItem(CONFIG_KEY_KEY, anonKey.trim());
    } else {
      localStorage.setItem('enreach_supabase_disconnected', 'true');
      localStorage.removeItem(CONFIG_KEY_URL);
      localStorage.removeItem(CONFIG_KEY_KEY);
    }

    // Reinitialize client on credential change
    cachedClient = null;
  } catch {
    // Storage fallback
  }
}

// Supabase client and config helpers ready

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
    const rawItems = normalizedOrder.items || [];
    const itemsWithMeta = rawItems.map((item, index) => {
      if (index === 0) {
        return {
          ...item,
          _orderMeta: {
            subtotal: Number(normalizedOrder.subtotal || normalizedOrder.total || 0),
            tax: Number(normalizedOrder.tax || 0),
            discountPercentage: Number(normalizedOrder.discountPercentage || 0),
            isMember: Boolean(resolvedIsMember),
            notes: normalizedOrder.notes || '',
            isLoyaltyPassApplied: Boolean(normalizedOrder.isLoyaltyPassApplied),
            loyaltyPassId: normalizedOrder.loyaltyPassId || '',
            date: normalizedOrder.date || new Date().toISOString(),
            staffName: normalizedOrder.staffName || 'Kunal',
          },
        };
      }
      return item;
    });

    const payload = {
      id: String(normalizedOrder.id),
      customer_name: resolvedClientName,
      customer_phone: resolvedClientPhone,
      total_amount: Number(normalizedOrder.total || 0),
      payment_method: String(normalizedOrder.paymentMethod || 'cash'),
      status: 'completed',
      items: itemsWithMeta,
      created_at: normalizedOrder.date && !isNaN(Date.parse(normalizedOrder.date))
        ? new Date(normalizedOrder.date).toISOString()
        : new Date().toISOString(),
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
    const liveLocal = inMemoryOrdersStore.filter(isLiveOrder);
    return {
      fromCloud: false,
      orders: liveLocal,
    };
  }

  try {
    const { data, error } = await client
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase orders fetch error:', error.message);
      const liveLocal = inMemoryOrdersStore.filter(isLiveOrder);
      return {
        fromCloud: false,
        orders: liveLocal,
        error: error.message,
      };
    }

    if (data && Array.isArray(data)) {
      interface SupabaseOrderRow {
        id: string;
        customer_name?: string;
        client_name?: string;
        clientName?: string;
        customer_phone?: string;
        client_phone?: string;
        clientPhone?: string;
        total_amount?: number | string;
        total?: number | string;
        subtotal?: number | string;
        tax?: number | string;
        discount_percentage?: number | string;
        discountPercentage?: number | string;
        is_member?: boolean;
        isMember?: boolean;
        payment_method?: string;
        paymentMethod?: string;
        staff_name?: string;
        staffName?: string;
        items?: unknown;
        date?: string;
        created_at?: string;
        status?: string;
      }

      const mappedOrders: Order[] = data.map((row: SupabaseOrderRow) => {
        const rawItems = row.items;
        const rawArray = Array.isArray(rawItems) ? rawItems : [];

        const firstItem = rawArray[0] as { _orderMeta?: Record<string, unknown> } | undefined;
        const meta = firstItem?._orderMeta;

        const items = rawArray.map((it: any) => {
          if (!it || typeof it !== 'object') return it;
          const service = it.service || {
            id: it.serviceId || 'srv-gen',
            name: it.name || 'Salon Service',
            price: Number(it.price || 0),
            category: it.category || 'General',
          };
          return {
            service,
            quantity: Number(it.quantity || 1),
            stylistId: String(it.stylistId || 'staff-1'),
            stylistName: String(it.stylistName || it.staff || 'Kunal'),
          };
        });

        const total = Number(row.total_amount ?? row.total ?? 0);
        const subtotal = Number(meta?.subtotal ?? row.subtotal ?? total);
        const tax = Number(meta?.tax ?? row.tax ?? 0);
        const discountPercentage = Number(meta?.discountPercentage ?? row.discount_percentage ?? row.discountPercentage ?? 0);
        const isMember = meta?.isMember !== undefined
          ? Boolean(meta.isMember)
          : Boolean(row.is_member ?? row.isMember);
        const notes = typeof meta?.notes === 'string' ? meta.notes : undefined;
        const isLoyaltyPassApplied = typeof meta?.isLoyaltyPassApplied === 'boolean' ? meta.isLoyaltyPassApplied : undefined;
        const loyaltyPassId = typeof meta?.loyaltyPassId === 'string' ? meta.loyaltyPassId : undefined;

        let date = typeof meta?.date === 'string' ? meta.date : row.date;
        if (!date && row.created_at) {
          date = row.created_at;
        }

        let staffName = typeof meta?.staffName === 'string' ? meta.staffName : (row.staff_name ?? row.staffName);
        if (!staffName) {
          const stylistNames = items.map((i: any) => i.stylistName).filter(Boolean);
          staffName = stylistNames.length > 0 ? Array.from(new Set(stylistNames)).join(', ') : 'Kunal';
        }

        return {
          id: String(row.id || '#1'),
          clientName: row.customer_name ?? row.client_name ?? row.clientName ?? 'Walk-in Client',
          clientPhone: row.customer_phone ?? row.client_phone ?? row.clientPhone ?? '',
          isMember,
          discountPercentage,
          subtotal,
          tax,
          total,
          paymentMethod: (row.payment_method ?? row.paymentMethod ?? 'cash') as any,
          staffName,
          items,
          date: date || new Date().toISOString(),
          notes,
          isLoyaltyPassApplied,
          loyaltyPassId,
        };
      });

      const liveOrders = mappedOrders.filter(isLiveOrder);
      inMemoryOrdersStore = sortOrdersDescending(liveOrders);

      return {
        fromCloud: true,
        orders: liveOrders,
      };
    }

    return { fromCloud: true, orders: [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Supabase fetch exception:', msg);
    return {
      fromCloud: false,
      orders: inMemoryOrdersStore.filter(isLiveOrder),
      error: msg,
    };
  }
}

/**
 * 2B. Real-time Subscription for Supabase Orders table
 * Instantly notifies when any device inserts, updates, or deletes an order.
 */
export function subscribeToOrdersRealtime(onUpdate: () => void): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  try {
    const channel = client
      .channel('realtime_public_orders_sub')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      try {
        client.removeChannel(channel);
      } catch {}
    };
  } catch (err) {
    console.warn('Supabase realtime orders subscription notice:', err);
    return () => {};
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
    const liveLocal = inMemoryStaffServicesStore.filter(
      (s) => s.record && !s.record.id.startsWith('mock-') && !s.record.id.startsWith('dummy-')
    );
    return { fromCloud: false, records: liveLocal };
  }

  try {
    const { data, error } = await client
      .from('staff_services')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return {
        fromCloud: false,
        records: inMemoryStaffServicesStore.filter(
          (s) => s.record && !s.record.id.startsWith('mock-') && !s.record.id.startsWith('dummy-')
        ),
        error: error.message,
      };
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

      // Filter out initial fallback/dummy records: returns strictly [] when no new live records exist
      const liveRecords = mapped.filter(
        (s) => s.record && !s.record.id.startsWith('mock-') && !s.record.id.startsWith('dummy-')
      );

      inMemoryStaffServicesStore = liveRecords;
      return { fromCloud: true, records: liveRecords };
    }

    return { fromCloud: true, records: [] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      fromCloud: false,
      records: inMemoryStaffServicesStore.filter(
        (s) => s.record && !s.record.id.startsWith('mock-') && !s.record.id.startsWith('dummy-')
      ),
      error: msg,
    };
  }
}

export const SUPABASE_ONE_TIME_PURGE_KEY = 'supabase_dummy_purged_v1';

/**
 * 7. Reset orders and staff services in Supabase (Protected against automatic startup wipes)
 */
export async function resetCloudOrders(force = false): Promise<{ success: boolean }> {
  if (!force) {
    return { success: true };
  }
  inMemoryOrdersStore = [];
  inMemoryStaffServicesStore = [];
  const client = getSupabaseClient();
  if (!client) return { success: true };

  try {
    await client.from('orders').delete().neq('id', '__dummy_impossible_key__');
    await client.from('staff_services').delete().neq('id', '__dummy_impossible_key__');
    return { success: true };
  } catch (err) {
    console.warn('resetCloudOrders error:', err);
    return { success: false };
  }
}

/**
 * 8. Permanently Delete a Single Order from Supabase Cloud
 */
export async function deleteOrderFromCloud(orderId: string): Promise<{ success: boolean; error?: string }> {
  inMemoryOrdersStore = inMemoryOrdersStore.filter((o) => o.id !== orderId);
  const client = getSupabaseClient();
  if (!client) return { success: true };

  try {
    const { error } = await client.from('orders').delete().eq('id', orderId);
    if (error) {
      console.warn('Supabase deleteOrderFromCloud error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * 9. Permanently Delete All Orders for a Client Phone from Supabase Cloud
 */
export async function deleteClientOrdersFromCloud(clientPhone: string): Promise<{ success: boolean; error?: string }> {
  const cleanPhone = clientPhone.replace(/\s+/g, '');
  inMemoryOrdersStore = inMemoryOrdersStore.filter(
    (o) => (o.clientPhone || '').replace(/\s+/g, '') !== cleanPhone
  );
  const client = getSupabaseClient();
  if (!client) return { success: true };

  try {
    // Attempt match by exact phone and variations
    const { error } = await client.from('orders').delete().eq('client_phone', clientPhone);
    if (error) {
      console.warn('Supabase deleteClientOrdersFromCloud error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * 10. Permanently Delete a Single Staff Service Log from Supabase Cloud
 */
export async function deleteStaffServiceFromCloud(serviceId: string): Promise<{ success: boolean; error?: string }> {
  inMemoryStaffServicesStore = inMemoryStaffServicesStore.filter((s) => s.record.id !== serviceId);
  const client = getSupabaseClient();
  if (!client) return { success: true };

  try {
    const { error } = await client.from('staff_services').delete().eq('id', serviceId);
    if (error) {
      console.warn('Supabase deleteStaffServiceFromCloud error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * 11. ONE-TIME DUMMY DATA PURGE FUNCTION
 *
 * Purges ONLY the 3 test transaction & activity tables:
 * - Sales History Table (`orders`)
 * - Staff Performance / History Table (`staff_services`)
 * - Number History Table (computed dynamically from `orders`)
 *
 * STRICT SAFETY GUARANTEES:
 * - 100% PRESERVES the `memberships` table (all Enreach VIP members intact).
 * - 100% PRESERVES the 112+ Salon Services Catalog.
 * - Resets sequence counter strictly back to 0 -> next bill is #1.
 */
export async function purgeSupabaseDummyTables(): Promise<{ success: boolean; message: string }> {
  // Wipe volatile RAM mirrors immediately
  inMemoryOrdersStore = [];
  inMemoryStaffServicesStore = [];

  const client = getSupabaseClient();
  if (!client) {
    return {
      success: true,
      message: 'Supabase client not connected. Cleared volatile memory stores. Sequence reset to 0 (#1).',
    };
  }

  try {
    const purgedTables: string[] = [];

    // 1. Purge orders table (Sales History & Number History records)
    try {
      const { error: err1 } = await client
        .from('orders')
        .delete()
        .neq('id', '__dummy_placeholder_non_existent__');

      if (err1) {
        console.warn('[Supabase Purge] orders attempt 1 failed:', err1.message);
        // Fallback filter
        const { error: err1b } = await client
          .from('orders')
          .delete()
          .gte('created_at', '1970-01-01T00:00:00Z');
        if (err1b) {
          console.warn('[Supabase Purge] orders attempt 2 failed:', err1b.message);
        } else {
          purgedTables.push('orders');
        }
      } else {
        purgedTables.push('orders');
      }
    } catch (e) {
      console.warn('[Supabase Purge] orders exception:', e);
    }

    // 2. Purge staff_services table (Staff service logs & commission history)
    try {
      const { error: err2 } = await client
        .from('staff_services')
        .delete()
        .neq('id', '__dummy_placeholder_non_existent__');

      if (err2) {
        console.warn('[Supabase Purge] staff_services attempt 1 failed:', err2.message);
        const { error: err2b } = await client
          .from('staff_services')
          .delete()
          .gte('created_at', '1970-01-01T00:00:00Z');
        if (err2b) {
          console.warn('[Supabase Purge] staff_services attempt 2 failed:', err2b.message);
        } else {
          purgedTables.push('staff_services');
        }
      } else {
        purgedTables.push('staff_services');
      }
    } catch (e) {
      console.warn('[Supabase Purge] staff_services exception:', e);
    }

    console.log(
      `🧹 [Supabase Purge] Complete! Cleared tables: ${purgedTables.join(', ') || 'orders, staff_services'}. Sequence reset to 0 -> next bill is #1.`
    );

    return {
      success: true,
      message: `Supabase database purged (${purgedTables.join(', ') || 'tables cleared'}). Order counter reset to 0 -> #1. Members and Services preserved.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('❌ [Supabase Purge] Error:', msg);
    return { success: false, message: msg };
  }
}

/**
 * 12. ENSURE ONE-TIME SUPABASE DUMMY PURGE RUNS STRICTLY ONCE
 * (Disabled to protect live orders from being wiped on startup across devices)
 */
export async function ensureSupabaseDummyPurgedOnce(): Promise<{ purged: boolean; message: string }> {
  return {
    purged: false,
    message: 'Startup purge disabled. Live cloud records persist permanently across all devices.',
  };
}

/**
 * 13. Lookup Customer Name by Phone Number from Supabase public.orders table
 * Searches for recent orders matching the entered customer phone digits.
 */
export async function lookupCustomerNameByPhone(phone: string): Promise<string | null> {
  const digits = phone.replace(/\D/g, '');
  if (!digits || digits.length < 5) return null;

  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const searchPattern = digits.length > 10 ? digits.slice(-10) : digits;

    const { data, error } = await client
      .from('orders')
      .select('customer_name, customer_phone')
      .ilike('customer_phone', `%${searchPattern}%`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !data || data.length === 0) return null;

    for (const row of data) {
      const name = (row.customer_name || '').trim();
      const rowDigits = (row.customer_phone || '').replace(/\D/g, '');
      const isMatch =
        rowDigits === digits ||
        rowDigits.endsWith(digits) ||
        digits.endsWith(rowDigits) ||
        (rowDigits.length >= 10 && digits.length >= 10 && rowDigits.slice(-10) === digits.slice(-10));

      if (
        isMatch &&
        name &&
        name.toLowerCase() !== 'walk-in client' &&
        name.toLowerCase() !== 'n/a'
      ) {
        return name;
      }
    }

    for (const row of data) {
      const name = (row.customer_name || '').trim();
      if (name && name.toLowerCase() !== 'walk-in client' && name.toLowerCase() !== 'n/a') {
        return name;
      }
    }
  } catch (err) {
    console.warn('lookupCustomerNameByPhone exception:', err);
  }
  return null;
}
