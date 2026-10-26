import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', PaymentController.listPayments);
router.post('/', PaymentController.createPayment);
router.patch('/:id/status', PaymentController.updatePaymentStatus);

export default router;
