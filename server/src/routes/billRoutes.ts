import { Router } from 'express';
import { BillController } from '../controllers/billController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', BillController.listBills);
router.post('/', BillController.createBill);
router.get('/:id', BillController.getBill);
router.post('/:id/pay', BillController.recordBillPayment);

export default router;
