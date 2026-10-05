import { Router } from 'express';
import { reviewQueue, getReviewProject, reviewProject } from '../controllers/review.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth, requireRole('supervisor'));

router.get('/', reviewQueue);
router.get('/:id', getReviewProject);
router.patch('/:id', reviewProject);

export default router;