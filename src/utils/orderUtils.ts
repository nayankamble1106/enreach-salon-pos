import { Order } from '../types';
import { parseDateToTimestamp } from './dateUtils';

/**
 * Extracts numeric sequence from order ID like "#1", "#1000", "ORD-123", or "5"
 */
export const parseOrderSequence = (id: string): number => {
  if (!id) return 0;
  const match = id.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

/**
 * Robust date parser for orders
 */
export const parseOrderTimestamp = (dateStr: string): number => {
  return parseDateToTimestamp(dateStr);
};

/**
 * Calculates the next sequential order number (e.g. "#1", "#2", ..., "#1000")
 */
export const getNextOrderNumber = (orders: Order[]): string => {
  if (!orders || orders.length === 0) {
    return '#1';
  }

  let maxNumber = 0;
  for (const order of orders) {
    const num = parseOrderSequence(order.id);
    if (num > maxNumber) {
      maxNumber = num;
    }
  }

  return `#${maxNumber + 1}`;
};

/**
 * Sorts orders in descending order so the latest/newest invoice (e.g. #1000)
 * always appears at the very top, and older bills (#1) remain at the bottom.
 */
export const sortOrdersDescending = (orders: Order[]): Order[] => {
  return [...orders].sort((a, b) => {
    const seqA = parseOrderSequence(a.id);
    const seqB = parseOrderSequence(b.id);
    if (seqA !== seqB) {
      return seqB - seqA; // Descending: #1000, #999, ..., #1
    }
    return parseOrderTimestamp(b.date) - parseOrderTimestamp(a.date);
  });
};

/**
 * Migrates any legacy ORD-xxxx IDs into sequential #1..#N IDs
 */
export const migrateOrdersToSequential = (orders: Order[]): Order[] => {
  if (!orders || orders.length === 0) return [];

  const hasLegacyOrd = orders.some((o) => o.id && (o.id.startsWith('ORD-') || ['#9166', '#9169', '#9170', 'ORD-7793'].includes(o.id)));
  if (!hasLegacyOrd) {
    return sortOrdersDescending(orders);
  }

  // Purge fake orders
  const cleansed = orders.filter((o) => !['#9166', '#9169', '#9170', 'ORD-7793'].includes(o.id));
  if (cleansed.length === 0) return [];

  // Sort chronological (oldest to newest) to assign #1, #2, #3...
  const chronological = [...cleansed].sort((a, b) => {
    return parseOrderTimestamp(a.date) - parseOrderTimestamp(b.date);
  });

  const migrated = chronological.map((order, index) => ({
    ...order,
    id: `#${index + 1}`,
  }));

  return sortOrdersDescending(migrated);
};

