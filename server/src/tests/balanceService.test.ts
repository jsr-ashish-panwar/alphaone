import { describe, it, expect } from 'vitest';
import {
  distributePaiseEqually,
  BalanceService,
  MemberBalanceSummary,
} from '../services/balanceService.js';

describe('BalanceService & Financial Logic', () => {
  describe('distributePaiseEqually', () => {
    it('splits ₹500 (50,000 paise) equally among 4 members without remainder', () => {
      const shares = distributePaiseEqually(50000, 4);
      expect(shares).toEqual([12500, 12500, 12500, 12500]);
      expect(shares.reduce((a, b) => a + b, 0)).toBe(50000);
    });

    it('splits ₹100 (10,000 paise) among 3 members with remainder deterministically allocated', () => {
      const shares = distributePaiseEqually(10000, 3);
      // 10000 / 3 = 3333 with remainder 1. First member gets 3334, others 3333.
      expect(shares).toEqual([3334, 3333, 3333]);
      expect(shares.reduce((a, b) => a + b, 0)).toBe(10000);
    });

    it('splits ₹10 (1,000 paise) among 7 members with sum strictly matching total', () => {
      const shares = distributePaiseEqually(1000, 7);
      expect(shares.length).toBe(7);
      expect(shares.reduce((a, b) => a + b, 0)).toBe(1000);
    });

    it('returns empty array when count is 0 or negative', () => {
      expect(distributePaiseEqually(1000, 0)).toEqual([]);
    });
  });

  describe('computeSettlementSuggestions (Debt Simplification)', () => {
    it('correctly matches debtor with creditor in a 2-person scenario', () => {
      const mockBalances: MemberBalanceSummary[] = [
        {
          membershipId: 'm1',
          userId: 'u1',
          name: 'Rohan',
          username: 'rohan',
          role: 'admin',
          status: 'active',
          joinedAt: new Date(),
          totalPaidPaise: 50000,
          totalSharePaise: 12500,
          netExpenseBalancePaise: 37500,
          settlementsPaidPaise: 0,
          settlementsReceivedPaise: 0,
          netBalancePaise: 37500, // Creditor (+₹375)
          totalPaidINR: 500,
          totalShareINR: 125,
          netBalanceINR: 375,
        },
        {
          membershipId: 'm2',
          userId: 'u2',
          name: 'Aarav',
          username: 'aarav',
          role: 'member',
          status: 'active',
          joinedAt: new Date(),
          totalPaidPaise: 0,
          totalSharePaise: 37500,
          netExpenseBalancePaise: -37500,
          settlementsPaidPaise: 0,
          settlementsReceivedPaise: 0,
          netBalancePaise: -37500, // Debtor (-₹375)
          totalPaidINR: 0,
          totalShareINR: 375,
          netBalanceINR: -375,
        },
      ];

      const suggestions = BalanceService.computeSettlementSuggestions(mockBalances);
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toEqual({
        fromMembershipId: 'm2',
        fromName: 'Aarav',
        toMembershipId: 'm1',
        toName: 'Rohan',
        amountPaise: 37500,
        amountINR: 375,
      });
    });

    it('returns empty suggestions when all balances are 0 (settled)', () => {
      const mockBalances: MemberBalanceSummary[] = [
        {
          membershipId: 'm1',
          userId: 'u1',
          name: 'Rohan',
          username: 'rohan',
          role: 'admin',
          status: 'active',
          joinedAt: new Date(),
          totalPaidPaise: 10000,
          totalSharePaise: 10000,
          netExpenseBalancePaise: 0,
          settlementsPaidPaise: 0,
          settlementsReceivedPaise: 0,
          netBalancePaise: 0,
          totalPaidINR: 100,
          totalShareINR: 100,
          netBalanceINR: 0,
        },
      ];

      const suggestions = BalanceService.computeSettlementSuggestions(mockBalances);
      expect(suggestions).toEqual([]);
    });
  });
});
