import { Types } from 'mongoose';
import { Expense } from '../models/Expense.js';
import { ExpenseSplit } from '../models/ExpenseSplit.js';
import { Bill } from '../models/Bill.js';
import { Payment } from '../models/Payment.js';
import { Membership } from '../models/Membership.js';

export interface MemberBalanceSummary {
  membershipId: string;
  userId: string;
  name: string;
  username: string;
  role: string;
  status: string;
  joinedAt: Date;
  leftAt?: Date;
  totalPaidPaise: number; // Total amount paid out of pocket for expenses and paid bills
  totalSharePaise: number; // Total share of expenses and bills charged to this member
  netExpenseBalancePaise: number; // totalPaidPaise - totalSharePaise
  settlementsPaidPaise: number; // Confirmed repayments made to others
  settlementsReceivedPaise: number; // Confirmed repayments received from others
  netBalancePaise: number; // Net balance: > 0 means others owe them, < 0 means they owe others
  // Formatted INR helpers
  totalPaidINR: number;
  totalShareINR: number;
  netBalanceINR: number;
}

export interface SettlementSuggestion {
  fromMembershipId: string;
  fromName: string;
  toMembershipId: string;
  toName: string;
  amountPaise: number;
  amountINR: number;
}

export interface FlatBalanceReport {
  flatId: string;
  memberBalances: MemberBalanceSummary[];
  totalExpensesPaise: number;
  totalExpensesINR: number;
  totalBillsPaidPaise: number;
  totalBillsPaidINR: number;
  totalSettlementsPaise: number;
  totalSettlementsINR: number;
  sumOfNetBalancesPaise: number; // Invariant check: should be 0
  settlementSuggestions: SettlementSuggestion[];
}

/**
 * Distribute integer paise equally among count members.
 * Leftover paise are distributed 1 by 1 deterministically to the first members.
 * Guarantees sum(shares) === totalPaise exactly.
 */
export function distributePaiseEqually(totalPaise: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(totalPaise / count);
  const remainder = totalPaise % count;
  const shares: number[] = [];
  for (let i = 0; i < count; i++) {
    shares.push(base + (i < remainder ? 1 : 0));
  }
  return shares;
}

