import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Expense } from '../models/Expense.js';
import { ExpenseSplit } from '../models/ExpenseSplit.js';
import { Bill } from '../models/Bill.js';
import { Payment } from '../models/Payment.js';
import { AuditLog } from '../models/AuditLog.js';
import { AuthenticatedRequest } from '../types/index.js';

export interface LedgerItem {
  id: string;
  date: Date;
  type: 'Expense' | 'Rent' | 'Electricity' | 'Settlement';
  title: string;
  category?: string;
  amountINR: number;
  paidBy: { id: string; name: string };
  createdBy?: { id: string; name: string };
  status: string;
  notes?: string;
  shares?: { memberName: string; amountINR: number }[];
}

export class ReportController {
  static async getLedger(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        type,
        timeframe,
        startDate,
        endDate,
        memberId,
        category,
        search,
      } = req.query as Record<string, string>;

      const flatId = new Types.ObjectId(req.user!.flatId);

      // Determine date range
      let dateFrom: Date | undefined;
      let dateTo: Date | undefined;

      const now = new Date();
      if (timeframe === 'today') {
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      } else if (timeframe === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        dateFrom = startOfWeek;
        dateTo = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      } else if (timeframe === 'month') {
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (startDate || endDate) {
        if (startDate) dateFrom = new Date(startDate);
        if (endDate) dateTo = new Date(endDate);
      }

      const ledger: LedgerItem[] = [];

      // 1. Fetch Expenses
      if (!type || type === 'all' || type === 'Expense') {
        const expQuery: Record<string, any> = { flatId };
        if (category && category !== 'all') expQuery.category = category;
        if (dateFrom || dateTo) {
          expQuery.expenseDate = {};
          if (dateFrom) expQuery.expenseDate.$gte = dateFrom;
          if (dateTo) expQuery.expenseDate.$lte = dateTo;
        }
        if (memberId && memberId !== 'all') {
          expQuery.payerMembershipId = new Types.ObjectId(memberId);
        }

        const expenses = await Expense.find(expQuery)
          .populate({
            path: 'payerMembershipId',
            populate: { path: 'userId', select: 'name username' },
          })
          .populate('createdByUserId', 'name username')
          .lean();

        const expIds = expenses.map((e) => e._id);
        const splits = await ExpenseSplit.find({ expenseId: { $in: expIds } })
          .populate({
            path: 'membershipId',
            populate: { path: 'userId', select: 'name username' },
          })
          .lean();

        const splitMap = new Map<string, { memberName: string; amountINR: number }[]>();
        for (const sp of splits) {
          const key = sp.expenseId.toString();
          if (!splitMap.has(key)) splitMap.set(key, []);
          const u = (sp.membershipId as any)?.userId;
          splitMap.get(key)!.push({
            memberName: u?.name || 'Unknown',
            amountINR: sp.shareAmountPaise / 100,
          });
        }

        for (const e of expenses) {
          const payerUser = (e.payerMembershipId as any)?.userId;
          const createdUser = e.createdByUserId as any;
          ledger.push({
            id: e._id.toString(),
            date: e.expenseDate,
            type: 'Expense',
            title: e.title,
            category: e.category,
            amountINR: e.totalAmountPaise / 100,
            paidBy: {
              id: (e.payerMembershipId as any)?._id?.toString() || '',
              name: payerUser?.name || 'Unknown',
            },
            createdBy: {
              id: createdUser?._id?.toString() || '',
              name: createdUser?.name || 'Unknown',
            },
            status: e.status,
            notes: e.description,
            shares: splitMap.get(e._id.toString()) || [],
          });
        }
      }

      // 2. Fetch Bills (Rent / Electricity)
      if (!type || type === 'all' || type === 'Rent' || type === 'Electricity' || type === 'Bill') {
        const billQuery: Record<string, any> = { flatId };
        if (type === 'Rent') billQuery.type = 'Rent';
        if (type === 'Electricity') billQuery.type = 'Electricity';
        if (dateFrom || dateTo) {
          billQuery.dueDate = {};
          if (dateFrom) billQuery.dueDate.$gte = dateFrom;
          if (dateTo) billQuery.dueDate.$lte = dateTo;
        }

        const bills = await Bill.find(billQuery)
          .populate({
            path: 'payerMembershipId',
            populate: { path: 'userId', select: 'name username' },
          })
          .populate({
            path: 'eligibleMemberIds',
            populate: { path: 'userId', select: 'name username' },
          })
          .lean();

        for (const b of bills) {
          const payerUser = (b.payerMembershipId as any)?.userId;
          const eligibleCount = b.eligibleMemberIds.length || 1;
          const perShare = b.totalAmountPaise / eligibleCount / 100;

          ledger.push({
            id: b._id.toString(),
            date: b.dueDate,
            type: b.type,
            title: `${b.type} Bill - ${b.billingPeriod}`,
            amountINR: b.totalAmountPaise / 100,
            paidBy: {
              id: (b.payerMembershipId as any)?._id?.toString() || '',
              name: payerUser?.name || (b.paymentStatus === 'unpaid' ? 'Unpaid' : 'Unknown'),
            },
            status: b.paymentStatus,
            notes: b.notes,
            shares: b.eligibleMemberIds.map((m: any) => ({
              memberName: m.userId?.name || 'Unknown',
              amountINR: perShare,
            })),
          });
        }
      }

      // 3. Fetch Payments (Settlements)
      if (!type || type === 'all' || type === 'Settlement' || type === 'Payment') {
        const payQuery: Record<string, any> = { flatId };
        if (dateFrom || dateTo) {
          payQuery.paymentDate = {};
          if (dateFrom) payQuery.paymentDate.$gte = dateFrom;
          if (dateTo) payQuery.paymentDate.$lte = dateTo;
        }

        const payments = await Payment.find(payQuery)
          .populate({
            path: 'payerMembershipId',
            populate: { path: 'userId', select: 'name username' },
          })
          .populate({
            path: 'receiverMembershipId',
            populate: { path: 'userId', select: 'name username' },
          })
          .populate('createdByUserId', 'name username')
          .lean();

        for (const p of payments) {
          const payerUser = (p.payerMembershipId as any)?.userId;
          const receiverUser = (p.receiverMembershipId as any)?.userId;
          const createdUser = p.createdByUserId as any;

          ledger.push({
            id: p._id.toString(),
            date: p.paymentDate,
            type: 'Settlement',
            title: `Repayment: ${payerUser?.name || 'Unknown'} → ${receiverUser?.name || 'Unknown'}`,
            amountINR: p.amountPaise / 100,
            paidBy: {
              id: (p.payerMembershipId as any)?._id?.toString() || '',
              name: payerUser?.name || 'Unknown',
            },
            createdBy: {
              id: createdUser?._id?.toString() || '',
              name: createdUser?.name || 'Unknown',
            },
            status: p.status,
            notes: `${p.method}${p.reference ? ` (Ref: ${p.reference})` : ''}`,
          });
        }
      }

      // Filter search
      let filtered = ledger;
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (item) =>
            item.title.toLowerCase().includes(s) ||
            item.paidBy.name.toLowerCase().includes(s) ||
            (item.category && item.category.toLowerCase().includes(s)) ||
            (item.notes && item.notes.toLowerCase().includes(s))
        );
      }

      // Sort by date descending
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      res.json({
        success: true,
        count: filtered.length,
        ledger: filtered,
      });
    } catch (err) {
      next(err);
    }
  }

  static async exportLedgerCSV(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Reuse getLedger logic
      const ledgerResponse = await new Promise<any[]>((resolve, reject) => {
        const mockRes = {
          json: (data: any) => resolve(data.ledger || []),
          status: () => mockRes,
        } as any;
        ReportController.getLedger(req, mockRes, (err: any) => reject(err));
      });

      // Build CSV
      const headers = ['Date', 'Type', 'Title', 'Category', 'Amount (INR)', 'Paid By', 'Status', 'Notes'];
      const rows = ledgerResponse.map((row) => [
        `"${new Date(row.date).toISOString().slice(0, 10)}"`,
        `"${row.type}"`,
        `"${row.title.replace(/"/g, '""')}"`,
        `"${row.category || ''}"`,
        row.amountINR.toFixed(2),
        `"${row.paidBy.name.replace(/"/g, '""')}"`,
        `"${row.status}"`,
        `"${(row.notes || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="roommate-split-ledger.csv"');
      res.status(200).send(csvContent);
    } catch (err) {
      next(err);
    }
  }

  static async getAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const logs = await AuditLog.find({ flatId: req.user!.flatId })
        .populate('actorUserId', 'name username')
        .sort({ timestamp: -1 })
        .limit(100)
        .lean();

      res.json({
        success: true,
        logs,
      });
    } catch (err) {
      next(err);
    }
  }
}
