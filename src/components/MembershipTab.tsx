import React, { useState } from 'react';
import { MembershipRecord, Order } from '../types';
import { Search, Star, Calendar, Clock, X, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { formatIndianDate, formatIndianDateTime } from '../utils/dateUtils';

interface MembershipTabProps {
  memberships: MembershipRecord[];
  orders: Order[];
  currencySymbol: string;
}

export const MembershipTab: React.FC<MembershipTabProps> = ({
  memberships,
  orders,
  currencySymbol,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<MembershipRecord | null>(null);

  // Filter members by name or phone
  const filteredMembers = memberships.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      m.clientName.toLowerCase().includes(q) ||
      m.clientPhone.toLowerCase().includes(q)
    );
  });

  // Calculate days remaining from today to expiryDate
  const getDaysRemaining = (expiryDateStr: string) => {
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      // Handle DD/MM/YYYY or standard format
      let expiry: Date;
      const ddmmyyyyMatch = expiryDateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
      if (ddmmyyyyMatch) {
        expiry = new Date(parseInt(ddmmyyyyMatch[3], 10), parseInt(ddmmyyyyMatch[2], 10) - 1, parseInt(ddmmyyyyMatch[1], 10));
      } else {
        expiry = new Date(expiryDateStr);
      }
      expiry.setHours(0, 0, 0, 0);

      const diffMs = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    } catch {
      return 365;
    }
  };

  // Find orders for selected member (matching phone number or name)
  const memberOrders = selectedMember
    ? orders.filter(
        (o) =>
          (o.clientPhone && o.clientPhone.replace(/\s+/g, '') === selectedMember.clientPhone.replace(/\s+/g, '')) ||
          (o.clientName && o.clientName.toLowerCase() === selectedMember.clientName.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              VIP Loyalty Directory
            </span>
            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              1-Year Plan
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
            Enreach Membership Club
          </h2>
          <p className="text-xs text-slate-500">
            Active club members receive VIP member privileges, custom discounts &amp; priority scheduling
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-800 block">
              Active VIP Members
            </span>
            <span className="text-xl font-extrabold text-emerald-900">
              {memberships.length}
            </span>
          </div>
        </div>
      </div>

      {/* Prominent Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter members by full name or mobile number (e.g. Aditya, +91 98201...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-xs"
        />
      </div>

      {/* Member Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredMembers.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500">
            <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No active member profiles found</p>
            <p className="text-xs text-slate-400 mt-1">
              Toggle the &ldquo;Enreach Member&rdquo; button during checkout to enroll or renew a client.
            </p>
          </div>
        ) : (
          filteredMembers.map((member) => {
            const daysLeft = getDaysRemaining(member.expiryDate);

            return (
              <div
                key={member.id}
                onClick={() => setSelectedMember(member)}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Glowing Green Top Accent Line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400" />

                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    {/* Active Member Badge */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 border border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                      <Star className="w-3 h-3 fill-slate-950" />
                      <span>Active Member</span>
                    </span>

                    <span className="text-xs font-semibold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <span>View History</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  {/* Client Full Name */}
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-950 transition-colors">
                    {member.clientName}
                  </h3>

                  {/* Client Mobile Number */}
                  <p className="text-xs font-semibold text-slate-500 mt-1">
                    {member.clientPhone}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Membership Status
                    </span>
                    <span className="text-sm font-bold text-emerald-700 mt-0.5 block">
                      {daysLeft} Days Remaining
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 font-medium">
                    Exp: {formatIndianDate(member.expiryDate)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Full History Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.3)]">
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

            {/* 1. Membership Status Box */}
            <div className="mt-4 p-4 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>1-Year VIP Membership Plan</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-400 text-slate-950">
                  {getDaysRemaining(selectedMember.expiryDate)} Days Left
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[11px]">Start Date (DD/MM/YYYY)</span>
                  <span className="font-semibold text-slate-200 mt-0.5 block flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {formatIndianDate(selectedMember.startDate)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Expiry Date (DD/MM/YYYY)</span>
                  <span className="font-semibold text-slate-200 mt-0.5 block flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {formatIndianDate(selectedMember.expiryDate)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Validity Duration</span>
                  <span className="font-semibold text-emerald-400 mt-0.5 block">
                    365 Days Total
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-1.5 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(5, (getDaysRemaining(selectedMember.expiryDate) / 365) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 2. Complete Visit History Table */}
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
                      memberOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap font-medium">
                            {formatIndianDateTime(order.date)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 max-w-xs">
                            {order.items.map((i) => i.service.name).join(', ') || 'Salon Services'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-medium">
                            {order.staffName || 'Staff'}
                          </td>
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

            {/* Modal Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Member ID: {selectedMember.id}
              </span>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
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
