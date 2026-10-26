import { Router } from 'express';
import authRoutes from './authRoutes.js';
import flatRoutes from './flatRoutes.js';
import memberRoutes from './memberRoutes.js';
import expenseRoutes from './expenseRoutes.js';
import billRoutes from './billRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import balanceRoutes from './balanceRoutes.js';
import reportRoutes from './reportRoutes.js';

import { seedDatabase } from '../seed.js';

const router = Router();

router.post('/seed/reset', async (_req, res) => {
  try {
    await seedDatabase();
    res.json({ success: true, message: 'Database reseeded successfully for 4 roommates!' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.use('/auth', authRoutes);
router.use('/flats', flatRoutes);
router.use('/members', memberRoutes);
router.use('/expenses', expenseRoutes);
router.use('/bills', billRoutes);
router.use('/payments', paymentRoutes);
router.use('/balances', balanceRoutes);
router.use('/reports', reportRoutes);

export default router;
