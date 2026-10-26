import React from 'react';
import { formatINR } from './CurrencyFormat.js';
import { ArrowDownLeft, ArrowUpRight, Check } from 'lucide-react';

interface BalancePillProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const BalancePill: React.FC<BalancePillProps> = ({ amount, size = 'md', showLabel = false }) => {
  const isSettled = Math.abs(amount) < 0.01;
  const isReceivable = amount > 0.01;
  const isOwed = amount < -0.01;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3.5 py-1.5 gap-2 font-bold',
  };

  if (isSettled) {
    return (
      <span
        className={`inline-flex items-center font-medium rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 ${sizeClasses[size]}`}
      >
        <Check className="w-3.5 h-3.5 text-slate-500" />
        <span>Settled</span>
      </span>
    );
  }

  if (isReceivable) {
    return (
      <span
        className={`inline-flex items-center font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60 ${sizeClasses[size]}`}
      >
        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>+{formatINR(amount)}</span>
        {showLabel && <span className="text-xs opacity-75 font-normal ml-0.5">to receive</span>}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60 ${sizeClasses[size]}`}
    >
      <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
      <span>-{formatINR(Math.abs(amount))}</span>
      {showLabel && <span className="text-xs opacity-75 font-normal ml-0.5">owes</span>}
    </span>
  );
};
