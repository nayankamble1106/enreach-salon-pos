import { Order } from '../types';
import { parseDateToTimestamp } from './dateUtils';

/**
 * Robust date parser for orders
 */
export const parseOrderTimestamp = (dateStr: string): number => {
  return parseDateToTimestamp(dateStr);
};

/**
 * Strictly extracts the monthly sequential number from an order ID like "#1", "#2", "#15", "#001".
 * Explicitly ignores/discards random timestamp IDs like "INV-5661", "ORD-7793", or fake random 4-digit IDs (#5661, #9166).
 */
export const parseOrderSequence = (id: string): number => {
  if (!id) return 0;
  
  // Strictly match standard sequential format #1, #2, #100 etc.
  const match = id.trim().match(/^#(\d+)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    // Ignore random 4-digit timestamp artifacts (e.g. 5661, 5662, 5663, 9166)
    if (!isNaN(num) && num > 0 && num < 2000) {
      return num;
    }
  }
  return 0;
};

/**
 * Initial Order Counter strictly set to 0.
 * When the order counter is 0, the next generated order/invoice is strictly "#1".
 */
export const INITIAL_ORDER_COUNTER = 0;

/**
 * STRICT MONTHLY INVOICE / ORDER NUMBER GENERATOR:
 * 
 * 1. FORCE RESET MONTHLY COUNTER TO #1:
 *    - For any sale created in the active month (e.g., October 2026), if there are no existing
 *      bills for that month, the Order/Invoice ID STRICTLY starts at "#1".
 *    - Subsequent bills in the same month follow sequential incrementing: "#1", "#2", "#3", "#4", etc.
 * 
 * 2. ZERO RANDOM PREFIXES:
 *    - Completely removes random timestamps, legacy prefixes (INV-, ORD-), or 4-digit hashes.
 *    - Output string is strictly formatted as "#" followed by the integer count (e.g., "#1", "#2", "#3").
 * 
 * @param orders List of all orders/bills in the system
 * @param refDate Target date of the transaction (defaults to current active transaction time)
 */
export const generateInvoiceNumber = (orders: Order[] = [], refDate = new Date()): string => {
  if (!orders || orders.length === 0) {
    return '#1';
  }

  const currentMonth = refDate.getMonth();
  const currentYear = refDate.getFullYear();

  // Filter orders that belong strictly to the current active calendar month and year
  const currentMonthOrders = orders.filter((order) => {
    if (!order || !order.date) return false;
    try {
      const ts = parseOrderTimestamp(order.date);
      if (!ts || isNaN(ts)) return false;
      const d = new Date(ts);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    } catch {
      return false;
    }
  });

  // If no transactions exist yet in the current active month, strictly start at #1
  if (currentMonthOrders.length === 0) {
    return '#1';
  }

  // Find the highest sequence number in the current active month
  let maxSeq = 0;
  for (const order of currentMonthOrders) {
    const seq = parseOrderSequence(order.id);
    if (seq > maxSeq) {
      maxSeq = seq;
    }
  }

  return `#${maxSeq + 1}`;
};

// Aliases for seamless imports across all components
export const generateOrderId = generateInvoiceNumber;
export const getNextOrderNumber = generateInvoiceNumber;

/**
 * Sorts orders in descending order so the latest/newest invoice (e.g. #3, #2, #1)
 * always appears at the very top of the ledger, and older bills remain at the bottom.
 */
export const sortOrdersDescending = (orders: Order[]): Order[] => {
  if (!orders || orders.length === 0) return [];
  return [...orders].sort((a, b) => {
    const tsA = parseOrderTimestamp(a.date);
    const tsB = parseOrderTimestamp(b.date);
    if (tsB !== tsA) {
      return tsB - tsA; // Newest timestamp at top
    }
    const seqA = parseOrderSequence(a.id);
    const seqB = parseOrderSequence(b.id);
    return seqB - seqA;
  });
};

/**
 * Cleanses any legacy random IDs (e.g. INV-5661, #5662, #5663, ORD-7793, #9166)
 * and guarantees clean sequential #1, #2, #3 numbering.
 */
export const migrateOrdersToSequential = (orders: Order[]): Order[] => {
  if (!orders || orders.length === 0) return [];

  // Check if any legacy / random artifacts exist
  const hasLegacyOrRandomIds = orders.some((o) => {
    if (!o.id) return true;
    if (o.id.startsWith('INV-') || o.id.startsWith('ORD-')) return true;
    const match = o.id.match(/^#(\d+)$/);
    if (!match) return true;
    const n = parseInt(match[1], 10);
    return isNaN(n) || n >= 2000;
  });

  if (!hasLegacyOrRandomIds) {
    return sortOrdersDescending(orders);
  }

  // Group orders by month/year (key: "YYYY-MM")
  const groupsByMonth: { [key: string]: Order[] } = {};
  for (const order of orders) {
    const ts = parseOrderTimestamp(order.date);
    const d = new Date(ts);
    const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!groupsByMonth[mKey]) {
      groupsByMonth[mKey] = [];
    }
    groupsByMonth[mKey].push(order);
  }

  const allCleansed: Order[] = [];

  // For each month, sort chronological (oldest to newest) and assign clean #1, #2, #3
  Object.keys(groupsByMonth).forEach((mKey) => {
    const monthOrders = groupsByMonth[mKey];
    const chronological = [...monthOrders].sort((a, b) => {
      return parseOrderTimestamp(a.date) - parseOrderTimestamp(b.date);
    });

    chronological.forEach((order, index) => {
      allCleansed.push({
        ...order,
        id: `#${index + 1}`,
      });
    });
  });

  return sortOrdersDescending(allCleansed);
};
