import { Router, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { analysisController } from '../controllers/analysis.controller';
import { cmsController } from '../controllers/cms.controller';
import { AuthenticatedRequest } from '../types';

const router = Router();
const wrap = (fn: (req: AuthenticatedRequest, res: Response) => unknown) =>
  (req: unknown, res: Response) => fn(req as AuthenticatedRequest, res);

router.use(requireAuth);

// Start analysis for a company
router.post('/companies/:companyId/start', wrap(analysisController.create));

// List analyses for a company
router.get('/companies/:companyId', wrap(analysisController.getForCompany));

// Get full analysis details
router.get('/:id', wrap(analysisController.getOne));

// Share of Voice data
router.get('/:id/share-of-voice', wrap(analysisController.getShareOfVoice));

// Blog posts — nested (frontend) and flat (legacy) paths both work
router.get('/blogs/:blogId', wrap(analysisController.getBlogPost));
router.post('/blogs/:blogId/revise', wrap(analysisController.requestRevision));
router.post('/blogs/:blogId/approve', wrap(analysisController.approveBlog));
router.post('/blogs/:blogId/publish', wrap(cmsController.publish));
router.get('/:id/blog-posts/:postId', wrap(analysisController.getBlogPost));
router.post('/:id/blog-posts/:postId/revise', wrap(analysisController.requestRevision));
router.post('/:id/blog-posts/:postId/approve', wrap(analysisController.approveBlog));
router.post('/:id/blog-posts/:postId/publish', wrap(cmsController.publish));

// Recommendations — nested and flat paths
router.patch('/recommendations/:recId/status', wrap(analysisController.updateRecStatus));
router.patch('/:id/recommendations/:recId', wrap(analysisController.updateRecStatus));

export default router;
