import React from 'react';

interface CurrencyFormatProps {
  amount: number;
  showSign?: boolean;
  className?: string;
}

export const formatINR = (val: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: val % 1 !== 0 ? 2 : 0,
  }).format(val);
};

export const CurrencyFormat: React.FC<CurrencyFormatProps> = ({ amount, showSign = false, className = '' }) => {
  const isPositive = amount > 0;
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      {showSign && isPositive && '+'}
      {showSign && isNegative && '-'}
      {formatINR(absAmount)}
    </span>
  );
};
