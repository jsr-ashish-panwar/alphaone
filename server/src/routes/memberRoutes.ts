import { Router } from 'express';
import { MemberController } from '../controllers/memberController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', MemberController.listMembers);
router.post('/', requireAdmin, MemberController.addMember);
router.patch('/:membershipId', MemberController.updateMember);
router.post('/:membershipId/reset-pin', MemberController.resetPin);

export default router;
