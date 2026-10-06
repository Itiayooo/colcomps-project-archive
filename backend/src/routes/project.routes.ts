import { Router } from 'express';
import {
    listSupervisors,
    submitProject,
    myProjects,
    uploadProjectPdf,
    listArchive,
    archiveFilters,
    getProject,
    updateProject,
    resubmitProject,
    deleteProject,
    downloadProject
} from '../controllers/project.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { handleUpload } from '../middleware/upload.middleware';

const router = Router();

router.get('/', listArchive);
router.get('/filters', archiveFilters);

router.get('/supervisors', requireAuth, requireRole('student'), listSupervisors);
router.get('/mine', requireAuth, requireRole('student'), myProjects);
router.post('/', requireAuth, requireRole('student'), submitProject);
router.post('/:id/pdf', requireAuth, requireRole('student'), handleUpload, uploadProjectPdf);
router.patch('/:id', requireAuth, requireRole('student'), updateProject);
router.post('/:id/resubmit', requireAuth, requireRole('student'), resubmitProject);
router.delete('/:id', requireAuth, requireRole('student'), deleteProject);

router.get('/:id/download', downloadProject);
router.get('/:id', getProject);

export default router;