import { Router } from 'express';
import {
    createLecturer,
    listLecturers,
    setLecturerStatus,
    resetLecturerPassword,
    listAllProjects,
    unpublishProject,
    deleteAnyProject
} from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.post('/lecturers', createLecturer);
router.get('/lecturers', listLecturers);
router.patch('/lecturers/:id/status', setLecturerStatus);
router.post('/lecturers/:id/reset-password', resetLecturerPassword);
router.get('/projects', listAllProjects);
router.patch('/projects/:id/unpublish', unpublishProject);
router.delete('/projects/:id', deleteAnyProject);

export default router;