export class BalanceService {
  /**
   * Authoritative calculation of flat balances from base records in MongoDB.
   */
  static async calculateFlatBalances(flatId: string | Types.ObjectId): Promise<FlatBalanceReport> {
    const fId = new Types.ObjectId(flatId.toString());

    // 1. Fetch all memberships (both active and inactive to preserve historical records)
    const memberships = await Membership.find({ flatId: fId })
      .populate('userId', 'name username email accountStatus')
      .lean();

    const memberMap = new Map<string, MemberBalanceSummary>();

    for (const m of memberships) {
      const u = m.userId as any;
      const memId = m._id.toString();
      memberMap.set(memId, {
        membershipId: memId,
        userId: u?._id?.toString() || '',
        name: u?.name || 'Unknown',
        username: u?.username || 'unknown',
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
        leftAt: m.leftAt,
        totalPaidPaise: 0,
        totalSharePaise: 0,
        netExpenseBalancePaise: 0,
        settlementsPaidPaise: 0,
        settlementsReceivedPaise: 0,
        netBalancePaise: 0,
        totalPaidINR: 0,
        totalShareINR: 0,
        netBalanceINR: 0,
      });
    }

    // 2. Fetch all finalized expenses
    const expenses = await Expense.find({
      flatId: fId,
      status: 'finalized',
    }).lean();

    const expenseIds = expenses.map((e) => e._id);
    let totalExpensesPaise = 0;

    // Credit payers for expenses
    for (const exp of expenses) {
      totalExpensesPaise += exp.totalAmountPaise;
      const payerId = exp.payerMembershipId.toString();
      const payer = memberMap.get(payerId);
      if (payer) {
        payer.totalPaidPaise += exp.totalAmountPaise;
      }
    }

    // Debit members for expense splits
    const expenseSplits = await ExpenseSplit.find({
      expenseId: { $in: expenseIds },
    }).lean();

    for (const split of expenseSplits) {
      const memId = split.membershipId.toString();
      const mem = memberMap.get(memId);
      if (mem) {
        mem.totalSharePaise += split.shareAmountPaise;
      }
    }

    // 3. Fetch paid Bills (Rent & Electricity)
    const paidBills = await Bill.find({
      flatId: fId,
      status: 'finalized',
      paymentStatus: 'paid',
      payerMembershipId: { $exists: true, $ne: null },
    }).lean();

    let totalBillsPaidPaise = 0;

    for (const bill of paidBills) {
      totalBillsPaidPaise += bill.totalAmountPaise;
      const payerId = bill.payerMembershipId!.toString();
      const payer = memberMap.get(payerId);
      if (payer) {
        payer.totalPaidPaise += bill.totalAmountPaise;
      }

      // Split bill amount among eligible members
      const eligibleIds = bill.eligibleMemberIds.map((id) => id.toString());
      if (eligibleIds.length > 0) {
        const shares = distributePaiseEqually(bill.totalAmountPaise, eligibleIds.length);
        eligibleIds.forEach((mId, idx) => {
          const mem = memberMap.get(mId);
          if (mem) {
            mem.totalSharePaise += shares[idx];
          }
        });
      }
    }

    // 4. Fetch confirmed Payments (repayments/settlements)
    const confirmedPayments = await Payment.find({
      flatId: fId,
      status: 'Confirmed',
    }).lean();

    let totalSettlementsPaise = 0;

    for (const payment of confirmedPayments) {
      totalSettlementsPaise += payment.amountPaise;
      const payerId = payment.payerMembershipId.toString();
      const receiverId = payment.receiverMembershipId.toString();

      const payer = memberMap.get(payerId);
      const receiver = memberMap.get(receiverId);

      // When Payer pays Receiver:
      // Payer's debt decreases (balance increases towards positive)
      if (payer) {
        payer.settlementsPaidPaise += payment.amountPaise;
      }
      // Receiver's receivable decreases (balance decreases towards zero)
      if (receiver) {
        receiver.settlementsReceivedPaise += payment.amountPaise;
      }
    }

    // 5. Calculate net balance for each member
    // netBalance = (totalPaid - totalShare) + settlementsPaid - settlementsReceived
    let sumOfNetBalancesPaise = 0;
    const memberBalances: MemberBalanceSummary[] = [];

    for (const mem of memberMap.values()) {
      mem.netExpenseBalancePaise = mem.totalPaidPaise - mem.totalSharePaise;
      mem.netBalancePaise =
        mem.netExpenseBalancePaise + mem.settlementsPaidPaise - mem.settlementsReceivedPaise;

      mem.totalPaidINR = mem.totalPaidPaise / 100;
      mem.totalShareINR = mem.totalSharePaise / 100;
      mem.netBalanceINR = mem.netBalancePaise / 100;

      sumOfNetBalancesPaise += mem.netBalancePaise;
      memberBalances.push(mem);
    }

    // 6. Compute settlement suggestions (debt minimization)
    const settlementSuggestions = this.computeSettlementSuggestions(memberBalances);

    return {
      flatId: fId.toString(),
      memberBalances,
      totalExpensesPaise,
      totalExpensesINR: totalExpensesPaise / 100,
      totalBillsPaidPaise,
      totalBillsPaidINR: totalBillsPaidPaise / 100,
      totalSettlementsPaise,
      totalSettlementsINR: totalSettlementsPaise / 100,
      sumOfNetBalancesPaise,
      settlementSuggestions,
    };
  }

  /**
   * Compute simplified settlement suggestions (minimizing transaction count).
   */
  static computeSettlementSuggestions(
    memberBalances: MemberBalanceSummary[]
  ): SettlementSuggestion[] {
    // Debtors (netBalance < 0) owe money
    const debtors: { membershipId: string; name: string; amount: number }[] = [];
    // Creditors (netBalance > 0) should receive money
    const creditors: { membershipId: string; name: string; amount: number }[] = [];

    for (const m of memberBalances) {
      if (m.netBalancePaise < 0) {
        debtors.push({
          membershipId: m.membershipId,
          name: m.name,
          amount: Math.abs(m.netBalancePaise),
        });
      } else if (m.netBalancePaise > 0) {
        creditors.push({
          membershipId: m.membershipId,
          name: m.name,
          amount: m.netBalancePaise,
        });
      }
    }

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const suggestions: SettlementSuggestion[] = [];
    let i = 0; // debtor index
    let j = 0; // creditor index

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const settleAmount = Math.min(debtor.amount, creditor.amount);

      if (settleAmount > 0) {
        suggestions.push({
          fromMembershipId: debtor.membershipId,
          fromName: debtor.name,
          toMembershipId: creditor.membershipId,
          toName: creditor.name,
          amountPaise: settleAmount,
          amountINR: settleAmount / 100,
        });
      }

      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;

      if (debtor.amount === 0) i++;
      if (creditor.amount === 0) j++;
    }

    return suggestions;
  }
}
