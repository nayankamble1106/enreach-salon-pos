import React, { useState, useMemo } from 'react';
import { Order } from '../types';
import {
  Users,
  Lock,
  ArrowRight,
  X,
  Calendar,
  Clock,
  BarChart3,
  Sparkles,
  TrendingUp,
  Wallet,
  Scissors,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { parseDateToTimestamp, formatIndianDate, getTimeframeBounds } from '../utils/dateUtils';
import { cleanNumberInput } from '../utils/numberUtils';
import { SalesTimeframe } from './SalesHistoryTab';


export interface StaffServiceRecord {
  id: string;
  date: string;
  clientName: string;
  serviceName: string;
  amount: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  totalSalesThisMonth: number;
  history: StaffServiceRecord[];
}

interface StaffTabProps {
  staffMembers: StaffMember[];
  orders: Order[];
  currencySymbol: string;
  onLockStaff: () => void;
  onUpdateStaff?: (updatedStaff: StaffMember[]) => void;
  onDeleteStaffRecord?: (staffId: string, recordId: string) => void;
  onResetStaffSales?: (staffId: string) => void;
  onPurgeStaffLogs?: () => void;
}

export const StaffTab: React.FC<StaffTabProps> = ({
  staffMembers,
  orders,
  currencySymbol,
  onLockStaff,
  onUpdateStaff,
  onDeleteStaffRecord,
  onResetStaffSales,
  onPurgeStaffLogs,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<SalesTimeframe>('monthly');
  const [selectedStaffModal, setSelectedStaffModal] = useState<StaffMember | null>(null);
  const [purgeToastMessage, setPurgeToastMessage] = useState<string | null>(null);

  const handleDeleteSingleStaffRecord = (staffId: string, recordId: string) => {
    if (onDeleteStaffRecord) {
      onDeleteStaffRecord(staffId, recordId);
    } else {
      const updated = staffMembers.map((s) => {
        if (s.id === staffId || s.name.toLowerCase() === staffId.toLowerCase()) {
          const newHist = (s.history || []).filter((h) => h.id !== recordId);
          const newSales = newHist.reduce((sum, h) => sum + h.amount, 0);
          return { ...s, history: newHist, totalSalesThisMonth: newSales };
        }
        return s;
      });
      if (onUpdateStaff) onUpdateStaff(updated);
      try {
        localStorage.setItem('backstage_staff_performance', JSON.stringify(updated));
      } catch {}
    }
    setPurgeToastMessage('🗑️ Staff service log record permanently deleted.');
    setTimeout(() => setPurgeToastMessage(null), 3500);
  };

  const handleResetSingleStaff = (staffId: string) => {
    if (onResetStaffSales) {
      onResetStaffSales(staffId);
    } else {
      const updated = staffMembers.map((s) => {
        if (s.id === staffId || s.name.toLowerCase() === staffId.toLowerCase()) {
          return { ...s, history: [], totalSalesThisMonth: 0 };
        }
        return s;
      });
      if (onUpdateStaff) onUpdateStaff(updated);
      try {
        localStorage.setItem('backstage_staff_performance', JSON.stringify(updated));
      } catch {}
    }
    setPurgeToastMessage('🔄 Staff performance reset to 0.');
    setTimeout(() => setPurgeToastMessage(null), 3500);
  };

  const handlePurgeStaffLogsClick = () => {
    if (onPurgeStaffLogs) {
      onPurgeStaffLogs();
    } else {
      const resetStaff = staffMembers.map((s) => ({
        ...s,
        totalSalesThisMonth: 0,
        history: [],
      }));
      if (onUpdateStaff) onUpdateStaff(resetStaff);
      try {
        localStorage.setItem('backstage_staff_performance', JSON.stringify(resetStaff));
      } catch {}
    }
    setPurgeToastMessage('🧹 Purged All Staff Logs! Staff sales and commission logs are now reset to 0.');
    setTimeout(() => setPurgeToastMessage(null), 5000);
  };
  
  // Sub-period selection state for granular breakdown blocks (e.g. specific month, day, quarter, or time slot)
  const [selectedSubPeriod, setSelectedSubPeriod] = useState<{
    timeframe: SalesTimeframe;
    id: string;
    label: string;
    start: number;
    end: number;
  } | null>(null);

  // 2. DYNAMIC CUSTOM COMMISSION PERCENTAGE INPUT (Defaults to 0%)
  const [commissionRateInput, setCommissionRateInput] = useState<string>('0');

  const commissionRate = useMemo(() => {
    if (!commissionRateInput.trim()) return 0;
    const num = parseFloat(commissionRateInput);
    return isNaN(num) || num < 0 ? 0 : Math.min(100, num);
  }, [commissionRateInput]);

  const handleCommissionInputChange = (val: string) => {
    const cleaned = cleanNumberInput(val, true);
    if (cleaned !== '' && Number(cleaned) > 100) {
      setCommissionRateInput('100');
    } else {
      setCommissionRateInput(cleaned);
    }
  };

  const handleTimeframeSelect = (tf: SalesTimeframe) => {
    setSelectedTimeframe(tf);
    setSelectedSubPeriod(null);
  };

  // Timeframe configurations
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

    const now = new Date();
    return slots.map((slot) => {
      const slotStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), slot.startHour, 0, 0, 0).getTime();
      const slotEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        slot.endHour === 24 ? 23 : slot.endHour - 1,
        59,
        59,
        999
      ).getTime();

      const inSlot = todaysBills.filter((o) => {
        const d = new Date(parseDateToTimestamp(o.date));
        const hour = d.getHours();
        return hour >= slot.startHour && hour < slot.endHour;
      });
      const revenue = inSlot.reduce((sum, o) => sum + o.total, 0);
      return {
        ...slot,
        start: slotStart,
        end: slotEnd,
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
        start: dayStart,
        end: dayEnd,
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
        start: mStart,
        end: mEnd,
        count: matchedBills.length,
        revenue,
        isCurrentMonth: mIdx === currentMonthIdx,
      };
    });
  }, [orders]);

  // 4. Yearly Overview Breakdown (Quarters Q1-Q4)
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
        start: qStart,
        end: qEnd,
        count: matchedBills.length,
        revenue,
      };
    });
  }, [orders]);

  // Active calculation bounds (dynamically reflects selected sub-period or parent timeframe)
  const activeBounds = useMemo(() => {
    if (selectedSubPeriod && selectedSubPeriod.timeframe === selectedTimeframe) {
      return {
        start: selectedSubPeriod.start,
        end: selectedSubPeriod.end,
        label: selectedSubPeriod.label,
        isCustomSubPeriod: true,
      };
    }
    const bounds = getTimeframeBounds(selectedTimeframe);
    const labelMap: Record<SalesTimeframe, string> = {
      daily: "Today's Sales",
      weekly: 'Current Week',
      monthly: 'Current Month',
      yearly: `Calendar Year ${new Date().getFullYear()}`,
    };
    return {
      start: bounds.start,
      end: bounds.end,
      label: labelMap[selectedTimeframe],
      isCustomSubPeriod: false,
    };
  }, [selectedTimeframe, selectedSubPeriod]);

  // Calculate staff performance metrics dynamically based on the active chosen period
  const staffPerformanceData = useMemo(() => {
    const { start, end } = activeBounds;

    // Orders in active selected timeframe / breakdown period
    const periodOrders = orders.filter((o) => {
      const ts = parseDateToTimestamp(o.date);
      return ts >= start && ts <= end;
    });

    return staffMembers.map((staff) => {
      // Accurately credit each employee ONLY for the specific services they performed
      const staffRecords: StaffServiceRecord[] = [];
      let totalSales = 0;
      let servicesCount = 0;
      let invoiceCount = 0;

      periodOrders.forEach((o) => {
        // Find items in this order assigned to this specific staff member
        const staffItems = (o.items || []).filter((i) => {
          if (i.stylistName) {
            return i.stylistName.trim().toLowerCase() === staff.name.trim().toLowerCase();
          }
          if (o.staffName) {
            const splitNames = o.staffName.split(',').map((s) => s.trim().toLowerCase());
            return splitNames.includes(staff.name.trim().toLowerCase());
          }
          return false;
        });

        if (staffItems.length > 0) {
          invoiceCount++;
          const orderGross = (o.items || []).reduce((s, it) => s + it.service.price * it.quantity, 0);
          const staffGross = staffItems.reduce((s, it) => s + it.service.price * it.quantity, 0);
          const creditedAmount =
            orderGross > 0 ? Math.round((staffGross / orderGross) * o.total) : staffGross;
          const count = staffItems.reduce((s, it) => s + it.quantity, 0);

          totalSales += creditedAmount;
          servicesCount += count;

          staffRecords.push({
            id: `ord-rec-${o.id}-${staff.name}-${o.date || ''}-${staffRecords.length}`,
            date: o.date,
            clientName: o.clientName || 'Walk-in Client',
            serviceName: staffItems
              .map((i) => `${i.service.name}${i.quantity > 1 ? ` (x${i.quantity})` : ''}`)
              .join(', '),
            amount: creditedAmount,
          });
        }
      });

      const historyList: StaffServiceRecord[] = Array.isArray(staff.history)
        ? staff.history
        : typeof staff.history === 'object' && staff.history !== null
        ? (Object.values(staff.history) as StaffServiceRecord[])
        : [];

      // Fallback: If no orders in live ledger yet, check staff.history
      if (staffRecords.length === 0 && historyList.length > 0) {
        const historyInPeriod = historyList.filter((h) => {
          const ts = parseDateToTimestamp(h.date);
          return ts >= start && ts <= end;
        });
        const historySales = historyInPeriod.reduce((sum, h) => sum + h.amount, 0);
        return {
          ...staff,
          periodSales: historySales,
          servicesCount: historyInPeriod.length,
          invoiceCount: historyInPeriod.length,
          periodRecords: historyInPeriod,
        };
      }

      return {
        ...staff,
        periodSales: totalSales,
        servicesCount,
        invoiceCount,
        periodRecords: staffRecords,
      };
    });
  }, [staffMembers, orders, activeBounds]);

  // Overall total team sales for active chosen period
  const totalTeamRevenue = useMemo(() => {
    return staffPerformanceData.reduce((sum, s) => sum + s.periodSales, 0);
  }, [staffPerformanceData]);

  const totalTeamServices = useMemo(() => {
    return staffPerformanceData.reduce((sum, s) => sum + s.servicesCount, 0);
  }, [staffPerformanceData]);

  // Selected staff member detailed records for the modal
  const modalStaffDetails = useMemo(() => {
    if (!selectedStaffModal) return null;
    return (
      staffPerformanceData.find((s) => s.id === selectedStaffModal.id) || null
    );
  }, [selectedStaffModal, staffPerformanceData]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {purgeToastMessage && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <span>{purgeToastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setPurgeToastMessage(null)}
            className="p-1 hover:bg-emerald-700 rounded-lg text-emerald-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Team Performance</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-0.5">Staff Performance Dashboard</h2>
          <p className="text-xs text-slate-500">
            Calculate accurate stylist salaries, commissions &amp; service revenue across timeframes
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-right">
            <span className="text-[10px] uppercase font-bold text-amber-800 block">
              Team Revenue ({activeBounds.label})
            </span>
            <span className="text-base font-bold text-amber-900">
              {currencySymbol}{totalTeamRevenue.toLocaleString('en-IN')}
            </span>
          </div>

          <button
            type="button"
            onClick={onLockStaff}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer border border-slate-200"
          >
            <Lock className="w-3.5 h-3.5 text-slate-600" />
            <span>Lock Staff</span>
          </button>
        </div>
      </div>

      {/* 4 Timeframe Filter Buttons & Interactive Breakdown Grid */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-amber-700" />
            <span>Select Staff Calculation Timeframe</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-medium">
              Active Period: <strong className="text-slate-800 font-bold">{activeBounds.label}</strong>
            </span>
            {activeBounds.isCustomSubPeriod && (
              <button
                type="button"
                onClick={() => setSelectedSubPeriod(null)}
                className="text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer border border-amber-300"
                title="Reset to full timeframe"
              >
                ✕ View All
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {timeframeConfig.map((item) => {
            const Icon = item.icon;
            const isActive = selectedTimeframe === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTimeframeSelect(item.id)}
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
                  <span>Today&apos;s Time-Slot Breakdown (Click to Calculate Staff for Slot)</span>
                </span>
                <span className="text-[11px] text-slate-400">Date: {formatIndianDate(new Date())}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {todayBreakdown.map((slot) => {
                  const isSelected = selectedSubPeriod?.id === slot.name && selectedSubPeriod?.timeframe === 'daily';
                  return (
                    <div
                      key={slot.name}
                      onClick={() =>
                        setSelectedSubPeriod(
                          isSelected
                            ? null
                            : {
                                timeframe: 'daily',
                                id: slot.name,
                                label: `Today's ${slot.name} Slot`,
                                start: slot.start,
                                end: slot.end,
                              }
                        )
                      }
                      className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all active:scale-98 group ${
                        isSelected
                          ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-500 shadow-xs'
                          : 'bg-slate-50 hover:bg-amber-50/70 hover:border-amber-400 hover:shadow-xs border-slate-200/90'
                      }`}
                      title={`Click to calculate staff performance for ${slot.name} (${slot.timeRange})`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isSelected ? 'text-amber-950' : 'text-slate-900 group-hover:text-amber-950'}`}>
                            {slot.name}
                          </span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                            isSelected ? 'bg-amber-200 text-amber-900 border-amber-300' : 'bg-white text-slate-500 border-slate-200'
                          }`}>
                            {slot.count} {slot.count === 1 ? 'Bill' : 'Bills'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{slot.timeRange}</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-medium">Sales</span>
                        <span className={`text-sm font-bold ${isSelected ? 'text-amber-950' : 'text-slate-900 group-hover:text-amber-900'}`}>
                          {currencySymbol}{slot.revenue.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Weekly Sales Breakdown: Monday to Sunday */}
          {selectedTimeframe === 'weekly' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" />
                  <span>Weekly 7-Day Breakdown (Click Any Day to Calculate Staff Performance)</span>
                </span>
                <span className="text-[11px] text-slate-400">Current Calendar Week</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {weeklyBreakdown.map((day) => {
                  const isSelected = selectedSubPeriod?.id === day.dayName && selectedSubPeriod?.timeframe === 'weekly';
                  return (
                    <div
                      key={day.dayName}
                      onClick={() =>
                        setSelectedSubPeriod(
                          isSelected
                            ? null
                            : {
                                timeframe: 'weekly',
                                id: day.dayName,
                                label: `${day.dayName} (${day.formattedDate})`,
                                start: day.start,
                                end: day.end,
                              }
                        )
                      }
                      className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer active:scale-98 hover:shadow-xs ${
                        isSelected
                          ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-500 shadow-xs'
                          : day.isToday
                          ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-400/50 hover:bg-amber-100/80'
                          : 'bg-slate-50 border-slate-200 hover:bg-amber-50/60 hover:border-amber-400'
                      }`}
                      title={`Click to calculate staff sales and commissions for ${day.dayName}`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isSelected || day.isToday ? 'text-amber-950' : 'text-slate-800'}`}>
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
                        <div className={`text-xs font-extrabold mt-0.5 ${isSelected || day.isToday ? 'text-amber-950' : 'text-slate-900'}`}>
                          {currencySymbol}{day.revenue.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Monthly Sales Breakdown: Jan to Dec - 12-MONTH GRID (CLICKABLE FOR ALL 12 MONTHS) */}
          {selectedTimeframe === 'monthly' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-amber-700" />
                  <span>12-Month Breakdown (Click Any Month to Calculate Staff Salaries &amp; Commissions)</span>
                </span>
                <span className="text-[11px] text-slate-400">Calendar Year {new Date().getFullYear()}</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                {monthlyBreakdown.map((m) => {
                  const isSelected = selectedSubPeriod?.id === m.monthName && selectedSubPeriod?.timeframe === 'monthly';
                  return (
                    <div
                      key={m.monthName}
                      onClick={() =>
                        setSelectedSubPeriod(
                          isSelected
                            ? null
                            : {
                                timeframe: 'monthly',
                                id: m.monthName,
                                label: `${m.monthFullName} ${new Date().getFullYear()}`,
                                start: m.start,
                                end: m.end,
                              }
                        )
                      }
                      className={`p-2 rounded-xl border text-center flex flex-col justify-between transition-all cursor-pointer active:scale-95 hover:shadow-md hover:border-amber-400 ${
                        isSelected
                          ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-500 shadow-xs'
                          : m.isCurrentMonth
                          ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/60 shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:bg-amber-50/70'
                      }`}
                      title={`Click to calculate staff performance for ${m.monthFullName}`}
                    >
                      <span className={`text-xs font-bold ${isSelected || m.isCurrentMonth ? 'text-amber-950 font-black' : 'text-slate-800'}`}>
                        {m.monthName}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {m.count} bills
                      </span>
                      <span className={`text-[11px] font-bold mt-1 block truncate ${isSelected || m.isCurrentMonth ? 'text-amber-950 font-black' : 'text-slate-900'}`}>
                        {currencySymbol}{m.revenue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Yearly Sales Breakdown: Calendar Year & Quarters */}
          {selectedTimeframe === 'yearly' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>Quarterly Breakdown (Click Any Quarter to Calculate Staff Performance)</span>
                </span>
                <span className="text-[11px] text-slate-400">Annual Summary</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {yearlyBreakdown.map((q) => {
                  const isSelected = selectedSubPeriod?.id === q.name && selectedSubPeriod?.timeframe === 'yearly';
                  return (
                    <div
                      key={q.name}
                      onClick={() =>
                        setSelectedSubPeriod(
                          isSelected
                            ? null
                            : {
                                timeframe: 'yearly',
                                id: q.name,
                                label: q.name,
                                start: q.start,
                                end: q.end,
                              }
                        )
                      }
                      className={`p-3 rounded-xl border cursor-pointer transition-all active:scale-98 hover:shadow-xs group ${
                        isSelected
                          ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-500 shadow-xs'
                          : 'bg-slate-50 hover:bg-amber-50/70 hover:border-amber-400 border-slate-200'
                      }`}
                      title={`Click to calculate staff performance for ${q.name}`}
                    >
                      <span className={`text-xs font-bold block ${isSelected ? 'text-amber-950' : 'text-slate-900 group-hover:text-amber-950'}`}>
                        {q.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{q.count} invoices processed</span>
                      <div className={`mt-2 pt-2 border-t border-slate-200 text-sm font-extrabold ${isSelected ? 'text-amber-950' : 'text-slate-900 group-hover:text-amber-900'}`}>
                        {currencySymbol}{q.revenue.toLocaleString('en-IN')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Commission Rate Configurator Bar with Editable Custom Percentage Input */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center font-black text-sm shrink-0">
            %
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Stylist Commission Calculation
            </span>
            <span className="text-[11px] text-slate-500">
              Custom percentage applied dynamically across team sales ({commissionRate}% active)
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Editable Custom Percentage Input Field */}
          <div className="flex items-center gap-1.5 bg-amber-50/70 border border-amber-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <label htmlFor="custom-commission-rate-input" className="text-xs font-bold text-amber-950 whitespace-nowrap">
              Commission:
            </label>
            <div className="relative flex items-center">
              <input
                id="custom-commission-rate-input"
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="0"
                value={commissionRateInput}
                onFocus={(e) => e.target.select()}
                onChange={(e) => handleCommissionInputChange(e.target.value)}
                className="w-16 px-2 py-1 bg-white border border-amber-400 rounded-lg text-xs font-black text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-600 shadow-2xs"
              />
              <span className="ml-1 text-xs font-bold text-amber-900 select-none">%</span>
            </div>
          </div>

          {/* Quick Preset Selector Buttons */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
            {[0, 5, 10, 15, 20].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setCommissionRateInput(rate.toString())}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  commissionRate === rate && commissionRateInput === rate.toString()
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                {rate === 0 ? '0% (Default)' : `${rate}%`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Staff Sales</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {currencySymbol}{totalTeamRevenue.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Generated by team in <strong className="text-slate-600 capitalize">{selectedTimeframe === 'daily' ? "Today's" : selectedTimeframe}</strong>
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Services Delivered</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Scissors className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {totalTeamServices} {totalTeamServices === 1 ? 'Service' : 'Services'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Total service rituals rendered in selected period
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Stylists</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {staffMembers.length} Stylists
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Official team members available for allocation
          </p>
        </div>
      </div>

      {/* Grid of 6 Staff Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {staffPerformanceData.map((staff) => (
          <div
            key={staff.id}
            onClick={() => setSelectedStaffModal(staff)}
            className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {staff.role}
                </span>
                <span className="text-xs font-semibold text-amber-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <span>View History</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-amber-900 transition-colors">
                {staff.name}
              </h3>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  Sales ({selectedTimeframe === 'daily' ? "Today" : selectedTimeframe.charAt(0).toUpperCase() + selectedTimeframe.slice(1)})
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {staff.invoiceCount} {staff.invoiceCount === 1 ? 'bill' : 'bills'}
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {currencySymbol}{staff.periodSales.toLocaleString('en-IN')}
              </div>
              {/* Commission Calculation Display */}
              <div className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-900">
                <span className="font-semibold flex items-center gap-1">
                  <span>💼</span>
                  <span>Est. Commission ({commissionRate}%):</span>
                </span>
                <span className="font-extrabold text-amber-950">
                  {currencySymbol}{Math.round((staff.periodSales * commissionRate) / 100).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-600">
                <span>Services Completed:</span>
                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                  {staff.servicesCount} {staff.servicesCount === 1 ? 'service' : 'services'}
                </span>
              </div>
            </div>
          </div>
        ))}

      </div>

      {/* Staff Personal Service History Modal / Popup */}
      {modalStaffDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Staff Service History &amp; Commission</span>
                <h3 className="text-xl font-bold text-slate-900">{modalStaffDetails.name}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                    Credited Sales ({selectedTimeframe === 'daily' ? "Today" : selectedTimeframe}):{' '}
                    <strong className="text-slate-900 font-bold">{currencySymbol}{modalStaffDetails.periodSales.toLocaleString('en-IN')}</strong>
                  </span>
                  <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded-md font-bold border border-amber-300">
                    Commission ({commissionRate}%): {currencySymbol}{Math.round((modalStaffDetails.periodSales * commissionRate) / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStaffModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Service History Table */}
            <div className="mt-4 max-h-96 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Date (DD/MM/YYYY)</th>
                    <th className="py-2.5 px-3">Client Name</th>
                    <th className="py-2.5 px-3">Service Name</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {modalStaffDetails.periodRecords.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No service records found for {modalStaffDetails.name} in this timeframe.
                      </td>
                    </tr>
                  ) : (
                    modalStaffDetails.periodRecords.map((record, rIdx) => (
                      <tr key={`staff-rec-${record.id || 'rec'}-${record.date || ''}-${rIdx}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap font-medium">
                          {formatIndianDate(record.date)}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{record.clientName}</td>
                        <td className="py-2.5 px-3 text-slate-700 max-w-xs">{record.serviceName}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                          {currencySymbol}{record.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {modalStaffDetails.periodRecords.length} {modalStaffDetails.periodRecords.length === 1 ? 'service entry' : 'service entries'} in period
              </span>
              <button
                type="button"
                onClick={() => setSelectedStaffModal(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
