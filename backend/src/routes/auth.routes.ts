import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { Response } from 'express';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', requireAuth, (req, res) => authController.logout(req as AuthenticatedRequest, res));
router.get('/verify/:token', authController.verifyEmail);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', requireAuth, (req, res) => authController.getMe(req as AuthenticatedRequest, res as Response));

export default router;
