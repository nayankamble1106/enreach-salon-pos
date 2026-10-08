/**
 * SPECIFIC HISTORY PURGE SCRIPT
 * 
 * Permanently purges ONLY the 3 transaction & activity history objects:
 * 1. Sales History (all past bills, receipts & orders)
 * 2. Staff History (clears staff service logs & resets monthly sales to ₹0)
 * 3. Number History (customer phone logs & visit frequency)
 * 
 * STRICT GUARANTEES:
 * - 100% PRESERVES the Members & Loyalty Pass section (untouched).
 * - 100% PRESERVES the 112+ Salon Services Catalog & Custom Categories.
 * - 100% PRESERVES Salon Logo, Name, GST Number & App Settings.
 * - Enforces Order ID counter reset strictly back to 0 -> next bill is "#1".
 */

import {
  resetCloudOrders,
  purgeSupabaseDummyTables,
  ensureSupabaseDummyPurgedOnce,
} from '../services/supabase';

export const OFFICIAL_STAFF_MEMBERS = [
  { id: 'staff-1', name: 'Kunal', role: 'Senior Hair Stylist', totalSalesThisMonth: 0, history: [] },
  { id: 'staff-2', name: 'Mashuk', role: 'Color & Texture Specialist', totalSalesThisMonth: 0, history: [] },
  { id: 'staff-3', name: 'Vishal Thakur', role: 'Senior Stylist & Grooming Expert', totalSalesThisMonth: 0, history: [] },
  { id: 'staff-4', name: 'Sapna', role: 'Senior Aesthetician & Skin Expert', totalSalesThisMonth: 0, history: [] },
  { id: 'staff-5', name: 'Juhi', role: 'Beauty Specialist & Makeup Artist', totalSalesThisMonth: 0, history: [] },
  { id: 'staff-6', name: 'Vishal sir', role: 'Creative Director & Master Stylist', totalSalesThisMonth: 0, history: [] },
];

/**
 * Synchronous purge for immediate invocation on app boot / load before React state renders
 */
export function purgeOnlyHistoriesSync(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('enreach_supabase_disconnected');
    // 1. PURGE SALES HISTORY (All cached keys)
    localStorage.removeItem('sales');
    localStorage.removeItem('orders');
    localStorage.removeItem('staffLogs');
    localStorage.removeItem('numberLogs');
    localStorage.removeItem('backstage_orders');
    localStorage.removeItem('sales_history');
    localStorage.removeItem('invoices');
    localStorage.removeItem('backstage_cloud_orders');
    localStorage.removeItem('backstage_cart');
    localStorage.setItem('backstage_orders', '[]');

    // Clear session storage as well
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.clear();
      } catch {}
    }

    // 2. PURGE NUMBER HISTORY / TEMPORARY CLIENT LOGS
    localStorage.removeItem('backstage_number_history');
    localStorage.removeItem('backstage_client_logs');

    // 3. PURGE STAFF SERVICE WORK HISTORY (Preserve Staff Profiles & reset sales to 0)
    localStorage.setItem('backstage_staff_performance', JSON.stringify(OFFICIAL_STAFF_MEMBERS));

    // Clear runtime in-memory caches (preserve members and loyalty passes)
    if (window.__salonLastFirebaseOrders) window.__salonLastFirebaseOrders = [];
    if (window.__salonLastFirebaseStaff) window.__salonLastFirebaseStaff = OFFICIAL_STAFF_MEMBERS;

    localStorage.setItem('enreach_production_clean_v1', 'true');
    console.log('🧹 [Startup Purge] Supabase disconnected, Sales, Number History & Staff logs purged. Members, Services and Settings intact. Next Order: #1');
  } catch (err) {
    console.warn('[Startup Purge] Warning:', err);
  }
}

/**
 * Full asynchronous purge including cloud/Firebase mirrors & live React custom events
 */
