import { Router } from 'express';
import { FlatController } from '../controllers/flatController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', FlatController.getFlat);
router.patch('/', requireAdmin, FlatController.updateFlat);

export default router;
