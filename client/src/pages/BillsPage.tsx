import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  Home,
  Zap,
  Plus,
  Calendar,
  User,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  CreditCard,
  Lock,
} from 'lucide-react';
import { api } from '../services/api.js';
import { BillRecord, BillType, MemberBalanceSummary } from '../types/index.js';
import { CurrencyFormat, formatINR } from '../components/CurrencyFormat.js';
import { PinModal } from '../components/PinModal.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

export const BillsPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [bills, setBills] = useState<BillRecord[]>([]);
  const [members, setMembers] = useState<MemberBalanceSummary[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedBillToPay, setSelectedBillToPay] = useState<BillRecord | null>(null);
  const [payerMembershipId, setPayerMembershipId] = useState('');

  // PIN Modal
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  // Add Bill Form State
  const [billType, setBillType] = useState<BillType>('Rent');
  const [billingPeriod, setBillingPeriod] = useState('October 2026');
  const [title, setTitle] = useState('');
  const [amountINR, setAmountINR] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [eligibleMemberIds, setEligibleMemberIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

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

  const fetchBills = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedType !== 'all') params.type = selectedType;
      const res = await api.getBills(params);
      if (res.success) {
        setBills(res.bills);
      }
    } catch (err: any) {
      error(err.message || 'Failed to load bills');
    } finally {
      setIsLoading(false);
    }
  }, [selectedType, error]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setIsAddModalOpen(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Set default title when billType or period changes, and default rent to 15,500
  useEffect(() => {
    setTitle(`${billType === 'Rent' ? 'Flat Monthly Rent' : 'Electricity Bill'} - ${billingPeriod}`);
    if (billType === 'Rent') {
      setAmountINR('15500');
    }
  }, [billType, billingPeriod]);

  const handleToggleMember = (mId: string) => {
    if (eligibleMemberIds.includes(mId)) {
      if (eligibleMemberIds.length === 1) return;
      setEligibleMemberIds(eligibleMemberIds.filter((id) => id !== mId));
    } else {
      setEligibleMemberIds([...eligibleMemberIds, mId]);
    }
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amountINR);
    if (isNaN(amt) || amt <= 0) {
      error('Please enter a valid bill amount');
      return;
    }
    if (eligibleMemberIds.length === 0) {
      error('Please select at least one roommate responsible for this bill');
      return;
    }

    try {
      const res = await api.createBill({
        type: billType,
        billingPeriod,
        title,
        amountINR: amt,
        dueDate,
        eligibleMemberIds,
        paymentStatus: 'unpaid',
        notes,
      });

      if (res.success) {
        success(`${billType} bill created successfully!`);
        setIsAddModalOpen(false);
        setAmountINR('');
        setNotes('');
        fetchBills();
      }
    } catch (err: any) {
      error(err.message || 'Failed to create bill');
    }
  };

  const handleInitiatePay = (bill: BillRecord) => {
    setSelectedBillToPay(bill);
    // Find current user's membership
    const myMem = members.find((m) => m.userId === user?.id);
    if (myMem) {
      setPayerMembershipId(myMem.membershipId);
    } else if (members.length > 0) {
      setPayerMembershipId(members[0].membershipId);
    }
    setIsPayModalOpen(true);
  };

  const handleConfirmPayWithPin = async (pin: string) => {
    if (!selectedBillToPay) return;
    try {
      const res = await api.recordBillPayment(
        selectedBillToPay._id,
        payerMembershipId,
        pin
      );
      if (res.success) {
        success(`Bill marked as paid! Balances have been credited to payer.`);
        setIsPinModalOpen(false);
        setIsPayModalOpen(false);
        fetchBills();
      }
    } catch (err: any) {
      error(err.message || 'Failed to record bill payment');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Monthly Rent & Electricity Bills
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage flat lease rent, electricity bills, due dates, and track who paid out of pocket.
          </p>
        </div>

        <button
          onClick={() => {
            setBillType('Electricity');
            setAmountINR('');
            setIsAddModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/25 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Enter Bill (Electricity / Rent)</span>
        </button>
      </div>

      {/* Clear Rule Card */}
      <div className="p-4 rounded-2xl bg-brand-50/80 dark:bg-brand-950/40 border border-brand-200/70 dark:border-brand-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-600 text-white shrink-0">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-brand-950 dark:text-brand-200 uppercase tracking-wide">
              Rule 1: Flat Rent is ₹15,500 (Split 4 ways = ₹3,875 each)
            </div>
            <div className="text-xs text-brand-700 dark:text-brand-300">
              Rule 2: Electricity Bill can be entered by <strong>ANY</strong> roommate as soon as the bill arrives!
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            setBillType('Electricity');
            setAmountINR('');
            setIsAddModalOpen(true);
          }}
          className="shrink-0 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-300 border border-brand-200 dark:border-brand-700 text-xs font-bold hover:bg-brand-50 transition"
        >
          ⚡ Enter Electricity Bill Now
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setSelectedType('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            selectedType === 'all'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>All Bills ({bills.length})</span>
        </button>
        <button
          onClick={() => setSelectedType('Rent')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            selectedType === 'Rent'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Rent Bills</span>
        </button>
        <button
          onClick={() => setSelectedType('Electricity')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            selectedType === 'Electricity'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Electricity Bills</span>
        </button>
      </div>

      {/* Bills Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading bills...</div>
      ) : bills.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {bills.map((bill) => {
            const isRent = bill.type === 'Rent';
            const isPaid = bill.paymentStatus === 'paid';
            const eligibleCount = bill.eligibleMemberIds?.length || 1;

            return (
              <div
                key={bill._id}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isRent
                            ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/70 dark:text-brand-400'
                            : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400'
                        }`}
                      >
                        {isRent ? <Home className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          {bill.billingPeriod}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {bill.title}
                        </h3>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        isPaid
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                      }`}
                    >
                      {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      <span>{isPaid ? 'Paid' : 'Unpaid'}</span>
                    </span>
                  </div>

                  {/* Amounts */}
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                      <CurrencyFormat amount={bill.amountINR} />
                    </span>
                    <span className="text-xs text-slate-400">
                      ({formatINR(bill.amountINR / eligibleCount)} / roommate)
                    </span>
                  </div>

                  {/* Details Card */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Calendar className="w-3.5 h-3.5" /> Due Date:
                      </span>
                      <strong className="font-semibold text-slate-900 dark:text-white">
                        {new Date(bill.dueDate).toLocaleDateString()}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <User className="w-3.5 h-3.5" /> Payer:
                      </span>
                      <strong className="font-semibold text-slate-900 dark:text-white">
                        {bill.payerMembershipId?.userId?.name || (isPaid ? 'Recorded' : 'Not yet paid')}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Users className="w-3.5 h-3.5" /> Roommates Sharing:
                      </span>
                      <span>
                        {bill.eligibleMemberIds?.map((m) => m.userId?.name).join(', ') || 'All members'}
                      </span>
                    </div>

                    {bill.notes && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-500 italic">
                        {bill.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {!isPaid ? (
                    <button
                      onClick={() => handleInitiatePay(bill)}
                      className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Record Payment Out-of-Pocket</span>
                    </button>
                  ) : (
                    <div className="text-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold py-1">
                      ✓ Settled in ledger — payer credited
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No bills found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Click Add Monthly Bill to record the rent or electricity bill for your flat.
          </p>
        </div>
      )}

      {/* Add Bill Modal */}
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
              Add Monthly Bill (Rent / Electricity)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Create a single authoritative bill with linked individual shares.
            </p>

            <form onSubmit={handleCreateBill} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Bill Type *
                  </label>
                  <select
                    value={billType}
                    onChange={(e) => setBillType(e.target.value as BillType)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Rent">Flat Rent</option>
                    <option value="Electricity">Electricity Bill</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Billing Period *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. October 2026"
                    value={billingPeriod}
                    onChange={(e) => setBillingPeriod(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Bill Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Total Amount in INR (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder={billType === 'Rent' ? 'e.g. 16000' : 'e.g. 2400'}
                    value={amountINR}
                    onChange={(e) => setAmountINR(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Responsible Roommates */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Responsible Roommates ({eligibleMemberIds.length} sharing)
                </label>
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
                          <span className="truncate">{m.name}</span>
                        </button>
                      );
                    })}
                </div>

                {amountINR && eligibleMemberIds.length > 0 && (
                  <div className="mt-2 text-xs text-slate-500 flex justify-between">
                    <span>Each person owes:</span>
                    <strong>{formatINR(parseFloat(amountINR) / eligibleMemberIds.length)}</strong>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Notes / Payment Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Paid to flat owner via NEFT / Consumer No: 541092"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/25 transition"
                >
                  Create Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Bill Payment Modal */}
      {isPayModalOpen && selectedBillToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Record Bill Payment
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Who paid <strong>{selectedBillToPay.title}</strong> ({formatINR(selectedBillToPay.amountINR)}) out of pocket?
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Payer (credited in ledger) *
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

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setIsPinModalOpen(true)}
                className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-md shadow-brand-500/20 flex items-center justify-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Verify PIN & Pay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Verification Modal */}
      <PinModal
        isOpen={isPinModalOpen}
        title="Authorize Bill Payment"
        description="Enter your 4-digit PIN to confirm bill payment and update ledger balances."
        onConfirm={handleConfirmPayWithPin}
        onCancel={() => setIsPinModalOpen(false)}
      />
    </div>
  );
};
