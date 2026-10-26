export type UserRole = 'admin' | 'member';
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

export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
}

export interface Flat {
  id: string;
  name: string;
  code: string;
  address?: string;
  timezone?: string;
  currency?: string;
}

export interface MembershipInfo {
  id: string;
  role: UserRole;
}

export interface MemberBalanceSummary {
  membershipId: string;
  userId: string;
  name: string;
  username: string;
  role: UserRole;
  status: 'active' | 'inactive';
  joinedAt: string;
  leftAt?: string;
  totalPaidPaise: number;
  totalSharePaise: number;
  netExpenseBalancePaise: number;
  settlementsPaidPaise: number;
  settlementsReceivedPaise: number;
  netBalancePaise: number;
  totalPaidINR: number;
  totalShareINR: number;
  netBalanceINR: number;
}

export interface SettlementSuggestion {
  fromMembershipId: string;
  fromName: string;
  toMembershipId: string;
  toName: string;
  amountPaise: number;
  amountINR: number;
}

export interface DashboardSummary {
  summaryCards: {
    totalExpensesThisMonthINR: number;
    monthlyRentINR: number;
    electricityBillINR: number;
    groceryAndHouseholdINR: number;
    myOutstandingDuesINR: number;
    amountOthersOweMeINR: number;
    totalAmountIPaidINR: number;
    myShareOfTotalExpensesINR: number;
    myNetBalanceINR: number;
  };
  memberBalances: MemberBalanceSummary[];
  settlementSuggestions: SettlementSuggestion[];
  pendingSettlements: PaymentRecord[];
  recentTransactions: ExpenseRecord[];
  chartData: { month: string; Groceries: number; Bills: number; Other: number; Total: number }[];
}

export interface ExpenseSplit {
  membershipId: { _id: string; userId: { name: string; username: string } };
  shareAmountPaise: number;
  shareAmountINR: number;
}

export interface ExpenseRecord {
  _id: string;
  title: string;
  category: ExpenseCategory;
  totalAmountPaise: number;
  amountINR: number;
  payerMembershipId: { _id: string; userId: { name: string; username: string } };
  createdByUserId: { _id: string; name: string; username: string };
  expenseDate: string;
  description?: string;
  status: ExpenseStatus;
  receiptUrl?: string;
  splits?: ExpenseSplit[];
  createdAt: string;
}

export interface BillRecord {
  _id: string;
  type: BillType;
  billingPeriod: string;
  title: string;
  totalAmountPaise: number;
  amountINR: number;
  perMemberShareINR?: number;
  payerMembershipId?: { _id: string; userId: { name: string; username: string } };
  dueDate: string;
  eligibleMemberIds: { _id: string; userId: { name: string; username: string } }[];
  paymentStatus: BillStatus;
  notes?: string;
  receiptUrl?: string;
  status: string;
  paidAt?: string;
  createdAt: string;
}

export interface PaymentRecord {
  _id: string;
  payerMembershipId: { _id: string; userId: { name: string; username: string } };
  receiverMembershipId: { _id: string; userId: { name: string; username: string } };
  amountPaise: number;
  amountINR: number;
  method: PaymentMethod;
  reference?: string;
  status: PaymentStatus;
  createdByUserId: { _id: string; name: string; username: string };
  confirmedByUserId?: { _id: string; name: string; username: string };
  paymentDate: string;
  notes?: string;
  createdAt: string;
}

export interface LedgerItem {
  id: string;
  date: string;
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

export interface AuditLogItem {
  _id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorUserId: { name: string; username: string };
  timestamp: string;
  reason?: string;
  metadata?: any;
}
