import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { BalanceService } from '../services/balanceService.js';
import { Expense } from '../models/Expense.js';
import { Bill } from '../models/Bill.js';
import { Payment } from '../models/Payment.js';
import { AuthenticatedRequest } from '../types/index.js';

export class BalanceController {
  static async getFlatBalances(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const balanceReport = await BalanceService.calculateFlatBalances(req.user!.flatId);
      res.json({
        success: true,
        report: balanceReport,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const flatId = new Types.ObjectId(req.user!.flatId);
      const membershipId = req.user!.membershipId;

      // 1. Authoritative balances
      const balanceReport = await BalanceService.calculateFlatBalances(flatId);
      const myBalance = balanceReport.memberBalances.find((m) => m.membershipId === membershipId) || {
        totalPaidPaise: 0,
        totalSharePaise: 0,
        netBalancePaise: 0,
        totalPaidINR: 0,
        totalShareINR: 0,
        netBalanceINR: 0,
      };

      // 2. Month-specific breakdown (current month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      // Expenses this month
      const currentMonthExpenses = await Expense.find({
        flatId,
        status: 'finalized',
        expenseDate: { $gte: startOfMonth, $lte: endOfMonth },
      }).lean();

      let totalExpensesThisMonthPaise = 0;
      let groceryAndHouseholdPaise = 0;

      for (const e of currentMonthExpenses) {
        totalExpensesThisMonthPaise += e.totalAmountPaise;
        if (['Groceries', 'Vegetables', 'Milk', 'Cleaning Supplies'].includes(e.category)) {
          groceryAndHouseholdPaise += e.totalAmountPaise;
        }
      }

      // Rent and Electricity bills this month
      const currentMonthBills = await Bill.find({
        flatId,
        status: 'finalized',
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      }).lean();

      let monthlyRentPaise = 0;
      let electricityBillPaise = 0;

      for (const b of currentMonthBills) {
        if (b.type === 'Rent') {
          monthlyRentPaise += b.totalAmountPaise;
        } else if (b.type === 'Electricity') {
          electricityBillPaise += b.totalAmountPaise;
        }
      }

      // If no bills created this month, check the most recent bill for rent & electricity
      if (monthlyRentPaise === 0) {
        const lastRent = await Bill.findOne({ flatId, type: 'Rent', status: 'finalized' })
          .sort({ dueDate: -1 })
          .lean();
        if (lastRent) monthlyRentPaise = lastRent.totalAmountPaise;
      }

      if (electricityBillPaise === 0) {
        const lastElec = await Bill.findOne({ flatId, type: 'Electricity', status: 'finalized' })
          .sort({ dueDate: -1 })
          .lean();
        if (lastElec) electricityBillPaise = lastElec.totalAmountPaise;
      }

      // 3. Outstanding dues vs receivables for current user
      const myDuesPaise = myBalance.netBalancePaise < 0 ? Math.abs(myBalance.netBalancePaise) : 0;
      const amountOthersOweMePaise = myBalance.netBalancePaise > 0 ? myBalance.netBalancePaise : 0;

      // 4. Pending settlements for this flat
      const pendingSettlements = await Payment.find({
        flatId,
        status: 'Pending',
      })
        .populate({
          path: 'payerMembershipId',
          populate: { path: 'userId', select: 'name username' },
        })
        .populate({
          path: 'receiverMembershipId',
          populate: { path: 'userId', select: 'name username' },
        })
        .sort({ createdAt: -1 })
        .lean();

      // 5. Recent transactions (last 10 combined expenses, bills, settlements)
      const recentExpenses = await Expense.find({ flatId, status: 'finalized' })
        .populate({
          path: 'payerMembershipId',
          populate: { path: 'userId', select: 'name username' },
        })
        .sort({ expenseDate: -1, createdAt: -1 })
        .limit(6)
        .lean();

      // 6. Monthly spending history for charts (last 6 months)
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const pastExpenses = await Expense.find({
        flatId,
        status: 'finalized',
        expenseDate: { $gte: sixMonthsAgo },
      }).lean();

      const monthlyDataMap = new Map<string, { month: string; Groceries: number; Bills: number; Other: number; Total: number }>();

      // Initialize 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mKey = d.toLocaleString('default', { month: 'short' });
        monthlyDataMap.set(mKey, { month: mKey, Groceries: 0, Bills: 0, Other: 0, Total: 0 });
      }

      for (const e of pastExpenses) {
        const mKey = new Date(e.expenseDate).toLocaleString('default', { month: 'short' });
        if (monthlyDataMap.has(mKey)) {
          const entry = monthlyDataMap.get(mKey)!;
          const amt = e.totalAmountPaise / 100;
          entry.Total += amt;
          if (['Groceries', 'Vegetables', 'Milk'].includes(e.category)) {
            entry.Groceries += amt;
          } else {
            entry.Other += amt;
          }
        }
      }

      // Add paid bills into the monthly data
      const pastBills = await Bill.find({
        flatId,
        status: 'finalized',
        paymentStatus: 'paid',
        dueDate: { $gte: sixMonthsAgo },
      }).lean();

      for (const b of pastBills) {
        const mKey = new Date(b.dueDate).toLocaleString('default', { month: 'short' });
        if (monthlyDataMap.has(mKey)) {
          const entry = monthlyDataMap.get(mKey)!;
          const amt = b.totalAmountPaise / 100;
          entry.Bills += amt;
          entry.Total += amt;
        }
      }

      const chartData = Array.from(monthlyDataMap.values());

      res.json({
        success: true,
        summaryCards: {
          totalExpensesThisMonthINR: totalExpensesThisMonthPaise / 100,
          monthlyRentINR: monthlyRentPaise / 100,
          electricityBillINR: electricityBillPaise / 100,
          groceryAndHouseholdINR: groceryAndHouseholdPaise / 100,
          myOutstandingDuesINR: myDuesPaise / 100,
          amountOthersOweMeINR: amountOthersOweMePaise / 100,
          totalAmountIPaidINR: myBalance.totalPaidINR,
          myShareOfTotalExpensesINR: myBalance.totalShareINR,
          myNetBalanceINR: myBalance.netBalanceINR,
        },
        memberBalances: balanceReport.memberBalances,
        settlementSuggestions: balanceReport.settlementSuggestions,
        pendingSettlements: pendingSettlements.map((p) => ({
          ...p,
          amountINR: p.amountPaise / 100,
        })),
        recentTransactions: recentExpenses.map((e) => ({
          ...e,
          amountINR: e.totalAmountPaise / 100,
        })),
        chartData,
      });
    } catch (err) {
      next(err);
    }
  }
}
