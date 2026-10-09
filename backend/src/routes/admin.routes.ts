import { Router } from 'express';
import {
    createLecturer,
    listLecturers,
    setLecturerStatus,
    resetLecturerPassword,
    listAllProjects,
    unpublishProject,
    deleteAnyProject,
    reassignProject,
    makeAdmin,
    listAdmins,
    createAdmin,
    setAdminStatus,
    resetAdminPassword
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
router.patch('/projects/:id/supervisor', reassignProject);
router.post('/lecturers/:id/make-admin', makeAdmin);
router.get('/admins', listAdmins);
router.post('/admins', createAdmin);
router.patch('/admins/:id/status', setAdminStatus);
router.post('/admins/:id/reset-password', resetAdminPassword);

export default router;