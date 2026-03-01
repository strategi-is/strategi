import { Router, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { billingController } from '../controllers/billing.controller';
import { AuthenticatedRequest } from '../types';

const router = Router();
const wrap = (fn: (req: AuthenticatedRequest, res: Response) => unknown) =>
  (req: unknown, res: Response) => fn(req as AuthenticatedRequest, res);

// All billing endpoints require authentication
router.use(requireAuth);
router.get('/status', wrap(billingController.getStatus));
router.post('/checkout', wrap(billingController.checkout));
router.post('/portal', wrap(billingController.portal));

export default router;
