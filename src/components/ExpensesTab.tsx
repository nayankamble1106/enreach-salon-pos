import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Clock,
  Calendar,
  BarChart3,
  Sparkles,
  TrendingDown,
  Search,
  X,
  CheckCircle2,
  Receipt,
  Coffee,
  AlertTriangle,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { ExpenseItem } from '../types';
import { formatIndianDate, formatIndianDateTime, parseDateToTimestamp } from '../utils/dateUtils';

interface ExpensesTabProps {
  expenses: ExpenseItem[];
  onAddExpenses: (newExpenses: Omit<ExpenseItem, 'id' | 'createdAt'>[]) => void;
  onUpdateExpense: (updated: ExpenseItem) => void;
  onDeleteExpense: (id: string) => void;
  currencySymbol?: string;
  isEditMode?: boolean;
}

type ExpenseTimeframe = 'daily' | 'weekly' | 'monthly' | 'yearly';

const AVAILABLE_YEARS = Array.from({ length: 11 }, (_, i) => 2026 + i);

const QUICK_SUGGESTIONS = [
  'Tea',
  'Coffee',
  'Milk',
  'Disposal Glasses',
  'Water Bottle',
  'Cleaning / Mop',
  'Snacks',
  'Salon Supplies',
];

interface ExpenseRowInput {
  name: string;
  amount: string;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({
  expenses,
  onAddExpenses,
  onUpdateExpense,
  onDeleteExpense,
  currencySymbol = '₹',
  isEditMode = false,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<ExpenseTimeframe>('daily');
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const current = new Date().getFullYear();
    return current >= 2026 && current <= 2036 ? current : 2026;
  });

