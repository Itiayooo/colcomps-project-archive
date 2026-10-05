import { Router } from 'express';
import { listDepartments, createDepartment } from '../controllers/department.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.get('/', listDepartments);
router.post('/', requireAuth, requireRole('admin'), createDepartment);

export default router;