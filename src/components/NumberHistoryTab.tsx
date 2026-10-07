import React, { useState, useMemo, useEffect } from 'react';
import { Order, MembershipRecord } from '../types';
import { Search, Phone, User, Calendar, DollarSign, Star, Clock, Copy, Check, X, Eye, TrendingUp, Scissors, Trash2, CheckCircle2 } from 'lucide-react';
import {
  parseDateToTimestamp,
  formatIndianDate,
  formatIndianDateTime,
  getTimeframeBounds,
} from '../utils/dateUtils';
import { SalesTimeframe } from './SalesHistoryTab';

interface NumberHistoryTabProps {
  orders: Order[];
  memberships: MembershipRecord[];
  currencySymbol: string;
  onPurgeNumberLogs?: () => void;
}

export const NumberHistoryTab: React.FC<NumberHistoryTabProps> = ({
  orders,
  memberships,
  currencySymbol,
  onPurgeNumberLogs,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<SalesTimeframe>('monthly');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [selectedClientPhone, setSelectedClientPhone] = useState<string | null>(null);
  const [purgeToastMessage, setPurgeToastMessage] = useState<string | null>(null);

  const handlePurgeNumberLogsClick = () => {
    if (onPurgeNumberLogs) {
      onPurgeNumberLogs();
    } else {
      try {
        localStorage.removeItem('backstage_number_history');
        localStorage.removeItem('backstage_client_logs');
        localStorage.removeItem('backstage_orders');
        localStorage.setItem('backstage_orders', '[]');
      } catch {}
    }
    setPurgeToastMessage('🧹 Purged All Number Logs! Client mobile history directory is now 0 records.');
    setTimeout(() => setPurgeToastMessage(null), 5000);
  };

  const handleCopyPhone = (phone: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard?.writeText(phone);
    setCopiedNumber(phone);
    setTimeout(() => setCopiedNumber(null), 2000);
  };

  // Calculate days remaining from today
  const calculateDaysRemaining = (expiryDateStr: string): number => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let expiry: Date;
      const ddmmyyyyMatch = expiryDateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
      if (ddmmyyyyMatch) {
        expiry = new Date(parseInt(ddmmyyyyMatch[3], 10), parseInt(ddmmyyyyMatch[2], 10) - 1, parseInt(ddmmyyyyMatch[1], 10));
      } else {
        expiry = new Date(expiryDateStr);
      }
      expiry.setHours(0, 0, 0, 0);

      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    } catch {
      return 365;
    }
  };

  // Helper to clean digits
  const cleanPhone = (p: string) => p.replace(/\D/g, '');

  // Aggregate and filter client records by the selected calendar-based timeframe
  const clientDirectory = useMemo(() => {
    const { start, end } = getTimeframeBounds(selectedTimeframe);

    // Map by normalized phone
    const clientMap = new Map<string, {
      phone: string;
      name: string;
      orders: Order[];
      lastVisitTimestamp: number;
      lastVisitDate: string;
      totalSpent: number;
    }>();

    orders.forEach((order) => {
      const phoneKey = (order.clientPhone || '').replace(/\s+/g, '');
      if (!phoneKey) return;

      const orderTimestamp = parseDateToTimestamp(order.date);

      // Check if order falls within the active timeframe
      if (orderTimestamp >= start && orderTimestamp <= end) {
        const existing = clientMap.get(phoneKey);
        if (existing) {
          existing.orders.push(order);
          existing.totalSpent += order.total;
          if (orderTimestamp > existing.lastVisitTimestamp) {
            existing.lastVisitTimestamp = orderTimestamp;
            existing.lastVisitDate = order.date;
            if (order.clientName && order.clientName !== 'Walk-in Client') {
              existing.name = order.clientName;
            }
          }
        } else {
          clientMap.set(phoneKey, {
            phone: order.clientPhone,
            name: order.clientName || 'Walk-in Client',
            orders: [order],
            lastVisitTimestamp: orderTimestamp,
            lastVisitDate: order.date,
            totalSpent: order.total,
          });
        }
      }
    });

    return Array.from(clientMap.values()).sort(
      (a, b) => b.lastVisitTimestamp - a.lastVisitTimestamp
    );
  }, [orders, selectedTimeframe]);

  // Filter with quick search bar
  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return clientDirectory;

    return clientDirectory.filter(
      (client) =>
        client.phone.toLowerCase().includes(q) ||
        client.name.toLowerCase().includes(q)
    );
  }, [clientDirectory, searchQuery]);

  // Check if a client has an active membership
  const isMemberClient = (phone: string) => {
    const norm = phone.replace(/\s+/g, '');
    const cleanP = cleanPhone(phone);
    return memberships.some((m) => {
      const mNorm = m.clientPhone.replace(/\s+/g, '');
      const mClean = cleanPhone(m.clientPhone);
      return (
        mNorm === norm ||
        (cleanP && mClean && (cleanP === mClean || cleanP.endsWith(mClean) || mClean.endsWith(cleanP)))
      );
    });
  };

  // Full client history calculation for the modal (Lifetime history across ALL orders)
  const fullClientHistory = useMemo(() => {
    if (!selectedClientPhone) return null;
    const targetPhone = selectedClientPhone;
    const cleanTarget = cleanPhone(targetPhone);

    // Retrieve all lifetime orders for this client
    const clientLifetimeOrders = orders
      .filter((o) => {
        const oClean = cleanPhone(o.clientPhone || '');
        if (cleanTarget && oClean) {
          return (
            cleanTarget === oClean ||
            cleanTarget.endsWith(oClean) ||
            oClean.endsWith(cleanTarget)
          );
        }
        return (
          o.clientPhone &&
          o.clientPhone.replace(/\s+/g, '') === targetPhone.replace(/\s+/g, '')
        );
      })
      .sort((a, b) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));

    // Resolve name
    const detectedName =
      clientLifetimeOrders.find(
        (o) => o.clientName && o.clientName !== 'Walk-in Client'
      )?.clientName ||
      clientDirectory.find((c) => c.phone === targetPhone)?.name ||
      'Walk-in Client';

    // Lifetime revenue & visit count
    const lifetimeTotalSpent = clientLifetimeOrders.reduce(
      (sum, o) => sum + (o.total || 0),
      0
    );
    const totalVisitCount = clientLifetimeOrders.length;
    const averageBill =
      totalVisitCount > 0 ? Math.round(lifetimeTotalSpent / totalVisitCount) : 0;

    // Membership record lookup
    const memberRecord = memberships.find((m) => {
      const mClean = cleanPhone(m.clientPhone || '');
      if (cleanTarget && mClean) {
        return (
          cleanTarget === mClean ||
          cleanTarget.endsWith(mClean) ||
          mClean.endsWith(cleanTarget)
        );
      }
      return (
        m.clientPhone &&
        m.clientPhone.replace(/\s+/g, '') === targetPhone.replace(/\s+/g, '')
      );
    });

    return {
      phone: targetPhone,
      name: detectedName,
      orders: clientLifetimeOrders,
      lifetimeTotalSpent,
      totalVisitCount,
      averageBill,
      memberRecord,
      isActiveMember: Boolean(memberRecord && memberRecord.isActive),
    };
  }, [selectedClientPhone, orders, memberships, clientDirectory]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedClientPhone(null);
      }
    };
    if (selectedClientPhone) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClientPhone]);

  const timeframeLabels: { id: SalesTimeframe; label: string; desc: string }[] = [
    { id: 'daily', label: "Today's", desc: 'From 12:00 AM' },
    { id: 'weekly', label: 'Weekly', desc: 'Current Week' },
    { id: 'monthly', label: 'Monthly', desc: 'Current Month' },
    { id: 'yearly', label: 'Yearly', desc: `Year ${new Date().getFullYear()}` },
  ];

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
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Client Directory &amp; Records
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
            Client Mobile Number History
          </h2>
          <p className="text-xs text-slate-500">
            Click any client row to inspect complete visit history, lifetime revenue stats &amp; services log
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-right">
            <span className="text-[10px] uppercase font-bold text-amber-800 block">
              Active Contacts in Period
            </span>
            <span className="text-xl font-extrabold text-amber-950">
              {filteredClients.length}
            </span>
          </div>
        </div>
      </div>

      {/* Timeframe Filters & Quick Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Timeframe Period
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {timeframeLabels.map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setSelectedTimeframe(tf.id)}
                  className={`flex flex-col items-center justify-center py-2 px-3 sm:px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    selectedTimeframe === tf.id
                      ? 'border-amber-700 bg-amber-50 text-amber-950 shadow-xs ring-1 ring-amber-500'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <span>{tf.label}</span>
                  <span className="text-[10px] font-normal text-slate-400 mt-0.5">
                    {tf.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Search Bar */}
          <div className="w-full md:w-80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Quick Search
            </span>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search mobile number or client name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Directory Table / Cards */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Directory Listing ({filteredClients.length} clients recorded)
            </h3>
            <span className="text-xs text-slate-500">
              Filtered by: <span className="font-semibold text-slate-800 capitalize">{selectedTimeframe === 'daily' ? "Today's" : selectedTimeframe}</span> • Indian Standard Date (DD/MM/YYYY)
            </span>
          </div>
          <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg w-fit">
            💡 Click any row for Full Visit Log
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Mobile Number</th>
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Membership</th>
                <th className="py-3 px-4 text-center">Visit Count</th>
                <th className="py-3 px-4">Last Visit Date</th>
                <th className="py-3 px-4 text-right">Total Spent</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Phone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-600">No client contact records found for this period</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      New client contact records will populate automatically upon checkout.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const isMember = isMemberClient(client.phone);

                  return (
                    <tr
                      key={client.phone}
                      onClick={() => setSelectedClientPhone(client.phone)}
                      className="hover:bg-amber-50/70 transition-colors cursor-pointer group"
                      title="Click to view complete client profile and visit history modal"
                    >
                      {/* Mobile Number with Copy */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-700 transition-colors" />
                          <span className="group-hover:text-amber-950 font-bold">{client.phone}</span>
                        </div>
                      </td>

                      {/* Client Name */}
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="group-hover:text-slate-950 font-semibold">{client.name}</span>
                        </div>
                      </td>

                      {/* Membership Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isMember ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500 text-slate-950 border border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                            <Star className="w-2.5 h-2.5 fill-slate-950" />
                            <span>VIP Member</span>
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-medium text-slate-500 bg-slate-100">
                            Regular
                          </span>
                        )}
                      </td>

                      {/* Visit Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 group-hover:bg-amber-100 transition-colors">
                          {client.orders.length} {client.orders.length === 1 ? 'visit' : 'visits'}
                        </span>
                      </td>

                      {/* Last Visit Date in DD/MM/YYYY */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatIndianDate(client.lastVisitDate)}</span>
                        </div>
                      </td>

                      {/* Total Spent in period */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap group-hover:text-amber-950">
                        {currencySymbol}{client.totalSpent.toLocaleString('en-IN')}
                      </td>

                      {/* Interactive Actions (Inspect History + Copy) */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedClientPhone(client.phone)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-900 bg-amber-100/90 hover:bg-amber-200 transition-colors cursor-pointer shadow-2xs"
                            title="Inspect complete client visit history log"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View History</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleCopyPhone(client.phone, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Copy phone number"
                          >
                            {copiedNumber === client.phone ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FULL CLIENT HISTORY MODAL */}
      {fullClientHistory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedClientPhone(null);
          }}
        >
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm ${
                  fullClientHistory.isActiveMember
                    ? 'bg-emerald-500 text-slate-950 shadow-[0_0_14px_rgba(16,185,129,0.35)]'
                    : 'bg-amber-100 text-amber-900 border border-amber-200'
                }`}>
                  {fullClientHistory.isActiveMember ? (
                    <Star className="w-6 h-6 fill-slate-950" />
                  ) : (
                    <User className="w-6 h-6 text-amber-800" />
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                      {fullClientHistory.name}
                    </h3>
                    {fullClientHistory.isActiveMember ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500 text-slate-950 border border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                        <Star className="w-3 h-3 fill-slate-950" />
                        <span>Active Member</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        Regular Client
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
                    <span className="font-mono text-slate-700 font-semibold flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {fullClientHistory.phone}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCopyPhone(fullClientHistory.phone, e)}
                      className="text-amber-800 hover:text-amber-950 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedNumber === fullClientHistory.phone ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 text-[11px]">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-[11px]">Copy Number</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedClientPhone(null)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Membership Highlight Banner */}
            {fullClientHistory.isActiveMember && fullClientHistory.memberRecord && (
              <div className="mt-4 p-3.5 rounded-xl bg-slate-900 text-white border border-emerald-500/40 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-emerald-400" />
                      Enreach VIP Membership
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-400 text-slate-950">
                    🟢 {calculateDaysRemaining(fullClientHistory.memberRecord.expiryDate)} Days Remaining
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 mt-2 border-t border-slate-800 text-slate-300">
                  <div>
                    <span className="text-slate-400 text-[11px]">📅 Started On: </span>
                    <strong className="text-white font-semibold">{formatIndianDate(fullClientHistory.memberRecord.startDate)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">⏳ Expires On: </span>
                    <strong className="text-white font-semibold">{formatIndianDate(fullClientHistory.memberRecord.expiryDate)}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Visit & Revenue Stats */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-700" />
                  Total Visits
                </span>
                <span className="text-lg sm:text-xl font-black text-amber-950 mt-0.5 block">
                  {fullClientHistory.totalVisitCount} {fullClientHistory.totalVisitCount === 1 ? 'Visit' : 'Visits'}
                </span>
                <span className="text-[10px] text-amber-800/80">Lifetime salon visits</span>
              </div>

              <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-emerald-700" />
                  Lifetime Total Spent
                </span>
                <span className="text-lg sm:text-xl font-black text-emerald-950 mt-0.5 block">
                  {currencySymbol}{fullClientHistory.lifetimeTotalSpent.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-emerald-800/80">Total billing generated</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-slate-500" />
                  Avg Bill Value
                </span>
                <span className="text-lg sm:text-xl font-black text-slate-900 mt-0.5 block">
                  {currencySymbol}{fullClientHistory.averageBill.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-500">Per visit average</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  Last Visit
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 mt-1 block truncate">
                  {fullClientHistory.orders[0]?.date ? formatIndianDate(fullClientHistory.orders[0].date) : 'None'}
                </span>
                <span className="text-[10px] text-slate-500">Most recent appointment</span>
              </div>
            </div>

            {/* Complete Visit History Log Table */}
            <div className="mt-4 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-amber-700" />
                  <span>Complete Visit History Log</span>
                </h4>
                <span className="text-xs font-semibold text-slate-500">
                  {fullClientHistory.orders.length} {fullClientHistory.orders.length === 1 ? 'Invoice recorded' : 'Invoices recorded'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl max-h-64 sm:max-h-72">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider sticky top-0 shadow-2xs z-10">
                    <tr>
                      <th className="py-2.5 px-3">Date &amp; Time (DD/MM/YYYY)</th>
                      <th className="py-2.5 px-3">Services Taken</th>
                      <th className="py-2.5 px-3">Staff Served</th>
                      <th className="py-2.5 px-3 text-right">Final Bill</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {fullClientHistory.orders.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                          No logged orders found for this contact.
                        </td>
                      </tr>
                    ) : (
                      fullClientHistory.orders.map((order, idx) => (
                        <tr key={`client-order-${order.id || 'ord'}-${order.date || ''}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap font-medium">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{formatIndianDateTime(order.date)}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                              Invoice: {order.id}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-slate-900">
                            {order.items && order.items.length > 0 ? (
                              <div className="space-y-1">
                                {order.items.map((item, itemIdx) => (
                                  <div key={itemIdx} className="flex items-center gap-1.5">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    <span className="font-semibold text-xs text-slate-800">
                                      {item.service.name}
                                    </span>
                                    {item.quantity > 1 && (
                                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                                        x{item.quantity}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">Salon Services</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/80">
                              <User className="w-3 h-3 text-amber-700" />
                              <span>{order.staffName || 'Kunal'}</span>
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right font-extrabold text-slate-900 whitespace-nowrap text-sm">
                            <div className="text-amber-950 font-black">
                              {currencySymbol}{order.total.toLocaleString('en-IN')}
                            </div>
                            <span className="text-[10px] text-slate-400 font-normal uppercase">
                              {order.paymentMethod || 'Paid'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Contact: <strong className="text-slate-600">{fullClientHistory.phone}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedClientPhone(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Close History Modal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
