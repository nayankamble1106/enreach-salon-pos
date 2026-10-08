import React, { useState, useMemo } from 'react';
import { Order } from '../types';
import {
  Search,
  Receipt,
  User,
  QrCode,
  CreditCard,
  Banknote,
  Calendar,
  MessageCircle,
  TrendingUp,
  Clock,
  BarChart3,
  Sparkles,
  Lock,
  Wallet,
  Database,
  RefreshCw,
  CheckCircle2,
  X,
  Scissors,
  Phone,
  Trash2,
} from 'lucide-react';
import { getWhatsAppReceiptUrl } from '../utils/whatsappReceipt';
import { sortOrdersDescending } from '../utils/orderUtils';
import {
  parseDateToTimestamp,
  formatIndianDate,
  formatIndianDateTime,
  getTimeframeBounds,
  AVAILABLE_YEARS,
  DEFAULT_SELECTED_YEAR,
} from '../utils/dateUtils';
import { SupabaseConfigModal } from './SupabaseConfigModal';
import { resetCloudOrders, isSupabaseConfigured } from '../services/supabase';

interface SalesHistoryTabProps {
  orders: Order[];
  currencySymbol: string;
  onViewReceipt: (order: Order) => void;
  onUpdateOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  onDeleteOrder?: (orderId: string) => void;
  onResetProductionData?: () => Promise<void> | void;
  onPurgeAllSales?: () => void;
  onLockLedger?: () => void;
  onRefreshCloud?: () => Promise<void>;
  isCloudSyncing?: boolean;
}

export type SalesTimeframe = 'daily' | 'weekly' | 'monthly' | 'yearly';

