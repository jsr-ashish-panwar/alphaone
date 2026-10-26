import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Home,
  Zap,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  PieChart,
  PlusCircle,
  FilePlus,
  Users,
  HandCoins,
  History,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Clock,
  Sparkles,
  RefreshCw,
  Package,
} from 'lucide-react';
import { api } from '../services/api.js';
import { DashboardSummary } from '../types/index.js';
import { SummaryCard } from '../components/SummaryCard.js';
import { BalancePill } from '../components/BalancePill.js';
import { CurrencyFormat } from '../components/CurrencyFormat.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getDashboard();
      if (res.success) {
        setData(res as unknown as DashboardSummary);
      }
    } catch (err: any) {
      error(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleConfirmPayment = async (paymentId: string) => {
    try {
      const res = await api.updatePaymentStatus(paymentId, 'Confirmed');
      if (res.success) {
        success('Payment confirmed successfully!');
        fetchDashboard();
      }
    } catch (err: any) {
      error(err.message || 'Failed to confirm payment');
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    try {
      const res = await api.updatePaymentStatus(paymentId, 'Rejected');
      if (res.success) {
        success('Payment rejected.');
        fetchDashboard();
      }
    } catch (err: any) {
      error(err.message || 'Failed to reject payment');
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading ledger & balances...</p>
        </div>
      </div>
    );
  }

  const cards = data?.summaryCards;

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner & Quick Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-brand-900 via-brand-800 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient opacity-10 pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-semibold text-brand-200 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Alpha C-42 Live Financial Ledger</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Hello, {user?.name}! 👋
          </h2>
          <p className="text-sm text-brand-100/90 mt-1 max-w-xl">
            {cards && cards.myNetBalanceINR > 0
              ? `You are net positive! Roommates owe you a total of ₹${cards.myNetBalanceINR.toLocaleString('en-IN')}.`
              : cards && cards.myNetBalanceINR < 0
              ? `You currently owe ₹${Math.abs(cards.myNetBalanceINR).toLocaleString('en-IN')}. Check pending settlements below.`
              : 'All your flat expenses and dues are currently settled up!'}
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-sm text-xs font-semibold text-white transition active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Balances</span>
          </button>
        </div>
      </div>

      {/* The 4 Flat Expense Categories */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold text-[11px] uppercase tracking-wide mb-1">
              <span>Flat Alpha C-42 Expense Categories</span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              The 4 Expense Categories
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Only 4 simple categories for all shared flat expenses & bills.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 self-start sm:self-auto">
            4 Roommates • Equal Split
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Flat Rent */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between hover:border-brand-500 transition group">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Home className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                  Fixed Monthly
                </span>
              </div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                1. Flat Rent
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                ₹15,500
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                ₹3,875 per person (4 roommates)
              </p>
            </div>
            <button
              onClick={() => navigate('/bills')}
              className="mt-4 w-full py-2 rounded-xl bg-white dark:bg-slate-700 hover:bg-brand-50 dark:hover:bg-brand-950/40 text-brand-600 dark:text-brand-300 border border-slate-200 dark:border-slate-600 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <span>View Rent Status</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 2. Electricity Bill */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between hover:border-amber-500 transition group">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Zap className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50">
                  Anyone Enters
                </span>
              </div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                2. Electricity Bill
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                ₹{cards ? cards.electricityBillINR.toLocaleString('en-IN') : '2,200'}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Enter amount whenever the bill arrives
              </p>
            </div>
            <button
              onClick={() => navigate('/bills?action=add')}
              className="mt-4 w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm shadow-amber-500/20 transition flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Enter Power Bill</span>
            </button>
          </div>

          {/* 3. Daily Things */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between hover:border-emerald-500 transition group">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                  Daily Purchases
                </span>
              </div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                3. Daily Things
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                Milk, Sabzi, Groceries
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Water cans, curd, bread & local supplies
              </p>
            </div>
            <button
              onClick={() => navigate('/expenses?action=add')}
              className="mt-4 w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-500/20 transition flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Daily Things</span>
            </button>
          </div>

          {/* 4. Online Products */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between hover:border-indigo-500 transition group">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                  Online Orders
                </span>
              </div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                4. Online Products
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                Amazon, Blinkit, Zepto
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Any appliances, kits or items bought online
              </p>
            </div>
            <button
              onClick={() => navigate('/expenses?action=add')}
              className="mt-4 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-500/20 transition flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Online Product</span>
            </button>
          </div>
        </div>
      </div>

      {/* WHO TAKES MONEY VS WHO SENDS MONEY (Lene / Dene Ka Hisaab) */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-bold uppercase tracking-wider mb-2">
              <HandCoins className="w-3.5 h-3.5 text-brand-400" />
              <span>Clear Money Split • Who Takes vs Who Sends</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Who Has How Much & Who Has To Pay Whom
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Exact calculations so nobody is confused about who takes money (Lene hain) and who sends money (Dene hain).
            </p>
          </div>

          <button
            onClick={() => navigate('/settle')}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-bold transition flex items-center gap-1.5"
          >
            <span>Settle Up Screen</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 2 Big Status Columns: Lene Wale (Take) vs Dene Wale (Send) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Green Column: Who Takes Money */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
              <span>🟢 Roommates Who Have to TAKE Money (Lene Hain)</span>
            </div>
            <div className="space-y-2.5">
              {data?.memberBalances
                .filter((m) => m.netBalanceINR > 0)
                .map((m) => (
                  <div
                    key={m.membershipId}
                    className="flex items-center justify-between p-3 rounded-xl bg-emerald-900/30 border border-emerald-500/20"
                  >
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{m.name}</span>
                        {m.userId === user?.id && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-emerald-300/80">
                        Paid ₹{m.totalPaidINR.toLocaleString('en-IN')} upfront for flat
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-emerald-400">
                        +₹{m.netBalanceINR.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-emerald-300/70 font-semibold uppercase">
                        Has to Collect
                      </div>
                    </div>
                  </div>
                ))}
              {data?.memberBalances.filter((m) => m.netBalanceINR > 0).length === 0 && (
                <div className="p-3 text-xs text-slate-400 text-center">
                  All receivables are settled!
                </div>
              )}
            </div>
          </div>

          {/* Red/Amber Column: Who Sends Money */}
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/40 border border-rose-500/30">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-3">
              <ArrowUpRight className="w-4 h-4 text-rose-400" />
              <span>🔴 Roommates Who Have to SEND Money (Dene Hain)</span>
            </div>
            <div className="space-y-2.5">
              {data?.memberBalances
                .filter((m) => m.netBalanceINR < 0)
                .map((m) => (
                  <div
                    key={m.membershipId}
                    className="flex items-center justify-between p-3 rounded-xl bg-rose-900/30 border border-rose-500/20"
                  >
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{m.name}</span>
                        {m.userId === user?.id && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-semibold">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-rose-300/80">
                        Share ₹{m.totalShareINR.toLocaleString('en-IN')} (Paid ₹{m.totalPaidINR.toLocaleString('en-IN')})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-rose-400">
                        -₹{Math.abs(m.netBalanceINR).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-rose-300/70 font-semibold uppercase">
                        Has to Pay
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Direct Payment Instructions */}
        {data?.settlementSuggestions && data.settlementSuggestions.length > 0 && (
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div className="text-xs font-bold text-brand-300 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span>Direct Money Transfers to Clear All Debts Completely</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {data.settlementSuggestions.map((s, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 flex flex-col justify-between"
                >
                  <div>
                    <div className="text-[11px] text-slate-400 mb-1">Payment #{idx + 1}</div>
                    <div className="text-xs font-semibold text-slate-200">
                      <strong className="text-rose-400">{s.fromName}</strong>
                      <span className="text-slate-400"> sends to </span>
                      <strong className="text-emerald-400">{s.toName}</strong>
                    </div>
                    <div className="text-xl font-black text-white mt-1">
                      ₹{s.amountINR.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/settle')}
                    className="mt-3 w-full py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-[11px] font-bold transition"
                  >
                    Record Payment →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards Grid */}
      {cards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <SummaryCard
            title="Total Expenses This Month"
            amount={cards.totalExpensesThisMonthINR}
            icon={<TrendingUp className="w-5 h-5" />}
            subtitle="Combined flat purchases"
          />
          <SummaryCard
            title="Monthly Rent"
            amount={cards.monthlyRentINR}
            icon={<Home className="w-5 h-5" />}
            subtitle="Flat lease October 2026"
            badge={{ text: 'Fixed ₹15.5k', variant: 'neutral' }}
          />
          <SummaryCard
            title="Electricity Bill"
            amount={cards.electricityBillINR}
            icon={<Zap className="w-5 h-5" />}
            subtitle="Power consumption bill"
            badge={{ text: 'Utility', variant: 'info' }}
          />
          <SummaryCard
            title="Groceries & Household"
            amount={cards.groceryAndHouseholdINR}
            icon={<ShoppingCart className="w-5 h-5" />}
            subtitle="Daily needs, milk, veggies"
          />

          {/* Personal Financial Share Cards */}
          <SummaryCard
            title="My Outstanding Dues"
            amount={cards.myOutstandingDuesINR}
            icon={<ArrowUpRight className="w-5 h-5" />}
            subtitle="Amount you owe flatmates"
            badge={{
              text: cards.myOutstandingDuesINR > 0 ? 'Due' : 'Clear',
              variant: cards.myOutstandingDuesINR > 0 ? 'negative' : 'positive',
            }}
          />
          <SummaryCard
            title="Amount Others Owe Me"
            amount={cards.amountOthersOweMeINR}
            icon={<ArrowDownLeft className="w-5 h-5" />}
            subtitle="Reimbursements due to you"
            badge={{
              text: cards.amountOthersOweMeINR > 0 ? 'Receivable' : 'Settled',
              variant: cards.amountOthersOweMeINR > 0 ? 'positive' : 'neutral',
            }}
          />
          <SummaryCard
            title="Total Amount I Have Paid"
            amount={cards.totalAmountIPaidINR}
            icon={<Wallet className="w-5 h-5" />}
            subtitle="Total out-of-pocket spending"
          />
          <SummaryCard
            title="My Share of Total Expenses"
            amount={cards.myShareOfTotalExpensesINR}
            icon={<PieChart className="w-5 h-5" />}
            subtitle="Your calculated responsibility"
            highlight={false}
          />
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => navigate('/expenses?action=add')}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/25 shrink-0 transition active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
        <button
          onClick={() => navigate('/bills?action=add')}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-sm shadow-sm shrink-0 transition active:scale-95"
        >
          <FilePlus className="w-4 h-4 text-brand-500" />
          <span>Add Monthly Bill</span>
        </button>
        <button
          onClick={() => navigate('/settle')}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-sm shadow-sm shrink-0 transition active:scale-95"
        >
          <HandCoins className="w-4 h-4 text-emerald-500" />
          <span>Settle Payment</span>
        </button>
        <button
          onClick={() => navigate('/members')}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-sm shadow-sm shrink-0 transition active:scale-95"
        >
          <Users className="w-4 h-4 text-indigo-500" />
          <span>Roommates</span>
        </button>
        <button
          onClick={() => navigate('/history')}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-sm shadow-sm shrink-0 transition active:scale-95"
        >
          <History className="w-4 h-4 text-amber-500" />
          <span>Transaction History</span>
        </button>
      </div>

      {/* Grid: Charts & Member Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Analytics Chart (2 columns) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Monthly Spending Breakdown</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Past months spending across Groceries, Bills & Household</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              INR (₹)
            </span>
          </div>

          <div className="h-72 w-full">
            {data?.chartData && data.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="Groceries" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="Bills" fill="#8b5cf6" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="Other" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No monthly data recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Member-wise Balances (1 column) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Roommate Balances</h3>
              <button
                onClick={() => navigate('/members')}
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Net balance: positive means they receive money, negative means they owe money.
            </p>

            <div className="space-y-3">
              {data?.memberBalances.map((m) => (
                <div
                  key={m.membershipId}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm">
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {m.name} {m.userId === user?.id && <span className="text-[11px] font-normal text-slate-400">(You)</span>}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Paid: <CurrencyFormat amount={m.totalPaidINR} />
                      </div>
                    </div>
                  </div>
                  <BalancePill amount={m.netBalanceINR} size="sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Settle Suggestions Quick Link */}
          {data?.settlementSuggestions && data.settlementSuggestions.length > 0 && (
            <div className="mt-5 p-3.5 rounded-2xl bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-800/60">
              <div className="text-xs font-bold text-brand-900 dark:text-brand-200 mb-1 flex items-center gap-1.5">
                <HandCoins className="w-3.5 h-3.5 text-brand-600" />
                <span>Suggested Settlement</span>
              </div>
              <p className="text-xs text-brand-700 dark:text-brand-300">
                <strong>{data.settlementSuggestions[0].fromName}</strong> pays{' '}
                <strong>{data.settlementSuggestions[0].toName}</strong>{' '}
                <CurrencyFormat amount={data.settlementSuggestions[0].amountINR} />
              </p>
              <button
                onClick={() => navigate('/settle')}
                className="mt-2 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Settle up now →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Pending Settlements & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Settlements */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pending Repayments</h3>
            </div>
            <button
              onClick={() => navigate('/settle')}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {data?.pendingSettlements && data.pendingSettlements.length > 0 ? (
            <div className="space-y-3">
              {data.pendingSettlements.map((p) => {
                const isReceiver = p.receiverMembershipId?.userId?.name === user?.name;
                return (
                  <div
                    key={p._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/40 gap-3"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {p.payerMembershipId?.userId?.name || 'Someone'} → {p.receiverMembershipId?.userId?.name || 'Someone'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <CurrencyFormat amount={p.amountINR} /> via {p.method} • {new Date(p.paymentDate).toLocaleDateString()}
                      </div>
                      {p.notes && <div className="text-xs text-slate-400 italic mt-0.5">{p.notes}</div>}
                    </div>

                    <div className="flex items-center gap-2">
                      {isReceiver ? (
                        <>
                          <button
                            onClick={() => handleConfirmPayment(p._id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirm Receipt</span>
                          </button>
                          <button
                            onClick={() => handleRejectPayment(p._id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-semibold transition"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60">
                          Awaiting Confirmation
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm">
              No pending settlements awaiting confirmation.
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Flat Transactions</h3>
            <button
              onClick={() => navigate('/history')}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              <span>Full Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {data?.recentTransactions && data.recentTransactions.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.recentTransactions.map((tx) => (
                <div key={tx._id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{tx.title}</div>
                    <div className="text-xs text-slate-400">
                      Paid by {tx.payerMembershipId?.userId?.name || 'Unknown'} • {tx.category} •{' '}
                      {new Date(tx.expenseDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      <CurrencyFormat amount={tx.amountINR} />
                    </div>
                    <span className="text-[11px] text-slate-400 capitalize">{tx.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm">
              No transactions recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
