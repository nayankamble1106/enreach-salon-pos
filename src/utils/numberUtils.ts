/**
 * Number Input Sanitization Utilities
 * Solves Issue 1: Erasing values leaves stuck '0', and typing creates unwanted '01', '05' prefixes.
 */

/**
 * Sanitizes numeric string input from onChange events:
 * - Allows completely empty string "" (for seamless backspacing/clearing of every digit)
 * - Automatically strips unwanted leading zeros (e.g., "05" -> "5", "0523" -> "523")
 * - Preserves single "0" if user explicitly types 0
 * - Handles optional decimals (e.g., "0.5", "100.50")
 * 
 * @param val Raw input string from event target
 * @param allowDecimals Whether floating point numbers are allowed
 */
export function cleanNumberInput(val: string, allowDecimals = false): string {
  if (val === undefined || val === null || val === '') {
    return '';
  }

  // Remove unwanted non-numeric characters (allow decimal point if requested)
  let cleaned = allowDecimals
    ? val.replace(/[^0-9.]/g, '')
    : val.replace(/[^0-9]/g, '');

  // If allowDecimals is true, ensure only one decimal point exists
  if (allowDecimals && cleaned.includes('.')) {
    const parts = cleaned.split('.');
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }

  // If string has leading zeros followed by non-zero digits (e.g. "01", "05", "0523"), strip leading zeros
  if (/^0+[1-9]/.test(cleaned)) {
    cleaned = cleaned.replace(/^0+/, '');
  } else if (/^0{2,}$/.test(cleaned)) {
    // If user types multiple zeros "000", reduce to single "0"
    cleaned = '0';
  }

  return cleaned;
}

/**
 * Safely parses a string input into a number for calculations/saving.
 * Returns fallback (default 0) when input is empty string or invalid.
 */
export function parseSafeNumber(val: string | number | undefined | null, fallback = 0): number {
  if (val === undefined || val === null || val === '') {
    return fallback;
  }
  if (typeof val === 'number') {
    return isNaN(val) ? fallback : val;
  }
  const parsed = parseFloat(val);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Safely parses an integer input.
 */
export function parseSafeInt(val: string | number | undefined | null, fallback = 0): number {
  if (val === undefined || val === null || val === '') {
    return fallback;
  }
  if (typeof val === 'number') {
    return isNaN(val) ? fallback : Math.floor(val);
  }
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? fallback : parsed;
}
