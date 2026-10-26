import mongoose, { Document, Schema } from 'mongoose';
import { IBill } from '../types/index.js';

export interface IBillDocument extends Omit<IBill, '_id'>, Document {}

const BillSchema = new Schema<IBillDocument>(
  {
    flatId: {
      type: Schema.Types.ObjectId,
      ref: 'Flat',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['Rent', 'Electricity'],
      required: true,
      index: true,
    },
    billingPeriod: {
      type: String,
      required: true,
      trim: true,
      index: true, // e.g. "2026-10" or "October 2026"
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    totalAmountPaise: {
      type: Number,
      required: true,
      min: 1,
    },
    payerMembershipId: {
      type: Schema.Types.ObjectId,
      ref: 'Membership',
    },
    dueDate: {
      type: Date,
      required: true,
    },
    eligibleMemberIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Membership',
      },
    ],
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'partial'],
      default: 'unpaid',
      index: true,
    },
    receiptUrl: {
      type: String,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'finalized', 'cancelled'],
      default: 'finalized',
    },
    paidAt: {
      type: Date,
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

BillSchema.index({ flatId: 1, type: 1, billingPeriod: 1 }, { unique: true });

export const Bill = mongoose.model<IBillDocument>('Bill', BillSchema);
