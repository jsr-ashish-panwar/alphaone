import { Router } from 'express';
import { BalanceController } from '../controllers/balanceController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/flat', BalanceController.getFlatBalances);
router.get('/dashboard', BalanceController.getDashboard);

export default router;
