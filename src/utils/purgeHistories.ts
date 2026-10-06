/**
 * SPECIFIC HISTORY PURGE SCRIPT
 * 
 * Permanently purges ONLY the 4 transaction & activity history objects:
 * 1. Sales History (all bills, receipts & orders)
 * 2. Membership History (dummy VIP members & loyalty pass logs)
 * 3. Number History (customer phone logs & visit frequency)
 * 4. Staff History (clears staff service logs & resets monthly sales to ₹0)
 * 
 * STRICT GUARANTEES:
 * - 100% PRESERVES the 112+ Salon Services Catalog & Custom Categories.
 * - 100% PRESERVES Salon Logo, Name, GST Number & App Settings.
 * - Enforces Order ID counter reset strictly back to "#1".
 */

import { resetCloudOrders } from '../services/supabase';

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
    // 1. PURGE SALES HISTORY
    localStorage.removeItem('backstage_orders');
    localStorage.removeItem('sales_history');
    localStorage.removeItem('invoices');
    localStorage.removeItem('backstage_cloud_orders');
    localStorage.removeItem('backstage_cart');

    // 2. PURGE MEMBERSHIP & LOYALTY PASS HISTORY
    localStorage.removeItem('backstage_memberships');
    localStorage.removeItem('backstage_loyalty_passes');

    // 3. PURGE NUMBER HISTORY / TEMPORARY CLIENT LOGS
    localStorage.removeItem('backstage_number_history');
    localStorage.removeItem('backstage_client_logs');

    // 4. PURGE STAFF SERVICE WORK HISTORY (Preserve Staff Profiles & reset sales to 0)
    localStorage.setItem('backstage_staff_performance', JSON.stringify(OFFICIAL_STAFF_MEMBERS));

    // Clear runtime in-memory caches
    if (window.__salonLastFirebaseOrders) window.__salonLastFirebaseOrders = [];
    if (window.__salonLastFirebaseMembers) window.__salonLastFirebaseMembers = [];
    if (window.__salonLastFirebaseLoyaltyPasses) window.__salonLastFirebaseLoyaltyPasses = [];
    if (window.__salonLastFirebaseStaff) window.__salonLastFirebaseStaff = OFFICIAL_STAFF_MEMBERS;

    localStorage.setItem('enreach_production_clean_v1', 'true');
    console.log('🧹 [Startup Purge] Sales, Memberships, Number History & Staff logs purged. Services and Settings intact. Next Order: #1');
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

    // Reset cloud orders in Supabase if configured
    await resetCloudOrders();

    // Dispatch system events for live UI reactivity
    window.dispatchEvent(new CustomEvent('salon:firebase-orders-updated', { detail: [] }));
    window.dispatchEvent(new CustomEvent('salon:firebase-memberships-updated', { detail: [] }));
    window.dispatchEvent(new CustomEvent('salon:firebase-loyalty-passes-updated', { detail: [] }));
    window.dispatchEvent(new CustomEvent('salon:firebase-staff-updated', { detail: OFFICIAL_STAFF_MEMBERS }));

    console.log('✅ Specific histories purged successfully across storage & cloud. Order counter reset to #1.');
    return {
      success: true,
      message: 'Histories purged successfully. Next order strictly starts at #1. Services & Settings preserved.',
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to purge histories:', msg);
    return { success: false, message: msg };
  }
}

/**
 * Purge ONLY Members List and Membership / Loyalty Pass History data on launch
 * Guarantees zero records in Members section for handover while keeping all services, orders, and staff intact.
 */
export function purgeMembersAndLoyaltyPassesOnlySync(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('backstage_memberships');
    localStorage.removeItem('backstage_loyalty_passes');
    if (window.__salonLastFirebaseMembers) window.__salonLastFirebaseMembers = [];
    if (window.__salonLastFirebaseLoyaltyPasses) window.__salonLastFirebaseLoyaltyPasses = [];
    console.log('🧹 [Startup] Members List & Loyalty Pass History purged cleanly (0 records).');
  } catch (err) {
    console.warn('[Startup] Membership purge warning:', err);
  }
}

export async function purgeMembersAndLoyaltyPassesOnly(): Promise<{ success: boolean; message: string }> {
  purgeMembersAndLoyaltyPassesOnlySync();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('salon:firebase-memberships-updated', { detail: [] }));
    window.dispatchEvent(new CustomEvent('salon:firebase-loyalty-passes-updated', { detail: [] }));
  }
  return {
    success: true,
    message: 'Members List and Membership History purged successfully.',
  };
}

// Auto-execute immediate members purge on initial script load
purgeMembersAndLoyaltyPassesOnlySync();

// Attach to window object for direct console execution: window.purgeAllHistoriesForProduction()
if (typeof window !== 'undefined') {
  (window as unknown as { purgeAllHistoriesForProduction: typeof purgeOnlyHistories }).purgeAllHistoriesForProduction = purgeOnlyHistories;
  (window as unknown as { purgeOnlyHistoriesSync: typeof purgeOnlyHistoriesSync }).purgeOnlyHistoriesSync = purgeOnlyHistoriesSync;
}
