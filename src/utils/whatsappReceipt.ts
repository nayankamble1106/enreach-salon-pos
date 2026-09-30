import { Order } from '../types';
import { formatIndianDateTime } from './dateUtils';

export const GOOGLE_REVIEW_URL = 'https://g.page/r/CXUEjEbv1ulJEBM/review';
export const SALON_OWNER_NUMBER = '+91 88067 67186 / +91 70206 78366';

/**
 * Combines all unique staff members involved across items in an order into a clean comma-separated list
 * Example: "Vishal sir, Aman"
 */
export function getUniqueStaffNames(order: Order | null | undefined): string {
  if (!order) return 'Kunal';
  const staffSet = new Set<string>();

  if (Array.isArray(order.items) && order.items.length > 0) {
    order.items.forEach((item) => {
      const name = item.stylistName?.trim();
      if (name) staffSet.add(name);
    });
  }

  if (staffSet.size === 0 && order.staffName) {
    order.staffName.split(',').forEach((s) => {
      const trimmed = s.trim();
      if (trimmed) staffSet.add(trimmed);
    });
  }

  const list = Array.from(staffSet);
  return list.length > 0 ? list.join(', ') : order.staffName || 'Kunal';
}

export function formatWhatsAppReceiptMessage(order: Order): string {
  const clientName = order.clientName?.trim() || 'Valued Client';
  const clientPhone = order.clientPhone?.trim() || 'N/A';
  const staffName = getUniqueStaffNames(order);

  // Format Date and Time in strict Indian Standard Format DD/MM/YYYY | hh:mm AM/PM
  const dateTimeStr = formatIndianDateTime(order.date);

  // Format items list without individual prices as clean bullet points
  const servicesList = order.items
    .map(
      (item) =>
        `• ${item.service.name}${item.quantity > 1 ? ` (x${item.quantity})` : ''}`
    )
    .join('\n');

  // Format payment mode
  const paymentModeMap: Record<string, string> = {
    upi: 'UPI / QR',
    card: 'Card / POS',
    cash: 'Cash',
    'loyalty member pass': 'Loyalty Member Pass',
    'loyalty_pass': 'Loyalty Member Pass',
  };
  const paymentMode =
    paymentModeMap[order.paymentMethod?.toLowerCase()] ||
    (order.paymentMethod === 'Loyalty Member Pass' ? 'Loyalty Member Pass' : order.paymentMethod?.toUpperCase()) ||
    'UPI / QR';

  const notesLine = order.notes ? `📝 *Notes:* ${order.notes}\n` : '';

  // Subtotal and Dynamic Discount
  const subtotalFormatted = order.subtotal.toLocaleString('en-IN');
  const finalAmountFormatted = order.total.toLocaleString('en-IN');

  const discountPercent = order.discountPercentage ?? 0;
  const calculatedDiscount = Math.max(0, Math.round((order.subtotal * discountPercent) / 100));
  const discountAmount = calculatedDiscount > 0 ? calculatedDiscount : Math.max(0, order.subtotal - order.total);

  let discountLine = '';
  if (discountPercent > 0 || discountAmount > 0) {
    const displayPercent = discountPercent > 0 ? discountPercent : (order.subtotal > 0 ? Math.round((discountAmount / order.subtotal) * 100) : 0);
    const discountAmountFormatted = discountAmount.toLocaleString('en-IN');
    discountLine = `🏷️ *Special Discount (${displayPercent}%):* -₹${discountAmountFormatted}\n`;
  }

  return `✨ *ENREACH UNISEX SALON* ✨
_Chandrapur • Hair • Skin • Grooming_ ✂️💇‍♂️💅
━━━━━━━━━━━━━━━━━━━
👤 *Client Name:* ${clientName}
📞 *Mobile:* ${clientPhone}
🗓️ *Date & Time:* ${dateTimeStr}
💈 *Served By:* ${staffName}

━━━━━━━━━━━━━━━━━━━
🛍️ *SERVICES RENDERED:*
${servicesList}

━━━━━━━━━━━━━━━━━━━
📊 *BILL SUMMARY:*
💵 *Subtotal:* ₹${subtotalFormatted}
${discountLine}💰 *Final Amount Paid:* ₹${finalAmountFormatted}
💳 *Payment Mode:* ${paymentMode}
${notesLine}

━━━━━━━━━━━━━━━━━━━
⭐ *RATE YOUR EXPERIENCE:*
We would love your feedback! Please take a quick moment to leave us a 5-star review on Google:
👉 ${GOOGLE_REVIEW_URL}

📞 *For Appointments & Inquiries:*
Salon Owner / Manager: ${SALON_OWNER_NUMBER}

Thank you for visiting Enreach Unisex Salon! We look forward to serving you again. ✨💇‍♀️💇‍♂️
━━━━━━━━━━━━━━━━━━━`;
}

export function getWhatsAppReceiptUrl(order: Order): string {
  const message = formatWhatsAppReceiptMessage(order);
  const encodedText = encodeURIComponent(message);

  const cleanPhone = (order.clientPhone || '').replace(/\D/g, '');

  // If standard 10 digit Indian number without country code
  let targetPhone = '';
  if (cleanPhone.length === 10) {
    targetPhone = `91${cleanPhone}`;
  } else if (cleanPhone.length > 10 && cleanPhone.startsWith('91')) {
    targetPhone = cleanPhone;
  } else if (cleanPhone.length > 6) {
    targetPhone = cleanPhone;
  }

  if (targetPhone && !targetPhone.startsWith('910000000000')) {
    return `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`;
  }

  return `https://api.whatsapp.com/send?text=${encodedText}`;
}
