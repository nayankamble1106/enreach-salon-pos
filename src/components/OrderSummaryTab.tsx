import React, { useState, useEffect, useMemo } from 'react';
import { CartItem, Order, MembershipRecord, LoyaltyPass, LoyaltyPassUsageLog } from '../types';
import {
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle,
  User,
  Phone,
  Sparkles,
  Star,
  Calendar,
  Clock,
  RotateCcw,
  Ticket,
  Gift,
  CheckCircle2,
  PartyPopper,
  X,
  AlertTriangle,
  Scissors,
} from 'lucide-react';
import { getNextOrderNumber } from '../utils/orderUtils';
import { formatIndianDate, formatIndianDateTime, parseDateToTimestamp } from '../utils/dateUtils';
import { cleanNumberInput, parseSafeNumber } from '../utils/numberUtils';
import { getUniqueStaffNames } from '../utils/whatsappReceipt';

interface OrderSummaryTabProps {
  cartItems: CartItem[];
  onUpdateQuantity: (serviceId: string, delta: number) => void;
  onRemoveItem: (serviceId: string) => void;
  onClearCart: () => void;
  onCompleteOrder: (order: Order) => void;
  onUpdateItemStaff?: (serviceId: string, staffName: string) => void;
  taxRate: number;
  currencySymbol: string;
  onExploreServices: () => void;
  selectedStaff?: string;
  onSelectStaff?: (staff: string) => void;
  staffList?: string[];
  existingOrders?: Order[];
  nextOrderNumber?: string;
  memberships?: MembershipRecord[];
  loyaltyPasses?: LoyaltyPass[];
  onUpdateLoyaltyPass?: (pass: LoyaltyPass) => void;
}

const DEFAULT_STAFF_NAMES = [
  'Kunal',
  'Mashuk',
  'Vishal Thakur',
  'Sapna',
  'Juhi',
  'Vishal sir',
  'Aman',
];

