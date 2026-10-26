import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { error } = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState('ashish');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [flatCode, setFlatCode] = useState('ALPHA-C42');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || pin.length < 4) {
      error('Please enter username and 4-digit PIN');
      return;
    }

    setIsLoading(true);
    try {
      const ok = await login(username, pin, flatCode);
      if (ok) {
        navigate('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const demoAccounts = [
    { username: 'ashish', name: 'Ashish Panwar (Admin)', role: 'Admin' },
    { username: 'hitesh', name: 'Hitesh Chauhan', role: 'Member' },
    { username: 'govind', name: 'Govind Sharma', role: 'Member' },
    { username: 'pd', name: 'PD Bhai', role: 'Member' },
  ];

  const handleSelectDemo = (d: { username: string }) => {
    setUsername(d.username);
    setPin('');
    setFlatCode('ALPHA-C42');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 mesh-bg">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-brand-500/25 mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Alpha C-42 Flat Login
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          RoomMate Split PIN-Protected Ledger
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-200/80 dark:border-slate-800">
          {/* Demo Roommates Quick-Selector */}
          <div className="mb-6 p-3 rounded-2xl bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-800/60">
            <div className="text-[11px] font-bold uppercase tracking-wider text-brand-900 dark:text-brand-300 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                <span>Quick Roommate Accounts</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {demoAccounts.map((d) => (
                <button
                  key={d.username}
                  type="button"
                  onClick={() => handleSelectDemo(d)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-semibold text-left transition border ${
                    username === d.username
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="block truncate font-bold">{d.name}</span>
                  <span className="block text-[10px] opacity-75">@{d.username}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. ashish"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                4-Digit Security PIN
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={6}
                  required
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm font-mono tracking-widest bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  title={showPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Flat Code (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. ALPHA-C42"
                value={flatCode}
                onChange={(e) => setFlatCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-60"
            >
              <span>{isLoading ? 'Verifying PIN...' : 'Log In to Flat'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            <span>Living in a new rented flat? </span>
            <Link to="/register" className="font-bold text-brand-600 dark:text-brand-400 hover:underline">
              Register Flat & Admin
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
