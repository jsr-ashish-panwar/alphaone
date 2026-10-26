import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authRateLimiter, pinVerifyRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authRateLimiter, AuthController.registerFlat);
router.post('/login', authRateLimiter, AuthController.login);
router.post('/verify-pin', authenticate, pinVerifyRateLimiter, AuthController.verifyPin);
router.post('/change-pin', authenticate, pinVerifyRateLimiter, AuthController.changePin);
router.get('/me', authenticate, AuthController.getMe);
router.post('/logout', authenticate, AuthController.logout);

export default router;
