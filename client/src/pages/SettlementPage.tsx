import React, { useState, useEffect, useCallback } from 'react';
import {
  HandCoins,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Send,
  X,
  CreditCard,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api.js';
import {
  PaymentRecord,
  MemberBalanceSummary,
  SettlementSuggestion,
  PaymentMethod,
} from '../types/index.js';
import { CurrencyFormat, formatINR } from '../components/CurrencyFormat.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

export const SettlementPage: React.FC = () => {
  const { user, membership } = useAuth();
  const { success, error } = useToast();

  const [members, setMembers] = useState<MemberBalanceSummary[]>([]);
  const [suggestions, setSuggestions] = useState<SettlementSuggestion[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Record Repayment Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [receiverMembershipId, setReceiverMembershipId] = useState('');
  const [amountINR, setAmountINR] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const fetchSettlementData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [membersRes, paymentsRes] = await Promise.all([
        api.getMembers(),
        api.getPayments(),
      ]);

      if (membersRes.success) {
        setMembers(membersRes.members);
        setSuggestions(membersRes.settlementSuggestions || []);
      }
      if (paymentsRes.success) {
        setPayments(paymentsRes.payments);
      }
    } catch (err: any) {
      error(err.message || 'Failed to load settlement data');
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchSettlementData();
  }, [fetchSettlementData]);

  const currentMember = members.find((m) => m.userId === user?.id);

  // Settle suggestion 1-click fill
  const handleUseSuggestion = (s: SettlementSuggestion) => {
    setReceiverMembershipId(s.toMembershipId);
    setAmountINR(s.amountINR.toString());
    setNotes(`Settlement from suggestion: ${s.fromName} → ${s.toName}`);
    setIsRecordModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amountINR);
    if (isNaN(amt) || amt <= 0) {
      error('Please enter a valid amount');
      return;
    }
    if (!receiverMembershipId) {
      error('Please select the receiver roommate');
      return;
    }

    try {
      const res = await api.createPayment({
        receiverMembershipId,
        amountINR: amt,
        method,
        reference,
        notes,
      });

      if (res.success) {
        success('Repayment recorded as Pending! Receiver will confirm receipt.');
        setIsRecordModalOpen(false);
        setAmountINR('');
        setReference('');
        setNotes('');
        fetchSettlementData();
      }
    } catch (err: any) {
      error(err.message || 'Failed to record repayment');
    }
  };

  const handleUpdateStatus = async (paymentId: string, status: 'Confirmed' | 'Rejected' | 'Cancelled') => {
    try {
      const res = await api.updatePaymentStatus(paymentId, status);
      if (res.success) {
        success(`Payment ${status.toLowerCase()} successfully!`);
        fetchSettlementData();
      }
    } catch (err: any) {
      error(err.message || 'Action failed');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Settle Balances & Repayments
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track who owes whom, record UPI / cash repayments, and confirm receipts to settle dues.
          </p>
        </div>

        <button
          onClick={() => {
            const otherMembers = members.filter((m) => m.userId !== user?.id);
            if (otherMembers.length > 0) setReceiverMembershipId(otherMembers[0].membershipId);
            setIsRecordModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/25 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Record Repayment</span>
        </button>
      </div>

      {/* Debt Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Whom I Owe */}
        <div className="p-5 rounded-3xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-sm mb-2">
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
            <span>Whom I Owe Money</span>
          </div>
          {currentMember && currentMember.netBalanceINR < 0 ? (
            <div>
              <div className="text-2xl font-extrabold text-rose-900 dark:text-rose-100">
                <CurrencyFormat amount={Math.abs(currentMember.netBalanceINR)} />
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                You have unpaid shares for groceries, rent or electricity. Use the suggested settlements below to clear your balance.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You currently do not owe any money to flatmates. Great job!
            </p>
          )}
        </div>

        {/* Who Owes Me */}
        <div className="p-5 rounded-3xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm mb-2">
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            <span>Whom I Can Receive Money From</span>
          </div>
          {currentMember && currentMember.netBalanceINR > 0 ? (
            <div>
              <div className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-100">
                <CurrencyFormat amount={currentMember.netBalanceINR} />
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                You paid for shared expenses or bills upfront and are owed reimbursements.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You do not have any pending receivables from flatmates.
            </p>
          )}
        </div>
      </div>

      {/* Complete Roommates Ledger: Who Takes vs Who Sends */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              All 4 Roommates: Who Takes Money vs Who Sends Money
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Green means they have to take/collect money (Lene hain). Red means they have to send money (Dene hain).
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 self-start sm:self-auto">
            Flat Alpha C-42
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {members.map((m) => {
            const takesMoney = m.netBalanceINR > 0;
            const sendsMoney = m.netBalanceINR < 0;
            return (
              <div
                key={m.membershipId}
                className={`p-4 rounded-2xl border transition ${
                  takesMoney
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300/80 dark:border-emerald-800/60'
                    : sendsMoney
                    ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300/80 dark:border-rose-800/60'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <span>{m.name}</span>
                    {m.userId === user?.id && <span className="text-[10px] text-brand-600 font-normal">(You)</span>}
                  </div>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      takesMoney
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                        : sendsMoney
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {takesMoney ? 'Takes Money' : sendsMoney ? 'Sends Money' : 'Settled'}
                  </span>
                </div>

                <div
                  className={`text-xl font-black ${
                    takesMoney
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : sendsMoney
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {takesMoney ? '+' : ''}
                  <CurrencyFormat amount={m.netBalanceINR} />
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 space-y-0.5">
                  <div>Paid for Flat: <CurrencyFormat amount={m.totalPaidINR} /></div>
                  <div>Calculated Share: <CurrencyFormat amount={m.totalShareINR} /></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Smart Debt Simplification Suggestions */}
      {suggestions.length > 0 && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Optimized Settlement Suggestions
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            The algorithm minimizes total repayments needed across all 4 roommates to reach zero net balances.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestions.map((s, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs text-slate-400 mb-1">Suggestion #{idx + 1}</div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    <strong className="text-brand-600 dark:text-brand-400">{s.fromName}</strong> pays{' '}
                    <strong className="text-indigo-600 dark:text-indigo-400">{s.toName}</strong>
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1.5">
                    <CurrencyFormat amount={s.amountINR} />
                  </div>
                </div>

                <button
                  onClick={() => handleUseSuggestion(s)}
                  className="mt-4 w-full py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-brand-600 dark:text-brand-300 hover:bg-brand-50 transition"
                >
                  Record this payment →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Repayments History & Pending Approvals */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
          Settlement Repayment Log
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          All recorded settlements. Only confirmed payments reduce outstanding debts.
        </p>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading settlements...</div>
        ) : payments.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {payments.map((p) => {
              const isReceiver = p.receiverMembershipId?.userId?.name === user?.name;
              const isPayer = p.payerMembershipId?.userId?.name === user?.name;
              const isAdmin = membership?.role === 'admin';
              const isPending = p.status === 'Pending';

              return (
                <div key={p._id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {p.payerMembershipId?.userId?.name || 'Someone'} → {p.receiverMembershipId?.userId?.name || 'Someone'}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          p.status === 'Confirmed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                            : p.status === 'Pending'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400">
                      Method: <strong>{p.method}</strong> • {new Date(p.paymentDate).toLocaleDateString()}
                      {p.reference && <span> • Ref: {p.reference}</span>}
                    </div>

                    {p.notes && <div className="text-xs text-slate-500 italic mt-0.5">{p.notes}</div>}
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-900 dark:text-white">
                        <CurrencyFormat amount={p.amountINR} />
                      </div>
                    </div>

                    {/* Actions if Pending */}
                    {isPending && (
                      <div className="flex items-center gap-1.5">
                        {(isReceiver || isAdmin) && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(p._id, 'Confirmed')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(p._id, 'Rejected')}
                              className="px-3 py-1.5 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {(isPayer || isAdmin) && !isReceiver && (
                          <button
                            onClick={() => handleUpdateStatus(p._id, 'Cancelled')}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-sm">
            No settlement payments recorded yet.
          </div>
        )}
      </div>

      {/* Record Repayment Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setIsRecordModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
              Record Shared Repayment
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Record a transfer made to a roommate. The receiver can confirm receipt.
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Receiver (Roommate you paid) *
                </label>
                <select
                  required
                  value={receiverMembershipId}
                  onChange={(e) => setReceiverMembershipId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select receiver...</option>
                  {members
                    .filter((m) => m.userId !== user?.id && m.status === 'active')
                    .map((m) => (
                      <option key={m.membershipId} value={m.membershipId}>
                        {m.name} (@{m.username})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Amount (INR) *
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

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer / IMPS / NEFT</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Transaction Reference / UTR (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI/394109281/GPay"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Oct rent share settlement"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/25 transition"
                >
                  Submit Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
