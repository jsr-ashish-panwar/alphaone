import bcrypt from 'bcryptjs';
import { User } from './models/User.js';
import { Flat } from './models/Flat.js';
import { Membership } from './models/Membership.js';
import { Expense } from './models/Expense.js';
import { ExpenseSplit } from './models/ExpenseSplit.js';
import { Bill } from './models/Bill.js';
import { Payment } from './models/Payment.js';
import { AuditLog } from './models/AuditLog.js';
import { distributePaiseEqually } from './services/balanceService.js';
import { connectDB, disconnectDB } from './config/db.js';

export const seedDatabase = async () => {
  console.log('🌱 Seeding database with Alpha C-42 roommates and transactions...');

  // Clear existing
  await User.deleteMany({});
  await Flat.deleteMany({});
  await Membership.deleteMany({});
  await Expense.deleteMany({});
  await ExpenseSplit.deleteMany({});
  await Bill.deleteMany({});
  await Payment.deleteMany({});
  await AuditLog.deleteMany({});

  const [ashishPinHash, hiteshPinHash, govindPinHash, pdPinHash] = await Promise.all([
    bcrypt.hash('1111', 10), // Ashish: 1111
    bcrypt.hash('2222', 10), // Hitesh: 2222
    bcrypt.hash('3333', 10), // Govind: 3333
    bcrypt.hash('4444', 10), // PD Bhai: 4444
  ]);

  // 1. Create the 4 Roommate Users
  const ashish = await User.create({
    name: 'Ashish Panwar',
    username: 'ashish',
    email: 'ashish.panwar@example.com',
    pinHash: ashishPinHash,
    accountStatus: 'active',
  });

  const hitesh = await User.create({
    name: 'Hitesh Chauhan',
    username: 'hitesh',
    email: 'hitesh.chauhan@example.com',
    pinHash: hiteshPinHash,
    accountStatus: 'active',
  });

  const govind = await User.create({
    name: 'Govind Sharma',
    username: 'govind',
    email: 'govind.sharma@example.com',
    pinHash: govindPinHash,
    accountStatus: 'active',
  });

  const pd = await User.create({
    name: 'PD Bhai',
    username: 'pd',
    email: 'pd.bhai@example.com',
    pinHash: pdPinHash,
    accountStatus: 'active',
  });

  // 2. Create Flat Alpha C-42
  const flat = await Flat.create({
    name: 'Alpha C-42',
    code: 'ALPHA-C42',
    address: 'Flat 402, Sunshine Heights, Bangalore, KA - 560102',
    adminUserId: ashish._id,
    timezone: 'Asia/Kolkata',
    currency: 'INR',
  });

  // 3. Create Memberships for all 4 Roommates
  const ashishMem = await Membership.create({
    flatId: flat._id,
    userId: ashish._id,
    role: 'admin',
    joinedAt: new Date(2026, 7, 1),
    status: 'active',
  });

  const hiteshMem = await Membership.create({
    flatId: flat._id,
    userId: hitesh._id,
    role: 'member',
    joinedAt: new Date(2026, 7, 1),
    status: 'active',
  });

  const govindMem = await Membership.create({
    flatId: flat._id,
    userId: govind._id,
    role: 'member',
    joinedAt: new Date(2026, 7, 1),
    status: 'active',
  });

  const pdMem = await Membership.create({
    flatId: flat._id,
    userId: pd._id,
    role: 'member',
    joinedAt: new Date(2026, 7, 1),
    status: 'active',
  });

  const allMembers = [ashishMem, hiteshMem, govindMem, pdMem];
  const allMemIds = allMembers.map((m) => m._id);

  // Helper to create expense + splits
  const addExpenseWithSplits = async (
    title: string,
    category: any,
    amountINR: number,
    payerMem: any,
    creatorUser: any,
    date: Date,
    memberIds: any[],
    description?: string
  ) => {
    const totalAmountPaise = Math.round(amountINR * 100);
    const shares = distributePaiseEqually(totalAmountPaise, memberIds.length);

    const exp = await Expense.create({
      flatId: flat._id,
      title,
      category,
      totalAmountPaise,
      payerMembershipId: payerMem._id,
      createdByUserId: creatorUser._id,
      expenseDate: date,
      description,
      status: 'finalized',
      splitMethod: 'equal',
    });

    const splits = memberIds.map((mId, idx) => ({
      expenseId: exp._id,
      membershipId: mId,
      shareAmountPaise: shares[idx],
      splitCalculationMethod: 'equal',
    }));

    await ExpenseSplit.insertMany(splits);
    return exp;
  };

  const now = new Date();
  const d1 = new Date(now.getFullYear(), now.getMonth(), 2, 9, 30);
  const d2 = new Date(now.getFullYear(), now.getMonth(), 8, 14, 0);
  const d3 = new Date(now.getFullYear(), now.getMonth(), 12, 19, 15);

  // 4. Create the 4 Categories of Shared Living Expenses:
  // Category 1: Flat Rent - ₹15,500 paid by Ashish Panwar
  await Bill.create({
    flatId: flat._id,
    type: 'Rent',
    billingPeriod: 'October 2026',
    title: 'Flat Monthly Rent - October 2026',
    totalAmountPaise: 1550000, // ₹15,500 (Exact user requirement)
    payerMembershipId: ashishMem._id,
    dueDate: new Date(2026, 9, 5),
    eligibleMemberIds: allMemIds,
    paymentStatus: 'paid',
    notes: 'Paid ₹15,500 directly to flat owner via UPI / NetBanking. Split equally: ₹3,875 each.',
    status: 'finalized',
    paidAt: new Date(2026, 9, 3),
  });

  // Category 2: Electricity Bill - ₹2,200 entered & paid by Hitesh Chauhan when bill arrived
  await Bill.create({
    flatId: flat._id,
    type: 'Electricity',
    billingPeriod: 'October 2026',
    title: 'BESCOM Electricity Bill - October 2026',
    totalAmountPaise: 220000, // ₹2,200
    payerMembershipId: hiteshMem._id,
    dueDate: new Date(2026, 9, 15),
    eligibleMemberIds: allMemIds,
    paymentStatus: 'paid',
    notes: 'Electricity bill arrived and paid by Hitesh via PhonePe. Split equally: ₹550 each.',
    status: 'finalized',
    paidAt: new Date(2026, 9, 10),
  });

  // Category 3: Daily Things (Milk, bread, groceries, water cans, vegetables)
  await addExpenseWithSplits(
    'Daily Things: Milk, Curd, Bread & Groceries',
    'Daily Things',
    1200, // ₹1,200
    govindMem,
    govind,
    d1,
    allMemIds,
    'Daily breakfast, dairy supply and cooking essentials from local market'
  );

  await addExpenseWithSplits(
    'Daily Things: Fresh Vegetables & Drinking Water Cans',
    'Daily Things',
    600, // ₹600
    pdMem,
    pd,
    d2,
    allMemIds,
    'Weekly sabzi and Bisleri water jars for kitchen'
  );

  // Category 4: Online Products (Purchased online from Amazon, Blinkit, etc.)
  await addExpenseWithSplits(
    'Online Products: Flat Cleaning Kit & Kitchen Essentials',
    'Online Products',
    1600, // ₹1,600
    ashishMem,
    ashish,
    d3,
    allMemIds,
    'Ordered online via Amazon/Blinkit for shared flat use'
  );

  // 5. Initial Audit Log
  await AuditLog.create({
    flatId: flat._id,
    actorUserId: ashish._id,
    action: 'FLAT_INITIALIZED',
    entityType: 'Flat',
    entityId: flat._id,
    timestamp: new Date(2026, 7, 1),
    metadata: { name: 'Alpha C-42', code: 'ALPHA-C42' },
    reason: 'Initial setup of Alpha C-42 with Ashish Panwar, Hitesh Chauhan, Govind Sharma, PD Bhai',
  });

  console.log('✅ Database seeded successfully for 4 roommates!');
  console.log('--------------------------------------------------');
  console.log('Flat Code: ALPHA-C42');
  console.log('Roommates & PINs:');
  console.log('  1. Ashish Panwar (ashish) - PIN: 1111 (Admin)');
  console.log('  2. Hitesh Chauhan (hitesh) - PIN: 2222');
  console.log('  3. Govind Sharma (govind)  - PIN: 3333');
  console.log('  4. PD Bhai (pd)            - PIN: 4444');
  console.log('Categories:');
  console.log('  1. Flat Rent: ₹15,500');
  console.log('  2. Electricity Bill: Entered by anyone when it arrives');
  console.log('  3. Daily Things: Daily purchases & groceries');
  console.log('  4. Online Products: Bought online');
  console.log('--------------------------------------------------');
};

export const seedDatabaseIfEmpty = async () => {
  const count = await Flat.countDocuments();
  if (count === 0) {
    console.log('🔍 Database is empty. Running initial seed...');
    await seedDatabase();
  }
};

// Standalone runner: tsx src/seed.ts
if (process.argv[1]?.endsWith('seed.ts')) {
  (async () => {
    try {
      await connectDB();
      await seedDatabase();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('Failed to seed:', err);
      process.exit(1);
    }
  })();
}