  // Modal State for Add Daily Expense
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalRows, setModalRows] = useState<ExpenseRowInput[]>([
    { name: '', amount: '' },
    { name: '', amount: '' },
    { name: '', amount: '' },
    { name: '', amount: '' },
    { name: '', amount: '' },
  ]);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal State for Edit Daily Expense (supports appending extra items)
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [editRows, setEditRows] = useState<ExpenseRowInput[]>([{ name: '', amount: '' }]);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Confirmation Modal
  const [deletingExpense, setDeletingExpense] = useState<ExpenseItem | null>(null);

  // Drill-Down Breakdown Modal (Matches Sales History style)
  const [selectedBreakdown, setSelectedBreakdown] = useState<{
    title: string;
    subtitle: string;
    items: ExpenseItem[];
  } | null>(null);
  const [breakdownSearchQuery, setBreakdownSearchQuery] = useState('');

  // Search & Filter in Main Expense History List
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. TODAY'S EXPENSES (Resets daily at 12:00 AM)
  const todaysExpenses = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    return expenses.filter((e) => {
      const ts = parseDateToTimestamp(e.date || e.createdAt);
      return ts >= startOfToday && ts <= endOfToday;
    });
  }, [expenses]);

  const todayTotal = useMemo(() => {
    return todaysExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [todaysExpenses]);

  // Today's Time-Slots (Morning, Afternoon, Evening, Night)
  const todayBreakdown = useMemo(() => {
    const slots = [
      { name: 'Morning', time: '8:00 AM - 12:00 PM', startHour: 8, endHour: 12 },
      { name: 'Afternoon', time: '12:00 PM - 4:00 PM', startHour: 12, endHour: 16 },
      { name: 'Evening', time: '4:00 PM - 8:00 PM', startHour: 16, endHour: 20 },
      { name: 'Night / Late', time: '8:00 PM - 12:00 AM', startHour: 20, endHour: 24 },
    ];

    return slots.map((slot) => {
      const inSlot = todaysExpenses.filter((e) => {
        const d = new Date(parseDateToTimestamp(e.date || e.createdAt));
        const hour = d.getHours();
        return hour >= slot.startHour && hour < slot.endHour;
      });
      const total = inSlot.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      return {
        ...slot,
        count: inSlot.length,
        total,
        items: inSlot,
      };
    });
  }, [todaysExpenses]);

  // 2. WEEKLY EXPENSES (Monday to Sunday)
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

      const matched = expenses.filter((e) => {
        const ts = parseDateToTimestamp(e.date || e.createdAt);
        return ts >= dayStart && ts <= dayEnd;
      });

      const total = matched.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      return {
        dayName: name,
        formattedDate: formatIndianDate(dayDate),
        count: matched.length,
        total,
        isToday: formatIndianDate(dayDate) === formatIndianDate(now),
        items: matched,
      };
    });
  }, [expenses]);

  const weeklyTotal = useMemo(() => {
    return weeklyBreakdown.reduce((sum, d) => sum + d.total, 0);
  }, [weeklyBreakdown]);

  // 3. MONTHLY EXPENSES (Jan to Dec of Current Year)
  const monthlyBreakdown = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthFullNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const currentYear = new Date().getFullYear();
    const currentMonthIdx = new Date().getMonth();

    return months.map((mName, mIdx) => {
      const mStart = new Date(currentYear, mIdx, 1, 0, 0, 0, 0).getTime();
      const mEnd = new Date(currentYear, mIdx + 1, 0, 23, 59, 59, 999).getTime();

      const matched = expenses.filter((e) => {
        const ts = parseDateToTimestamp(e.date || e.createdAt);
        return ts >= mStart && ts <= mEnd;
      });

      const total = matched.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      return {
        monthName: mName,
        monthFullName: monthFullNames[mIdx],
        count: matched.length,
        total,
        isCurrentMonth: mIdx === currentMonthIdx,
        items: matched,
      };
    });
  }, [expenses]);

  const monthlyTotal = useMemo(() => {
    const currentMonthIdx = new Date().getMonth();
    return monthlyBreakdown[currentMonthIdx]?.total || 0;
  }, [monthlyBreakdown]);

  // 4. YEARLY EXPENSES (2026 to 2036 breakdown)
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

      const matched = expenses.filter((e) => {
        const ts = parseDateToTimestamp(e.date || e.createdAt);
        return ts >= qStart && ts <= qEnd;
      });

      const total = matched.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      return {
        name: q.name,
        label: q.label,
        count: matched.length,
        total,
        items: matched,
      };
    });
  }, [expenses, selectedYear]);

  const selectedYearTotal = useMemo(() => {
    const start = new Date(selectedYear, 0, 1, 0, 0, 0, 0).getTime();
    const end = new Date(selectedYear, 11, 31, 23, 59, 59, 999).getTime();
    return expenses
      .filter((e) => {
        const ts = parseDateToTimestamp(e.date || e.createdAt);
        return ts >= start && ts <= end;
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses, selectedYear]);

  // Filtered Main Expenses List (Chronological, newest first)
  const filteredExpenses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const sorted = [...expenses].sort((a, b) => {
      const tsA = parseDateToTimestamp(a.date || a.createdAt);
      const tsB = parseDateToTimestamp(b.date || b.createdAt);
      return tsB - tsA;
    });

    if (!q) return sorted;
    return sorted.filter((e) => {
      const matchName = e.name.toLowerCase().includes(q);
      const matchDate = formatIndianDate(e.date || e.createdAt).toLowerCase().includes(q);
      const matchAmount = String(e.amount).includes(q);
      return matchName || matchDate || matchAmount;
    });
  }, [expenses, searchQuery]);

  // Filtered Drill-Down Modal Items
  const modalFilteredItems = useMemo(() => {
    if (!selectedBreakdown) return [];
    const q = breakdownSearchQuery.toLowerCase().trim();
    if (!q) return selectedBreakdown.items;
    return selectedBreakdown.items.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        formatIndianDateTime(item.date || item.createdAt).toLowerCase().includes(q) ||
        String(item.amount).includes(q)
      );
    });
  }, [selectedBreakdown, breakdownSearchQuery]);

  // Modal Handlers
  const handleOpenAddModal = () => {
    setModalRows([
      { name: '', amount: '' },
      { name: '', amount: '' },
      { name: '', amount: '' },
      { name: '', amount: '' },
      { name: '', amount: '' },
    ]);
    setModalError(null);
    setIsAddModalOpen(true);
  };

  const handleAddMoreRow = () => {
    setModalRows((prev) => [...prev, { name: '', amount: '' }]);
  };

  const handleRowChange = (index: number, field: 'name' | 'amount', value: string) => {
    setModalRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveRow = (index: number) => {
    setModalRows((prev) => {
      if (prev.length <= 1) {
        return [{ name: '', amount: '' }];
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleApplySuggestion = (suggestion: string) => {
    // Find the first empty row or append
    setModalRows((prev) => {
      const emptyIdx = prev.findIndex((r) => !r.name.trim());
      if (emptyIdx >= 0) {
        const copy = [...prev];
        copy[emptyIdx] = { ...copy[emptyIdx], name: suggestion };
        return copy;
      }
      return [...prev, { name: suggestion, amount: '' }];
    });
  };

  const handleDoneAddExpenses = () => {
    // Filter rows with valid name and amount > 0
    const validRows = modalRows
      .map((r) => ({
        name: r.name.trim(),
        amount: parseFloat(r.amount) || 0,
        date: new Date().toISOString(),
      }))
      .filter((r) => r.name.length > 0 && r.amount > 0);

    if (validRows.length === 0) {
      setModalError('Please fill in at least one item name and an amount greater than 0.');
      return;
    }

    onAddExpenses(validRows);
    setIsAddModalOpen(false);
    const sum = validRows.reduce((acc, curr) => acc + curr.amount, 0);
    showToast(`Added ${validRows.length} daily ${validRows.length === 1 ? 'expense' : 'expenses'} totaling ${currencySymbol}${sum.toLocaleString('en-IN')}`);
  };

  // Edit Expense Handlers (Supports editing primary item + appending additional rows)
  const handleStartEdit = (exp: ExpenseItem) => {
    setEditingExpense(exp);
    setEditRows([{ name: exp.name, amount: String(exp.amount) }]);
    setEditError(null);
  };

  const handleAddEditRow = () => {
    setEditRows((prev) => [...prev, { name: '', amount: '' }]);
  };

  const handleEditRowChange = (index: number, field: 'name' | 'amount', value: string) => {
    setEditRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveEditRow = (index: number) => {
    setEditRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSaveEdit = () => {
    if (!editingExpense) return;
    const firstRow = editRows[0];
    const firstName = firstRow?.name.trim();
    const firstAmount = parseFloat(firstRow?.amount);

    if (!firstName || isNaN(firstAmount) || firstAmount <= 0) {
      setEditError('Please enter a valid item name and amount greater than 0 for the primary expense.');
      return;
    }

    // 1. Update the existing primary expense
    onUpdateExpense({
      ...editingExpense,
      name: firstName,
      amount: firstAmount,
    });

    // 2. If additional rows were added and filled, add them as new expenses
    const additionalRows = editRows.slice(1).filter((r) => r.name.trim() && parseFloat(r.amount) > 0);
    if (additionalRows.length > 0) {
      const newItems = additionalRows.map((r) => ({
        name: r.name.trim(),
        amount: parseFloat(r.amount),
        date: editingExpense.date || new Date().toISOString(),
      }));
      onAddExpenses(newItems);
    }

    setEditingExpense(null);
    showToast(
      additionalRows.length > 0
        ? `Updated "${firstName}" and added ${additionalRows.length} more ${additionalRows.length === 1 ? 'expense' : 'expenses'}!`
        : `Updated expense "${firstName}" to ${currencySymbol}${firstAmount.toLocaleString('en-IN')}`
    );
  };

  const handleConfirmDelete = () => {
    if (!deletingExpense) return;
    const name = deletingExpense.name;
    onDeleteExpense(deletingExpense.id);
    setDeletingExpense(null);
    showToast(`Deleted expense "${name}"`);
  };

  const timeframeConfig: {
    id: ExpenseTimeframe;
    label: string;
    sublabel: string;
    amount: number;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'daily',
      label: "Today's Expenses",
      sublabel: 'Resets daily at 12:00 AM',
      amount: todayTotal,
      icon: Clock,
    },
    {
      id: 'weekly',
      label: 'Weekly Expenses',
      sublabel: 'Current Week (Mon - Sun)',
      amount: weeklyTotal,
      icon: Calendar,
    },
    {
      id: 'monthly',
      label: 'Monthly Expenses',
      sublabel: 'Current Month (1st - 31st)',
      amount: monthlyTotal,
      icon: BarChart3,
    },
    {
      id: 'yearly',
      label: 'Yearly Expenses',
      sublabel: `Calendar Year ${selectedYear}`,
      amount: selectedYearTotal,
      icon: Sparkles,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-emerald-700 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-emerald-800 rounded-lg text-emerald-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Metric Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Daily Cash Outflows</span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">Daily Expenses Ledger</h2>
          <p className="text-xs text-slate-500">
            Log store refreshments, tea, milk, coffee, water bottles, disposal supplies &amp; maintenance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Daily Expense</span>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY TIMEFRAME CARDS (Top Section) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-amber-700" />
            <span>Expense Timeframe Overview</span>
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            Active: <strong className="text-slate-800 capitalize">{selectedTimeframe === 'daily' ? "Today's" : selectedTimeframe} Expenses</strong>
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
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
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
                    <span className={`text-sm sm:text-base font-black mt-1 block ${isActive ? 'text-amber-400' : 'text-slate-900'}`}>
                      {currencySymbol}{item.amount.toLocaleString('en-IN')}
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
          {/* 1. Today's Breakdown: Time-Slots */}
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
                        title: `Today's ${slot.name} Expenses`,
                        subtitle: `${slot.time} • ${slot.count} entries totaling ${currencySymbol}${slot.total.toLocaleString('en-IN')}`,
                        items: slot.items,
                      })
                    }
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50/70 hover:border-amber-300 transition-all cursor-pointer group"
                  >
                    <span className="text-xs font-bold text-slate-800 block group-hover:text-amber-950">
                      {slot.name}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{slot.time}</span>
                    <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-medium">{slot.count} items</span>
                      <span className="text-xs font-black text-slate-900 group-hover:text-amber-950">
                        {currencySymbol}{slot.total.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Weekly Expenses Breakdown: Monday to Sunday */}
          {selectedTimeframe === 'weekly' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" />
                  <span>Weekly Day-Wise Breakdown (Mon to Sun • Click Any Day)</span>
                </span>
                <span className="text-[11px] text-slate-400">Current Calendar Week</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {weeklyBreakdown.map((day) => (
                  <div
                    key={day.dayName}
                    onClick={() =>
                      setSelectedBreakdown({
                        title: `${day.dayName} Expenses Breakdown (${day.formattedDate})`,
                        subtitle: `${day.count} entries • Total: ${currencySymbol}${day.total.toLocaleString('en-IN')}`,
                        items: day.items,
                      })
                    }
                    className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer active:scale-98 hover:shadow-sm ${
                      day.isToday
                        ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-400/50 hover:bg-amber-100/80'
                        : 'bg-slate-50 border-slate-200 hover:bg-amber-50/60 hover:border-amber-400'
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
                        {day.count} {day.count === 1 ? 'item' : 'items'}
                      </div>
                      <div className={`text-xs font-extrabold mt-0.5 ${day.isToday ? 'text-amber-950' : 'text-slate-900'}`}>
                        {currencySymbol}{day.total.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Monthly Expenses Breakdown: Jan to Dec 12-Month Breakdown */}
          {selectedTimeframe === 'monthly' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-amber-700" />
                  <span>Monthly Breakdown (Click Any Month for Details)</span>
                </span>
                <span className="text-[11px] text-slate-400">All 12 Calendar Months ({new Date().getFullYear()})</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                {monthlyBreakdown.map((m) => (
                  <div
                    key={m.monthName}
                    onClick={() =>
                      setSelectedBreakdown({
                        title: `${m.monthFullName} Expenses Breakdown`,
                        subtitle: `Calendar Year ${new Date().getFullYear()} • ${m.count} ${m.count === 1 ? 'item' : 'items'} totaling ${currencySymbol}${m.total.toLocaleString('en-IN')}`,
                        items: m.items,
                      })
                    }
                    className={`p-2 rounded-xl border text-center flex flex-col justify-between transition-all cursor-pointer active:scale-95 hover:shadow-md hover:border-amber-400 ${
                      m.isCurrentMonth
                        ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/60 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-amber-50/70'
                    }`}
                  >
                    <span className={`text-xs font-bold ${m.isCurrentMonth ? 'text-amber-950' : 'text-slate-800'}`}>
                      {m.monthName}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {m.count} items
                    </span>
                    <span className={`text-[11px] font-bold mt-1 block truncate ${m.isCurrentMonth ? 'text-amber-950 font-black' : 'text-slate-900'}`}>
                      {currencySymbol}{m.total.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Yearly Expenses Breakdown: 2026 to 2036 breakdown */}
          {selectedTimeframe === 'yearly' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-amber-800" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                      Yearly Expenses Breakdown (2026 – 2036)
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Select calendar year to calculate annual &amp; quarterly metrics
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <label htmlFor="expense-year-select" className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-amber-700" />
                    <span>Select Year:</span>
                  </label>
                  <select
                    id="expense-year-select"
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

              {/* Dynamic Annual Banner */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/25 text-amber-200 border border-amber-400/30 text-[11px] font-bold tracking-wide uppercase">
                    <Calendar className="w-3 h-3 text-amber-300" />
                    <span>Annual Expenses Summary</span>
                  </div>
                  <h4 className="text-lg sm:text-2xl font-black text-amber-50 tracking-tight">
                    {selectedYear} Total Expenses:{' '}
                    <span className="text-amber-400 font-black">
                      {currencySymbol}{selectedYearTotal.toLocaleString('en-IN')}
                    </span>
                  </h4>
                </div>
              </div>

              {/* Quarters Q1 - Q4 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {yearlyBreakdown.map((q) => (
                  <div
                    key={q.name}
                    onClick={() =>
                      setSelectedBreakdown({
                        title: `${selectedYear} ${q.name} Expenses`,
                        subtitle: `${q.count} items totaling ${currencySymbol}${q.total.toLocaleString('en-IN')}`,
                        items: q.items,
                      })
                    }
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50/70 hover:border-amber-300 transition-all cursor-pointer group"
                  >
                    <span className="text-xs font-bold text-slate-800 block group-hover:text-amber-950">
                      {q.label}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{q.name}</span>
                    <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">{q.count} items</span>
                      <span className="text-xs font-black text-slate-900 group-hover:text-amber-950">
                        {currencySymbol}{q.total.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. EXPENSE HISTORY LIST (Below Summary Cards & Add Button) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-700" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Chronological Expenses History
            </h3>
            <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
              {filteredExpenses.length} {filteredExpenses.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by item, date, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">No daily expenses recorded yet</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Click &quot;+ Add Daily Expense&quot; above to log tea, milk, water bottles, and supplies.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Daily Expense</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            {filteredExpenses.map((exp) => (
              <div
                key={exp.id}
                className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100/70 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm sm:text-base">
                        {exp.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatIndianDate(exp.date || exp.createdAt)}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatIndianDateTime(exp.date || exp.createdAt).split('|')[1] || ''}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Amount</span>
                    <span className="text-base font-black text-slate-900">
                      {currencySymbol}{Number(exp.amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {isEditMode && (
                    <div className="flex items-center gap-1 animate-in fade-in duration-150">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(exp)}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Edit expense"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingExpense(exp)}
                        className="p-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. "+ ADD DAILY EXPENSE" POPUP MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-amber-800" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg">Add Daily Expenses</h3>
                  <p className="text-xs text-slate-500">Record refreshments, supplies &amp; daily shop expenses</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="py-3 border-b border-slate-100 shrink-0">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Quick Items
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {QUICK_SUGGESTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleApplySuggestion(tag)}
                    className="text-xs bg-slate-100 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-300 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 font-medium transition-colors cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body - Multi-Entry Rows */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
              {modalError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-500 uppercase px-1">
                <span className="col-span-1 text-center">#</span>
                <span className="col-span-7">Service / Item Name</span>
                <span className="col-span-3">Amount (₹)</span>
                <span className="col-span-1 text-center"></span>
              </div>

              {modalRows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <span className="col-span-1 text-center text-xs font-bold text-slate-400">
                    {idx + 1}
                  </span>
                  <div className="col-span-7">
                    <input
                      type="text"
                      placeholder="e.g. Tea, Milk, Coffee..."
                      value={row.name}
                      onChange={(e) => handleRowChange(idx, 'name', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                  <div className="col-span-3">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        step="any"
                        value={row.amount}
                        onChange={(e) => handleRowChange(idx, 'amount', e.target.value)}
                        className="w-full pl-6 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      disabled={modalRows.length <= 1}
                      className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                      title="Clear / remove row"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddMoreRow}
                className="w-full mt-2 py-2 px-3 border border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/50 hover:bg-amber-100/60 text-amber-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add More Expense Row</span>
              </button>
            </div>

            {/* Modal Footer with DONE Button */}
            <div className="pt-3 border-t border-slate-100 shrink-0 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                <span>Filled rows: </span>
                <strong className="text-slate-800">
                  {modalRows.filter((r) => r.name.trim() && parseFloat(r.amount) > 0).length}
                </strong>
                <span className="mx-1.5">•</span>
                <span>Total: </span>
                <strong className="text-slate-900 font-black">
                  {currencySymbol}
                  {modalRows
                    .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
                    .toLocaleString('en-IN')}
                </strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDoneAddExpenses}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  DONE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. ENHANCED "EDIT DAILY EXPENSE" MODAL */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                  <Edit2 className="w-5 h-5 text-amber-800" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg">Edit Daily Expense</h3>
                  <p className="text-xs text-slate-500">
                    Modify expense details or add additional expense items
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
              {editError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="space-y-3">
                {editRows.map((row, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                        {idx === 0 ? 'Primary Item' : `Additional Item #${idx + 1}`}
                      </span>
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEditRow(idx)}
                          className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-8">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Item / Service Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Tea, Milk, Coffee..."
                          value={row.name}
                          onChange={(e) => handleEditRowChange(idx, 'name', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Amount (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={row.amount}
                            onChange={(e) => handleEditRowChange(idx, 'amount', e.target.value)}
                            className="w-full pl-6 pr-2 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* + Add More Expense button */}
                <button
                  type="button"
                  onClick={handleAddEditRow}
                  className="w-full py-2.5 px-3 border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/50 hover:bg-amber-100/60 text-amber-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add More Expense</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 shrink-0 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                <span>Items: </span>
                <strong className="text-slate-800">
                  {editRows.filter((r) => r.name.trim() && parseFloat(r.amount) > 0).length}
                </strong>
                <span className="mx-1.5">•</span>
                <span>Total: </span>
                <strong className="text-slate-900 font-black">
                  {currencySymbol}
                  {editRows
                    .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
                    .toLocaleString('en-IN')}
                </strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Delete Daily Expense?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete &quot;<strong className="text-slate-800">{deletingExpense.name}</strong>&quot; ({currencySymbol}{deletingExpense.amount})?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingExpense(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Delete Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRILL-DOWN BREAKDOWN MODAL */}
      {selectedBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Timeframe Drill-Down
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                  {selectedBreakdown.title}
                </h3>
                <p className="text-xs text-slate-500">{selectedBreakdown.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBreakdown(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-2.5 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter expenses in this timeframe..."
                  value={breakdownSearchQuery}
                  onChange={(e) => setBreakdownSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-2 space-y-2 pr-1">
              {modalFilteredItems.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No expense records match this timeframe or search.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
                  {modalFilteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 hover:bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 text-sm block">{item.name}</span>
                        <span className="text-slate-400 text-[11px]">
                          {formatIndianDateTime(item.date || item.createdAt)}
                        </span>
                      </div>
                      <span className="font-black text-slate-900 text-sm">
                        {currencySymbol}{Number(item.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 shrink-0 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {modalFilteredItems.length} of {selectedBreakdown.items.length} items
              </span>
              <button
                type="button"
                onClick={() => setSelectedBreakdown(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
