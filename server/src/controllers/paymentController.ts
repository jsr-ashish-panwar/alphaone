import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Payment } from '../models/Payment.js';
import { Membership } from '../models/Membership.js';
import { AuditService } from '../services/auditService.js';
import {
  createPaymentSchema,
  updatePaymentStatusSchema,
} from '../validators/index.js';
import { AuthenticatedRequest } from '../types/index.js';

export class PaymentController {
  static async createPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createPaymentSchema.parse(req.body);

      // Payer is default current user's membership unless admin overrides
      let payerMembershipId = req.user!.membershipId;
      if (data.payerMembershipId && data.payerMembershipId !== req.user!.membershipId) {
        if (req.user!.role !== 'admin') {
          res.status(403).json({
            success: false,
            message: 'Only an admin can record a repayment on behalf of another member.',
          });
          return;
        }
        payerMembershipId = data.payerMembershipId;
      }

      if (payerMembershipId === data.receiverMembershipId) {
        res.status(400).json({
          success: false,
          message: 'Payer and receiver cannot be the same member.',
        });
        return;
      }

      // Verify both members belong to flat
      const payer = await Membership.findOne({ _id: payerMembershipId, flatId: req.user!.flatId });
      const receiver = await Membership.findOne({ _id: data.receiverMembershipId, flatId: req.user!.flatId });

      if (!payer || !receiver) {
        res.status(400).json({ success: false, message: 'Invalid payer or receiver membership.' });
        return;
      }

      const amountPaise = Math.round(data.amountINR * 100);

      const payment = await Payment.create({
        flatId: new Types.ObjectId(req.user!.flatId),
        payerMembershipId: payer._id,
        receiverMembershipId: receiver._id,
        amountPaise,
        method: data.method,
        reference: data.reference,
        status: 'Pending',
        createdByUserId: new Types.ObjectId(req.user!.userId),
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        notes: data.notes,
      });

      await AuditService.log({
        flatId: req.user!.flatId,
        actorUserId: req.user!.userId,
        action: 'PAYMENT_RECORDED',
        entityType: 'Payment',
        entityId: payment._id,
        metadata: {
          payerMembershipId: payer._id,
          receiverMembershipId: receiver._id,
          amountINR: data.amountINR,
          method: data.method,
          status: payment.status,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Settlement payment recorded as Pending. The receiver can confirm receipt.',
        payment: {
          ...payment.toJSON(),
          amountINR: data.amountINR,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async updatePaymentStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = updatePaymentStatusSchema.parse(req.body);

      const payment = await Payment.findOne({ _id: id, flatId: req.user!.flatId });
      if (!payment) {
        res.status(404).json({ success: false, message: 'Payment record not found.' });
        return;
      }

      if (payment.status === 'Confirmed' || payment.status === 'Cancelled') {
        res.status(400).json({
          success: false,
          message: `Cannot update a payment that is already ${payment.status}.`,
        });
        return;
      }

      const isReceiver = payment.receiverMembershipId.toString() === req.user!.membershipId;
      const isPayer = payment.payerMembershipId.toString() === req.user!.membershipId;
      const isAdmin = req.user!.role === 'admin';

      // Authorization rules:
      // - To Confirm: Must be receiver or admin
      // - To Reject: Must be receiver or admin
      // - To Cancel: Must be payer or admin
      if (data.status === 'Confirmed' || data.status === 'Rejected') {
        if (!isReceiver && !isAdmin) {
          res.status(403).json({
            success: false,
            message: 'Only the receiver or an administrator can confirm or reject this repayment.',
          });
          return;
        }
      } else if (data.status === 'Cancelled') {
        if (!isPayer && !isAdmin) {
          res.status(403).json({
            success: false,
            message: 'Only the payer or an administrator can cancel this pending payment.',
          });
          return;
        }
      }

      payment.status = data.status;
      if (data.status === 'Confirmed') {
        payment.confirmedByUserId = new Types.ObjectId(req.user!.userId);
      }
      if (data.notes) {
        payment.notes = payment.notes ? `${payment.notes} | ${data.notes}` : data.notes;
      }
      await payment.save();

      await AuditService.log({
        flatId: req.user!.flatId,
        actorUserId: req.user!.userId,
        action: `PAYMENT_${data.status.toUpperCase()}`,
        entityType: 'Payment',
        entityId: payment._id,
        metadata: {
          status: data.status,
          amountINR: payment.amountPaise / 100,
        },
      });

      res.json({
        success: true,
        message: `Payment status changed to ${data.status}. Outstanding balances updated accordingly.`,
        payment,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listPayments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.query as Record<string, string>;
      const query: Record<string, any> = {
        flatId: new Types.ObjectId(req.user!.flatId),
      };

      if (status && status !== 'all') {
        query.status = status;
      }

      const payments = await Payment.find(query)
        .populate({
          path: 'payerMembershipId',
          populate: { path: 'userId', select: 'name username' },
        })
        .populate({
          path: 'receiverMembershipId',
          populate: { path: 'userId', select: 'name username' },
        })
        .populate('createdByUserId', 'name username')
        .populate('confirmedByUserId', 'name username')
        .sort({ paymentDate: -1, createdAt: -1 })
        .lean();

      const formatted = payments.map((p) => ({
        ...p,
        amountINR: p.amountPaise / 100,
      }));

      res.json({
        success: true,
        payments: formatted,
      });
    } catch (err) {
      next(err);
    }
  }
}
