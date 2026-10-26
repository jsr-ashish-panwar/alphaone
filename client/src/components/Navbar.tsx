import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { useToast } from '../context/ToastContext.js';
import {
  Sun,
  Moon,
  LogOut,
  Copy,
  Check,
  UserCheck,
  ChevronDown,
  Building2,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const { user, flat, membership, logout, quickSwitchUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { info } = useToast();
  const [copied, setCopied] = useState(false);
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

  const handleCopyCode = () => {
    if (flat?.code) {
      navigator.clipboard.writeText(flat.code);
      setCopied(true);
      info('Flat code copied to clipboard!', flat.code);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const demoUsers = [
    { username: 'ashish', name: 'Ashish Panwar', role: 'Admin' },
    { username: 'hitesh', name: 'Hitesh Chauhan', role: 'Member' },
    { username: 'govind', name: 'Govind Sharma', role: 'Member' },
    { username: 'pd', name: 'PD Bhai', role: 'Member' },
  ];

  return (
    <header className="sticky top-0 z-30 w-full h-16 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Brand & Flat info */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-none">
              {flat?.name || 'Alpha C-42'}
            </h1>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-950/70 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
              RoomMate Split
            </span>
          </div>
          {flat?.code && (
            <button
              onClick={handleCopyCode}
              title="Click to copy flat code"
              className="group flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition mt-0.5"
            >
              <span>Code: {flat.code}</span>
              {copied ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Roommate Switcher (Demo helper) */}
        <div className="relative">
          <button
            onClick={() => setShowSwitchMenu(!showSwitchMenu)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition text-xs font-medium"
          >
            <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-[11px]">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                {user?.name}
              </div>
              <div className="text-[10px] text-slate-400 capitalize">
                {membership?.role || 'Member'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          </button>

          {showSwitchMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSwitchMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-56 p-1.5 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Switch Roommate (PIN: 1234)
                </div>
                {demoUsers.map((u) => {
                  const isCurrent = user?.username === u.username;
                  return (
                    <button
                      key={u.username}
                      onClick={async () => {
                        setShowSwitchMenu(false);
                        if (!isCurrent) await quickSwitchUser(u.username);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                        isCurrent
                          ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px]">
                          {u.name.charAt(0)}
                        </div>
                        <div className="text-left">
                          <div>{u.name}</div>
                          <span className="text-[10px] text-slate-400">@{u.username}</span>
                        </div>
                      </div>
                      {isCurrent && <UserCheck className="w-4 h-4 text-brand-600" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle Dark Mode"
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          title="Log out"
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
