/**
 * Indian Standard Date Utilities (DD/MM/YYYY)
 */

/**
 * Pads a number to 2 digits
 */
const pad2 = (n: number): string => n.toString().padStart(2, '0');

/**
 * Robustly parses various date formats into a timestamp.
 * Supports:
 * - DD/MM/YYYY or DD/MM/YYYY | hh:mm A
 * - YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
 * - Timestamps or Date objects
 */
export function parseDateToTimestamp(input: string | number | Date | undefined | null): number {
  if (!input) return Date.now();
  if (input instanceof Date) return input.getTime();
  if (typeof input === 'number') return input;

  const str = input.trim();

  // Match DD/MM/YYYY or DD-MM-YYYY (with optional time)
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[\s,|T]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM|am|pm))?)?/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
    const year = parseInt(ddmmyyyyMatch[3], 10);
    let hour = ddmmyyyyMatch[4] ? parseInt(ddmmyyyyMatch[4], 10) : 0;
    const minute = ddmmyyyyMatch[5] ? parseInt(ddmmyyyyMatch[5], 10) : 0;
    const second = ddmmyyyyMatch[6] ? parseInt(ddmmyyyyMatch[6], 10) : 0;
    const ampm = ddmmyyyyMatch[7] ? ddmmyyyyMatch[7].toUpperCase() : null;

    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    const d = new Date(year, month, day, hour, minute, second);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // Match YYYY-MM-DD or YYYY/MM/DD
  const yyyymmddMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[\s,|T]+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM|am|pm))?)?/);
  if (yyyymmddMatch) {
    const year = parseInt(yyyymmddMatch[1], 10);
    const month = parseInt(yyyymmddMatch[2], 10) - 1;
    const day = parseInt(yyyymmddMatch[3], 10);
    let hour = yyyymmddMatch[4] ? parseInt(yyyymmddMatch[4], 10) : 0;
    const minute = yyyymmddMatch[5] ? parseInt(yyyymmddMatch[5], 10) : 0;
    const second = yyyymmddMatch[6] ? parseInt(yyyymmddMatch[6], 10) : 0;
    const ampm = yyyymmddMatch[7] ? yyyymmddMatch[7].toUpperCase() : null;

    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    const d = new Date(year, month, day, hour, minute, second);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  const standardParsed = new Date(str);
  if (!isNaN(standardParsed.getTime())) {
    return standardParsed.getTime();
  }

  return Date.now();
}

/**
 * Converts any date into strict Indian Standard Format: DD/MM/YYYY (e.g. 25/09/2026)
 */
export function formatIndianDate(input: string | number | Date | undefined | null): string {
  if (!input) {
    const now = new Date();
    return `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()}`;
  }

  // If already strict DD/MM/YYYY
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }
  }

  const ts = parseDateToTimestamp(input);
  const d = new Date(ts);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * Converts any date into Indian Standard Format with Time: DD/MM/YYYY | hh:mm AM/PM
 * Example: 25/09/2026 | 11:30 AM
 */
export function formatIndianDateTime(input: string | number | Date | undefined | null): string {
  const ts = parseDateToTimestamp(input);
  const d = new Date(ts);

  const datePart = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  let hours = d.getHours();
  const minutes = pad2(d.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 hour is 12 AM
  const timePart = `${pad2(hours)}:${minutes} ${ampm}`;

  return `${datePart} | ${timePart}`;
}

/**
 * Returns today's date in DD/MM/YYYY
 */
export function getTodayIndianDate(): string {
  return formatIndianDate(new Date());
}

/**
 * Returns date N days from now in DD/MM/YYYY
 */
export function getFutureIndianDate(daysToAdd: number): string {
  const now = new Date();
  const future = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  return formatIndianDate(future);
}

/**
 * Calculates start and end timestamps for the 4 standard timeframes:
 * 1. Today's Sales: Strictly from TODAY at 12:00 AM (00:00:00) to now/end of day
 * 2. Weekly Sales: From Monday at 12:00 AM of current week to now
 * 3. Monthly Sales: Strictly from 1st day of current month (00:00:00) to now
 * 4. Yearly Sales: Strictly from Jan 1st of current calendar year (00:00:00) to now
 */
export function getTimeframeBounds(timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly', refDate = new Date()): { start: number; end: number } {
  const now = new Date(refDate);
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();

  if (timeframe === 'daily') {
    const startOfDay = new Date(year, month, date, 0, 0, 0, 0).getTime();
    const endOfDay = new Date(year, month, date, 23, 59, 59, 999).getTime();
    return { start: startOfDay, end: Math.max(endOfDay, now.getTime()) };
  }

  if (timeframe === 'weekly') {
    // Current week starting from Monday 00:00:00
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // distance to Monday
    const monday = new Date(year, month, date - diffToMonday, 0, 0, 0, 0);
    const endOfWeek = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    return { start: monday.getTime(), end: Math.max(endOfWeek.getTime(), now.getTime()) };
  }

  if (timeframe === 'monthly') {
    // 1st of current month at 00:00:00 to end of month
    const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0).getTime();
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
    return { start: startOfMonth, end: Math.max(endOfMonth, now.getTime()) };
  }

  // Yearly: Jan 1st 00:00:00 of current calendar year to Dec 31st 23:59:59
  const startOfYear = new Date(year, 0, 1, 0, 0, 0, 0).getTime();
  const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
  return { start: startOfYear, end: Math.max(endOfYear, now.getTime()) };
}
