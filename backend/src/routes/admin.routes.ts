import { Router } from 'express';
import {
    createLecturer,
    listLecturers,
    setLecturerStatus,
    resetLecturerPassword,
} from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.post('/lecturers', createLecturer);
router.get('/lecturers', listLecturers);
router.patch('/lecturers/:id/status', setLecturerStatus);
router.post('/lecturers/:id/reset-password', resetLecturerPassword);

export default router;