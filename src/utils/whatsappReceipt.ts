import { Order } from '../types';
import { formatIndianDateTime } from './dateUtils';

export const GOOGLE_REVIEW_URL = 'https://g.page/r/CXUEjEbv1ulJEBM/review';
export const SALON_OWNER_NUMBER = '+91 88067 67186';

export function formatWhatsAppReceiptMessage(order: Order): string {
  const clientName = order.clientName?.trim() || 'Valued Client';
  const clientPhone = order.clientPhone?.trim() || 'N/A';
  const staffName = order.staffName || 'Kunal';

  // Format Date and Time in strict Indian Standard Format DD/MM/YYYY | hh:mm AM/PM
  const dateTimeStr = formatIndianDateTime(order.date);

  // Format items list
  const servicesList = order.items
    .map(
      (item) =>
        `• ${item.service.name}${item.quantity > 1 ? ` (x${item.quantity})` : ''} - ₹${(
          item.service.price * item.quantity
        ).toLocaleString('en-IN')}`
    )
    .join('\n');

  // Format payment mode
  const paymentModeMap: Record<string, string> = {
    upi: 'UPI / QR',
    card: 'Card / POS',
    cash: 'Cash',
  };
  const paymentMode = paymentModeMap[order.paymentMethod?.toLowerCase()] || order.paymentMethod?.toUpperCase() || 'UPI';

  // Subtotal and Dynamic Discount
  const subtotalFormatted = order.subtotal.toLocaleString('en-IN');
  const finalAmountFormatted = order.total.toLocaleString('en-IN');

  const discountPercent = order.discountPercentage ?? 0;
  let discountLine = '';
  if (discountPercent > 0) {
    const discountAmount = Math.max(0, Math.round((order.subtotal * discountPercent) / 100));
    const discountAmountFormatted = discountAmount.toLocaleString('en-IN');
    if (order.isMember) {
      discountLine = `⭐ *VIP Member Discount (${discountPercent}%):* -₹${discountAmountFormatted}\n`;
    } else {
      discountLine = `🏷️ *Special Discount (${discountPercent}%):* -₹${discountAmountFormatted}\n`;
    }
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
