import mongoose, { Document, Schema } from 'mongoose';
import { IMembership } from '../types/index.js';

export interface IMembershipDocument extends Omit<IMembership, '_id'>, Document {}

const MembershipSchema = new Schema<IMembershipDocument>(
  {
    flatId: {
      type: Schema.Types.ObjectId,
      ref: 'Flat',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
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

MembershipSchema.index({ flatId: 1, userId: 1 }, { unique: true });

export const Membership = mongoose.model<IMembershipDocument>('Membership', MembershipSchema);
