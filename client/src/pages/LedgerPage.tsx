import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Download,
  Filter,
  Search,
  Calendar,
  User,
  ShieldCheck,
  Receipt,
  Home,
  Zap,
  HandCoins,
  ChevronDown,
  Clock,
} from 'lucide-react';
import { api } from '../services/api.js';
import { LedgerItem, AuditLogItem, MemberBalanceSummary } from '../types/index.js';
import { CurrencyFormat } from '../components/CurrencyFormat.js';
import { useToast } from '../context/ToastContext.js';

export const LedgerPage: React.FC = () => {
  const { error, success } = useToast();

  const [activeTab, setActiveTab] = useState<'ledger' | 'audit'>('ledger');
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [members, setMembers] = useState<MemberBalanceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [timeframe, setTimeframe] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await api.getMembers();
      if (res.success) {
        setMembers(res.members);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchLedger = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (timeframe !== 'all') params.timeframe = timeframe;
      if (selectedType !== 'all') params.type = selectedType;
      if (selectedMember !== 'all') params.memberId = selectedMember;

      const res = await api.getLedger(params);
      if (res.success) {
        setLedger(res.ledger);
      }
    } catch (err: any) {
      error(err.message || 'Failed to load ledger');
    } finally {
      setIsLoading(false);
    }
  }, [search, timeframe, selectedType, selectedMember, error]);

  const fetchAuditLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getAuditLogs();
      if (res.success) {
        setAuditLogs(res.logs);
      }
    } catch (err: any) {
      error(err.message || 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    if (activeTab === 'ledger') {
      fetchLedger();
    } else {
      fetchAuditLogs();
    }
  }, [activeTab, fetchLedger, fetchAuditLogs]);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (timeframe !== 'all') params.timeframe = timeframe;
      if (selectedType !== 'all') params.type = selectedType;
      if (selectedMember !== 'all') params.memberId = selectedMember;

      await api.downloadLedgerCSV(params);
      success('Ledger exported to CSV successfully!');
    } catch (err: any) {
      error(err.message || 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Expense':
        return <Receipt className="w-4 h-4 text-brand-500" />;
      case 'Rent':
        return <Home className="w-4 h-4 text-purple-500" />;
      case 'Electricity':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'Settlement':
        return <HandCoins className="w-4 h-4 text-emerald-500" />;
      default:
        return <History className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header and CSV Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Financial Ledger & History
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Complete date-wise transactional ledger with shares, receipts, and audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'ledger' && (
            <button
              onClick={handleExportCSV}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs shadow-sm transition active:scale-95"
            >
              <Download className="w-4 h-4 text-brand-500" />
              <span>{isExporting ? 'Exporting...' : 'Export to CSV'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'ledger'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Date-wise Ledger</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'audit'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Security Audit Trail</span>
        </button>
      </div>

      {activeTab === 'ledger' ? (
        <>
          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search description, payer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Timeframe */}
            <div>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month (October 2026)</option>
              </select>
            </div>

            {/* Type */}
            <div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">All Transaction Types</option>
                <option value="Expense">Shared Expenses</option>
                <option value="Rent">Monthly Rent</option>
                <option value="Electricity">Electricity Bills</option>
                <option value="Settlement">Settlements & Repayments</option>
              </select>
            </div>

            {/* Member */}
            <div>
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">All Roommates</option>
                {members.map((m) => (
                  <option key={m.membershipId} value={m.membershipId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Paid By</th>
                    <th className="py-3.5 px-4">Roommate Splits</th>
                    <th className="py-3.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Loading financial ledger entries...
                      </td>
                    </tr>
                  ) : ledger.length > 0 ? (
                    ledger.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        {/* Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {new Date(item.date).toLocaleDateString()}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-[11px]">
                            {getTypeIcon(item.type)}
                            <span>{item.type}</span>
                          </span>
                        </td>

                        {/* Title & Notes */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.title}
                          </div>
                          {item.notes && (
                            <div className="text-[11px] text-slate-400 italic mt-0.5 line-clamp-1">
                              {item.notes}
                            </div>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-extrabold text-sm text-slate-900 dark:text-white">
                          <CurrencyFormat amount={item.amountINR} />
                        </td>

                        {/* Paid By */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">
                          {item.paidBy.name}
                        </td>

                        {/* Splits */}
                        <td className="py-3.5 px-4">
                          {item.shares && item.shares.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {item.shares.map((sh, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                >
                                  {sh.memberName}: ₹{sh.amountINR}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              item.status === 'finalized' || item.status === 'Confirmed' || item.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                : item.status === 'reversed' || item.status === 'Rejected'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No transactions found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Audit Trail */
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Immutable Financial Audit Trail
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Preserves chronological logs of all financial additions, reversals, and PIN modifications.
            </p>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-slate-400 text-sm">Loading security logs...</div>
          ) : auditLogs.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditLogs.map((log) => (
                <div key={log._id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/70 px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                      <span className="text-slate-400">by</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {log.actorUserId?.name || 'System'}
                      </strong>
                    </div>

                    {log.reason && (
                      <div className="text-slate-600 dark:text-slate-300 italic mt-0.5">
                        Reason: {log.reason}
                      </div>
                    )}
                  </div>

                  <span className="text-slate-400 whitespace-nowrap text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-sm">No audit logs recorded.</div>
          )}
        </div>
      )}
    </div>
  );
};
