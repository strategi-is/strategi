import { Router, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { cmsController } from '../controllers/cms.controller';
import { AuthenticatedRequest } from '../types';

const router = Router();
const wrap = (fn: (req: AuthenticatedRequest, res: Response) => unknown) =>
  (req: unknown, res: Response) => fn(req as AuthenticatedRequest, res);

router.use(requireAuth);

// WordPress connection management — scoped per company
router.get('/companies/:companyId/wordpress', wrap(cmsController.getStatus));
router.post('/companies/:companyId/wordpress', wrap(cmsController.connect));
router.delete('/companies/:companyId/wordpress', wrap(cmsController.disconnect));
router.post('/companies/:companyId/wordpress/test', wrap(cmsController.test));

export default router;