export const SalesHistoryTab: React.FC<SalesHistoryTabProps> = ({
  orders,
  currencySymbol,
  onViewReceipt,
  onUpdateOrders,
  onDeleteOrder,
  onResetProductionData,
  onPurgeAllSales,
  onLockLedger,
  onRefreshCloud,
  isCloudSyncing = false,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<SalesTimeframe>('monthly');
  const [selectedYear, setSelectedYear] = useState<number>(DEFAULT_SELECTED_YEAR);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isProductionResetModalOpen, setIsProductionResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetToastMessage, setResetToastMessage] = useState<string | null>(null);
  const [selectedBreakdown, setSelectedBreakdown] = useState<{
    title: string;
    subtitle: string;
    orders: Order[];
  } | null>(null);
  const [breakdownSearchQuery, setBreakdownSearchQuery] = useState('');

  const handleDeleteSingleOrder = (orderId: string) => {
    if (onDeleteOrder) {
      onDeleteOrder(orderId);
    } else {
      onUpdateOrders((prev) => {
        const updated = prev.filter((o) => o.id !== orderId);
        try {
          localStorage.setItem('backstage_orders', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
    setSelectedBreakdown((prev) => {
      if (!prev) return null;
      const updated = prev.orders.filter((o) => o.id !== orderId);
      return {
        ...prev,
        orders: updated,
        subtitle: `${updated.length} total transactions in period`,
      };
    });
    setResetToastMessage(`🗑️ Invoice ${orderId} permanently deleted.`);
    setTimeout(() => setResetToastMessage(null), 4000);
  };

  const handleResetOrderCounterToZero = () => {
    onUpdateOrders([]);
    try {
      localStorage.removeItem('backstage_orders');
      localStorage.removeItem('sales_history');
      localStorage.removeItem('invoices');
      localStorage.removeItem('backstage_cloud_orders');
      localStorage.removeItem('backstage_cart');
      localStorage.setItem('backstage_orders', '[]');
    } catch {}
    if (onResetProductionData) {
      onResetProductionData();
    }
    setResetToastMessage('🔄 Order sequence counter reset to 0! The next invoice will start at #1.');
    setTimeout(() => setResetToastMessage(null), 5000);
  };

  const handlePurgeAllSalesClick = () => {
    if (onPurgeAllSales) {
      onPurgeAllSales();
    } else {
      onUpdateOrders([]);
      try {
        localStorage.removeItem('backstage_orders');
        localStorage.removeItem('sales_history');
        localStorage.removeItem('invoices');
        localStorage.removeItem('backstage_cloud_orders');
        localStorage.removeItem('backstage_cart');
        localStorage.setItem('backstage_orders', '[]');
      } catch {}
    }
    setResetToastMessage('🧹 Purged All Sales Data! Sales History is now 0 records and next invoice is #1.');
    setTimeout(() => setResetToastMessage(null), 5000);
  };

  const handleExecuteProductionReset = async () => {
    setIsResetting(true);
    try {
      if (onResetProductionData) {
        await onResetProductionData();
      } else {
        onUpdateOrders([]);
        await resetCloudOrders();
        if (typeof window !== 'undefined' && window.salonFirebase?.resetOrders) {
          await window.salonFirebase.resetOrders();
        }
        try {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('backstage_orders');
            localStorage.removeItem('invoices');
            localStorage.removeItem('sales_history');
            localStorage.removeItem('backstage_cloud_orders');
            localStorage.removeItem('backstage_cart');
          }
        } catch {}
      }

      setIsProductionResetModalOpen(false);
      setResetToastMessage('✨ Clean Production Reset complete! Sales History is now empty and next order starts cleanly from #1. All 112+ Services & Settings remain intact.');
      setTimeout(() => setResetToastMessage(null), 6000);
    } catch (err) {
      console.warn('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // Dynamically filter invoices by strict calendar-based timeframe
  const timeframeOrders = useMemo(() => {
    const { start, end } = getTimeframeBounds(selectedTimeframe, new Date(), selectedYear);

    const matched = orders.filter((order) => {
      const orderTs = parseDateToTimestamp(order.date);
      return orderTs >= start && orderTs <= end;
    });

    return sortOrdersDescending(matched);
  }, [orders, selectedTimeframe, selectedYear]);

  // Calculate dynamic financial metrics based on the selected timeframe
  const totalRevenue = useMemo(() => {
    return timeframeOrders.reduce((sum, ord) => sum + ord.total, 0);
  }, [timeframeOrders]);

  const totalInvoiceCount = timeframeOrders.length;

  const averageBillValue = useMemo(() => {
    return totalInvoiceCount > 0 ? Math.round(totalRevenue / totalInvoiceCount) : 0;
  }, [totalRevenue, totalInvoiceCount]);

  // Apply search query over timeframe-filtered invoices while preserving descending sort
  const filteredOrders = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return timeframeOrders;

    const results = timeframeOrders.filter((order) => {
      const matchesClient = order.clientName.toLowerCase().includes(term);
      const matchesPhone = order.clientPhone ? order.clientPhone.toLowerCase().includes(term) : false;
      const matchesId = order.id.toLowerCase().includes(term);
      const matchesStaff = order.staffName ? order.staffName.toLowerCase().includes(term) : false;
      const matchesItemStaff =
        Array.isArray(order.items) &&
        order.items.some((it) => it.stylistName && it.stylistName.toLowerCase().includes(term));
      return matchesClient || matchesPhone || matchesId || matchesStaff || matchesItemStaff;
    });

    return sortOrdersDescending(results);
  }, [timeframeOrders, searchTerm]);

  // 1. Today's Time-Slot Breakdown (9am-12pm, 12pm-4pm, 4pm-8pm, 8pm-12am)
  const todayBreakdown = useMemo(() => {
    const slots = [
      { name: 'Morning', timeRange: '09:00 AM - 12:00 PM', startHour: 9, endHour: 12 },
      { name: 'Afternoon', timeRange: '12:00 PM - 04:00 PM', startHour: 12, endHour: 16 },
      { name: 'Evening', timeRange: '04:00 PM - 08:00 PM', startHour: 16, endHour: 20 },
      { name: 'Night', timeRange: '08:00 PM - 11:59 PM', startHour: 20, endHour: 24 },
    ];

    const { start, end } = getTimeframeBounds('daily');
    const todaysBills = orders.filter((o) => {
      const ts = parseDateToTimestamp(o.date);
      return ts >= start && ts <= end;
    });

    return slots.map((slot) => {
      const inSlot = todaysBills.filter((o) => {
        const d = new Date(parseDateToTimestamp(o.date));
        const hour = d.getHours();
        return hour >= slot.startHour && hour < slot.endHour;
      });
      const revenue = inSlot.reduce((sum, o) => sum + o.total, 0);
      return {
        ...slot,
        count: inSlot.length,
        revenue,
        orders: sortOrdersDescending(inSlot),
      };
    });
  }, [orders]);

  // 2. Weekly Day-Wise Breakdown (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
  const weeklyBreakdown = useMemo(() => {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0, 0);

    return dayNames.map((name, idx) => {
      const dayDate = new Date(monday.getTime() + idx * 24 * 60 * 60 * 1000);
      const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0, 0).getTime();
      const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999).getTime();

      const matchedBills = orders.filter((o) => {
        const ts = parseDateToTimestamp(o.date);
        return ts >= dayStart && ts <= dayEnd;
      });

      const revenue = matchedBills.reduce((sum, o) => sum + o.total, 0);
      return {
        dayName: name,
        formattedDate: formatIndianDate(dayDate),
        count: matchedBills.length,
        revenue,
        isToday: formatIndianDate(dayDate) === formatIndianDate(now),
        orders: sortOrdersDescending(matchedBills),
      };
    });
  }, [orders]);

  // 3. Monthly Month-Wise Breakdown (Jan to Dec of Current Year)
  const monthlyBreakdown = useMemo(() => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const monthFullNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const currentYear = new Date().getFullYear();
    const currentMonthIdx = new Date().getMonth();

    return months.map((mName, mIdx) => {
      const mStart = new Date(currentYear, mIdx, 1, 0, 0, 0, 0).getTime();
      const mEnd = new Date(currentYear, mIdx + 1, 0, 23, 59, 59, 999).getTime();

      const matchedBills = orders.filter((o) => {
        const ts = parseDateToTimestamp(o.date);
        return ts >= mStart && ts <= mEnd;
      });

      const revenue = matchedBills.reduce((sum, o) => sum + o.total, 0);
      return {
        monthName: mName,
        monthFullName: monthFullNames[mIdx],
        monthNumber: mIdx + 1,
        count: matchedBills.length,
        revenue,
        isCurrentMonth: mIdx === currentMonthIdx,
        orders: sortOrdersDescending(matchedBills),
      };
    });
  }, [orders]);

  // 4. Yearly Overview Breakdown (Quarters Q1-Q4 & Year Summary for selectedYear 2026-2036)
  const yearlyBreakdown = useMemo(() => {
    const quarters = [
      { name: 'Q1 (Jan - Mar)', startMonth: 0, endMonth: 2, label: 'Q1' },
      { name: 'Q2 (Apr - Jun)', startMonth: 3, endMonth: 5, label: 'Q2' },
      { name: 'Q3 (Jul - Sep)', startMonth: 6, endMonth: 8, label: 'Q3' },
      { name: 'Q4 (Oct - Dec)', startMonth: 9, endMonth: 11, label: 'Q4' },
    ];

    return quarters.map((q) => {
      const qStart = new Date(selectedYear, q.startMonth, 1, 0, 0, 0, 0).getTime();
      const qEnd = new Date(selectedYear, q.endMonth + 1, 0, 23, 59, 59, 999).getTime();

      const matchedBills = orders.filter((o) => {
        const ts = parseDateToTimestamp(o.date);
        return ts >= qStart && ts <= qEnd;
      });

      const revenue = matchedBills.reduce((sum, o) => sum + o.total, 0);
      return {
        name: q.name,
        label: q.label,
        count: matchedBills.length,
        revenue,
        orders: sortOrdersDescending(matchedBills),
      };
    });
  }, [orders, selectedYear]);

  // Dynamic Annual Revenue for selectedYear (2026 - 2036)
  const selectedYearRevenue = useMemo(() => {
    const start = new Date(selectedYear, 0, 1, 0, 0, 0, 0).getTime();
    const end = new Date(selectedYear, 11, 31, 23, 59, 59, 999).getTime();
    return orders
      .filter((o) => {
        const ts = parseDateToTimestamp(o.date);
        return ts >= start && ts <= end;
      })
      .reduce((sum, o) => sum + o.total, 0);
  }, [orders, selectedYear]);

  const selectedYearInvoicesCount = useMemo(() => {
    const start = new Date(selectedYear, 0, 1, 0, 0, 0, 0).getTime();
    const end = new Date(selectedYear, 11, 31, 23, 59, 59, 999).getTime();
    return orders.filter((o) => {
      const ts = parseDateToTimestamp(o.date);
      return ts >= start && ts <= end;
    }).length;
  }, [orders, selectedYear]);

  // Filtered orders inside Drill-Down Modal
  const modalFilteredOrders = useMemo(() => {
    if (!selectedBreakdown) return [];
    const q = breakdownSearchQuery.toLowerCase().trim();
    if (!q) return selectedBreakdown.orders;
    return selectedBreakdown.orders.filter((ord) => {
      const matchesClient = ord.clientName?.toLowerCase().includes(q);
      const matchesPhone = ord.clientPhone?.toLowerCase().includes(q);
      const matchesId = ord.id?.toLowerCase().includes(q);
      const matchesStaff = ord.staffName?.toLowerCase().includes(q);
      const matchesServices =
        Array.isArray(ord.items) &&
        ord.items.some((it) => it.service.name.toLowerCase().includes(q) || (it.stylistName && it.stylistName.toLowerCase().includes(q)));
      return matchesClient || matchesPhone || matchesId || matchesStaff || matchesServices;
    });
  }, [selectedBreakdown, breakdownSearchQuery]);

  const timeframeConfig: {
    id: SalesTimeframe;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'daily', label: "Today's Sales", sublabel: 'From 12:00 AM Today', icon: Clock },
    { id: 'weekly', label: 'Weekly Sales', sublabel: 'Current Week (Mon-Sun)', icon: Calendar },
    { id: 'monthly', label: 'Monthly Sales', sublabel: 'Current Month (1st-30/31st)', icon: BarChart3 },
    { id: 'yearly', label: 'Yearly Sales', sublabel: `Calendar Year ${selectedYear}`, icon: Sparkles },
  ];

  return (
    <div className="space-y-5">
      {/* Toast Notification for Production Reset */}
      {resetToastMessage && (
        <div className="bg-emerald-700 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <span>{resetToastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setResetToastMessage(null)}
            className="p-1 hover:bg-emerald-800 rounded-lg text-emerald-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cloud Database Status & Quick Sync Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {isSupabaseConfigured() ? 'Supabase Cloud Database' : 'Cloud In-Memory Database'}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}`}>
                0% Phone Memory
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isSupabaseConfigured()
                ? 'Multi-year bills & client records securely synced • Zero phone disk lag'
                : 'Zero-config preview mode active • All bills, memberships & staff sales work seamlessly in RAM'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onRefreshCloud && (
            <button
              type="button"
              onClick={onRefreshCloud}
              disabled={isCloudSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-xs font-semibold transition-colors border border-slate-700 cursor-pointer disabled:opacity-50"
              title="Fetch fresh sales from Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isCloudSyncing ? 'animate-spin' : ''}`} />
              <span>{isCloudSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            title="Configure Supabase project connection"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Cloud Config</span>
          </button>
        </div>
      </div>

      {/* Header Metric Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Financial Ledger</span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">Sales History &amp; Audit Trail</h2>
          <p className="text-xs text-slate-500">
            Live order stream • Sequential numbering (#1, #2...) • Indian Date (DD/MM/YYYY)
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          {onLockLedger && (
            <button
              type="button"
              onClick={onLockLedger}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer border border-slate-200"
            >
              <Lock className="w-3.5 h-3.5 text-slate-600" />
              <span>Lock Ledger</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Timeframe Filter Buttons */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-amber-700" />
            <span>Select Sales Timeframe</span>
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            Active: <strong className="text-slate-800 capitalize">{selectedTimeframe === 'daily' ? "Today's" : selectedTimeframe} Sales</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {timeframeConfig.map((item) => {
            const Icon = item.icon;
            const isActive = selectedTimeframe === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedTimeframe(item.id)}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 border-slate-900 text-white shadow-md ring-2 ring-amber-500/40'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isActive ? 'bg-amber-600/30 text-amber-400' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold block">{item.label}</span>
                    <span className={`text-[10px] block ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                      {item.sublabel}
                    </span>
                  </div>
                </div>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse hidden sm:inline-block" />
                )}
              </button>
            );
          })}
        </div>

        {/* ALWAYS VISIBLE TIMEFRAME BREAKDOWN SECTION */}
        <div className="mt-3 pt-3 border-t border-slate-100 animate-in fade-in duration-200">
          {/* 1. Today's Sales Breakdown: Time-Slots */}
          {selectedTimeframe === 'daily' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Today&apos;s Time-Slot Breakdown (Click to Inspect)</span>
                </span>
                <span className="text-[11px] text-slate-400">Date: {formatIndianDate(new Date())}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {todayBreakdown.map((slot) => (
                  <div
                    key={slot.name}
                    onClick={() =>
                      setSelectedBreakdown({
                        title: `Today's ${slot.name} Sales Breakdown`,
                        subtitle: `${slot.timeRange} • ${slot.count} ${slot.count === 1 ? 'bill' : 'bills'} (${currencySymbol}${slot.revenue.toLocaleString('en-IN')})`,
                        orders: slot.orders,
                      })
                    }
                    className="p-3 bg-slate-50 hover:bg-amber-50/70 hover:border-amber-400 hover:shadow-sm rounded-xl border border-slate-200/90 flex flex-col justify-between cursor-pointer transition-all active:scale-98 group"
                    title="Click to view all bills in this time slot"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-amber-950">{slot.name}</span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {slot.count} {slot.count === 1 ? 'Bill' : 'Bills'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{slot.timeRange}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-medium">Revenue</span>
                      <span className="text-sm font-bold text-slate-900 group-hover:text-amber-900">
                        {currencySymbol}{slot.revenue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Weekly Sales Breakdown: Monday to Sunday */}
          {selectedTimeframe === 'weekly' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" />
                  <span>Weekly Day-Wise Breakdown (Click Any Day)</span>
                </span>
                <span className="text-[11px] text-slate-400">Current Calendar Week</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {weeklyBreakdown.map((day) => (
                  <div
                    key={day.dayName}
                    onClick={() =>
                      setSelectedBreakdown({
                        title: `${day.dayName} Sales Breakdown (${day.formattedDate})`,
                        subtitle: `${day.count} ${day.count === 1 ? 'bill' : 'bills'} processed • Total: ${currencySymbol}${day.revenue.toLocaleString('en-IN')}`,
                        orders: day.orders,
                      })
                    }
                    className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer active:scale-98 hover:shadow-sm ${
                      day.isToday
                        ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-400/50 hover:bg-amber-100/80'
                        : 'bg-slate-50 border-slate-200 hover:bg-amber-50/60 hover:border-amber-400'
                    }`}
                    title={`Click to view all bills for ${day.dayName}`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${day.isToday ? 'text-amber-950' : 'text-slate-800'}`}>
                          {day.dayName.slice(0, 3)}
                        </span>
                        {day.isToday && (
                          <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-200/80 px-1 rounded">
                            Today
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                        {day.formattedDate}
                      </span>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-slate-200/60">
                      <div className="text-[10px] text-slate-500 font-medium">
                        {day.count} {day.count === 1 ? 'bill' : 'bills'}
                      </div>
                      <div className={`text-xs font-extrabold mt-0.5 ${day.isToday ? 'text-amber-950' : 'text-slate-900'}`}>
                        {currencySymbol}{day.revenue.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Monthly Sales Breakdown: Jan to Dec - CLICKABLE FOR ALL 12 MONTHS */}
          {selectedTimeframe === 'monthly' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-amber-700" />
                  <span>Monthly Breakdown (Click Any Month for Invoices)</span>
                </span>
                <span className="text-[11px] text-slate-400">All 12 Calendar Months</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                {monthlyBreakdown.map((m) => (
                  <div
                    key={m.monthName}
                    onClick={() =>
                      setSelectedBreakdown({
                        title: `${m.monthFullName} Sales Breakdown`,
                        subtitle: `Calendar Year ${new Date().getFullYear()} • ${m.count} ${m.count === 1 ? 'bill' : 'bills'} totaling ${currencySymbol}${m.revenue.toLocaleString('en-IN')}`,
                        orders: m.orders,
                      })
                    }
                    className={`p-2 rounded-xl border text-center flex flex-col justify-between transition-all cursor-pointer active:scale-95 hover:shadow-md hover:border-amber-400 ${
                      m.isCurrentMonth
                        ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/60 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-amber-50/70'
                    }`}
                    title={`Click to inspect all sales for ${m.monthFullName}`}
                  >
                    <span className={`text-xs font-bold ${m.isCurrentMonth ? 'text-amber-950' : 'text-slate-800'}`}>
                      {m.monthName}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {m.count} bills
                    </span>
                    <span className={`text-[11px] font-bold mt-1 block truncate ${m.isCurrentMonth ? 'text-amber-950 font-black' : 'text-slate-900'}`}>
                      {currencySymbol}{m.revenue.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. 10-Yearly Sales Breakdown (2026 - 2036): Year Selector, Dynamic Annual Revenue Banner & Quarters */}
          {selectedTimeframe === 'yearly' && (
            <div className="space-y-4">
              {/* Year Selector Dropdown Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-amber-800" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                      10-Yearly Sales Breakdown (2026 – 2036)
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Select calendar year to calculate annual & quarterly metrics
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <label htmlFor="sales-year-select" className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-amber-700" />
                    <span>Select Year:</span>
                  </label>
                  <select
                    id="sales-year-select"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-white border-2 border-amber-300 hover:border-amber-500 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 text-slate-900 font-extrabold text-xs sm:text-sm rounded-xl px-3.5 py-1.5 shadow-2xs outline-none transition-all cursor-pointer"
                  >
                    {AVAILABLE_YEARS.map((yr) => (
                      <option key={yr} value={yr}>
                        Year {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Annual Revenue Banner */}
              <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-amber-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/25 text-amber-200 border border-amber-400/30 text-[11px] font-bold tracking-wide uppercase">
                    <Calendar className="w-3 h-3 text-amber-300" />
                    <span>Annual Revenue Summary</span>
                  </div>
                  <h4 className="text-lg sm:text-2xl font-black text-amber-50 tracking-tight">
                    {selectedYear} Total Revenue:{' '}
                    <span className="text-amber-300 font-black">
                      {currencySymbol}{selectedYearRevenue.toLocaleString('en-IN')}
                    </span>
                  </h4>
                  <p className="text-xs text-amber-200/80">
                    Cumulative gross revenue generated across all 4 quarters for calendar year {selectedYear}.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="bg-black/30 backdrop-blur-xs border border-amber-400/30 rounded-xl px-4 py-2.5 text-right">
                    <span className="text-[10px] uppercase tracking-wider text-amber-200/80 block font-bold">
                      Yearly Invoices
                    </span>
                    <span className="text-base sm:text-xl font-black text-white">
                      {selectedYearInvoicesCount} {selectedYearInvoicesCount === 1 ? 'Bill' : 'Bills'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quarterly Breakdown Cards Below Banner */}
              <div>
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Quarterly Breakdown for {selectedYear}</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Click Any Quarter to Inspect Bills</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {yearlyBreakdown.map((q) => (
                    <div
                      key={q.name}
                      onClick={() =>
                        setSelectedBreakdown({
                          title: `${q.name} (${selectedYear}) Sales Breakdown`,
                          subtitle: `${q.count} invoices processed • Total Revenue: ${currencySymbol}${q.revenue.toLocaleString('en-IN')}`,
                          orders: q.orders,
                        })
                      }
                      className="p-3 bg-slate-50 hover:bg-amber-50/70 hover:border-amber-400 rounded-xl border border-slate-200 cursor-pointer transition-all active:scale-98 hover:shadow-xs group"
                      title={`Click to inspect all bills for ${q.name} ${selectedYear}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 group-hover:text-amber-950 block">{q.name}</span>
                        <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-md border border-amber-200/60">
                          {selectedYear}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{q.count} invoices processed</span>
                      <div className="mt-2 pt-2 border-t border-slate-200 text-sm font-extrabold text-slate-900 group-hover:text-amber-900">
                        {currencySymbol}{q.revenue.toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* 3 Calculated Metrics Display Cards - Clickable for Instant Period Drill-Down */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Revenue */}
        <div
          onClick={() =>
            setSelectedBreakdown({
              title: `${selectedTimeframe.toUpperCase()} Total Revenue Breakdown`,
              subtitle: `Settled gross across ${totalInvoiceCount} ${totalInvoiceCount === 1 ? 'bill' : 'bills'}`,
              orders: timeframeOrders,
            })
          }
          className="bg-white border border-slate-200/80 hover:border-amber-400 rounded-2xl p-4 shadow-xs cursor-pointer transition-all active:scale-98 group"
          title="Click to view detailed list of all bills in this period"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-amber-800">
              Total Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 group-hover:text-amber-950 mt-2">
            {currencySymbol}{totalRevenue.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Settled gross for <strong className="text-slate-600 capitalize">{selectedTimeframe === 'daily' ? "Today's" : selectedTimeframe}</strong></span>
            <span className="text-amber-700 font-semibold text-[10px] group-hover:underline">Inspect &rarr;</span>
          </p>
        </div>

        {/* Total Invoices */}
        <div
          onClick={() =>
            setSelectedBreakdown({
              title: `${selectedTimeframe.toUpperCase()} Invoice Stream Breakdown`,
              subtitle: `${totalInvoiceCount} total transactions in period`,
              orders: timeframeOrders,
            })
          }
          className="bg-white border border-slate-200/80 hover:border-blue-400 rounded-2xl p-4 shadow-xs cursor-pointer transition-all active:scale-98 group"
          title="Click to view detailed list of all invoices"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-blue-800">
              Total Invoices
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 group-hover:text-blue-950 mt-2">
            {totalInvoiceCount} {totalInvoiceCount === 1 ? 'Bill' : 'Bills'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Generated in <strong className="text-slate-600 capitalize">{selectedTimeframe === 'daily' ? "Today's" : selectedTimeframe}</strong></span>
            <span className="text-blue-700 font-semibold text-[10px] group-hover:underline">Inspect &rarr;</span>
          </p>
        </div>

        {/* Average Bill Value */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Bill Value</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {currencySymbol}{averageBillValue.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Per-ticket average across {totalInvoiceCount} {totalInvoiceCount === 1 ? 'visit' : 'visits'}
          </p>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter by Client Name, Phone, Staff Member, or Order Number (#1, #2...)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-xs"
        />
      </div>

      {/* Orders Table - Sorted Descending (#1000 at top, #1 at bottom) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">INVOICE NO. &amp; DATE</th>
                <th className="py-3 px-4">CLIENT INFO</th>
                <th className="py-3 px-4">SERVED BY</th>
                <th className="py-3 px-4">SERVICES RENDERED</th>
                <th className="py-3 px-4">PAYMENT MODE</th>
                <th className="py-3 px-4 text-right">FINAL AMOUNT</th>
                <th className="py-3 px-4 text-center">RECEIPT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-1">
                      <p className="font-semibold text-slate-600">No transactions recorded</p>
                      <p className="text-xs">
                        No orders recorded for <strong className="capitalize">{selectedTimeframe === 'daily' ? "Today's" : selectedTimeframe} Sales</strong>
                        {searchTerm ? ` matching "${searchTerm}"` : ''}.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, idx) => (
                  <tr key={`order-row-${order.id || 'ord'}-${order.date || ''}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{order.id}</div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{formatIndianDateTime(order.date)}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{order.clientName}</div>
                      <div className="text-[11px] text-slate-500">{order.clientPhone}</div>
                      {order.isMember ? (
                        <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-200">
                          ⭐ VIP Member
                        </span>
                      ) : null}
                      {order.discountPercentage !== undefined && order.discountPercentage > 0 && !order.isMember ? (
                        <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                          🏷️ {order.discountPercentage}% Off
                        </span>
                      ) : null}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">
                        <User className="w-3 h-3 text-slate-500" />
                        <span>{order.staffName || 'Kunal'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="truncate font-medium text-slate-800">
                        {order.items.map((i) => `${i.service.name} (x${i.quantity})`).join(', ')}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {order.items.length} unique {order.items.length === 1 ? 'item' : 'items'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide bg-slate-100 text-slate-700">
                        {order.paymentMethod === 'upi' && <QrCode className="w-3 h-3 text-amber-700" />}
                        {order.paymentMethod === 'card' && <CreditCard className="w-3 h-3 text-amber-700" />}
                        {order.paymentMethod === 'cash' && <Banknote className="w-3 h-3 text-amber-700" />}
                        <span>{order.paymentMethod}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="font-bold text-slate-900 text-sm">
                        {currencySymbol}{order.total.toLocaleString('en-IN')}
                      </span>
                      <div className="text-[10px] text-slate-400">Tax: {currencySymbol}0</div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewReceipt(order)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                        >
                          <Receipt className="w-3.5 h-3.5 text-amber-700" />
                          <span>Bill</span>
                        </button>
                        <a
                          href={getWhatsAppReceiptUrl(order)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                          title="Send Receipt on WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-[#25D366] fill-[#25D366]" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supabase Cloud Database Configuration Modal */}
      <SupabaseConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onConfigSaved={() => {
          if (onRefreshCloud) {
            onRefreshCloud();
          }
        }}
      />

      {/* DETAILED SALES BREAKDOWN DRILL-DOWN MODAL */}
      {selectedBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3.5 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md shrink-0">
                  <BarChart3 className="w-5 h-5 font-bold" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    {selectedBreakdown.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedBreakdown.subtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedBreakdown(null);
                  setBreakdownSearchQuery('');
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics & Filter Bar */}
            <div className="py-3 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 -mx-4 sm:-mx-6 px-4 sm:px-6 border-b border-slate-200">
              <div className="flex items-center gap-2 sm:gap-4 text-xs font-semibold text-slate-700">
                <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                  Total Bills: <strong className="text-slate-900">{selectedBreakdown.orders.length}</strong>
                </span>
                <span className="bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-1 rounded-lg">
                  Total Sales: <strong className="text-amber-950">{currencySymbol}{selectedBreakdown.orders.reduce((sum, o) => sum + o.total, 0).toLocaleString('en-IN')}</strong>
                </span>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter within this period..."
                  value={breakdownSearchQuery}
                  onChange={(e) => setBreakdownSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Modal Orders List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 -mx-4 sm:-mx-6 px-4 sm:px-6">
              {modalFilteredOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-600 text-sm">No transactions found</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {breakdownSearchQuery
                      ? `No bills match query "${breakdownSearchQuery}" in this selected period.`
                      : 'No customer orders have been finalized in this period yet.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {modalFilteredOrders.map((order, idx) => (
                    <div
                      key={`modal-order-${order.id || 'ord'}-${order.date || ''}-${idx}`}
                      className="py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 -mx-4 sm:-mx-6 px-4 sm:px-6 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                          {order.id}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{order.clientName || 'Walk-in Client'}</span>
                            {order.clientPhone && (
                              <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{order.clientPhone}</span>
                              </span>
                            )}
                            {order.isMember && (
                              <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.2 rounded border border-amber-300">
                                VIP Member
                              </span>
                            )}
                            {order.paymentMethod && (
                              <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.2 rounded capitalize">
                                {order.paymentMethod}
                              </span>
                            )}
                          </div>

                          {/* Rendered Services */}
                          <div className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-700">Services:</span>
                            {order.items && order.items.length > 0 ? (
                              order.items.map((it, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[11px] text-slate-800"
                                >
                                  <Scissors className="w-3 h-3 text-amber-600" />
                                  <span>{it.service.name}{it.quantity > 1 ? ` (x${it.quantity})` : ''}</span>
                                  {it.stylistName && (
                                    <span className="text-[10px] text-slate-400">({it.stylistName})</span>
                                  )}
                                </span>
                              ))
                            ) : (
                              <span>Salon Services</span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatIndianDateTime(order.date)}</span>
                            </span>
                            {order.staffName && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400" />
                                <span>Staff: {order.staffName}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Price & Receipt Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total</span>
                          <span className="text-base font-black text-slate-900">
                            {currencySymbol}{order.total.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onViewReceipt(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                          >
                            <Receipt className="w-3.5 h-3.5 text-amber-700" />
                            <span>Bill</span>
                          </button>
                          <a
                            href={getWhatsAppReceiptUrl(order)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                            title="Send Receipt on WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-[#25D366] fill-[#25D366]" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-200 shrink-0 flex items-center justify-between text-xs text-slate-500">
              <span>Showing {modalFilteredOrders.length} of {selectedBreakdown.orders.length} transactions</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedBreakdown(null);
                  setBreakdownSearchQuery('');
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Production Clean Reset Confirmation Modal */}
      {isProductionResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150 space-y-4">
            <button
              type="button"
              onClick={() => setIsProductionResetModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                <Sparkles className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Clean Test Data &amp; Reset for Production
                </h3>
                <p className="text-xs text-slate-500">Prepare terminal for 100% fresh live client billing</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>What will happen upon reset:</span>
              </div>
              <ul className="list-disc list-inside text-slate-600 space-y-1 pl-1 text-[11px]">
                <li>Wipes all test/dummy invoices &amp; orders.</li>
                <li>Invoice counter is <strong>reset to #1</strong> for the 1st real customer.</li>
                <li>Wipes test memberships, loyalty passes &amp; temporary cart items.</li>
                <li>Resets staff monthly sales figures back to ₹0 while keeping stylist profiles.</li>
              </ul>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 font-medium space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <Scissors className="w-3.5 h-3.5" />
                <span>Guaranteed Data Safety:</span>
              </div>
              <p className="text-[11px]">
                Your <strong>112+ Salon Services Catalog</strong>, Custom Categories, Salon Logo, GST &amp; Settings will <strong>REMAIN 100% INTACT</strong> and are NOT deleted.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setIsProductionResetModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleExecuteProductionReset}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Confirm Reset (#1)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
