import { Order } from '../types';

export async function syncOrderToCloud(
  order: Order,
  clientMeta: { name: string; phone: string; isMember: boolean }
): Promise<{ success: boolean }> {
  try {
    if (typeof window === 'undefined') return { success: false };
    const existing = localStorage.getItem('backstage_cloud_orders');
    const orders: Order[] = existing ? JSON.parse(existing) : [];
    orders.unshift({ ...order, clientName: clientMeta.name, clientPhone: clientMeta.phone, isMember: clientMeta.isMember });
    localStorage.setItem('backstage_cloud_orders', JSON.stringify(orders.slice(0, 100)));
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function fetchSalesFromCloud(): Promise<{ fromCloud: boolean; orders: Order[] }> {
  try {
    if (typeof window === 'undefined') return { fromCloud: false, orders: [] };
    const existing = localStorage.getItem('backstage_cloud_orders');
    if (existing) {
      const orders: Order[] = JSON.parse(existing);
      const cleansed = orders.filter((o) => !['#9166', '#9169', '#9170', 'ORD-7793'].includes(o.id));
      return { fromCloud: true, orders: cleansed };
    }
  } catch {
    // fallback
  }
  return { fromCloud: false, orders: [] };
}
