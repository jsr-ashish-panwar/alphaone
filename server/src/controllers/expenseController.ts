import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Expense } from '../models/Expense.js';
import { ExpenseSplit } from '../models/ExpenseSplit.js';
import { User } from '../models/User.js';
import { Membership } from '../models/Membership.js';
import { AuditService } from '../services/auditService.js';
import { distributePaiseEqually } from '../services/balanceService.js';
import { createExpenseSchema, reverseExpenseSchema } from '../validators/index.js';
import { AuthenticatedRequest } from '../types/index.js';

export class ExpenseController {
  static async createExpense(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createExpenseSchema.parse(req.body);

      // 1. Verify PIN of currently authenticated user
      const user = await User.findById(req.user!.userId).select('+pinHash');
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      if (user.isLocked()) {
        res.status(423).json({ success: false, message: 'Account locked due to excessive failed attempts.' });
        return;
      }

      const isPinValid = await user.comparePin(data.pin);
      if (!isPinValid) {
        await user.incFailedAttempts();
        res.status(401).json({ success: false, message: 'Incorrect PIN. Expense creation denied.' });
        return;
      }
      await user.resetAttempts();

      // 2. Authorize payer:
      // If data.payerMembershipId != req.user.membershipId, only admin can assign another payer
      if (data.payerMembershipId !== req.user!.membershipId && req.user!.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Only an administrator can record an expense paid by another member.',
        });
        return;
      }

      // 3. Verify payer membership belongs to this flat
      const payerMembership = await Membership.findOne({
        _id: data.payerMembershipId,
        flatId: req.user!.flatId,
        status: 'active',
      });
      if (!payerMembership) {
        res.status(400).json({ success: false, message: 'Selected payer is not an active flat member.' });
        return;
      }

      // 4. Verify eligible members belong to this flat
      const eligibleMembers = await Membership.find({
        _id: { $in: data.eligibleMemberIds },
        flatId: req.user!.flatId,
      });

      if (eligibleMembers.length !== data.eligibleMemberIds.length) {
        res.status(400).json({ success: false, message: 'One or more selected members are invalid for this flat.' });
        return;
      }

      // 5. Calculate integer paise and deterministic split
      const totalAmountPaise = Math.round(data.amountINR * 100);
      const splitAmounts = distributePaiseEqually(totalAmountPaise, data.eligibleMemberIds.length);

      // 6. Create Expense
      const expense = await Expense.create({
        flatId: new Types.ObjectId(req.user!.flatId),
        title: data.title,
        category: data.category,
        totalAmountPaise,
        payerMembershipId: payerMembership._id,
        createdByUserId: new Types.ObjectId(req.user!.userId),
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
        description: data.description,
        receiptUrl: data.receiptUrl,
        splitMethod: 'equal',
        status: 'finalized',
      });

      // 7. Create ExpenseSplits
      const splits = data.eligibleMemberIds.map((mId, index) => ({
        expenseId: expense._id,
        membershipId: new Types.ObjectId(mId),
        shareAmountPaise: splitAmounts[index],
        splitCalculationMethod: 'equal',
      }));

      await ExpenseSplit.insertMany(splits);

      // 8. Log Audit
      await AuditService.log({
        flatId: req.user!.flatId,
        actorUserId: req.user!.userId,
        action: 'EXPENSE_CREATED',
        entityType: 'Expense',
        entityId: expense._id,
        metadata: {
          title: expense.title,
          amountINR: data.amountINR,
          totalAmountPaise,
          splitCount: splits.length,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Expense added and split successfully.',
        expense: {
          ...expense.toJSON(),
          amountINR: data.amountINR,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async listExpenses(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        category,
        payerId,
        startDate,
        endDate,
        search,
        status = 'finalized',
        page = '1',
        limit = '50',
      } = req.query as Record<string, string>;

      const query: Record<string, any> = {
        flatId: new Types.ObjectId(req.user!.flatId),
      };

      if (status && status !== 'all') {
        query.status = status;
      }
      if (category && category !== 'all') {
        query.category = category;
      }
      if (payerId && payerId !== 'all') {
        query.payerMembershipId = new Types.ObjectId(payerId);
      }
      if (startDate || endDate) {
        query.expenseDate = {};
        if (startDate) query.expenseDate.$gte = new Date(startDate);
        if (endDate) query.expenseDate.$lte = new Date(endDate);
      }
      if (search) {
        query.title = { $regex: search, $options: 'i' };
      }

      const p = parseInt(page, 10) || 1;
      const l = parseInt(limit, 10) || 50;

      const totalCount = await Expense.countDocuments(query);
      const expenses = await Expense.find(query)
        .populate({
          path: 'payerMembershipId',
          populate: { path: 'userId', select: 'name username' },
        })
        .populate('createdByUserId', 'name username')
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean();

      // Attach splits
      const expIds = expenses.map((e) => e._id);
      const allSplits = await ExpenseSplit.find({ expenseId: { $in: expIds } })
        .populate({
          path: 'membershipId',
          populate: { path: 'userId', select: 'name username' },
        })
        .lean();

      const splitsByExpense = new Map<string, any[]>();
      for (const sp of allSplits) {
        const key = sp.expenseId.toString();
        if (!splitsByExpense.has(key)) splitsByExpense.set(key, []);
        splitsByExpense.get(key)!.push({
          membershipId: sp.membershipId,
          shareAmountPaise: sp.shareAmountPaise,
          shareAmountINR: sp.shareAmountPaise / 100,
        });
      }

      const formatted = expenses.map((e) => ({
        ...e,
        amountINR: e.totalAmountPaise / 100,
        splits: splitsByExpense.get(e._id.toString()) || [],
      }));

      res.json({
        success: true,
        expenses: formatted,
        pagination: {
          total: totalCount,
          page: p,
          pages: Math.ceil(totalCount / l),
          limit: l,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getExpense(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const expense = await Expense.findOne({
        _id: id,
        flatId: req.user!.flatId,
      })
        .populate({
          path: 'payerMembershipId',
          populate: { path: 'userId', select: 'name username' },
        })
        .populate('createdByUserId', 'name username')
        .lean();

      if (!expense) {
        res.status(404).json({ success: false, message: 'Expense not found.' });
        return;
      }

      const splits = await ExpenseSplit.find({ expenseId: expense._id })
        .populate({
          path: 'membershipId',
          populate: { path: 'userId', select: 'name username' },
        })
        .lean();

      res.json({
        success: true,
        expense: {
          ...expense,
          amountINR: expense.totalAmountPaise / 100,
          splits: splits.map((s) => ({
            ...s,
            shareAmountINR: s.shareAmountPaise / 100,
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async reverseExpense(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = reverseExpenseSchema.parse(req.body);

      // Verify PIN
      const user = await User.findById(req.user!.userId).select('+pinHash');
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      const isPinValid = await user.comparePin(data.pin);
      if (!isPinValid) {
        await user.incFailedAttempts();
        res.status(401).json({ success: false, message: 'Incorrect PIN. Reversal rejected.' });
        return;
      }
      await user.resetAttempts();

      const expense = await Expense.findOne({ _id: id, flatId: req.user!.flatId });
      if (!expense) {
        res.status(404).json({ success: false, message: 'Expense not found.' });
        return;
      }

      if (expense.status === 'reversed') {
        res.status(400).json({ success: false, message: 'Expense is already reversed.' });
        return;
      }

      // Check authorization: only admin or the user who created the expense can reverse it
      if (
        req.user!.role !== 'admin' &&
        expense.createdByUserId.toString() !== req.user!.userId
      ) {
        res.status(403).json({
          success: false,
          message: 'Only the creator or an administrator can reverse this expense.',
        });
        return;
      }

      expense.status = 'reversed';
      await expense.save();

      await AuditService.log({
        flatId: req.user!.flatId,
        actorUserId: req.user!.userId,
        action: 'EXPENSE_REVERSED',
        entityType: 'Expense',
        entityId: expense._id,
        reason: data.reason,
        metadata: { title: expense.title, amountINR: expense.totalAmountPaise / 100 },
      });

      res.json({
        success: true,
        message: 'Expense reversed successfully. Balances have been updated.',
      });
    } catch (err) {
      next(err);
    }
  }
}
