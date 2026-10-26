import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Calendar,
  KeyRound,
  UserX,
  UserCheck,
  Edit2,
  X,
  CreditCard,
  PieChart,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { api } from '../services/api.js';
import { MemberBalanceSummary, UserRole } from '../types/index.js';
import { BalancePill } from '../components/BalancePill.js';
import { CurrencyFormat } from '../components/CurrencyFormat.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

export const MembersPage: React.FC = () => {
  const { user, membership } = useAuth();
  const { success, error } = useToast();

  const [members, setMembers] = useState<MemberBalanceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResetPinModalOpen, setIsResetPinModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberBalanceSummary | null>(null);

  // Add Member Form
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [joinedAt, setJoinedAt] = useState(new Date().toISOString().slice(0, 10));

  // Reset PIN Form
  const [newPin, setNewPin] = useState('');

  const isAdmin = membership?.role === 'admin';

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getMembers();
      if (res.success) {
        setMembers(res.members);
      }
    } catch (err: any) {
      error(err.message || 'Failed to load roommates');
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      error('PIN must be at least 4 digits');
      return;
    }

    try {
      const res = await api.addMember({
        name,
        username,
        pin,
        email: email || undefined,
        role,
        joinedAt,
      });

      if (res.success) {
        success(`Roommate ${name} added successfully! Initial PIN set.`);
        setIsAddModalOpen(false);
        setName('');
        setUsername('');
        setPin('');
        setEmail('');
        fetchMembers();
      }
    } catch (err: any) {
      error(err.message || 'Failed to add roommate');
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || newPin.length < 4) {
      error('PIN must be 4 to 6 numeric digits');
      return;
    }

    try {
      const res = await api.resetMemberPin(selectedMember.membershipId, newPin);
      if (res.success) {
        success(`PIN for ${selectedMember.name} has been updated.`);
        setIsResetPinModalOpen(false);
        setNewPin('');
      }
    } catch (err: any) {
      error(err.message || 'Failed to reset PIN');
    }
  };

  const handleToggleDeactivate = async () => {
    if (!selectedMember) return;
    const newStatus = selectedMember.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await api.updateMember(selectedMember.membershipId, {
        status: newStatus,
        leftAt: newStatus === 'inactive' ? new Date().toISOString() : null,
      });

      if (res.success) {
        success(
          newStatus === 'inactive'
            ? `Roommate ${selectedMember.name} deactivated. Past expenses and dues preserved.`
            : `Roommate ${selectedMember.name} reactivated.`
        );
        setIsDeactivateModalOpen(false);
        fetchMembers();
      }
    } catch (err: any) {
      error(err.message || 'Action failed');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Flat Roommate Accounts
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage flat members, joining & leaving dates, initial PINs, and personal financial standings.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/25 transition active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Roommate</span>
          </button>
        )}
      </div>

      {/* Member Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading roommate profiles...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {members.map((mem) => {
            const isSelf = mem.userId === user?.id;
            const isActive = mem.status === 'active';

            return (
              <div
                key={mem.membershipId}
                className={`p-6 rounded-3xl border transition-all duration-200 flex flex-col justify-between ${
                  !isActive
                    ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md'
                }`}
              >
                <div>
                  {/* Top info */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-brand-500/20">
                        {mem.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {mem.name}
                          </h3>
                          {isSelf && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">@{mem.username}</div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          mem.role === 'admin'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {mem.role}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'text-slate-500 bg-slate-100 dark:bg-slate-800'
                        }`}
                      >
                        {isActive ? 'Active' : 'Inactive (Left)'}
                      </span>
                    </div>
                  </div>

                  {/* Financial Standing Cards */}
                  <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center mb-4">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Total Paid</div>
                      <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                        <CurrencyFormat amount={mem.totalPaidINR} />
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">My Share</div>
                      <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                        <CurrencyFormat amount={mem.totalShareINR} />
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Net Balance</div>
                      <div className="mt-0.5">
                        <BalancePill amount={mem.netBalanceINR} size="sm" />
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Joined Flat: <strong>{new Date(mem.joinedAt).toLocaleDateString()}</strong></span>
                    </div>
                    {mem.leftAt && (
                      <div className="flex items-center gap-1.5 text-rose-500">
                        <UserX className="w-3.5 h-3.5" />
                        <span>Left Flat: <strong>{new Date(mem.leftAt).toLocaleDateString()}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {(isAdmin || isSelf) && (
                    <button
                      onClick={() => {
                        setSelectedMember(mem);
                        setIsResetPinModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                      <span>{isSelf ? 'Change My PIN' : 'Reset PIN'}</span>
                    </button>
                  )}

                  {isAdmin && !isSelf && (
                    <button
                      onClick={() => {
                        setSelectedMember(mem);
                        setIsDeactivateModalOpen(true);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        isActive
                          ? 'border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/40'
                          : 'border border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/60 dark:hover:bg-emerald-950/40'
                      }`}
                    >
                      {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      <span>{isActive ? 'Deactivate' : 'Reactivate'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
              Add New Roommate Account
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Assign a unique username and initial 4-digit PIN for the new flat member.
            </p>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sahil Kapoor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. sahil"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Initial PIN (4 digits) *
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    placeholder="e.g. 1234"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Joining Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={joinedAt}
                    onChange={(e) => setJoinedAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                    Role *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="member">Roommate (Member)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. sahil@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset PIN Modal */}
      {isResetPinModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Reset Security PIN
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter a new 4 to 6-digit security PIN for <strong>{selectedMember.name}</strong>.
            </p>

            <form onSubmit={handleResetPin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  New PIN (4 digits) *
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  placeholder="e.g. 5678"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-2.5 rounded-xl text-center text-xl font-mono tracking-widest bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetPinModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-md shadow-brand-500/20"
                >
                  Update PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Member Modal */}
      {isDeactivateModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {selectedMember.status === 'active' ? 'Deactivate Member?' : 'Reactivate Member?'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              {selectedMember.status === 'active' ? (
                <>
                  When <strong>{selectedMember.name}</strong> leaves the flat, they are deactivated from future expense splits. All their historical transactions, debts (<CurrencyFormat amount={selectedMember.netBalanceINR} />), and audit trails are preserved indefinitely.
                </>
              ) : (
                <>
                  Reactivating <strong>{selectedMember.name}</strong> will allow them to log in and participate in future flat expenses again.
                </>
              )}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsDeactivateModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleDeactivate}
                className={`flex-1 py-2.5 rounded-xl text-white text-xs font-semibold shadow-md ${
                  selectedMember.status === 'active'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                }`}
              >
                {selectedMember.status === 'active' ? 'Confirm Deactivation' : 'Confirm Reactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
