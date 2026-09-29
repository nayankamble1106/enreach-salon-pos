import React, { useState, useEffect, useMemo } from 'react';
import { CartItem, Order, MembershipRecord } from '../types';
import { Trash2, Plus, Minus, CreditCard, Banknote, QrCode, CheckCircle, User, Phone, Sparkles, Star, Calendar, Clock } from 'lucide-react';
import { getNextOrderNumber } from '../utils/orderUtils';
import { formatIndianDate, formatIndianDateTime } from '../utils/dateUtils';

interface OrderSummaryTabProps {
  cartItems: CartItem[];
  onUpdateQuantity: (serviceId: string, delta: number) => void;
  onRemoveItem: (serviceId: string) => void;
  onClearCart: () => void;
  onCompleteOrder: (order: Order) => void;
  taxRate: number;
  currencySymbol: string;
  onExploreServices: () => void;
  selectedStaff?: string;
  onSelectStaff?: (staff: string) => void;
  staffList?: string[];
  existingOrders?: Order[];
  nextOrderNumber?: string;
  memberships?: MembershipRecord[];
}

const DEFAULT_STAFF_NAMES = [
  'Kunal',
  'Mashuk',
  'Vishal Thakur',
  'Sapna',
  'Juhi',
  'Vishal sir',
];

