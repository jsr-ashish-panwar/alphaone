import mongoose, { Document, Schema } from 'mongoose';
import { IPayment } from '../types/index.js';

export interface IPaymentDocument extends Omit<IPayment, '_id'>, Document {}

const PaymentSchema = new Schema<IPaymentDocument>(
  {
    flatId: {
      type: Schema.Types.ObjectId,
      ref: 'Flat',
      required: true,
      index: true,
    },
    payerMembershipId: {
      type: Schema.Types.ObjectId,
      ref: 'Membership',
      required: true,
      index: true,
    },
    receiverMembershipId: {
      type: Schema.Types.ObjectId,
      ref: 'Membership',
      required: true,
      index: true,
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 1,
    },
    method: {
      type: String,
      enum: ['Cash', 'UPI', 'Bank Transfer', 'Other'],
      required: true,
    },
    reference: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Rejected', 'Cancelled'],
      default: 'Pending',
      index: true,
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    confirmedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Payment = mongoose.model<IPaymentDocument>('Payment', PaymentSchema);