export const OrderSummaryTab: React.FC<OrderSummaryTabProps> = ({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCompleteOrder,
  onUpdateItemStaff,
  currencySymbol,
  onExploreServices,
  selectedStaff: externalSelectedStaff,
  onSelectStaff: externalOnSelectStaff,
  staffList = DEFAULT_STAFF_NAMES,
  existingOrders = [],
  nextOrderNumber,
  memberships = [],
  loyaltyPasses: propLoyaltyPasses,
  onUpdateLoyaltyPass,
}) => {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [isMember, setIsMember] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'Loyalty Member Pass'>('upi');
  const [internalStaff, setInternalStaff] = useState('Kunal');
  const [lastAutoDetectedPhone, setLastAutoDetectedPhone] = useState<string | null>(null);

  // 5. FULL-SCREEN 6TH VISIT COMPLETION POPUP STATE
  const [fullScreenCompletionPass, setFullScreenCompletionPass] = useState<{
    clientName: string;
    clientPhone: string;
    serviceNames: string;
    totalVisits: number;
    completedOrder?: Order;
  } | null>(null);

  // Synchronized Loyalty Passes List
  const [internalLoyaltyPasses, setInternalLoyaltyPasses] = useState<LoyaltyPass[]>(() => {
    if (propLoyaltyPasses && propLoyaltyPasses.length > 0) return propLoyaltyPasses;
    if (typeof window !== 'undefined' && window.__salonLastFirebaseLoyaltyPasses && window.__salonLastFirebaseLoyaltyPasses.length > 0) {
      return window.__salonLastFirebaseLoyaltyPasses;
    }
    try {
      const saved = localStorage.getItem('backstage_loyalty_passes');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    if (propLoyaltyPasses) {
      setInternalLoyaltyPasses(propLoyaltyPasses);
    }
  }, [propLoyaltyPasses]);

  useEffect(() => {
    const handlePassesUpdated = (e: CustomEvent<LoyaltyPass[]>) => {
      if (Array.isArray(e.detail)) {
        setInternalLoyaltyPasses(e.detail);
      }
    };
    window.addEventListener('salon:firebase-loyalty-passes-updated', handlePassesUpdated as EventListener);
    return () => {
      window.removeEventListener('salon:firebase-loyalty-passes-updated', handlePassesUpdated as EventListener);
    };
  }, []);

  const loyaltyPassesList = propLoyaltyPasses || internalLoyaltyPasses;

  const normalizeDigits = (p: string) => p.replace(/\D/g, '');

  const calculateDaysRemaining = (expiryDateStr: string): number => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiryTimestamp = parseDateToTimestamp(expiryDateStr);
      const expiry = new Date(expiryTimestamp);
      expiry.setHours(0, 0, 0, 0);
      const diffTime = expiry.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  // Detect VIP membership
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

  // 3. SMART CHECKOUT AUTO-DETECTION: Check for active Loyalty Member Pass (multi-service enabled)
  const detectedLoyaltyPass = useMemo(() => {
    const cleanEntered = normalizeDigits(clientPhone);
    if (!cleanEntered || cleanEntered.length < 5) return null;
    return (
      loyaltyPassesList.find((p) => {
        const passDigits = normalizeDigits(p.clientPhone);
        const isMatch =
          passDigits === cleanEntered ||
          passDigits.endsWith(cleanEntered) ||
          cleanEntered.endsWith(passDigits);
        return isMatch && p.status === 'Active' && p.remainingVisits > 0;
      }) || null
    );
  }, [clientPhone, loyaltyPassesList]);

  // Autofill name and auto-activate status upon typing registered number
  useEffect(() => {
    if (detectedExistingMember && lastAutoDetectedPhone !== detectedExistingMember.clientPhone) {
      setIsMember(true);
      if (!clientName.trim() && detectedExistingMember.clientName) {
        setClientName(detectedExistingMember.clientName);
      }
      setLastAutoDetectedPhone(detectedExistingMember.clientPhone);
    } else if (detectedLoyaltyPass && !clientName.trim() && detectedLoyaltyPass.clientName) {
      setClientName(detectedLoyaltyPass.clientName);
    }
  }, [detectedExistingMember, detectedLoyaltyPass, lastAutoDetectedPhone, clientName]);

  // Helper: check if a cart item matches ANY eligible service on the active pass
  const isItemPassEligible = (item: CartItem): boolean => {
    if (!detectedLoyaltyPass) return false;

    // Check multi-services array
    if (detectedLoyaltyPass.eligibleServices && detectedLoyaltyPass.eligibleServices.length > 0) {
      const matchInArray = detectedLoyaltyPass.eligibleServices.some((srv) => {
        const srvName = srv.name.trim().toLowerCase();
        const itemName = item.service.name.trim().toLowerCase();
        return (
          srv.id === item.service.id ||
          itemName === srvName ||
          itemName.includes(srvName) ||
          srvName.includes(itemName)
        );
      });
      if (matchInArray) return true;
    }

    // Fallback: check primary serviceId and serviceName
    const itemServiceName = item.service.name.trim().toLowerCase();
    const passServiceName = (detectedLoyaltyPass.serviceName || '').trim().toLowerCase();
    return (
      item.service.id === detectedLoyaltyPass.serviceId ||
      itemServiceName === passServiceName ||
      itemServiceName.includes(passServiceName) ||
      passServiceName.includes(itemServiceName)
    );
  };

  // Find original catalog price for pass item (for transparent receipt / staff history)
  const getItemOriginalPrice = (item: CartItem): number => {
    if (detectedLoyaltyPass?.eligibleServices) {
      const found = detectedLoyaltyPass.eligibleServices.find(
        (s) => s.id === item.service.id || s.name.toLowerCase() === item.service.name.toLowerCase()
      );
      if (found && found.price) return found.price;
    }
    return item.service.price;
  };

  const hasPassEligibleItemInCart = useMemo(() => {
    return cartItems.some((item) => isItemPassEligible(item));
  }, [cartItems, detectedLoyaltyPass]);

  const activeMembershipInfo = useMemo(() => {
    if (detectedExistingMember) {
      const days = calculateDaysRemaining(detectedExistingMember.expiryDate);
      return {
        startDate: formatIndianDate(detectedExistingMember.startDate),
        expiryDate: formatIndianDate(detectedExistingMember.expiryDate),
        daysRemaining: days,
        isActive: days > 0,
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
        isActive: true,
        isExistingRecord: false,
      };
    }
    return null;
  }, [detectedExistingMember, isMember]);

  const activeStaff = externalSelectedStaff || internalStaff;

  const handleStaffChange = (newStaffName: string) => {
    if (externalOnSelectStaff) {
      externalOnSelectStaff(newStaffName);
    } else {
      setInternalStaff(newStaffName);
    }

    if (onUpdateItemStaff) {
      cartItems.forEach((item) => {
        onUpdateItemStaff(item.service.id, newStaffName);
      });
    }
  };

  const invoiceNumber = nextOrderNumber || getNextOrderNumber(existingOrders);

  // 3. ZERO-PRICING: pass-eligible services drop to ₹0, other services remain normal
  const getItemEffectivePrice = (item: CartItem): number => {
    if (detectedLoyaltyPass && isItemPassEligible(item)) {
      return 0; // ₹0
    }
    return item.service.price;
  };

  const getItemEffectiveTotal = (item: CartItem): number => {
    return getItemEffectivePrice(item) * item.quantity;
  };

  const cartItemsSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + getItemEffectiveTotal(item), 0);
  }, [cartItems, detectedLoyaltyPass]);

  // Final Amount Due / Custom Subtotal Override state
  const [customAmountInput, setCustomAmountInput] = useState<string>('');
  const [isCustomOverridden, setIsCustomOverridden] = useState<boolean>(false);

  // Special Discount percentage input (defaults to empty string for clean typing/placeholder)
  const [discountPercentInput, setDiscountPercentInput] = useState<string>('');

  const enteredDiscountNumber = useMemo(() => {
    if (!discountPercentInput.trim()) return 0;
    const n = Number(discountPercentInput);
    if (isNaN(n)) return 0;
    return Math.max(0, Math.min(100, n));
  }, [discountPercentInput]);

  const effectiveSubtotal = useMemo(() => {
    if (isCustomOverridden && customAmountInput.trim() !== '') {
      const parsed = parseFloat(customAmountInput);
      return !isNaN(parsed) && parsed >= 0 ? parsed : 0;
    }
    return cartItemsSubtotal;
  }, [isCustomOverridden, customAmountInput, cartItemsSubtotal]);

  const calculatedDiscountAmount = useMemo(() => {
    return enteredDiscountNumber > 0
      ? Math.round((effectiveSubtotal * enteredDiscountNumber) / 100)
      : 0;
  }, [effectiveSubtotal, enteredDiscountNumber]);

  const finalAmountPaid = useMemo(() => {
    return Math.max(0, effectiveSubtotal - calculatedDiscountAmount);
  }, [effectiveSubtotal, calculatedDiscountAmount]);

  const handleCustomAmountChange = (val: string) => {
    const cleaned = cleanNumberInput(val, true);
    setIsCustomOverridden(true);
    setCustomAmountInput(cleaned);
  };

  const handleResetOverride = () => {
    setIsCustomOverridden(false);
    setCustomAmountInput('');
  };

  const handleDiscountPercentChange = (newVal: string) => {
    const cleaned = cleanNumberInput(newVal);
    // Limit to max 100%
    if (cleaned !== '' && Number(cleaned) > 100) {
      setDiscountPercentInput('100');
    } else {
      setDiscountPercentInput(cleaned);
    }
  };

  // 3 & 4 & 5. CHECKOUT FINALIZATION, ZERO-COMMISSION STAFF ATTRIBUTION & 6TH VISIT FULL-SCREEN POPUP
  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    const isPassAppliedThisOrder = Boolean(detectedLoyaltyPass && hasPassEligibleItemInCart);

    // 4. STAFF ATTRIBUTION & ZERO-COMMISSION RULE:
    // Format pass item name as: "Girls Haircut — ₹0 (Loyal Member) [Orig: ₹250]"
    const redeemedServiceNamesList: string[] = [];
    const finalizedItems: CartItem[] = cartItems.map((item) => {
      const stylist = item.stylistName || activeStaff;
      const isPassItem = isPassAppliedThisOrder && isItemPassEligible(item);
      const origPrice = getItemOriginalPrice(item);

      if (isPassItem) {
        redeemedServiceNamesList.push(item.service.name);
      }

      return {
        ...item,
        service: isPassItem
          ? {
              ...item.service,
              price: 0,
              // Work history transparency tag with original value
              name: `${item.service.name} — ₹0 (Loyal Member) [Orig: ₹${origPrice}]`,
            }
          : item.service,
        stylistName: stylist,
        stylistId: item.stylistId || `staff-${stylist.toLowerCase().replace(/\s+/g, '-')}`,
      };
    });

    const combinedStaffNames = getUniqueStaffNames({
      items: finalizedItems,
      staffName: activeStaff,
    } as unknown as Order);

    // Check if this is the final/exhausting visit
    const isFinalVisitBeingConsumed = Boolean(
      isPassAppliedThisOrder &&
      detectedLoyaltyPass &&
      detectedLoyaltyPass.remainingVisits === 1
    );

    const resolvedPaymentMethod = isPassAppliedThisOrder
      ? 'Loyalty Member Pass'
      : paymentMethod;

    const resolvedNotes = isPassAppliedThisOrder
      ? 'Loyalty Member Pass'
      : undefined;

    const newOrder: Order = {
      id: invoiceNumber,
      clientName: clientName.trim() || 'Walk-in Client',
      clientPhone: clientPhone.trim() || '+91 98000 00000',
      isMember,
      discountPercentage: enteredDiscountNumber,
      items: finalizedItems,
      subtotal: effectiveSubtotal,
      tax: 0,
      total: finalAmountPaid,
      paymentMethod: resolvedPaymentMethod,
      notes: resolvedNotes,
      isLoyaltyPassApplied: isPassAppliedThisOrder,
      loyaltyPassId: isPassAppliedThisOrder && detectedLoyaltyPass ? detectedLoyaltyPass.id : undefined,
      staffName: combinedStaffNames,
      date: formatIndianDateTime(new Date()),
    };

    // 3 & 5. DECREMENT REMAINING VISITS, RECORD USAGE LOG & AUTO-EXPIRE IN FIREBASE RTDB
    if (isPassAppliedThisOrder && detectedLoyaltyPass) {
      const newRemaining = Math.max(0, detectedLoyaltyPass.remainingVisits - 1);
      const isCompleted = newRemaining === 0;
      const visitIndex = detectedLoyaltyPass.totalVisits - newRemaining;

      const newUsageLog: LoyaltyPassUsageLog = {
        date: formatIndianDateTime(new Date()),
        serviceName: redeemedServiceNamesList.join(', ') || detectedLoyaltyPass.serviceName,
        staffName: combinedStaffNames,
        visitNumber: visitIndex,
      };

      const updatedHistory = [...(detectedLoyaltyPass.usageHistory || []), newUsageLog];

      const updatedPass: LoyaltyPass = {
        ...detectedLoyaltyPass,
        remainingVisits: newRemaining,
        status: isCompleted ? 'Completed' : 'Active',
        updatedAt: formatIndianDate(new Date()),
        usageHistory: updatedHistory,
      };

      // Sync updated pass to Firebase RTDB under loyalty_passes node
      if (typeof window !== 'undefined' && window.salonFirebase?.syncLoyaltyPass) {
        window.salonFirebase.syncLoyaltyPass(updatedPass);
      }

      if (onUpdateLoyaltyPass) {
        onUpdateLoyaltyPass(updatedPass);
      }

      try {
        const saved = localStorage.getItem('backstage_loyalty_passes');
        const list: LoyaltyPass[] = saved ? JSON.parse(saved) : [];
        const nextList = list.map((p) => (p.id === updatedPass.id ? updatedPass : p));
        localStorage.setItem('backstage_loyalty_passes', JSON.stringify(nextList));
      } catch {}

      setInternalLoyaltyPasses((prev) =>
        prev.map((p) => (p.id === updatedPass.id ? updatedPass : p))
      );

      // 5. 6TH VISIT FULL-SCREEN COMPLETION POPUP
      if (isFinalVisitBeingConsumed) {
        setFullScreenCompletionPass({
          clientName: detectedLoyaltyPass.clientName,
          clientPhone: detectedLoyaltyPass.clientPhone,
          serviceNames: detectedLoyaltyPass.serviceName,
          totalVisits: detectedLoyaltyPass.totalVisits,
          completedOrder: newOrder,
        });
      }
    }

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
      {/* 5. 6TH VISIT FULL-SCREEN COMPLETION POPUP & AUTO-EXPIRATION OVERLAY */}
      {fullScreenCompletionPass && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 text-center shadow-2xl border-4 border-amber-400 relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Glowing celebratory header stripes */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500" />

            <div className="w-20 h-20 rounded-3xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center mb-4 shadow-inner">
              <PartyPopper className="w-10 h-10 text-amber-600 animate-bounce" />
            </div>

            <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500 text-slate-950 inline-block mb-3 shadow-md">
              🎉 LOYALTY PASS COMPLETED!
            </span>

            <h2 className="text-2xl font-black text-slate-900 leading-tight">
              All {fullScreenCompletionPass.totalVisits}/{fullScreenCompletionPass.totalVisits} Visits Redeemed!
            </h2>

            <p className="text-sm text-slate-600 mt-2">
              Congratulations <strong className="text-slate-900">{fullScreenCompletionPass.clientName}</strong> (
              {fullScreenCompletionPass.clientPhone})! The final 100% Free bonus visit for{' '}
              <strong className="text-amber-900">&ldquo;{fullScreenCompletionPass.serviceNames}&rdquo;</strong> has been successfully finalized.
            </p>

            {/* Note & Expiration Warning Banner */}
            <div className="mt-5 p-4 bg-amber-50 rounded-2xl border-2 border-amber-300/80 text-left text-xs space-y-2 text-slate-800">
              <div className="flex items-start gap-2 text-amber-950 font-bold text-xs sm:text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>⚠️ Note: This pass is now expired and moved to History.</span>
              </div>
              <p className="text-[11px] text-amber-900 pl-6 leading-relaxed font-semibold">
                Next visits for this client will be charged at regular rates unless a new Loyalty Member Pass is issued in the Membership tab.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setFullScreenCompletionPass(null)}
              className="mt-6 w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 active:scale-98 text-white rounded-xl text-sm font-black shadow-lg cursor-pointer transition-all"
            >
              Acknowledge &amp; View Final Receipt
            </button>
          </div>
        </div>
      )}

      {/* Left: Cart items list */}
      <div className="lg:col-span-7 space-y-4">
        {/* 3. PROMINENT UI BANNER FOR ACTIVE LOYALTY MEMBER PASS */}
        {detectedLoyaltyPass && (
          <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/25 to-yellow-500/15 border-2 border-amber-400 rounded-2xl p-4 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-2xl shrink-0">⭐</span>
                <div className="min-w-0">
                  <h4 className="text-sm sm:text-base font-black text-amber-950">
                    Loyalty Member Pass Active: {detectedLoyaltyPass.remainingVisits}/{detectedLoyaltyPass.totalVisits} Visits Remaining
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-xs text-amber-900 font-semibold">Eligible Services:</span>
                    {detectedLoyaltyPass.eligibleServices && detectedLoyaltyPass.eligibleServices.length > 0 ? (
                      detectedLoyaltyPass.eligibleServices.map((s) => (
                        <span key={s.id} className="text-[11px] bg-white/90 border border-amber-300 text-amber-950 font-bold px-1.5 py-0.2 rounded">
                          {s.name}
                        </span>
                      ))
                    ) : (
                      <strong className="text-xs text-amber-950 underline">{detectedLoyaltyPass.serviceName}</strong>
                    )}
                  </div>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shrink-0 shadow-xs ${
                  detectedLoyaltyPass.remainingVisits === 1
                    ? 'bg-amber-500 text-slate-950 animate-pulse border border-amber-400'
                    : 'bg-amber-200 text-amber-950 border border-amber-400'
                }`}
              >
                {detectedLoyaltyPass.remainingVisits === 1 ? '🎉 Final Bonus Visit!' : 'Active Pass'}
              </span>
            </div>

            {hasPassEligibleItemInCart ? (
              <div className="mt-2.5 pt-2 border-t border-amber-300/80 flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Eligible service auto-zero-priced to ₹0 with &ldquo;🎁 Loyalty Pass Applied&rdquo;!</span>
                </span>
                <span className="text-[11px] font-bold text-amber-950 bg-white/80 px-2 py-0.5 rounded-md border border-amber-300">
                  Visit 1 of {detectedLoyaltyPass.remainingVisits} will be redeemed
                </span>
              </div>
            ) : (
              <div className="mt-2.5 pt-2 border-t border-amber-300/80 flex items-center justify-between text-xs text-amber-900">
                <span>💡 Add any eligible pass service from catalog to apply ₹0 free visit pricing.</span>
                <button
                  type="button"
                  onClick={onExploreServices}
                  className="font-bold text-amber-950 underline hover:text-amber-800 cursor-pointer ml-2 shrink-0"
                >
                  Browse Catalog &rarr;
                </button>
              </div>
            )}
          </div>
        )}

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Services in Cart</h2>
              <p className="text-xs text-slate-500">
                {cartItems.reduce((acc, i) => acc + i.quantity, 0)} services selected • Multi-Staff &amp; Zero-Pricing Enabled
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
            {cartItems.map((item) => {
              const currentItemStylist = item.stylistName || activeStaff;
              const isOverridden = item.stylistName && item.stylistName !== activeStaff;
              const isPassEligible = isItemPassEligible(item);
              const effectivePrice = getItemEffectivePrice(item);
              const origPrice = getItemOriginalPrice(item);

              return (
                <div key={item.service.id} className="py-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-slate-900 text-sm truncate">{item.service.name}</h4>
                        {/* 3. "🎁 Loyalty Pass Applied" BADGE */}
                        {isPassEligible && (
                          <span className="px-2 py-0.5 text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full flex items-center gap-1 shadow-2xs">
                            <Gift className="w-3 h-3 text-emerald-600" />
                            <span>🎁 Loyalty Pass Applied</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        {isPassEligible ? (
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="line-through text-slate-400 font-medium">
                              {currencySymbol}{origPrice.toLocaleString('en-IN')}
                            </span>
                            <span className="text-emerald-700 font-extrabold text-sm">{currencySymbol}0</span>
                          </div>
                        ) : (
                          <span className="font-medium text-slate-700">
                            {currencySymbol}{item.service.price.toLocaleString('en-IN')}
                          </span>
                        )}
                        <span>•</span>
                        <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                          {item.service.category}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.service.id, -1)}
                          className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-slate-800">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.service.id, 1)}
                          className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className={`w-20 text-right font-bold text-sm ${isPassEligible ? 'text-emerald-700 font-black' : 'text-slate-900'}`}>
                        {currencySymbol}{(effectivePrice * item.quantity).toLocaleString('en-IN')}
                      </span>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.service.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 4. Staff selection on each service card */}
                  <div className="flex items-center justify-between bg-slate-50/70 border border-slate-200/70 rounded-xl px-2.5 py-1.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <label
                        htmlFor={`item-stylist-select-${item.service.id}`}
                        className="text-[11px] font-bold text-slate-700 flex items-center gap-1 shrink-0"
                      >
                        <span>💈</span>
                        <span>Stylist:</span>
                      </label>
                      <select
                        id={`item-stylist-select-${item.service.id}`}
                        value={currentItemStylist}
                        onChange={(e) => {
                          const newStylist = e.target.value;
                          if (onUpdateItemStaff) {
                            onUpdateItemStaff(item.service.id, newStylist);
                          }
                        }}
                        className="bg-white border border-slate-300 hover:border-amber-400 focus:border-amber-600 focus:ring-1 focus:ring-amber-500 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-900 outline-none cursor-pointer transition-colors shadow-2xs"
                      >
                        {staffList.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {isOverridden ? (
                      <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-full">
                        Individual Stylist
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Default: {activeStaff}</span>
                    )}
                  </div>
                </div>
              );
            })}
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
            <h3 className="text-base font-bold text-slate-900">Billing &amp; Payment</h3>
            <p className="text-xs text-slate-500">Provide client info and allocate staff member</p>
          </div>

          {/* Global Served By */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1.5">
            <label htmlFor="billing-staff-select" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
              <User className="w-3.5 h-3.5 text-amber-700" />
              <span>Served By / Select Staff (Default for all items)</span>
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
          </div>

          {/* Client Details */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Client Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Client Mobile Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  placeholder="e.g. +91 98201 44521"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Typing number automatically checks for VIP membership and active Loyalty Member Passes.
              </p>
            </div>

            {/* VIP Member Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Client VIP Membership</label>
              <button
                type="button"
                onClick={() => setIsMember(!isMember)}
                className={`w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                  isMember
                    ? 'bg-emerald-500 text-slate-950 font-black border-emerald-400 shadow-md ring-2 ring-emerald-400/80 scale-[1.01]'
                    : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-850 hover:text-white shadow-xs'
                }`}
              >
                <Star className={`w-4 h-4 ${isMember ? 'text-slate-950 fill-slate-950' : 'text-amber-400 fill-amber-400/40'}`} />
                <span className="tracking-wide">Enreach Member</span>
                {isMember ? (
                  <span className="text-[10px] bg-slate-950/20 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                    {detectedExistingMember
                      ? activeMembershipInfo?.isActive
                        ? `Active (${activeMembershipInfo.daysRemaining}d left)`
                        : 'Expired'
                      : 'Active (1-Year)'}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-normal">(Click to Activate 365 Days)</span>
                )}
              </button>
            </div>

            {/* Special Discount (%) Input */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="special-discount-input" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="text-xs">🏷️</span>
                  <span>Special Discount (%)</span>
                </label>
                {enteredDiscountNumber > 0 ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-200">
                    -{currencySymbol}{calculatedDiscountAmount.toLocaleString('en-IN')} ({enteredDiscountNumber}%)
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium">0% (No Discount)</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    id="special-discount-input"
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
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Method</label>
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

          {/* Bill Summary & Override Section */}
          <div className="pt-3 border-t border-slate-200 space-y-3 text-xs">
            <div className="p-3.5 bg-amber-50/60 border-2 border-amber-300/80 rounded-xl space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label htmlFor="final-amount-due-input" className="text-sm font-bold text-slate-900 block">
                    Final Amount Due
                  </label>
                  <span className="text-[11px] text-slate-500 block">
                    {isCustomOverridden ? (
                      <span className="text-amber-800 font-bold">
                        Custom Bill Overridden • Subtotal = {currencySymbol}{effectiveSubtotal.toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span>Enter any custom amount to override subtotal</span>
                    )}
                  </span>
                </div>

                <div className="relative flex items-center self-end sm:self-center">
                  <span className="absolute left-3 text-sm font-bold text-slate-500 select-none">
                    {currencySymbol}
                  </span>
                  <input
                    id="final-amount-due-input"
                    type="number"
                    min="0"
                    step="1"
                    value={isCustomOverridden ? customAmountInput : effectiveSubtotal.toString()}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    placeholder={cartItemsSubtotal.toString()}
                    className="w-36 sm:w-40 pl-7 pr-3 py-2 text-right text-base font-black text-slate-900 bg-white border-2 border-amber-400 focus:border-amber-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-xs"
                  />
                  {isCustomOverridden && (
                    <button
                      type="button"
                      onClick={handleResetOverride}
                      className="ml-2 px-2.5 py-2 text-[11px] font-bold text-amber-900 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors cursor-pointer border border-amber-300 flex items-center gap-1 shadow-2xs"
                      title="Reset to calculated cart subtotal"
                    >
                      <RotateCcw className="w-3 h-3 text-amber-700" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-1 px-1">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-semibold flex items-center gap-1">
                  <span>💵</span>
                  <span>Subtotal:</span>
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  {currencySymbol}{effectiveSubtotal.toLocaleString('en-IN')}
                </span>
              </div>

              {enteredDiscountNumber > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold items-center">
                  <span className="flex items-center gap-1">
                    <span>🏷️</span>
                    <span>Special Discount ({enteredDiscountNumber}%):</span>
                  </span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    -{currencySymbol}{calculatedDiscountAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {detectedLoyaltyPass && hasPassEligibleItemInCart && (
                <div className="flex justify-between text-amber-900 font-bold items-center bg-amber-50/80 p-1.5 rounded-lg border border-amber-200">
                  <span className="flex items-center gap-1">
                    <Ticket className="w-3.5 h-3.5 text-amber-700" />
                    <span>Loyalty Member Pass:</span>
                  </span>
                  <span className="text-[11px] bg-amber-200/90 text-amber-950 px-2 py-0.5 rounded font-black">
                    1 Visit Applied (₹0)
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-sm font-black text-slate-900 flex items-center gap-1">
                  <span>💰</span>
                  <span>Final Amount Paid:</span>
                </span>
                <span className="text-lg font-black text-amber-950">
                  {currencySymbol}{finalAmountPaid.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>
              Finalize Bill &amp; Generate Receipt ({currencySymbol}{finalAmountPaid.toLocaleString('en-IN')})
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
