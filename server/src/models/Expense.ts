import mongoose, { Document, Schema } from 'mongoose';
import { IExpense } from '../types/index.js';

export interface IExpenseDocument extends Omit<IExpense, '_id'>, Document {}

const ExpenseSchema = new Schema<IExpenseDocument>(
  {
    flatId: {
      type: Schema.Types.ObjectId,
      ref: 'Flat',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'Daily Things',
        'Online Products',
        'Rent',
        'Electricity Bill',
        'Vegetables',
        'Groceries',
        'Milk',
        'Cleaning Supplies',
        'Internet',
        'Other',
      ],
      required: true,
      index: true,
    },
    totalAmountPaise: {
      type: Number,
      required: true,
      min: 1,
    },
    payerMembershipId: {
      type: Schema.Types.ObjectId,
      ref: 'Membership',
      required: true,
      index: true,
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expenseDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['finalized', 'reversed', 'draft'],
      default: 'finalized',
      index: true,
    },
    receiptUrl: {
      type: String,
    },
    splitMethod: {
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

export const Expense = mongoose.model<IExpenseDocument>('Expense', ExpenseSchema);
