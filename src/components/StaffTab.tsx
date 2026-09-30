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
} from 'lucide-react';
import { parseDateToTimestamp, formatIndianDate, getTimeframeBounds } from '../utils/dateUtils';
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
}

export const StaffTab: React.FC<StaffTabProps> = ({
  staffMembers,
  orders,
  currencySymbol,
  onLockStaff,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<SalesTimeframe>('monthly');
  const [selectedStaffModal, setSelectedStaffModal] = useState<StaffMember | null>(null);
  const [commissionRate, setCommissionRate] = useState<number>(10); // Standard 10% salon commission rate

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

  // Calculate staff performance metrics dynamically based on the selected timeframe and orders ledger
  const staffPerformanceData = useMemo(() => {
    const { start, end } = getTimeframeBounds(selectedTimeframe);

    // Orders in selected timeframe
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
            id: `ord-rec-${o.id}-${staff.name}`,
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
  }, [staffMembers, orders, selectedTimeframe]);

  // Overall total team sales for selected timeframe
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

        <div className="flex items-center gap-3">
          <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-right">
            <span className="text-[10px] uppercase font-bold text-amber-800 block">
              Team Revenue ({selectedTimeframe === 'daily' ? "Today's" : selectedTimeframe})
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

      {/* 4 Timeframe Filter Buttons */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-amber-700" />
            <span>Select Staff Calculation Timeframe</span>
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
      </div>

      {/* Commission Rate Configurator Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-sm">
            %
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Stylist Commission Calculation
            </span>
            <span className="text-[11px] text-slate-500">
              Calculate accurate stylist commissions based exclusively on services each staff performed
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl">
          <span className="text-[11px] font-semibold text-slate-500 px-1.5">Rate:</span>
          {[5, 10, 15, 20].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => setCommissionRate(rate)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                commissionRate === rate
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              {rate}%
            </button>
          ))}
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
                    modalStaffDetails.periodRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
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