export const OrderSummaryTab: React.FC<OrderSummaryTabProps> = ({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCompleteOrder,
  currencySymbol,
  onExploreServices,
  selectedStaff: externalSelectedStaff,
  onSelectStaff: externalOnSelectStaff,
  staffList = DEFAULT_STAFF_NAMES,
  existingOrders = [],
  nextOrderNumber,
  memberships = [],
}) => {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [isMember, setIsMember] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('upi');
  const [internalStaff, setInternalStaff] = useState('Kunal');
  const [lastAutoDetectedPhone, setLastAutoDetectedPhone] = useState<string | null>(null);

  // Helper to normalize phone numbers for comparison
  const normalizeDigits = (p: string) => p.replace(/\D/g, '');

  // Calculate days remaining out of 365
  const calculateDaysRemaining = (expiryDateStr: string): number => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(expiryDateStr);
      expiry.setHours(0, 0, 0, 0);
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    } catch {
      return 365;
    }
  };

  // Automatically detect if entered phone matches an active membership record
  const detectedExistingMember = useMemo(() => {
    const cleanEntered = normalizeDigits(clientPhone);
    if (!cleanEntered || cleanEntered.length < 5) return null;
    return (
      memberships.find((m) => {
        const cleanTarget = normalizeDigits(m.clientPhone);
        return (
          cleanTarget &&
          (cleanTarget === cleanEntered ||
            cleanTarget.endsWith(cleanEntered) ||
            cleanEntered.endsWith(cleanTarget))
        );
      }) || null
    );
  }, [clientPhone, memberships]);

  // When a registered member's number is typed, automatically activate VIP membership status and autofill name if empty
  useEffect(() => {
    if (detectedExistingMember && lastAutoDetectedPhone !== detectedExistingMember.clientPhone) {
      setIsMember(true);
      if (!clientName.trim() && detectedExistingMember.clientName) {
        setClientName(detectedExistingMember.clientName);
      }
      setLastAutoDetectedPhone(detectedExistingMember.clientPhone);
    }
  }, [detectedExistingMember, lastAutoDetectedPhone, clientName]);

  // Active Membership Details for the Live Info Card
  const activeMembershipInfo = useMemo(() => {
    if (detectedExistingMember) {
      return {
        startDate: formatIndianDate(detectedExistingMember.startDate),
        expiryDate: formatIndianDate(detectedExistingMember.expiryDate),
        daysRemaining: calculateDaysRemaining(detectedExistingMember.expiryDate),
        isExistingRecord: true,
      };
    }
    if (isMember) {
      const today = new Date();
      const expiry = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000);
      return {
        startDate: formatIndianDate(today),
        expiryDate: formatIndianDate(expiry),
        daysRemaining: 365,
        isExistingRecord: false,
      };
    }
    return null;
  }, [detectedExistingMember, isMember]);


  const activeStaff = externalSelectedStaff || internalStaff;
  const handleStaffChange = (val: string) => {
    if (externalOnSelectStaff) {
      externalOnSelectStaff(val);
    } else {
      setInternalStaff(val);
    }
  };

  const invoiceNumber = nextOrderNumber || getNextOrderNumber(existingOrders);

  // VIP Member Discount percentage input (defaults to 0% as required)
  const [discountPercentInput, setDiscountPercentInput] = useState<string>('0');

  // Parse numeric discount percentage
  const enteredDiscountNumber = useMemo(() => {
    if (!discountPercentInput.trim()) return 0;
    const n = Number(discountPercentInput);
    if (isNaN(n)) return 0;
    return Math.max(0, Math.min(100, n));
  }, [discountPercentInput]);

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.service.price * item.quantity, 0);
  }, [cartItems]);

  const calculatedDiscountAmount = useMemo(() => {
    return enteredDiscountNumber > 0 ? Math.round((subtotal * enteredDiscountNumber) / 100) : 0;
  }, [subtotal, enteredDiscountNumber]);

  const calculatedTargetPayable = Math.max(0, subtotal - calculatedDiscountAmount);

  // Editable Final Amount Due state
  const [customFinalAmount, setCustomFinalAmount] = useState<string>('');
  const [isCustomEdited, setIsCustomEdited] = useState(false);

  // Automatically update Final Amount Due when target subtotal changes, unless manually overridden
  useEffect(() => {
    if (!isCustomEdited) {
      setCustomFinalAmount(calculatedTargetPayable.toString());
    }
  }, [calculatedTargetPayable, isCustomEdited]);

  // When user updates discount percentage input, recalculate target subtotal immediately
  const handleDiscountPercentChange = (newVal: string) => {
    setDiscountPercentInput(newVal);
    const n = Number(newVal);
    const validNum = !isNaN(n) ? Math.max(0, Math.min(100, n)) : 0;
    const newDiscAmt = validNum > 0 ? Math.round((subtotal * validNum) / 100) : 0;
    const newTarget = Math.max(0, subtotal - newDiscAmt);
    setIsCustomEdited(false);
    setCustomFinalAmount(newTarget.toString());
  };

  const activeFinalAmount = isCustomEdited && customFinalAmount !== ''
    ? Math.max(0, Number(customFinalAmount) || 0)
    : calculatedTargetPayable;

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    const newOrder: Order = {
      id: invoiceNumber,
      clientName: clientName.trim() || 'Walk-in Client',
      clientPhone: clientPhone.trim() || '+91 98000 00000',
      isMember,
      discountPercentage: enteredDiscountNumber,
      items: [...cartItems],
      subtotal,
      tax: 0,
      total: activeFinalAmount,
      paymentMethod,
      staffName: activeStaff,
      date: formatIndianDateTime(new Date()),
    };

    // Execute instant Firebase Realtime Database sync synchronously BEFORE UI resets
    if (typeof window !== 'undefined' && window.salonFirebase) {
      window.salonFirebase.syncOrder(newOrder);
    }

    onCompleteOrder(newOrder);
  };

  if (cartItems.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Your Cart is Currently Empty</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          Add hair treatments, styling, grooming, or luxury facial rituals from the services catalog to begin billing.
        </p>
        <button
          type="button"
          onClick={onExploreServices}
          className="mt-6 px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-all cursor-pointer shadow-xs"
        >
          Browse Services Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Cart items list */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Services in Cart</h2>
              <p className="text-xs text-slate-500">
                {cartItems.reduce((acc, i) => acc + i.quantity, 0)} services selected
              </p>
            </div>
            <button
              type="button"
              onClick={onClearCart}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {cartItems.map((item) => (
              <div key={item.service.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900 text-sm truncate">{item.service.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>{currencySymbol}{item.service.price.toLocaleString('en-IN')} each</span>
                    <span>•</span>
                    <span className="text-amber-800 font-medium">Stylist: {item.stylistName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.service.id, -1)}
                      className="px-2 py-1 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2.5 py-1 text-xs font-bold text-slate-800 bg-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.service.id, 1)}
                      className="px-2 py-1 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-bold text-sm text-slate-900 min-w-[70px] text-right">
                    {currencySymbol}{(item.service.price * item.quantity).toLocaleString('en-IN')}
                  </span>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.service.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onExploreServices}
          className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1.5 pl-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add more services from catalog</span>
        </button>
      </div>

      {/* Right: Client details & Final Checkout */}
      <div className="lg:col-span-5">
        <form onSubmit={handleCheckout} className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">Billing & Payment</h3>
            <p className="text-xs text-slate-500">Provide client info and allocate staff member</p>
          </div>

          {/* Served By / Select Staff Dropdown */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1.5">
            <label htmlFor="billing-staff-select" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
              <User className="w-3.5 h-3.5 text-amber-700" />
              <span>Served By / Select Staff</span>
            </label>
            <select
              id="billing-staff-select"
              value={activeStaff}
              onChange={(e) => handleStaffChange(e.target.value)}
              className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
            >
              {staffList.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-amber-800/80">
              This invoice will be credited to {activeStaff}&apos;s monthly performance total.
            </p>
          </div>

          {/* Client Details */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Client Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Aditya Mehta"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Client Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="e.g. +91 98201 44521"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>

            {/* Enreach Member Button (Removed old checkbox/toggle, styled identical to Payment Method buttons) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Client Membership
              </label>
              <button
                type="button"
                onClick={() => setIsMember(!isMember)}
                className={`w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                  isMember
                    ? 'bg-emerald-500 text-slate-950 font-black border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.55)] ring-2 ring-emerald-400/80 scale-[1.01]'
                    : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-850 hover:text-white hover:border-slate-700 shadow-xs'
                }`}
              >
                <Star
                  className={`w-4 h-4 ${
                    isMember
                      ? 'text-slate-950 fill-slate-950'
                      : 'text-amber-400 fill-amber-400/40'
                  }`}
                />
                <span className="tracking-wide">Enreach Member</span>
                {isMember ? (
                  <span className="text-[10px] bg-slate-950/20 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                    Active (1-Year)
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-normal">
                    (Click to Activate 365 Days)
                  </span>
                )}
              </button>
              {isMember && (
                <p className="text-[11px] text-emerald-700 font-medium mt-1.5 flex items-center gap-1">
                  <span>✓ 1-Year (365 Days) Membership Active (Enter VIP discount % below)</span>
                </p>
              )}
            </div>

            {/* Sleek, Compact Active Membership Status Info Card */}
            {activeMembershipInfo && (
              <div className="p-3.5 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-xl border border-emerald-500/50 shadow-md space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                      Active Membership Status
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-400 text-slate-950 shadow-xs flex items-center gap-1">
                    <span>🟢</span>
                    <span>{activeMembershipInfo.daysRemaining} Days Left</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-slate-800">
                  <div className="bg-slate-800/80 px-2.5 py-2 rounded-lg border border-slate-700/60">
                    <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-emerald-400" />
                      Started On
                    </span>
                    <span className="font-bold text-slate-100 text-xs mt-1 block">
                      📅 {activeMembershipInfo.startDate}
                    </span>
                  </div>

                  <div className="bg-slate-800/80 px-2.5 py-2 rounded-lg border border-slate-700/60">
                    <span className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      Expires On
                    </span>
                    <span className="font-bold text-slate-100 text-xs mt-1 block">
                      ⏳ {activeMembershipInfo.expiryDate}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <span className="text-slate-300 flex items-center gap-1">
                    <span>🟢 Days Remaining:</span>
                    <strong className="text-emerald-400 font-extrabold">{activeMembershipInfo.daysRemaining} Days Left</strong>
                    <span className="text-slate-500 text-[10px]">(out of 365)</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    {enteredDiscountNumber > 0 ? `${enteredDiscountNumber}% VIP Applied` : '0% Discount (Default)'}
                  </span>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(5, (activeMembershipInfo.daysRemaining / 365) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Discount Percentage Input (Defaults to 0%, manual override enabled) */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="vip-discount-input" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  {isMember ? (
                    <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                  ) : (
                    <span className="text-xs">🏷️</span>
                  )}
                  <span>{isMember ? 'VIP Member Discount (%)' : 'Special Discount (%)'}</span>
                </label>
                {enteredDiscountNumber > 0 ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200">
                    -{currencySymbol}{calculatedDiscountAmount.toLocaleString('en-IN')} ({enteredDiscountNumber}%)
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium">0% (Default - No Discount)</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    id="vip-discount-input"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={discountPercentInput}
                    onChange={(e) => handleDiscountPercentChange(e.target.value)}
                    placeholder="0"
                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-xs"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">
                    %
                  </span>
                </div>

                {/* Quick Presets (0%, 5%, 10%, 15%, 20%) */}
                <div className="flex items-center gap-1">
                  {[0, 5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleDiscountPercentChange(pct.toString())}
                      className={`px-2 py-1.5 sm:px-2.5 sm:py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        enteredDiscountNumber === pct
                          ? 'bg-amber-700 text-white border-amber-700 shadow-xs ring-1 ring-amber-500'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Enter any custom discount percentage (e.g., 5%, 10%, 15%). The target subtotal recalculates automatically.
              </p>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  paymentMethod === 'upi'
                    ? 'border-amber-700 bg-amber-50 text-amber-950 font-bold shadow-xs ring-1 ring-amber-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <QrCode className="w-4 h-4 mb-1 text-amber-700" />
                <span>UPI / QR</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  paymentMethod === 'card'
                    ? 'border-amber-700 bg-amber-50 text-amber-950 font-bold shadow-xs ring-1 ring-amber-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <CreditCard className="w-4 h-4 mb-1 text-amber-700" />
                <span>Card / POS</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'border-amber-700 bg-amber-50 text-amber-950 font-bold shadow-xs ring-1 ring-amber-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <Banknote className="w-4 h-4 mb-1 text-amber-700" />
                <span>Cash</span>
              </button>
            </div>
          </div>

          {/* Order Totals Summary */}
          <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span className="font-medium">Gross Subtotal</span>
              <span className="font-semibold text-slate-900">{currencySymbol}{subtotal.toLocaleString('en-IN')}</span>
            </div>
            {enteredDiscountNumber > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold items-center">
                <span className="flex items-center gap-1">
                  {isMember ? (
                    <Star className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
                  ) : (
                    <span>🏷️</span>
                  )}
                  <span>{isMember ? 'VIP Member Discount' : 'Special Discount'} ({enteredDiscountNumber}%)</span>
                </span>
                <span>-{currencySymbol}{calculatedDiscountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            
            {/* Final Amount Due: Fully Editable Input Box (Replaces non-editable display & GST removed) */}
            <div className="pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <label htmlFor="final-amount-due-input" className="text-sm font-bold text-slate-900 block">
                    Final Amount Due
                  </label>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {isCustomEdited ? (
                      <span className="text-amber-800 font-semibold">Custom price overridden • Click to edit</span>
                    ) : (
                      <span>Calculated subtotal • Click to manually override</span>
                    )}
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm font-bold text-slate-500 select-none">
                    {currencySymbol}
                  </span>
                  <input
                    id="final-amount-due-input"
                    type="number"
                    min="0"
                    step="1"
                    value={isCustomEdited ? customFinalAmount : (customFinalAmount || calculatedTargetPayable)}
                    onChange={(e) => {
                      setIsCustomEdited(true);
                      setCustomFinalAmount(e.target.value);
                    }}
                    placeholder={calculatedTargetPayable.toString()}
                    className="w-36 sm:w-44 pl-7 pr-3 py-2 text-right text-base font-extrabold text-slate-900 bg-amber-50/70 border-2 border-amber-400 focus:border-amber-600 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-inner"
                  />
                  {isCustomEdited && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomEdited(false);
                        setCustomFinalAmount(calculatedTargetPayable.toString());
                      }}
                      className="ml-2 px-2 py-1 text-[11px] font-semibold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors cursor-pointer"
                      title="Reset to calculated total"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Finalize Bill & Generate Receipt ({currencySymbol}{activeFinalAmount.toLocaleString('en-IN')})</span>
          </button>
        </form>
      </div>
    </div>
  );
};
