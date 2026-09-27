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
} from 'lucide-react';
import { getWhatsAppReceiptUrl } from '../utils/whatsappReceipt';
import { sortOrdersDescending } from '../utils/orderUtils';
import {
  parseDateToTimestamp,
  formatIndianDate,
  formatIndianDateTime,
  getTimeframeBounds,
} from '../utils/dateUtils';

interface SalesHistoryTabProps {
  orders: Order[];
  currencySymbol: string;
  onViewReceipt: (order: Order) => void;
  onUpdateOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  onLockLedger?: () => void;
}

export type SalesTimeframe = 'daily' | 'weekly' | 'monthly' | 'yearly';

export const SalesHistoryTab: React.FC<SalesHistoryTabProps> = ({
  orders,
  currencySymbol,
  onViewReceipt,
  onUpdateOrders,
  onLockLedger,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<SalesTimeframe>('monthly');
  const [searchTerm, setSearchTerm] = useState('');


  // Dynamically filter invoices by strict calendar-based timeframe
  const timeframeOrders = useMemo(() => {
    const { start, end } = getTimeframeBounds(selectedTimeframe);

    const matched = orders.filter((order) => {
      const orderTs = parseDateToTimestamp(order.date);
      return orderTs >= start && orderTs <= end;
    });

    return sortOrdersDescending(matched);
  }, [orders, selectedTimeframe]);

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
      return matchesClient || matchesPhone || matchesId || matchesStaff;
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
      };
    });
  }, [orders]);

  // 3. Monthly Month-Wise Breakdown (Jan to Dec of Current Year)
  const monthlyBreakdown = useMemo(() => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
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
        monthNumber: mIdx + 1,
        count: matchedBills.length,
        revenue,
        isCurrentMonth: mIdx === currentMonthIdx,
      };
    });
  }, [orders]);

  // 4. Yearly Overview Breakdown (Quarters Q1-Q4 & Year Summary)
  const yearlyBreakdown = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const quarters = [
      { name: 'Q1 (Jan - Mar)', startMonth: 0, endMonth: 2 },
      { name: 'Q2 (Apr - Jun)', startMonth: 3, endMonth: 5 },
      { name: 'Q3 (Jul - Sep)', startMonth: 6, endMonth: 8 },
      { name: 'Q4 (Oct - Dec)', startMonth: 9, endMonth: 11 },
    ];

    return quarters.map((q) => {
      const qStart = new Date(currentYear, q.startMonth, 1, 0, 0, 0, 0).getTime();
      const qEnd = new Date(currentYear, q.endMonth + 1, 0, 23, 59, 59, 999).getTime();

      const matchedBills = orders.filter((o) => {
        const ts = parseDateToTimestamp(o.date);
        return ts >= qStart && ts <= qEnd;
      });

      const revenue = matchedBills.reduce((sum, o) => sum + o.total, 0);
      return {
        name: q.name,
        count: matchedBills.length,
        revenue,
      };
    });
  }, [orders]);

  const timeframeConfig: {
    id: SalesTimeframe;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'daily', label: "Today's Sales", sublabel: 'From 12:00 AM Today', icon: Clock },
    { id: 'weekly', label: 'Weekly Sales', sublabel: 'Current Week (Mon-Sun)', icon: Calendar },
    { id: 'monthly', label: 'Monthly Sales', sublabel: 'Current Month (1st-30/31st)', icon: BarChart3 },
    { id: 'yearly', label: 'Yearly Sales', sublabel: `Calendar Year ${new Date().getFullYear()}`, icon: Sparkles },
  ];

  return (
    <div className="space-y-5">
      {/* Header Metric Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Financial Ledger</span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">Sales History &amp; Audit Trail</h2>
          <p className="text-xs text-slate-500">
            Live order stream • Sequential numbering (#1, #2...) • Indian Date (DD/MM/YYYY)
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset all sales history transactions? Ledger will be reset to 0 invoices and ₹0 revenue.')) {
                onUpdateOrders([]);
                try {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('backstage_orders');
                    localStorage.removeItem('invoices');
                    localStorage.removeItem('sales_history');
                  }
                } catch {
                  // localStorage fallback
                }
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-colors cursor-pointer border border-amber-200"
            title="Reset sales history to clean state"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Reset Counter to #1</span>
          </button>

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
                  <span>Today&apos;s Time-Slot Breakdown</span>
                </span>
                <span className="text-[11px] text-slate-400">Date: {formatIndianDate(new Date())}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {todayBreakdown.map((slot) => (
                  <div
                    key={slot.name}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/90 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{slot.name}</span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {slot.count} {slot.count === 1 ? 'Bill' : 'Bills'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{slot.timeRange}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-medium">Revenue</span>
                      <span className="text-sm font-bold text-slate-900">
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
                  <span>Weekly Day-Wise Breakdown (Mon - Sun)</span>
                </span>
                <span className="text-[11px] text-slate-400">Current Calendar Week</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {weeklyBreakdown.map((day) => (
                  <div
                    key={day.dayName}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between transition-colors ${
                      day.isToday
                        ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-400/50'
                        : 'bg-slate-50 border-slate-200'
                    }`}
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

          {/* 3. Monthly Sales Breakdown: Jan to Dec - ALWAYS DIRECTLY VISIBLE */}
          {selectedTimeframe === 'monthly' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-amber-700" />
                  <span>Monthly Breakdown for Calendar Year {new Date().getFullYear()}</span>
                </span>
                <span className="text-[11px] text-slate-400">All 12 Calendar Months</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                {monthlyBreakdown.map((m) => (
                  <div
                    key={m.monthName}
                    className={`p-2 rounded-xl border text-center flex flex-col justify-between ${
                      m.isCurrentMonth
                        ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-400/50'
                        : 'bg-slate-50 border-slate-200'
                    }`}
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

          {/* 4. Yearly Sales Breakdown: Calendar Year & Quarters */}
          {selectedTimeframe === 'yearly' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>Quarterly Breakdown for Calendar Year {new Date().getFullYear()}</span>
                </span>
                <span className="text-[11px] text-slate-400">Annual Summary</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {yearlyBreakdown.map((q) => (
                  <div key={q.name} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-900 block">{q.name}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{q.count} invoices processed</span>
                    <div className="mt-2 pt-2 border-t border-slate-200 text-sm font-extrabold text-slate-900">
                      {currencySymbol}{q.revenue.toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>


      {/* 3 Calculated Metrics Display Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Revenue */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {currencySymbol}{totalRevenue.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Settled gross for <strong className="text-slate-600 capitalize">{selectedTimeframe === 'daily' ? "Today's" : selectedTimeframe}</strong> period
          </p>
        </div>

        {/* Total Invoices */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Invoices</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {totalInvoiceCount} {totalInvoiceCount === 1 ? 'Bill' : 'Bills'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Invoices generated in <strong className="text-slate-600 capitalize">{selectedTimeframe === 'daily' ? "Today's" : selectedTimeframe}</strong>
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
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
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
    </div>
  );
};
