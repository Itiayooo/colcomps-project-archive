import { Router } from 'express';
import { listSupervisors, submitProject, myProjects, uploadProjectPdf } from '../controllers/project.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { handleUpload } from '../middleware/upload.middleware';

const router = Router();

router.get('/supervisors', requireAuth, requireRole('student'), listSupervisors);
router.get('/mine', requireAuth, requireRole('student'), myProjects);
router.post('/:id/pdf', requireAuth, requireRole('student'), handleUpload, uploadProjectPdf);

export default router;