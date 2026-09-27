import React, { useState } from 'react';
import { Order, SalonSettings } from '../types';
import { X, Printer, Sparkles, MessageCircle, Copy, Check, Star } from 'lucide-react';
import { getWhatsAppReceiptUrl, formatWhatsAppReceiptMessage, GOOGLE_REVIEW_URL, SALON_OWNER_NUMBER } from '../utils/whatsappReceipt';
import { formatIndianDateTime } from '../utils/dateUtils';

interface ReceiptModalProps {
  order: Order | null;
  onClose: () => void;
  settings: SalonSettings;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose, settings }) => {
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand & Receipt Header */}
        <div className="text-center pb-4 border-b border-dashed border-slate-200">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.salonName}
              className="w-12 h-12 rounded-xl object-cover mx-auto mb-2 border border-slate-200 shadow-xs"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-amber-700 mx-auto flex items-center justify-center text-white mb-2 shadow-sm">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
          )}
          <h3 className="font-bold text-lg text-slate-900">{settings.salonName}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{settings.address || 'Chandrapur • Hair • Skin • Grooming'}</p>
          <p className="text-[11px] text-slate-400">Owner Contact: {SALON_OWNER_NUMBER}</p>
        </div>

        {/* Invoice Metadata */}
        <div className="py-3 text-xs border-b border-dashed border-slate-200 space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Invoice No:</span>
            <span className="font-bold text-slate-800">{order.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Date & Time:</span>
            <span className="text-slate-800 font-medium">{formatIndianDateTime(order.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Client:</span>
            <span className="font-semibold text-slate-800">{order.clientName} ({order.clientPhone})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Served By:</span>
            <span className="font-semibold text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
              {order.staffName || 'Kunal'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Payment:</span>
            <span className="uppercase font-semibold text-slate-800">{order.paymentMethod}</span>
          </div>
          {order.discountPercentage !== undefined && order.discountPercentage > 0 ? (
            <div className="flex justify-between items-center pt-0.5">
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                {order.isMember ? (
                  <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                ) : (
                  <span className="text-xs">🏷️</span>
                )}
                {order.isMember ? 'VIP Member Discount:' : 'Special Discount:'}
              </span>
              <span className="text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                {order.discountPercentage}% Off (-₹{Math.max(0, Math.round((order.subtotal * order.discountPercentage) / 100)).toLocaleString('en-IN')})
              </span>
            </div>
          ) : null}
        </div>


        {/* Items Table */}
        <div className="py-3 border-b border-dashed border-slate-200 space-y-2">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs">
              <div className="flex-1 pr-2">
                <p className="font-medium text-slate-800">{item.service.name}</p>
                <p className="text-[10px] text-slate-400">
                  {item.quantity} x {settings.currencySymbol}{item.service.price}
                </p>
              </div>
              <span className="font-semibold text-slate-900">
                {settings.currencySymbol}{(item.service.price * item.quantity).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>

        {/* Breakdown (GST completely removed) */}
        <div className="py-3 border-b border-slate-200 text-xs space-y-1.5">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{settings.currencySymbol}{order.subtotal.toLocaleString('en-IN')}</span>
          </div>
          {order.discountPercentage !== undefined && order.discountPercentage > 0 ? (
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>
                {order.isMember ? '⭐ VIP Member Discount' : '🏷️ Special Discount'} ({order.discountPercentage}%)
              </span>
              <span>
                -{settings.currencySymbol}
                {Math.max(0, Math.round((order.subtotal * order.discountPercentage) / 100)).toLocaleString('en-IN')}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-100">
            <span>Total Paid</span>
            <span>{settings.currencySymbol}{order.total.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Official Google Review Card Link */}
        <div className="my-3 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex-1 min-w-0">
            <span className="font-bold text-amber-950 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              <span>Official Google Review</span>
            </span>
            <p className="text-[11px] text-amber-800 truncate">
              {GOOGLE_REVIEW_URL}
            </p>
          </div>
          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 text-[11px] font-bold bg-amber-700 hover:bg-amber-800 text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs"
          >
            Review Link
          </a>
        </div>

        {/* WhatsApp Send Action Button */}
        <div className="space-y-2 pt-1">
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
        </div>

        <div className="pt-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

