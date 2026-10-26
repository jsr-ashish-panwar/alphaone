import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Receipt,
  Calendar,
  User,
  RotateCcw,
  CheckSquare,
  Square,
  Eye,
  X,
  Lock,
} from 'lucide-react';
import { api } from '../services/api.js';
import { ExpenseRecord, MemberBalanceSummary, ExpenseCategory } from '../types/index.js';
import { CurrencyFormat, formatINR } from '../components/CurrencyFormat.js';
import { PinModal } from '../components/PinModal.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

export const ExpensesPage: React.FC = () => {
  const { user, membership } = useAuth();
  const { success, error } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [members, setMembers] = useState<MemberBalanceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRecord | null>(null);
  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);
  const [reverseReason, setReverseReason] = useState('');

  // PIN Modal
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'create' | 'reverse' | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Daily Things');
  const [amountINR, setAmountINR] = useState<string>('');
  const [payerMembershipId, setPayerMembershipId] = useState<string>('');
  const [eligibleMemberIds, setEligibleMemberIds] = useState<string[]>([]);
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().slice(0, 16));
  const [description, setDescription] = useState('');

  const categories: ExpenseCategory[] = [
    'Daily Things',
    'Online Products',
    'Rent',
    'Electricity Bill',
    'Groceries',
    'Vegetables',
    'Milk',
    'Cleaning Supplies',
    'Internet',
    'Other',
  ];

  const fetchMembers = useCallback(async () => {
    try {
      const res = await api.getMembers();
      if (res.success) {
        setMembers(res.members);
        const activeIds = res.members.filter((m) => m.status === 'active').map((m) => m.membershipId);
        setEligibleMemberIds(activeIds);
      }
    } catch (err: any) {
      error(err.message || 'Failed to load roommates');
    }
  }, [error]);

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (search) params.search = search;
      const res = await api.getExpenses(params);
      if (res.success) {
        setExpenses(res.expenses);
      }
    } catch (err: any) {
      error(err.message || 'Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, search, error]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Open add modal from query params if ?action=add
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setIsAddModalOpen(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Set default payer when membership is loaded
  useEffect(() => {
    if (membership && !payerMembershipId) {
      setPayerMembershipId(membership.id);
    }
  }, [membership, payerMembershipId]);

  const handleToggleMember = (mId: string) => {
    if (eligibleMemberIds.includes(mId)) {
      if (eligibleMemberIds.length === 1) return; // Must have at least 1
      setEligibleMemberIds(eligibleMemberIds.filter((id) => id !== mId));
    } else {
      setEligibleMemberIds([...eligibleMemberIds, mId]);
    }
  };

  const handleSelectAllMembers = () => {
    const activeIds = members.filter((m) => m.status === 'active').map((m) => m.membershipId);
    if (eligibleMemberIds.length === activeIds.length) {
      // keep only the current payer
      setEligibleMemberIds([payerMembershipId || activeIds[0]]);
    } else {
      setEligibleMemberIds(activeIds);
    }
  };

  const calculatePreviewShare = () => {
    const num = parseFloat(amountINR);
    if (isNaN(num) || num <= 0 || eligibleMemberIds.length === 0) return 0;
    return num / eligibleMemberIds.length;
  };

  const handleSubmitExpenseForm = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amountINR);
    if (isNaN(amt) || amt <= 0) {
      error('Please enter a valid amount');
      return;
    }
    if (eligibleMemberIds.length === 0) {
      error('Please select at least one roommate to share this expense');
      return;
    }
    // Trigger PIN verification
    setPendingAction('create');
    setIsPinModalOpen(true);
  };

  const handleExecuteWithPin = async (pin: string) => {
    try {
      if (pendingAction === 'create') {
        const payload = {
          title,
          category,
          amountINR: parseFloat(amountINR),
          payerMembershipId,
          eligibleMemberIds,
          expenseDate,
          description,
          pin,
        };
        const res = await api.createExpense(payload);
        if (res.success) {
          success('Expense added and split successfully!');
          setIsPinModalOpen(false);
          setIsAddModalOpen(false);
          // Reset form
          setTitle('');
          setAmountINR('');
          setDescription('');
          fetchExpenses();
        }
      } else if (pendingAction === 'reverse' && selectedExpense) {
        if (!reverseReason) {
          error('Please provide a reason for reversal');
          return;
        }
        const res = await api.reverseExpense(selectedExpense._id, reverseReason, pin);
        if (res.success) {
          success('Expense reversed. Balances adjusted.');
          setIsPinModalOpen(false);
          setIsReverseModalOpen(false);
          setIsDetailModalOpen(false);
          setReverseReason('');
          fetchExpenses();
        }
      }
    } catch (err: any) {
      error(err.message || 'Action failed');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Shared Flat Expenses
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Record shared purchases, verify PIN, and automatically calculate individual shares in paise.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/25 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Category Pills & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === 'all'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search expense title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Expense List Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading expenses...</div>
      ) : expenses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {expenses.map((exp) => {
            const isReversed = exp.status === 'reversed';
            return (
              <div
                key={exp._id}
                className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                  isReversed
                    ? 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 opacity-70'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400 border border-brand-200/50 dark:border-brand-800/50">
                      {exp.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isReversed
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
                      {exp.status}
                    </span>
                  </div>

                  <h3 className={`text-base font-bold text-slate-900 dark:text-white line-clamp-1 ${isReversed ? 'line-through text-slate-400' : ''}`}>
                    {exp.title}
                  </h3>

                  <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                    <CurrencyFormat amount={exp.amountINR} />
                  </div>

                  {exp.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {exp.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-brand-500" />
                    <span>Paid by <strong>{exp.payerMembershipId?.userId?.name || 'Unknown'}</strong></span>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedExpense(exp);
                      setIsDetailModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="View split details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No expenses found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            No purchases match your selected category or search filter. Click Add Expense to record a new flat purchase.
          </p>
        </div>
      )}

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
              Add New Shared Expense
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Enter expense details. Your PIN will be verified before saving.
            </p>

            {/* Quick Templates */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
                Quick Category Templates (1-Tap Fill)
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setTitle('Daily Things: Milk, Curd & Bread');
                    setCategory('Daily Things');
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition"
                >
                  🥛 Daily Milk & Bread
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitle('Daily Things: Fresh Vegetables & Sabzi');
                    setCategory('Daily Things');
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition"
                >
                  🥦 Daily Veggies
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitle('Daily Things: Drinking Water Cans');
                    setCategory('Daily Things');
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition"
                >
                  💧 Water Cans
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitle('Online Products: Amazon Order');
                    setCategory('Online Products');
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition"
                >
                  📦 Amazon Online Order
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitle('Online Products: Blinkit / Zepto Delivery');
                    setCategory('Online Products');
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition"
                >
                  ⚡ Blinkit / Zepto Online
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitExpenseForm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Expense Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Daily Milk, Vegetables, Amazon order..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Total Amount in INR (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="e.g. 500"
                    value={amountINR}
                    onChange={(e) => setAmountINR(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Who Paid? *
                  </label>
                  <select
                    value={payerMembershipId}
                    onChange={(e) => setPayerMembershipId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {members
                      .filter((m) => m.status === 'active')
                      .map((m) => (
                        <option key={m.membershipId} value={m.membershipId}>
                          {m.name} {m.userId === user?.id ? '(You)' : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Members who share expense */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                    Split Among Roommates ({eligibleMemberIds.length} selected)
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllMembers}
                    className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                  >
                    Toggle All
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  {members
                    .filter((m) => m.status === 'active')
                    .map((m) => {
                      const isSelected = eligibleMemberIds.includes(m.membershipId);
                      return (
                        <button
                          key={m.membershipId}
                          type="button"
                          onClick={() => handleToggleMember(m.membershipId)}
                          className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium transition text-left ${
                            isSelected
                              ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-brand-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate">{m.name}</span>
                        </button>
                      );
                    })}
                </div>

                {/* Calculation preview */}
                {amountINR && eligibleMemberIds.length > 0 && (
                  <div className="mt-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
                    <span>Equal share calculation:</span>
                    <strong className="font-bold">
                      {formatINR(calculatePreviewShare())} / person
                    </strong>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Optional Description / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes, items purchased, store name..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 transition"
                >
                  <Lock className="w-4 h-4" />
                  <span>Verify PIN & Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Detail Modal */}
      {isDetailModalOpen && selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
              {selectedExpense.category}
            </span>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
              {selectedExpense.title}
            </h3>

            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 mb-4">
              <CurrencyFormat amount={selectedExpense.amountINR} />
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 mb-5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Paid by:</span>
                <span className="font-semibold">{selectedExpense.payerMembershipId?.userId?.name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Created by:</span>
                <span>{selectedExpense.createdByUserId?.name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span>{new Date(selectedExpense.expenseDate).toLocaleString()}</span>
              </div>
              {selectedExpense.description && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-500">
                  {selectedExpense.description}
                </div>
              )}
            </div>

            {/* Individual Splits */}
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Roommate Share Splits
              </h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {selectedExpense.splits?.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {s.membershipId?.userId?.name || 'Roommate'}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      <CurrencyFormat amount={s.shareAmountINR} />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reversal action if active */}
            {selectedExpense.status === 'finalized' && (
              <button
                onClick={() => setIsReverseModalOpen(true)}
                className="w-full py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 font-semibold text-xs hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reverse Expense Entry</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Reversal Reason Modal */}
      {isReverseModalOpen && selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Reverse Expense Entry
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter the reason for reversing this finalized expense. Financial audit trail will be preserved.
            </p>

            <textarea
              required
              rows={3}
              placeholder="Reason for reversal (e.g. Duplicate entry, incorrect amount)..."
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsReverseModalOpen(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!reverseReason.trim()) {
                    error('Please enter a reason');
                    return;
                  }
                  setPendingAction('reverse');
                  setIsPinModalOpen(true);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-500/20"
              >
                Verify PIN & Reverse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Verification Modal */}
      <PinModal
        isOpen={isPinModalOpen}
        title="Authorize Expense Action"
        description="Enter your 4-digit security PIN to confirm this transaction."
        onConfirm={handleExecuteWithPin}
        onCancel={() => {
          setIsPinModalOpen(false);
          setPendingAction(null);
        }}
      />
    </div>
  );
};
