import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Bill } from '../models/Bill.js';
import { Membership } from '../models/Membership.js';
import { User } from '../models/User.js';
import { AuditService } from '../services/auditService.js';
import { distributePaiseEqually } from '../services/balanceService.js';
import {
  createBillSchema,
  recordBillPaymentSchema,
} from '../validators/index.js';
import { AuthenticatedRequest } from '../types/index.js';

export class BillController {
  static async createBill(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createBillSchema.parse(req.body);

      // Check duplicate bill for the same period and type in this flat
      const existing = await Bill.findOne({
        flatId: req.user!.flatId,
        type: data.type,
        billingPeriod: data.billingPeriod,
        status: { $ne: 'cancelled' },
      });

      if (existing) {
        res.status(409).json({
          success: false,
          message: `A ${data.type} bill for period "${data.billingPeriod}" already exists.`,
        });
        return;
      }

      // Verify eligible members belong to this flat
      const eligibleMembers = await Membership.find({
        _id: { $in: data.eligibleMemberIds },
        flatId: req.user!.flatId,
      });

      if (eligibleMembers.length !== data.eligibleMemberIds.length) {
        res.status(400).json({ success: false, message: 'One or more selected members are invalid for this flat.' });
        return;
      }

      // If payer is specified, verify payer membership
      let payerMembershipId: Types.ObjectId | undefined;
      if (data.payerMembershipId) {
        const payer = await Membership.findOne({
          _id: data.payerMembershipId,
          flatId: req.user!.flatId,
          status: 'active',
        });
        if (!payer) {
          res.status(400).json({ success: false, message: 'Selected bill payer is not an active member.' });
          return;
        }
        payerMembershipId = payer._id;
      }

      const totalAmountPaise = Math.round(data.amountINR * 100);

      const bill = await Bill.create({
        flatId: new Types.ObjectId(req.user!.flatId),
        type: data.type,
        billingPeriod: data.billingPeriod,
        title: data.title,
        totalAmountPaise,
        payerMembershipId,
        dueDate: new Date(data.dueDate),
        eligibleMemberIds: data.eligibleMemberIds.map((id) => new Types.ObjectId(id)),
        paymentStatus: data.paymentStatus,
        receiptUrl: data.receiptUrl,
        notes: data.notes,
        status: 'finalized',
        paidAt: data.paymentStatus === 'paid' ? new Date() : undefined,
      });

      await AuditService.log({
        flatId: req.user!.flatId,
        actorUserId: req.user!.userId,
        action: 'BILL_CREATED',
        entityType: 'Bill',
        entityId: bill._id,
        metadata: {
          type: bill.type,
          billingPeriod: bill.billingPeriod,
          amountINR: data.amountINR,
          paymentStatus: bill.paymentStatus,
        },
      });

      res.status(201).json({
        success: true,
        message: `${bill.type} bill created successfully.`,
        bill: {
          ...bill.toJSON(),
          amountINR: data.amountINR,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async recordBillPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = recordBillPaymentSchema.parse(req.body);

      // Verify PIN
      const user = await User.findById(req.user!.userId).select('+pinHash');
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      const isPinValid = await user.comparePin(data.pin);
      if (!isPinValid) {
        await user.incFailedAttempts();
        res.status(401).json({ success: false, message: 'Incorrect PIN. Action denied.' });
        return;
      }
      await user.resetAttempts();

      const bill = await Bill.findOne({ _id: id, flatId: req.user!.flatId });
      if (!bill) {
        res.status(404).json({ success: false, message: 'Bill not found.' });
        return;
      }

      // Verify payer
      const payer = await Membership.findOne({
        _id: data.payerMembershipId,
        flatId: req.user!.flatId,
        status: 'active',
      });
      if (!payer) {
        res.status(400).json({ success: false, message: 'Invalid payer membership.' });
        return;
      }

      bill.payerMembershipId = payer._id;
      bill.paymentStatus = 'paid';
      bill.paidAt = data.paidAt ? new Date(data.paidAt) : new Date();
      await bill.save();

      await AuditService.log({
        flatId: req.user!.flatId,
        actorUserId: req.user!.userId,
        action: 'BILL_PAID',
        entityType: 'Bill',
        entityId: bill._id,
        metadata: {
          type: bill.type,
          billingPeriod: bill.billingPeriod,
          payerMembershipId: payer._id,
          amountINR: bill.totalAmountPaise / 100,
        },
      });

      res.json({
        success: true,
        message: `${bill.type} bill marked as paid. Member balances updated.`,
        bill,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listBills(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type, status } = req.query as Record<string, string>;
      const query: Record<string, any> = {
        flatId: new Types.ObjectId(req.user!.flatId),
      };

      if (type && type !== 'all') {
        query.type = type;
      }
      if (status && status !== 'all') {
        query.paymentStatus = status;
      }

      const bills = await Bill.find(query)
        .populate({
          path: 'payerMembershipId',
          populate: { path: 'userId', select: 'name username' },
        })
        .populate({
          path: 'eligibleMemberIds',
          populate: { path: 'userId', select: 'name username' },
        })
        .sort({ dueDate: -1, createdAt: -1 })
        .lean();

      const formatted = bills.map((b) => {
        const eligibleCount = b.eligibleMemberIds.length || 1;
        const perMemberSharePaise = Math.floor(b.totalAmountPaise / eligibleCount);
        return {
          ...b,
          amountINR: b.totalAmountPaise / 100,
          perMemberShareINR: perMemberSharePaise / 100,
        };
      });

      res.json({
        success: true,
        bills: formatted,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getBill(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const bill = await Bill.findOne({ _id: id, flatId: req.user!.flatId })
        .populate({
          path: 'payerMembershipId',
          populate: { path: 'userId', select: 'name username' },
        })
        .populate({
          path: 'eligibleMemberIds',
          populate: { path: 'userId', select: 'name username' },
        })
        .lean();

      if (!bill) {
        res.status(404).json({ success: false, message: 'Bill not found.' });
        return;
      }

      const eligibleCount = bill.eligibleMemberIds.length || 1;
      const shares = distributePaiseEqually(bill.totalAmountPaise, eligibleCount);

      const memberShares = bill.eligibleMemberIds.map((m: any, idx: number) => ({
        member: m,
        shareAmountPaise: shares[idx],
        shareAmountINR: shares[idx] / 100,
      }));

      res.json({
        success: true,
        bill: {
          ...bill,
          amountINR: bill.totalAmountPaise / 100,
          memberShares,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
