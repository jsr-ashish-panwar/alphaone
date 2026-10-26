import { Router } from 'express';
import { ExpenseController } from '../controllers/expenseController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', ExpenseController.listExpenses);
router.post('/', ExpenseController.createExpense);
router.get('/:id', ExpenseController.getExpense);
router.post('/:id/reverse', ExpenseController.reverseExpense);

export default router;
