import React, { useState } from 'react';
import { Order, SalonSettings } from '../types';
import { X, Printer, MessageCircle, Copy, Check, Star, FileText } from 'lucide-react';
import {
  getWhatsAppReceiptUrl,
  formatWhatsAppReceiptMessage,
  getUniqueStaffNames,
  GOOGLE_REVIEW_URL,
  SALON_OWNER_NUMBER,
} from '../utils/whatsappReceipt';
import { formatIndianDateTime } from '../utils/dateUtils';

interface ReceiptModalProps {
  order: Order | null;
  onClose: () => void;
  settings: SalonSettings;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose, settings }) => {
  const [copied, setCopied] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const whatsappUrl = getWhatsAppReceiptUrl(order);
  const whatsappMessage = formatWhatsAppReceiptMessage(order);

  const handleCopyMessage = () => {
    navigator.clipboard?.writeText(whatsappMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const paymentModeMap: Record<string, string> = {
    upi: 'UPI / QR',
    card: 'Card / POS',
    cash: 'Cash',
    'loyalty member pass': 'Loyalty Member Pass',
    'loyalty_pass': 'Loyalty Member Pass',
  };
  const paymentMode =
    paymentModeMap[order.paymentMethod?.toLowerCase()] ||
    (order.paymentMethod === 'Loyalty Member Pass' ? 'Loyalty Member Pass' : order.paymentMethod) ||
    'UPI / QR';

  const discountPercent = order.discountPercentage ?? 0;
  const calculatedDiscount = Math.max(0, Math.round((order.subtotal * discountPercent) / 100));
  const discountAmount = calculatedDiscount > 0 ? calculatedDiscount : Math.max(0, order.subtotal - order.total);
  const displayDiscountPercent =
    discountPercent > 0
      ? discountPercent
      : order.subtotal > 0
      ? Math.round((discountAmount / order.subtotal) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div
        id="printable-receipt"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          className="no-print absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand & Receipt Header */}
        <div className="text-center pb-3 border-b border-dashed border-slate-200">
          <img
            src={settings.logoUrl || '/salon-logo.jpg'}
            alt={settings.salonName}
            className="w-12 h-12 rounded-xl object-contain mx-auto mb-2 border border-slate-200 shadow-xs bg-white"
          />
          <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-wide">
            ✨ ENREACH UNISEX SALON ✨
          </h3>
          <p className="text-xs text-slate-600 italic mt-0.5">
            Chandrapur • Hair • Skin • Grooming ✂️💇‍♂️💅
          </p>
        </div>

        {/* Toggle between Structured Card View and Exact Text View */}
        <div className="no-print flex items-center justify-end pt-2 pb-1">
          <button
            type="button"
            onClick={() => setShowRawText(!showRawText)}
            className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 transition-colors"
          >
            <FileText className="w-3 h-3 text-amber-700" />
            <span>{showRawText ? 'Switch to Card View' : 'View WhatsApp Receipt Preview'}</span>
          </button>
        </div>

        {showRawText ? (
          /* Exact WhatsApp Raw Text View */
          <div className="my-2 p-3.5 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-all shadow-inner border border-slate-800 max-h-80 overflow-y-auto">
            {whatsappMessage}
          </div>
        ) : (
          /* Exact Receipt Structure Popup */
          <div>
            {/* Metadata Section */}
            <div className="py-2.5 text-xs border-b border-dashed border-slate-200 space-y-1 text-slate-800">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-700">👤 Client Name:</span>
                <span className="font-bold text-slate-900">{order.clientName || 'Valued Client'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-700">📞 Mobile:</span>
                <span className="font-medium text-slate-800">{order.clientPhone || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-700">🗓️ Date &amp; Time:</span>
                <span className="font-medium text-slate-800">{formatIndianDateTime(order.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-700">💈 Served By:</span>
                <span className="font-bold text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  {getUniqueStaffNames(order)}
                </span>
              </div>
            </div>

            {/* SERVICES RENDERED: Strictly Clean Bullet Points Without Individual Prices */}
            <div className="py-3 border-b border-dashed border-slate-200">
              <p className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>🛍️</span>
                <span>SERVICES RENDERED:</span>
              </p>
              <div className="space-y-1.5 text-xs">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-slate-800">
                    <span className="text-amber-700 font-black">•</span>
                    <span className="font-semibold text-slate-900">
                      {item.service.name}
                      {item.quantity > 1 ? ` (x${item.quantity})` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* BILL SUMMARY */}
            <div className="py-3 border-b border-dashed border-slate-200 text-xs space-y-1.5 text-slate-800">
              <p className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>📊</span>
                <span>BILL SUMMARY:</span>
              </p>

              <div className="flex justify-between items-center text-slate-700">
                <span className="flex items-center gap-1.5 font-semibold">
                  <span>💵</span>
                  <span>Subtotal:</span>
                </span>
                <span className="font-bold text-slate-900">
                  {settings.currencySymbol}
                  {order.subtotal.toLocaleString('en-IN')}
                </span>
              </div>

              {(discountAmount > 0 || discountPercent > 0) && (
                <div className="flex justify-between items-center text-emerald-700 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span>🏷️</span>
                    <span>Special Discount ({displayDiscountPercent}%):</span>
                  </span>
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    -{settings.currencySymbol}
                    {discountAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 text-slate-900">
                <span className="flex items-center gap-1.5 font-extrabold text-sm">
                  <span>💰</span>
                  <span>Final Amount Paid:</span>
                </span>
                <span className="text-lg font-black text-amber-950">
                  {settings.currencySymbol}
                  {order.total.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-700 pt-0.5">
                <span className="flex items-center gap-1.5 font-semibold">
                  <span>💳</span>
                  <span>Payment Mode:</span>
                </span>
                <span className="font-bold text-slate-900">{paymentMode}</span>
              </div>

              {order.notes && (
                <div className="flex justify-between items-center text-slate-700 pt-0.5">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span>📝</span>
                    <span>Notes:</span>
                  </span>
                  <span className="font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {order.notes}
                  </span>
                </div>
              )}
            </div>

            {/* RATE YOUR EXPERIENCE */}
            <div className="py-3 border-b border-dashed border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>RATE YOUR EXPERIENCE:</span>
                </span>
                <a
                  href={GOOGLE_REVIEW_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-0.5 text-[11px] font-bold bg-amber-700 hover:bg-amber-800 text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
                >
                  5★ Google Review
                </a>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                We would love your feedback! Please take a quick moment to leave us a 5-star review on Google:
              </p>
              <p className="text-[11px] text-amber-800 font-mono truncate">👉 {GOOGLE_REVIEW_URL}</p>
            </div>

            {/* FOR APPOINTMENTS & INQUIRIES */}
            <div className="py-2.5 text-center text-xs text-slate-700 space-y-1">
              <p className="font-bold text-slate-900">📞 For Appointments &amp; Inquiries:</p>
              <p className="text-[11px] font-semibold text-slate-800">
                Salon Owner / Manager: +91 88067 67186 / +91 70206 78366
              </p>
              <p className="text-[11px] text-slate-500 italic pt-1">
                Thank you for visiting Enreach Unisex Salon! We look forward to serving you again. ✨💇‍♀️💇‍♂️
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="no-print space-y-2 pt-3 border-t border-slate-200">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer ring-1 ring-emerald-500/50"
          >
            <MessageCircle className="w-4 h-4 fill-slate-950 text-slate-950" />
            <span>Send Receipt on WhatsApp</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied Text!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy WhatsApp Text</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Receipt</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer mt-1"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
