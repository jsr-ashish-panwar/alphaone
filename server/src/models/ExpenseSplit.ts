import mongoose, { Document, Schema } from 'mongoose';
import { IExpenseSplit } from '../types/index.js';

export interface IExpenseSplitDocument extends Omit<IExpenseSplit, '_id'>, Document {}

const ExpenseSplitSchema = new Schema<IExpenseSplitDocument>(
  {
    expenseId: {
      type: Schema.Types.ObjectId,
      ref: 'Expense',
      required: true,
      index: true,
    },
    membershipId: {
      type: Schema.Types.ObjectId,
      ref: 'Membership',
      required: true,
      index: true,
    },
    shareAmountPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    splitCalculationMethod: {
      type: String,
      enum: ['equal', 'custom'],
      default: 'equal',
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

ExpenseSplitSchema.index({ expenseId: 1, membershipId: 1 });

export const ExpenseSplit = mongoose.model<IExpenseSplitDocument>(
  'ExpenseSplit',
  ExpenseSplitSchema
);
