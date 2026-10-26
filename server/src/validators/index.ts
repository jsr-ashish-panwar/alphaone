import { z } from 'zod';

export const pinRegex = /^\d{4,6}$/;

export const registerFlatSchema = z.object({
  flatName: z.string().min(2, 'Flat name must be at least 2 characters').trim(),
  address: z.string().optional(),
  adminName: z.string().min(2, 'Admin name must be at least 2 characters').trim(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, and _ . -')
    .toLowerCase()
    .trim(),
  pin: z.string().regex(pinRegex, 'PIN must be 4 to 6 numeric digits'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').toLowerCase().trim(),
  pin: z.string().regex(pinRegex, 'PIN must be 4 to 6 numeric digits'),
  flatCode: z.string().optional(),
});

export const verifyPinSchema = z.object({
  pin: z.string().regex(pinRegex, 'PIN must be 4 to 6 numeric digits'),
});

export const changePinSchema = z.object({
  currentPin: z.string().regex(pinRegex, 'Current PIN must be 4 to 6 numeric digits'),
  newPin: z.string().regex(pinRegex, 'New PIN must be 4 to 6 numeric digits'),
});

export const addMemberSchema = z.object({
  name: z.string().min(2, 'Member name must be at least 2 characters').trim(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, and _ . -')
    .toLowerCase()
    .trim(),
  pin: z.string().regex(pinRegex, 'PIN must be 4 to 6 numeric digits'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  role: z.enum(['admin', 'member']).default('member'),
  joinedAt: z.string().or(z.date()).optional(),
});

export const updateMemberSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).optional(),
  role: z.enum(['admin', 'member']).optional(),
  leftAt: z.string().or(z.date()).optional().nullable(),
});

export const resetPinSchema = z.object({
  newPin: z.string().regex(pinRegex, 'New PIN must be 4 to 6 numeric digits'),
});

export const createExpenseSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').trim(),
  category: z.enum([
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
  ]),
  amountINR: z.number().positive('Amount must be greater than zero'),
  payerMembershipId: z.string().min(1, 'Payer membership ID is required'),
  eligibleMemberIds: z
    .array(z.string())
    .min(1, 'At least one member must be selected to share the expense'),
  expenseDate: z.string().or(z.date()).optional(),
  description: z.string().optional(),
  receiptUrl: z.string().optional(),
  pin: z.string().regex(pinRegex, 'PIN verification is required to authorize adding an expense'),
});

export const reverseExpenseSchema = z.object({
  reason: z.string().min(3, 'Reason for reversal is required').trim(),
  pin: z.string().regex(pinRegex, 'PIN verification is required to authorize reversal'),
});

export const createBillSchema = z.object({
  type: z.enum(['Rent', 'Electricity']),
  billingPeriod: z.string().min(2, 'Billing period is required (e.g. "October 2026")').trim(),
  title: z.string().min(2, 'Bill title is required').trim(),
  amountINR: z.number().positive('Bill amount must be greater than zero'),
  payerMembershipId: z.string().optional().nullable(),
  dueDate: z.string().or(z.date()),
  eligibleMemberIds: z
    .array(z.string())
    .min(1, 'At least one eligible member must be selected for the bill'),
  paymentStatus: z.enum(['unpaid', 'paid', 'partial']).default('unpaid'),
  notes: z.string().optional(),
  receiptUrl: z.string().optional(),
});

export const recordBillPaymentSchema = z.object({
  payerMembershipId: z.string().min(1, 'Payer membership ID is required'),
  paidAt: z.string().or(z.date()).optional(),
  pin: z.string().regex(pinRegex, 'PIN is required to record payment'),
});

export const createPaymentSchema = z.object({
  receiverMembershipId: z.string().min(1, 'Receiver membership ID is required'),
  amountINR: z.number().positive('Repayment amount must be greater than zero'),
  method: z.enum(['Cash', 'UPI', 'Bank Transfer', 'Other']),
  reference: z.string().optional(),
  paymentDate: z.string().or(z.date()).optional(),
  notes: z.string().optional(),
  payerMembershipId: z.string().optional(), // defaults to authenticated member
});

export const updatePaymentStatusSchema = z.object({
  status: z.enum(['Confirmed', 'Rejected', 'Cancelled']),
  notes: z.string().optional(),
});
