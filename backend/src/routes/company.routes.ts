import { Router, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { companyController } from '../controllers/company.controller';
import { AuthenticatedRequest } from '../types';

const router = Router();

const auth = requireAuth;
const wrap = (fn: (req: AuthenticatedRequest, res: Response) => unknown) =>
  (req: unknown, res: Response) => fn(req as AuthenticatedRequest, res);

router.use(auth);

router.post('/', wrap(companyController.create));
router.get('/', wrap(companyController.getAll));
router.get('/:id', wrap(companyController.getOne));
router.put('/:id', wrap(companyController.update));
router.delete('/:id', wrap(companyController.delete));

// Target queries sub-resource
router.get('/:id/queries', wrap(companyController.getQueries));
router.post('/:id/queries', wrap(companyController.addQuery));
router.delete('/:id/queries/:queryId', wrap(companyController.deleteQuery));

export default router;
