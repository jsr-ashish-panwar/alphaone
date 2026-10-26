import React from 'react';
import { formatINR } from './CurrencyFormat.js';

interface SummaryCardProps {
  title: string;
  amount: number;
  icon: React.ReactNode;
  subtitle?: string;
  badge?: {
    text: string;
    variant: 'positive' | 'negative' | 'neutral' | 'info';
  };
  highlight?: boolean;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  amount,
  icon,
  subtitle,
  badge,
  highlight = false,
}) => {
  const badgeClasses = {
    positive: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60',
    negative: 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60',
    neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60',
  };

  return (
    <div
      className={`p-5 rounded-2xl border transition-all duration-200 ${
        highlight
          ? 'bg-gradient-to-br from-brand-600 to-indigo-700 text-white shadow-xl shadow-brand-500/15 border-transparent'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={`text-xs font-semibold uppercase tracking-wider ${
            highlight ? 'text-brand-100' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {title}
        </span>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            highlight
              ? 'bg-white/15 text-white backdrop-blur-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400'
          }`}
        >
          {icon}
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <h4
          className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
            highlight ? 'text-white' : 'text-slate-900 dark:text-white'
          }`}
        >
          {formatINR(amount)}
        </h4>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
        {subtitle && (
          <span
            className={`text-xs truncate ${
              highlight ? 'text-brand-100/90' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {subtitle}
          </span>
        )}
        {badge && (
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
              highlight ? 'bg-white/20 text-white border-white/20' : badgeClasses[badge.variant]
            }`}
          >
            {badge.text}
          </span>
        )}
      </div>
    </div>
  );
};
