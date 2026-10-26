import { Request } from 'express';
import { Types } from 'mongoose';

export type UserRole = 'admin' | 'member';
export type AccountStatus = 'active' | 'inactive' | 'suspended';
export type ExpenseCategory =
  | 'Daily Things'
  | 'Online Products'
  | 'Rent'
  | 'Electricity Bill'
  | 'Vegetables'
  | 'Groceries'
  | 'Milk'
  | 'Cleaning Supplies'
  | 'Internet'
  | 'Other';
export type ExpenseStatus = 'finalized' | 'reversed' | 'draft';
export type BillType = 'Rent' | 'Electricity';
export type BillStatus = 'unpaid' | 'paid' | 'partial';
export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Other';
export type PaymentStatus = 'Pending' | 'Confirmed' | 'Rejected' | 'Cancelled';

export interface IUser {
  _id: Types.ObjectId;
  username: string;
  name: string;
  email?: string;
  pinHash: string;
  accountStatus: AccountStatus;
  failedPinAttempts: number;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFlat {
  _id: Types.ObjectId;
  name: string;
  address?: string;
  adminUserId: Types.ObjectId;
  code: string;
  timezone: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMembership {
  _id: Types.ObjectId;
  flatId: Types.ObjectId;
  userId: Types.ObjectId;
  role: UserRole;
  joinedAt: Date;
  leftAt?: Date;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface IExpense {
  _id: Types.ObjectId;
  flatId: Types.ObjectId;
  title: string;
  category: ExpenseCategory;
  totalAmountPaise: number; // Integer in paise (1 INR = 100 paise)
  payerMembershipId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  expenseDate: Date;
  description?: string;
  status: ExpenseStatus;
  receiptUrl?: string;
  splitMethod: 'equal' | 'custom';
  createdAt: Date;
  updatedAt: Date;
}

export interface IExpenseSplit {
  _id: Types.ObjectId;
  expenseId: Types.ObjectId;
  membershipId: Types.ObjectId;
  shareAmountPaise: number;
  splitCalculationMethod: 'equal' | 'custom';
  createdAt: Date;
  updatedAt: Date;
}

export interface IBill {
  _id: Types.ObjectId;
  flatId: Types.ObjectId;
  type: BillType;
  billingPeriod: string; // e.g. "2026-10"
  title: string;
  totalAmountPaise: number;
  payerMembershipId?: Types.ObjectId;
  dueDate: Date;
  eligibleMemberIds: Types.ObjectId[];
  paymentStatus: BillStatus;
  receiptUrl?: string;
  notes?: string;
  status: 'draft' | 'finalized' | 'cancelled';
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPayment {
  _id: Types.ObjectId;
  flatId: Types.ObjectId;
  payerMembershipId: Types.ObjectId;
  receiverMembershipId: Types.ObjectId;
  amountPaise: number;
  method: PaymentMethod;
  reference?: string;
  status: PaymentStatus;
  createdByUserId: Types.ObjectId;
  confirmedByUserId?: Types.ObjectId;
  paymentDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuditLog {
  _id: Types.ObjectId;
  flatId: Types.ObjectId;
  actorUserId: Types.ObjectId;
  action: string;
  entityType: string;
  entityId: Types.ObjectId;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  reason?: string;
}

export interface AuthUserPayload {
  userId: string;
  username: string;
  name: string;
  flatId: string;
  membershipId: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}
