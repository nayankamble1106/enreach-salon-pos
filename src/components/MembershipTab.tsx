import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MembershipRecord, Order, LoyaltyPass, LoyaltyPassService, SalonService } from '../types';
import {
  Search,
  Star,
  Calendar,
  Clock,
  X,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Plus,
  User,
  Phone,
  Check,
  Ticket,
  Gift,
  Scissors,
  CreditCard,
  History,
  ChevronDown,
  Trash2,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { formatIndianDate, formatIndianDateTime, parseDateToTimestamp } from '../utils/dateUtils';
import { cleanNumberInput, parseSafeInt } from '../utils/numberUtils';
import { generateInvoiceNumber } from '../utils/orderUtils';
import { SALON_SERVICES } from '../data/mockData';

interface MembershipTabProps {
  memberships: MembershipRecord[];
  orders: Order[];
  services?: SalonService[];
  loyaltyPasses?: LoyaltyPass[];
  currencySymbol: string;
  onAddMember?: (member: MembershipRecord) => void;
  onDeleteMember?: (memberId: string) => void;
  onAddLoyaltyPass?: (pass: LoyaltyPass) => void;
  onDeleteLoyaltyPass?: (passId: string) => void;
  onAddAdvanceOrder?: (order: Order) => void;
  isEditMode?: boolean;
}

const MEMBERSHIP_PLANS = [
  { label: '1 Year (365 Days)', days: 365, badge: 'Standard VIP', default: true },
  { label: '6 Months (180 Days)', days: 180, badge: 'Semi-Annual' },
  { label: '2 Years (730 Days)', days: 730, badge: 'Executive VIP' },
  { label: '3 Months (90 Days)', days: 90, badge: 'Trial' },
];

/** Searchable Service Picker Component with embedded real-time search filter */
const SearchableServiceSelector: React.FC<{
  availableServices: SalonService[];
  selectedServiceId: string;
  onSelect: (service: SalonService) => void;
  currencySymbol: string;
}> = ({ availableServices, selectedServiceId, onSelect, currencySymbol }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedService = useMemo(() => {
    return availableServices.find((s) => s.id === selectedServiceId) || availableServices[0];
  }, [availableServices, selectedServiceId]);

  const filteredServices = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return availableServices;
    return availableServices.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.price.toString().includes(q)
    );
  }, [availableServices, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative flex-1" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all cursor-pointer text-left"
      >
        <span className="truncate">
          {selectedService ? (
            <span>
              {selectedService.name} — <strong className="text-amber-800">{currencySymbol}{selectedService.price}</strong>{' '}
              <span className="text-xs text-slate-500 font-normal">({selectedService.category})</span>
            </span>
          ) : (
            <span className="text-slate-400">Select eligible service...</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-64 flex flex-col">
          {/* Embedded Real-time text search filter */}
          <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                autoFocus
                placeholder="Type to search service name / category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="overflow-y-auto divide-y divide-slate-100">
            {filteredServices.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">No services match &ldquo;{searchTerm}&rdquo;</div>
            ) : (
              filteredServices.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onSelect(s);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-amber-50/80 transition-colors cursor-pointer ${
                    s.id === selectedServiceId ? 'bg-amber-100/60 font-bold text-amber-950' : 'text-slate-700'
                  }`}
                >
                  <span className="truncate">{s.name}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{s.category}</span>
                    <span className="font-bold text-slate-900">{currencySymbol}{s.price}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const MembershipTab: React.FC<MembershipTabProps> = ({
  memberships,
  orders,
  services = [],
  loyaltyPasses: propLoyaltyPasses,
  currencySymbol,
  onAddMember,
  onDeleteMember,
  onAddLoyaltyPass,
  onDeleteLoyaltyPass,
  onAddAdvanceOrder,
  isEditMode = false,
}) => {
  // State for permanent deletion modals
  const [memberToDelete, setMemberToDelete] = useState<MembershipRecord | null>(null);
  const [passToDelete, setPassToDelete] = useState<LoyaltyPass | null>(null);

  // 1. SUB-TABS LAYOUT: '💳 Regular Memberships' vs '🎁 Loyalty Member Passes'
  const [mainSubTab, setMainSubTab] = useState<'memberships' | 'loyalty_passes'>('memberships');

  // Under 'Loyalty Member Passes': 'Active Passes' vs 'Completed / History Passes'
  const [passFilterStatus, setPassFilterStatus] = useState<'Active' | 'Completed'>('Active');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<MembershipRecord | null>(null);
  const [selectedHistoryPass, setSelectedHistoryPass] = useState<LoyaltyPass | null>(null);

  // Available Salon Services for Loyalty Pass Dropdown
  const availableServices = useMemo(() => {
    if (services && services.length > 0) return services;
    if (typeof window !== 'undefined' && window.__salonLastFirebaseServices && window.__salonLastFirebaseServices.length > 0) {
      return window.__salonLastFirebaseServices;
    }
    return SALON_SERVICES;
  }, [services]);

  // Internal Loyalty Passes state with live sync
  const [internalLoyaltyPasses, setInternalLoyaltyPasses] = useState<LoyaltyPass[]>(() => {
    if (propLoyaltyPasses && propLoyaltyPasses.length > 0) return propLoyaltyPasses;
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

  // Active vs Completed pass counts
  const activePassesCount = useMemo(() => {
    return loyaltyPassesList.filter((p) => p.status === 'Active' && p.remainingVisits > 0).length;
  }, [loyaltyPassesList]);

  const completedPassesCount = useMemo(() => {
    return loyaltyPassesList.filter((p) => p.status === 'Completed' || p.remainingVisits === 0).length;
  }, [loyaltyPassesList]);

  // Dynamic Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStartDate, setFormStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formDurationDays, setFormDurationDays] = useState<number>(365);
  const [formError, setFormError] = useState('');

  // 2. LOYALTY PASS CREATION MODAL STATE
  const [isAddPassModalOpen, setIsAddPassModalOpen] = useState(false);
  const [passClientName, setPassClientName] = useState('');
  const [passClientPhone, setPassClientPhone] = useState('');
  const [passAdvancePaidAmount, setPassAdvancePaidAmount] = useState<string>('2000');
  const [passPaidVisitsInput, setPassPaidVisitsInput] = useState<string>('5');
  const [passBonusVisitsInput, setPassBonusVisitsInput] = useState<string>('1');
  const [selectedEligibleServices, setSelectedEligibleServices] = useState<LoyaltyPassService[]>(() => {
    const defaultS = availableServices[0] || { id: 's1', name: 'Hair Cut & Styling', price: 350 };
    return [{ id: defaultS.id, name: defaultS.name, price: defaultS.price }];
  });
  const [passFormError, setPassFormError] = useState('');
  const [successToastMessage, setSuccessToastMessage] = useState<string | null>(null);

  const passPaidVisits = useMemo(() => {
    return parseSafeInt(passPaidVisitsInput, 0);
  }, [passPaidVisitsInput]);

  const passBonusVisits = useMemo(() => {
    return parseSafeInt(passBonusVisitsInput, 0);
  }, [passBonusVisitsInput]);

  // Auto calculate Total Visits = Paid Visits + Bonus Free Visits
  const calculatedTotalVisits = useMemo(() => {
    return passPaidVisits + passBonusVisits;
  }, [passPaidVisits, passBonusVisits]);

  // Handle Multi-Service addition in modal
  const handleAddServiceRow = () => {
    const nextAvailable =
      availableServices.find((s) => !selectedEligibleServices.some((sel) => sel.id === s.id)) ||
      availableServices[0];
    if (nextAvailable) {
      setSelectedEligibleServices((prev) => [
        ...prev,
        { id: nextAvailable.id, name: nextAvailable.name, price: nextAvailable.price },
      ]);
    }
  };

  const handleUpdateServiceRow = (index: number, newService: SalonService) => {
    setSelectedEligibleServices((prev) => {
      const copy = [...prev];
      copy[index] = { id: newService.id, name: newService.name, price: newService.price };
      return copy;
    });
  };

  const handleRemoveServiceRow = (index: number) => {
    if (selectedEligibleServices.length <= 1) return;
    setSelectedEligibleServices((prev) => prev.filter((_, i) => i !== index));
  };

  // Dynamic Auto-Calculation of VIP Membership Expiry / End Date
  const calculatedEndDate = useMemo(() => {
    if (!formStartDate) return '';
    try {
      const [year, month, day] = formStartDate.split('-').map(Number);
      const start = new Date(year, month - 1, day);
      const end = new Date(start.getTime() + formDurationDays * 24 * 60 * 60 * 1000);
      return formatIndianDate(end);
    } catch {
      return '';
    }
  }, [formStartDate, formDurationDays]);

  const formattedStartDate = useMemo(() => {
    if (!formStartDate) return '';
    try {
      const [year, month, day] = formStartDate.split('-').map(Number);
      return formatIndianDate(new Date(year, month - 1, day));
    } catch {
      return '';
    }
  }, [formStartDate]);

  // Handle VIP Member Creation
  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Please enter customer full name.');
      return;
    }

    const cleanDigits = formPhone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setFormError('Please enter a valid 10-digit mobile phone number.');
      return;
    }

    const formattedPhone =
      cleanDigits.length === 10
        ? `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`
        : formPhone.trim();

    const newMember: MembershipRecord = {
      id: `MEM-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName: formName.trim(),
      clientPhone: formattedPhone,
      startDate: formattedStartDate,
      expiryDate: calculatedEndDate,
      isActive: true,
    };

    if (onAddMember) onAddMember(newMember);

    if (typeof window !== 'undefined' && window.salonFirebase) {
      window.salonFirebase.syncMembership(newMember);
    }

    try {
      const saved = localStorage.getItem('backstage_memberships');
      const list = saved ? JSON.parse(saved) : [];
      const updated = [
        newMember,
        ...list.filter((m: any) => m.id !== newMember.id && m.clientPhone !== newMember.clientPhone),
      ];
      localStorage.setItem('backstage_memberships', JSON.stringify(updated));
    } catch {}

    setFormName('');
    setFormPhone('');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormDurationDays(365);
    setIsAddModalOpen(false);

    setSuccessToastMessage('VIP Member saved & synchronized instantly to Firebase across all devices!');
    setTimeout(() => setSuccessToastMessage(null), 3500);
  };

  // 2. HANDLE LOYALTY PASS CREATION WITH ADVANCE COLLECTION & MULTI-SERVICE SELECTION
  const handleSaveLoyaltyPass = (e: React.FormEvent) => {
    e.preventDefault();
    setPassFormError('');

    if (!passClientName.trim()) {
      setPassFormError('Please enter client full name.');
      return;
    }

    const cleanDigits = passClientPhone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setPassFormError('Please enter a valid 10-digit mobile phone number.');
      return;
    }

    if (selectedEligibleServices.length === 0) {
      setPassFormError('Please select at least one eligible service for the pass.');
      return;
    }

    if (passPaidVisits < 1) {
      setPassFormError('Please enter at least 1 paid visit.');
      return;
    }

    const paid = passPaidVisits;
    const bonus = passBonusVisits;
    const total = paid + bonus;
    const advanceAmount = Math.max(0, parseFloat(passAdvancePaidAmount) || 0);

    const formattedPhone =
      cleanDigits.length === 10
        ? `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`
        : passClientPhone.trim();

    const serviceNamesCombined = selectedEligibleServices.map((s) => s.name).join(', ');
    const primaryServiceId = selectedEligibleServices[0].id;

    const newPass: LoyaltyPass = {
      id: `PASS-${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`,
      clientName: passClientName.trim(),
      clientPhone: formattedPhone,
      serviceId: primaryServiceId,
      serviceName: serviceNamesCombined,
      eligibleServices: selectedEligibleServices,
      advancePaidAmount: advanceAmount,
      paidVisits: paid,
      bonusVisits: bonus,
      totalVisits: total,
      remainingVisits: total,
      status: 'Active',
      createdAt: formatIndianDate(new Date()),
      usageHistory: [],
    };

    // a. Save in Firebase Realtime Database under loyalty_passes node
    if (typeof window !== 'undefined' && window.salonFirebase?.syncLoyaltyPass) {
      window.salonFirebase.syncLoyaltyPass(newPass);
    }

    if (onAddLoyaltyPass) {
      onAddLoyaltyPass(newPass);
    }

    // b. RECORD ADVANCE PAID AMOUNT INTO SALES HISTORY AS "Prepaid Loyalty Pass Sale"
    if (advanceAmount > 0) {
      const advanceOrder: Order = {
        id: generateInvoiceNumber(orders),
        clientName: newPass.clientName,
        clientPhone: newPass.clientPhone,
        items: [
          {
            service: {
              id: 'loyalty-pass-advance',
              name: `Prepaid Loyalty Pass (${serviceNamesCombined})`,
              price: advanceAmount,
              category: 'Loyalty Pass Advance',
            },
            quantity: 1,
            stylistId: 'staff-reception',
            stylistName: 'Front Desk',
          },
        ],
        subtotal: advanceAmount,
        tax: 0,
        total: advanceAmount,
        paymentMethod: 'cash',
        notes: `Prepaid Loyalty Pass Advance Collection (${total} Visits Package)`,
        date: formatIndianDateTime(new Date()),
        staffName: 'Front Desk',
      };

      if (typeof window !== 'undefined' && window.salonFirebase) {
        window.salonFirebase.syncOrder(advanceOrder);
      }

      if (onAddAdvanceOrder) {
        onAddAdvanceOrder(advanceOrder);
      }

      try {
        const existingRaw = localStorage.getItem('backstage_orders');
        const existingList = existingRaw ? JSON.parse(existingRaw) : [];
        localStorage.setItem('backstage_orders', JSON.stringify([advanceOrder, ...existingList]));
      } catch {}
    }

    // c. Local storage update
    setInternalLoyaltyPasses((prev) => {
      const updated = [newPass, ...prev.filter((p) => p.id !== newPass.id)];
      try {
        localStorage.setItem('backstage_loyalty_passes', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('salon:firebase-loyalty-passes-updated', {
          detail: [newPass, ...loyaltyPassesList.filter((p) => p.id !== newPass.id)],
        })
      );
    }

    // Reset Form
    setPassClientName('');
    setPassClientPhone('');
    setPassAdvancePaidAmount('2000');
    setPassPaidVisitsInput('5');
    setPassBonusVisitsInput('1');
    const defaultS = availableServices[0] || { id: 's1', name: 'Hair Cut & Styling', price: 350 };
    setSelectedEligibleServices([{ id: defaultS.id, name: defaultS.name, price: defaultS.price }]);
    setIsAddPassModalOpen(false);
    setMainSubTab('loyalty_passes');
    setPassFilterStatus('Active');

    setSuccessToastMessage(
      `⭐ Loyalty Member Pass created for ${newPass.clientName} (${newPass.totalVisits} Visits Package) & ₹${advanceAmount} recorded in Sales History!`
    );
    setTimeout(() => setSuccessToastMessage(null), 4500);
  };

  // Filter members by query
  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return memberships;
    return memberships.filter(
      (m) =>
        m.clientName.toLowerCase().includes(q) ||
        m.clientPhone.toLowerCase().includes(q)
    );
  }, [memberships, searchQuery]);

  // Filter loyalty passes by active/completed status and search query
  const filteredPasses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return loyaltyPassesList.filter((p) => {
      const isCompleted = p.status === 'Completed' || p.remainingVisits === 0;
      const statusMatches = passFilterStatus === 'Active' ? !isCompleted : isCompleted;
      if (!statusMatches) return false;

      if (!q) return true;
      return (
        p.clientName.toLowerCase().includes(q) ||
        p.clientPhone.toLowerCase().includes(q) ||
        p.serviceName.toLowerCase().includes(q)
      );
    });
  }, [loyaltyPassesList, passFilterStatus, searchQuery]);

  const getDaysRemaining = (expiryDateStr: string) => {
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const expiryTimestamp = parseDateToTimestamp(expiryDateStr);
      const expiry = new Date(expiryTimestamp);
      expiry.setHours(0, 0, 0, 0);
      const diffMs = expiry.getTime() - now.getTime();
      return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return 365;
    }
  };

  const memberOrders = selectedMember
    ? orders.filter(
        (o) =>
          (o.clientPhone &&
            o.clientPhone.replace(/\s+/g, '') === selectedMember.clientPhone.replace(/\s+/g, '')) ||
          (o.clientName && o.clientName.toLowerCase() === selectedMember.clientName.toLowerCase())
      )
    : [];

  const handleConfirmDeleteMember = () => {
    if (!memberToDelete) return;
    if (onDeleteMember) {
      onDeleteMember(memberToDelete.id);
    }
    setSuccessToastMessage(`VIP Member "${memberToDelete.clientName}" permanently deleted.`);
    setMemberToDelete(null);
  };

  const handleConfirmDeletePass = () => {
    if (!passToDelete) return;
    if (onDeleteLoyaltyPass) {
      onDeleteLoyaltyPass(passToDelete.id);
    }
    setInternalLoyaltyPasses((prev) => prev.filter((p) => p.id !== passToDelete.id));
    setSuccessToastMessage(`Loyalty Pass for "${passToDelete.clientName}" permanently deleted.`);
    setPassToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToastMessage && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <span>{successToastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToastMessage(null)}
            className="p-1 hover:bg-emerald-700 rounded-lg text-emerald-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Edit Mode Active Banner (Linked to Edit Services Toggle) */}
      {isEditMode && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 text-xs sm:text-sm text-amber-950 font-semibold shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>
              <strong>Edit Services Mode Active:</strong> Red delete buttons (🗑️) are unlocked on Member and Loyalty Pass cards. Click to permanently remove records.
            </span>
          </div>
        </div>
      )}

      {/* 1. TOP SUB-TABS NAVIGATION: '💳 Regular Memberships' vs '🎁 Loyalty Member Passes' */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 sm:p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
          {/* a. Regular Memberships */}
          <button
            type="button"
            onClick={() => setMainSubTab('memberships')}
            className={`flex items-center justify-center gap-2.5 px-4 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              mainSubTab === 'memberships'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md ring-2 ring-emerald-400/40'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span>💳 Regular Memberships</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                mainSubTab === 'memberships' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {memberships.length}
            </span>
          </button>

          {/* b. Loyalty Member Passes */}
          <button
            type="button"
            onClick={() => setMainSubTab('loyalty_passes')}
            className={`flex items-center justify-center gap-2.5 px-4 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              mainSubTab === 'loyalty_passes'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md ring-2 ring-amber-400/40'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Gift className="w-4 h-4 shrink-0" />
            <span>🎁 Loyalty Member Passes</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                mainSubTab === 'loyalty_passes' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
              }`}
            >
              {loyaltyPassesList.length}
            </span>
          </button>
        </div>

        {/* Action Button: Contextual based on active subtab */}
        <div className="flex items-center gap-2 shrink-0">
          {mainSubTab === 'memberships' ? (
            <button
              type="button"
              onClick={() => {
                setFormError('');
                setIsAddModalOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add VIP Member</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setPassFormError('');
                setIsAddPassModalOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-all active:scale-95"
            >
              <Ticket className="w-4 h-4" />
              <span>+ Add Loyalty Pass</span>
            </button>
          )}
        </div>
      </div>

      {/* 1b. UNDER LOYALTY MEMBER PASSES: TWO VIEW FILTERS ('Active Passes' vs 'Completed / History Passes') */}
      {mainSubTab === 'loyalty_passes' && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPassFilterStatus('Active')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                passFilterStatus === 'Active'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-amber-200 hover:bg-amber-100/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Active Passes ({activePassesCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setPassFilterStatus('Completed')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                passFilterStatus === 'Completed'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-amber-200 hover:bg-slate-100'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Completed / History Passes ({completedPassesCount})</span>
            </button>
          </div>

          <span className="text-xs text-amber-900 font-semibold">
            {passFilterStatus === 'Active'
              ? '✨ Active passes apply ₹0 zero-billing automatically when eligible services are added to cart.'
              : '📜 Retains complete multi-visit audit history, dates, and redeemed services.'}
          </span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder={
            mainSubTab === 'loyalty_passes'
              ? 'Filter passes by client name, mobile number, or eligible services...'
              : 'Filter members by full name or mobile number (e.g. Aditya, +91 98201...)'
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* SUBTAB 1 CONTENT: REGULAR VIP MEMBERSHIPS */}
      {mainSubTab === 'memberships' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredMembers.length === 0 ? (
            <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 shadow-xs">
              <Sparkles className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800 text-base">No active member profiles found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Add a new member profile using the button below or toggle &ldquo;Enreach Member&rdquo; during checkout.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFormError('');
                  setIsAddModalOpen(true);
                }}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add First VIP Member</span>
              </button>
            </div>
          ) : (
            filteredMembers.map((member, idx) => {
              const daysLeft = getDaysRemaining(member.expiryDate);
              const isActive = daysLeft > 0;

              return (
                <div
                  key={`member-${member.id || idx}-${idx}`}
                  onClick={() => setSelectedMember(member)}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                >
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400'
                        : 'bg-slate-300'
                    }`}
                  />

                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                          isActive
                            ? 'bg-emerald-500 text-slate-950 border border-emerald-400 shadow-2xs'
                            : 'bg-slate-200 text-slate-700 border border-slate-300'
                        }`}
                      >
                        <Star className={`w-3 h-3 ${isActive ? 'fill-slate-950 text-slate-950' : 'text-slate-500'}`} />
                        <span>{isActive ? `Active - ${daysLeft} Days Left` : 'Expired'}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        {isEditMode && (
                          <button
                            type="button"
                            title="Delete VIP Member"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMemberToDelete(member);
                            }}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <span className="text-xs font-semibold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <span>View History</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-950 transition-colors">
                      {member.clientName}
                    </h3>

                    <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{member.clientPhone}</span>
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        Remaining Validity
                      </span>
                      <span className={`text-sm font-bold mt-0.5 block ${isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {isActive ? `${daysLeft} Days Left` : 'Expired'}
                      </span>
                    </div>

                    <span className="text-xs text-slate-400 font-medium">Exp: {formatIndianDate(member.expiryDate)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUBTAB 2 CONTENT: LOYALTY MEMBER PASSES ('Active' vs 'Completed / History') */}
      {mainSubTab === 'loyalty_passes' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredPasses.length === 0 ? (
            <div className="col-span-full bg-white border border-amber-200/80 rounded-2xl p-10 text-center text-slate-500 shadow-xs">
              <Gift className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 text-base">
                {passFilterStatus === 'Active' ? 'No Active Loyalty Passes Found' : 'No Completed Pass History Found'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {passFilterStatus === 'Active'
                  ? 'Create multi-service loyalty passes with advance collection & free bonus visits to delight your regular clients.'
                  : 'Completed passes with exhausted visit counts will appear here for archival and audit logs.'}
              </p>
              {passFilterStatus === 'Active' && (
                <button
                  type="button"
                  onClick={() => {
                    setPassFormError('');
                    setIsAddPassModalOpen(true);
                  }}
                  className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Ticket className="w-4 h-4" />
                  <span>+ Create Loyalty Pass</span>
                </button>
              )}
            </div>
          ) : (
            filteredPasses.map((pass, idx) => {
              const isCompleted = pass.status === 'Completed' || pass.remainingVisits === 0;
              const isFinalBonusVisit = pass.remainingVisits === 1 && !isCompleted;
              const usedVisits = Math.max(0, pass.totalVisits - pass.remainingVisits);
              const progressPct = Math.min(100, Math.round((usedVisits / pass.totalVisits) * 100));

              return (
                <div
                  key={`pass-${pass.id || idx}-${idx}`}
                  onClick={() => isCompleted && setSelectedHistoryPass(pass)}
                  className={`bg-white border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between relative overflow-hidden transition-all ${
                    isCompleted
                      ? 'border-slate-300 bg-slate-50/50 hover:border-slate-500 hover:shadow-md cursor-pointer'
                      : 'border-amber-300 hover:border-amber-500 hover:shadow-md'
                  }`}
                >
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      isCompleted ? 'bg-slate-400' : 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400'
                    }`}
                  />

                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                          isCompleted
                            ? 'bg-slate-200 text-slate-800 border border-slate-300'
                            : isFinalBonusVisit
                            ? 'bg-amber-500 text-slate-950 border border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)] animate-pulse'
                            : 'bg-amber-100 text-amber-950 border border-amber-300'
                        }`}
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>
                          {isCompleted
                            ? 'Completed (All Consumed)'
                            : isFinalBonusVisit
                            ? '🎉 Final Bonus Visit Next!'
                            : `Active • ${pass.remainingVisits}/${pass.totalVisits} Left`}
                        </span>
                      </span>

                      <div className="flex items-center gap-2">
                        {isEditMode && (
                          <button
                            type="button"
                            title="Delete Loyalty Pass"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPassToDelete(pass);
                            }}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isCompleted ? (
                          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                            <span>Logs</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-400">{pass.id}</span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">{pass.clientName}</h3>

                    <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{pass.clientPhone}</span>
                    </p>

                    {/* Eligible Multi-Services Badge List */}
                    <div className="mt-3.5 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block">
                        Eligible Services (Multi-Service Enabled)
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pass.eligibleServices && pass.eligibleServices.length > 0 ? (
                          pass.eligibleServices.map((srv) => (
                            <span
                              key={srv.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-amber-300 text-slate-900 font-bold text-[11px]"
                            >
                              <Scissors className="w-3 h-3 text-amber-700" />
                              <span>{srv.name}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs font-bold text-slate-900">{pass.serviceName}</span>
                        )}
                      </div>
                    </div>

                    {/* Advance Collection Badge */}
                    {pass.advancePaidAmount && pass.advancePaidAmount > 0 ? (
                      <div className="mt-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center justify-between">
                        <span>Advance Collected:</span>
                        <strong className="text-emerald-950 font-black">
                          {currencySymbol}{pass.advancePaidAmount.toLocaleString('en-IN')}
                        </strong>
                      </div>
                    ) : null}
                  </div>

                  {/* Progress & Visit Counts */}
                  <div className="mt-5 pt-3.5 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600">
                        Visits Used: <strong className="text-slate-900">{usedVisits}/{pass.totalVisits}</strong>
                      </span>
                      <span className={isCompleted ? 'text-slate-500 font-bold' : 'text-amber-800 font-black'}>
                        {pass.remainingVisits} Remaining
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          isCompleted ? 'bg-slate-400' : 'bg-gradient-to-r from-amber-500 to-yellow-500'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>
                        Paid: <strong>{pass.paidVisits}</strong> + Bonus: <strong className="text-amber-700">+{pass.bonusVisits}</strong>
                      </span>
                      <span>Created: {pass.createdAt}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 2. LOYALTY PASS CREATION MODAL WITH MULTI-SERVICE SEARCH & ADVANCE COLLECTION */}
      {isAddPassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
                  <Ticket className="w-5 h-5 fill-slate-950" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Add Loyalty Member Pass</h3>
                  <p className="text-xs text-slate-500">
                    Prepaid package with advance revenue collection &amp; bonus visits
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddPassModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLoyaltyPass} className="mt-4 space-y-4">
              {passFormError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passFormError}</span>
                </div>
              )}

              {/* Client Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Client Full Name *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Malhotra"
                  value={passClientName}
                  onChange={(e) => setPassClientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* Client Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mobile Phone Number *</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="98201 12345"
                    value={passClientPhone}
                    onChange={(e) => setPassClientPhone(e.target.value)}
                    className="w-full pl-16 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Advance Paid Amount Input */}
              <div className="p-3 bg-amber-50/70 border border-amber-300 rounded-xl space-y-1">
                <label className="block text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-amber-700" />
                  <span>Advance Paid Amount ({currencySymbol}) *</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 select-none">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="2000"
                    value={passAdvancePaidAmount}
                    onChange={(e) => setPassAdvancePaidAmount(cleanNumberInput(e.target.value, true))}
                    className="w-full pl-8 pr-3.5 py-2 bg-white border border-amber-300 rounded-lg text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <p className="text-[11px] text-amber-900 font-medium">
                  💰 This amount ({currencySymbol}{passAdvancePaidAmount || 0}) is recorded immediately in today&apos;s Sales History as a &ldquo;Prepaid Loyalty Pass Sale&rdquo;.
                </p>
              </div>

              {/* Multi-Service Selection with Real-time Embedded Search Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-slate-400" />
                    <span>Eligible Services Selection (Multi-Service Enabled) *</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddServiceRow}
                    className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Another Service</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {selectedEligibleServices.map((row, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <SearchableServiceSelector
                        availableServices={availableServices}
                        selectedServiceId={row.id}
                        onSelect={(srv) => handleUpdateServiceRow(index, srv)}
                        currencySymbol={currencySymbol}
                      />
                      {selectedEligibleServices.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveServiceRow(index)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove service"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  Any of these selected services will automatically zero-price to ₹0 when added to checkout.
                </p>
              </div>

              {/* Paid Visits & Bonus Free Visits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Paid Visits Input *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="5"
                    value={passPaidVisitsInput}
                    onChange={(e) => setPassPaidVisitsInput(cleanNumberInput(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">e.g. 5 Paid Visits</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Gift className="w-3 h-3 text-amber-600" />
                    <span>Bonus Free Visits *</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="1"
                    value={passBonusVisitsInput}
                    onChange={(e) => setPassBonusVisitsInput(cleanNumberInput(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-amber-700 font-bold mt-0.5 block">e.g. +1 Free Bonus Visit</span>
                </div>
              </div>

              {/* Calculated Total Visits Formula Card */}
              <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-yellow-500/10 border border-amber-300 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Ticket className="w-4 h-4 text-amber-700" />
                    <span>Total Package Visits</span>
                  </span>
                  <span className="text-base font-black text-amber-950 bg-amber-200/80 px-2.5 py-0.5 rounded-lg border border-amber-400">
                    {calculatedTotalVisits} Total Visits
                  </span>
                </div>

                <div className="text-[11px] text-amber-900/90 pt-1 border-t border-amber-200 flex flex-col gap-0.5">
                  <span>
                    Formula: <strong>{passPaidVisits} Paid Visits</strong> + <strong className="text-amber-700">+{passBonusVisits} Free Bonus</strong> = <strong className="text-amber-950">{calculatedTotalVisits} Total</strong>
                  </span>
                  <span>
                    Advance Recorded: <strong>{currencySymbol}{passAdvancePaidAmount || 0}</strong> • Services: <strong>{selectedEligibleServices.map((s) => s.name).join(', ')}</strong>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddPassModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
                >
                  <Ticket className="w-4 h-4" />
                  <span>Activate Pass &amp; Record Revenue</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DYNAMIC ADD VIP MEMBER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md">
                  <Star className="w-5 h-5 fill-slate-950" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Add New VIP Member</h3>
                  <p className="text-xs text-slate-500">Register customer into the Enreach VIP Club</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="mt-4 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Customer Full Name *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mobile Phone Number *</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="98201 12345"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full pl-16 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Membership Duration / Plan</label>
                <div className="grid grid-cols-2 gap-2">
                  {MEMBERSHIP_PLANS.map((plan) => (
                    <button
                      key={plan.days}
                      type="button"
                      onClick={() => setFormDurationDays(plan.days)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        formDurationDays === plan.days
                          ? 'border-emerald-500 bg-emerald-50/80 text-emerald-950 ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{plan.label}</span>
                        {formDurationDays === plan.days && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider block mt-0.5">
                        {plan.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Membership Start Date</span>
                </label>
                <input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  <span>Calculated Validity Summary</span>
                </span>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-300">
                    📅 Starts: <strong className="text-slate-100">{formattedStartDate}</strong>
                  </span>
                  <span className="text-emerald-400 font-bold">
                    ⏳ Expires: <strong className="text-white underline">{calculatedEndDate}</strong>
                  </span>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer active:scale-95"
                >
                  <Star className="w-4 h-4 fill-white" />
                  <span>Save &amp; Activate Member</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETED / HISTORY PASS DETAIL MODAL */}
      {selectedHistoryPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedHistoryPass.clientName}</h3>
                  <p className="text-xs text-slate-500 font-medium">{selectedHistoryPass.clientPhone}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHistoryPass(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 bg-slate-100 rounded-xl text-xs space-y-1">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Pass ID:</span>
                  <span>{selectedHistoryPass.id}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Package:</span>
                  <span>{selectedHistoryPass.totalVisits}/{selectedHistoryPass.totalVisits} Visits Completed</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Advance Paid:</span>
                  <span>{currencySymbol}{selectedHistoryPass.advancePaidAmount || 0}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Created:</span>
                  <span>{selectedHistoryPass.createdAt}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Redemption Usage Logs ({selectedHistoryPass.usageHistory?.length || 0})
                </h4>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {selectedHistoryPass.usageHistory && selectedHistoryPass.usageHistory.length > 0 ? (
                    selectedHistoryPass.usageHistory.map((log, i) => (
                      <div key={i} className="p-2.5 text-xs flex items-center justify-between">
                        <div>
                          <strong className="text-slate-900">{log.serviceName}</strong>
                          <span className="text-[11px] text-slate-400 block">Served by: {log.staffName || 'Staff'}</span>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            Visit #{log.visitNumber}
                          </span>
                          <span className="text-[10px] text-slate-400 block">{log.date}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400">
                      All {selectedHistoryPass.totalVisits} visits completed in checkout records.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedHistoryPass(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEMBER HISTORY MODAL */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md">
                  <Star className="w-5 h-5 fill-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{selectedMember.clientName}</h3>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-emerald-500 text-slate-950 shadow-xs">
                      VIP
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{selectedMember.clientPhone}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>VIP Membership Details</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-400 text-slate-950">
                  {getDaysRemaining(selectedMember.expiryDate) > 0
                    ? `Active - ${getDaysRemaining(selectedMember.expiryDate)} Days Left`
                    : 'Expired'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[11px]">Start Date</span>
                  <span className="font-semibold text-slate-200 mt-0.5 block flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {formatIndianDate(selectedMember.startDate)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Expiry Date</span>
                  <span className="font-semibold text-slate-200 mt-0.5 block flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {formatIndianDate(selectedMember.expiryDate)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Remaining</span>
                  <span className="font-semibold text-emerald-400 mt-0.5 block">
                    {getDaysRemaining(selectedMember.expiryDate) > 0
                      ? `${getDaysRemaining(selectedMember.expiryDate)} Days Left`
                      : 'Expired'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Complete Visit History ({memberOrders.length} {memberOrders.length === 1 ? 'Visit' : 'Visits'})
              </h4>

              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Date &amp; Time</th>
                      <th className="py-2.5 px-3">Services Taken</th>
                      <th className="py-2.5 px-3">Staff</th>
                      <th className="py-2.5 px-3 text-right">Bill Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {memberOrders.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                          No previous visits logged under this phone number yet.
                        </td>
                      </tr>
                    ) : (
                      memberOrders.map((order, mIdx) => (
                        <tr key={`member-visit-${order.id || 'ord'}-${order.date || ''}-${mIdx}`} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap font-medium">
                            {formatIndianDateTime(order.date)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 max-w-xs">
                            {order.items.map((i) => i.service.name).join(', ') || 'Salon Services'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-medium">{order.staffName || 'Staff'}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                            {currencySymbol}{order.total.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Member ID: {selectedMember.id}</span>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Member Confirmation Modal */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Delete VIP Member</h3>
                <p className="text-xs text-slate-500">Permanent record removal</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Are you sure you want to permanently delete member <strong className="text-slate-900">{memberToDelete.clientName}</strong> ({memberToDelete.clientPhone})? This will permanently delete the membership record.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMember}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                Yes, Delete Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Loyalty Pass Confirmation Modal */}
      {passToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Delete Loyalty Pass</h3>
                <p className="text-xs text-slate-500">Permanent pass removal</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Are you sure you want to permanently delete the Loyalty Pass for <strong className="text-slate-900">{passToDelete.clientName}</strong> ({passToDelete.id})? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPassToDelete(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePass}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                Yes, Delete Pass
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