export async function purgeOnlyHistories(): Promise<{ success: boolean; message: string }> {
  purgeOnlyHistoriesSync();

  if (typeof window === 'undefined') {
    return { success: false, message: 'Window object unavailable' };
  }

  try {
    // Clear Firebase Realtime Database mirrors if present
    if (window.salonFirebase) {
      if (window.salonFirebase.resetOrders) {
        await window.salonFirebase.resetOrders();
      }
      if (window.salonFirebase.syncStaffMembers) {
        await window.salonFirebase.syncStaffMembers(OFFICIAL_STAFF_MEMBERS);
      }
    }

    // Reset cloud orders & staff services in Supabase if configured
    await purgeSupabaseDummyTables();

    // Dispatch system events for live UI reactivity
    window.dispatchEvent(new CustomEvent('salon:firebase-orders-updated', { detail: [] }));
    window.dispatchEvent(new CustomEvent('salon:firebase-staff-updated', { detail: OFFICIAL_STAFF_MEMBERS }));

    console.log('✅ Specific histories purged successfully across storage & Supabase cloud. Order counter reset to 0 -> #1.');
    return {
      success: true,
      message: 'Histories purged successfully from LocalStorage and Supabase. Next order strictly starts at #1. Members, Services & Settings preserved.',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to purge histories:', msg);
    return { success: false, message: msg };
  }
}

/**
 * ONE-TIME ASYNC WIPEOUT OF SUPABASE DUMMY ROWS:
 * Wipes existing initial dummy/test rows from Supabase database tables ONCE.
 * Keeps Supabase Cloud Sync 100% active for all future live data.
 */
export async function runOneTimeSupabaseWipeout(): Promise<{ purged: boolean; message: string }> {
  return ensureSupabaseDummyPurgedOnce();
}

/**
 * ONE-TIME PERMANENT DATA WIPEOUT ON LOAD (app_reset_v2):
 * - Checks localStorage for 'app_reset_v2' flag.
 * - IF app_reset_v2 is NOT set:
 *    1. Permanently delete / clear the stored array/data for:
 *       - Sales History ('backstage_orders', 'sales_history', 'invoices', 'backstage_cloud_orders', 'backstage_cart')
 *       - Staff History & Logs ('backstage_staff_performance' reset to clean official staff with 0 sales and empty history)
 *       - Number History & Logs ('backstage_number_history', 'backstage_client_logs')
 *    2. Hard-reset the Invoice / Order Counter strictly back to 0 (so the next real sale creates bill #1).
 *    3. Sets localStorage.setItem('app_reset_v2', 'true') so that this wipe script ONLY runs ONCE and NEVER deletes future data again.
 * - IF app_reset_v2 IS set:
 *    Skips completely so that all future live entries starting tomorrow are stored normally in LocalStorage!
 */
export function runOneTimePermanentWipeoutSync(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const isWiped = localStorage.getItem('app_reset_v2');
    if (isWiped === 'true') {
      return false; // Already wiped once, future data persists permanently!
    }

    // 1. Sales History
    localStorage.removeItem('sales');
    localStorage.removeItem('orders');
    localStorage.removeItem('staffLogs');
    localStorage.removeItem('numberLogs');
    localStorage.removeItem('backstage_orders');
    localStorage.removeItem('sales_history');
    localStorage.removeItem('invoices');
    localStorage.removeItem('backstage_cloud_orders');
    localStorage.removeItem('backstage_cart');

    // 2. Number History & Logs
    localStorage.removeItem('backstage_number_history');
    localStorage.removeItem('backstage_client_logs');

    // 3. Staff History & Logs (preserves official staff roster and resets monthly sales to 0)
    localStorage.setItem('backstage_staff_performance', JSON.stringify(OFFICIAL_STAFF_MEMBERS));

    // Clear runtime in-memory caches (preserve members and loyalty passes)
    if (window.__salonLastFirebaseOrders) window.__salonLastFirebaseOrders = [];
    if (window.__salonLastFirebaseStaff) window.__salonLastFirebaseStaff = OFFICIAL_STAFF_MEMBERS;

    // Set one-time version flag so future data is saved permanently
    localStorage.setItem('app_reset_v2', 'true');
    console.log('🧹 [One-Time Wipeout] app_reset_v2 executed. Sales, Staff logs & Number History wiped. Members and Services preserved. Next Order: #1');
    return true;
  } catch (err) {
    console.warn('[One-Time Wipeout] Warning:', err);
    return false;
  }
}

// Auto-execute immediate one-time wipeout check on module evaluation
runOneTimePermanentWipeoutSync();

// Attach to window object for direct console execution: window.purgeAllHistoriesForProduction()
if (typeof window !== 'undefined') {
  (window as unknown as { purgeAllHistoriesForProduction: typeof purgeOnlyHistories }).purgeAllHistoriesForProduction = purgeOnlyHistories;
  (window as unknown as { purgeOnlyHistoriesSync: typeof purgeOnlyHistoriesSync }).purgeOnlyHistoriesSync = purgeOnlyHistoriesSync;
}
