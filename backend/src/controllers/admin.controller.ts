import type { Request, Response } from 'express';
import type { HydratedDocument } from 'mongoose';
import { isValidObjectId } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { User, TITLES, type IUser } from '../models/user.model';
import { Department } from '../models/department.model';
import { Project, PROJECT_STATUSES } from '../models/project.model';
import { deletePdf } from '../utils/pdf';
import { notifySupervisor } from '../utils/notify';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generateTempPassword(length = 10) {
    return Array.from(crypto.randomBytes(length), (b) => ALPHABET[b % ALPHABET.length]).join('');
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const statusSchema = z.object({ isActive: z.boolean() });

/* ------------------------------------------------------------------ */
/* Lecturers                                                           */
/* ------------------------------------------------------------------ */

function lecturerView(u: HydratedDocument<IUser>) {
    return {
        id: u._id.toString(),
        name: u.name,
        title: u.title,
        email: u.email,
        department: u.department,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
    };
}

const createSchema = z.object({
    title: z.enum(TITLES).optional(),
    name: z.string().trim().min(2, 'Enter the lecturer name'),
    email: z.string().trim().email('Enter a valid email'),
    department: z.string().trim().min(1, 'Choose a department'),
});

async function findLecturer(id: string) {
    if (!isValidObjectId(id)) return null;
    return User.findOne({ _id: id, role: 'supervisor' });
}

export async function createLecturer(req: Request, res: Response) {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message });
    }
    const { title, name, email, department } = parsed.data;

    if (!(await Department.exists({ name: department }))) {
        return res.status(400).json({ message: 'That department does not exist' });
    }
    if (await User.exists({ email: email.toLowerCase() })) {
        return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const tempPassword = generateTempPassword();
    const user = await User.create({
        title,
        name,
        email,
        department,
        role: 'supervisor',
        passwordHash: await bcrypt.hash(tempPassword, 10),
        mustChangePassword: true,
    });

    res.status(201).json({ lecturer: lecturerView(user), tempPassword });
}

export async function listLecturers(req: Request, res: Response) {
    const filter: Record<string, unknown> = { role: 'supervisor' };
    if (typeof req.query.department === 'string' && req.query.department) {
        filter.department = req.query.department;
    }
    const lecturers = await User.find(filter).sort('name');
    res.json({ lecturers: lecturers.map(lecturerView) });
}

export async function setLecturerStatus(req: Request, res: Response) {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'isActive must be true or false' });
    }
    const lecturer = await findLecturer(req.params.id as string);
    if (!lecturer) return res.status(404).json({ message: 'Lecturer not found' });

    lecturer.isActive = parsed.data.isActive;
    await lecturer.save();

    const openProjects = lecturer.isActive
        ? 0
        : await Project.countDocuments({
              supervisor: lecturer._id,
              status: { $in: ['pending', 'revisions_requested'] },
          });

    res.json({ lecturer: lecturerView(lecturer), openProjects });
}

export async function resetLecturerPassword(req: Request, res: Response) {
    const lecturer = await findLecturer(req.params.id as string);
    if (!lecturer) return res.status(404).json({ message: 'Lecturer not found' });

    const tempPassword = generateTempPassword();
    lecturer.passwordHash = await bcrypt.hash(tempPassword, 10);
    lecturer.mustChangePassword = true;
    await lecturer.save();

    res.json({ lecturer: lecturerView(lecturer), tempPassword });
}

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

const projectListSchema = z.object({
    status: z.enum(PROJECT_STATUSES).optional(),
    q: z.string().trim().optional(),
});

export async function listAllProjects(req: Request, res: Response) {
    const parsed = projectListSchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid filter' });
    }
    const { status, q } = parsed.data;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (q) filter.title = new RegExp(escapeRegex(q), 'i');

    const projects = await Project.find(filter)
        .sort('-createdAt')
        .limit(100)
        .populate('student', 'name matricNo email')
        .populate('supervisor', 'name title email isActive');

    res.json({ projects });
}

export async function unpublishProject(req: Request, res: Response) {
    const id = req.params.id as string;
    if (!isValidObjectId(id)) {
        return res.status(404).json({ message: 'Project not found' });
    }

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.status !== 'approved') {
        return res.status(400).json({ message: 'Only approved projects can be unpublished' });
    }

    project.status = 'pending';
    await project.save();
    res.json({ project });
}

export async function deleteAnyProject(req: Request, res: Response) {
    const id = req.params.id as string;
    if (!isValidObjectId(id)) {
        return res.status(404).json({ message: 'Project not found' });
    }

    const project = await Project.findByIdAndDelete(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    await deletePdf(project.pdfUrl, project.pdfPublicId);
    res.json({ message: 'Project deleted' });
}

const reassignSchema = z.object({
    supervisorId: z.string().refine((v) => isValidObjectId(v), 'Choose a lecturer'),
});

export async function reassignProject(req: Request, res: Response) {
    const id = req.params.id as string;
    if (!isValidObjectId(id)) {
        return res.status(404).json({ message: 'Project not found' });
    }
    const parsed = reassignSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message });
    }

    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!['pending', 'revisions_requested'].includes(project.status)) {
        return res.status(400).json({ message: 'Only projects still under review can be reassigned' });
    }

    const supervisor = await User.findOne({
        _id: parsed.data.supervisorId,
        role: 'supervisor',
        isActive: true,
        department: project.department,
    });
    if (!supervisor) {
        return res.status(400).json({ message: 'Choose an active lecturer from the same department' });
    }

    project.supervisor = supervisor._id;
    await project.save();
    if (project.status === 'pending') notifySupervisor(project._id.toString());

    res.json({ project });
}

/* ------------------------------------------------------------------ */
/* Administrators                                                      */
/* ------------------------------------------------------------------ */

function adminView(u: HydratedDocument<IUser>, meId: string) {
    return {
        id: u._id.toString(),
        name: u.name,
        title: u.title,
        email: u.email,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
        isYou: u._id.toString() === meId,
    };
}

const adminCreateSchema = z.object({
    title: z.enum(TITLES).optional(),
    name: z.string().trim().min(2, 'Enter the name'),
    email: z.string().trim().email('Enter a valid email'),
});

async function findAdmin(id: string) {
    if (!isValidObjectId(id)) return null;
    return User.findOne({ _id: id, role: 'admin' });
}

export async function listAdmins(req: Request, res: Response) {
    const admins = await User.find({ role: 'admin' }).sort('name');
    res.json({ admins: admins.map((a) => adminView(a, req.user!._id.toString())) });
}

export async function createAdmin(req: Request, res: Response) {
    const parsed = adminCreateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message });
    }
    const { title, name, email } = parsed.data;

    if (await User.exists({ email: email.toLowerCase() })) {
        return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const tempPassword = generateTempPassword();
    const admin = await User.create({
        title,
        name,
        email,
        role: 'admin',
        passwordHash: await bcrypt.hash(tempPassword, 10),
        mustChangePassword: true,
    });

    res.status(201).json({ admin: adminView(admin, req.user!._id.toString()), tempPassword });
}

export async function setAdminStatus(req: Request, res: Response) {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'isActive must be true or false' });
    }
    const admin = await findAdmin(req.params.id as string);
    if (!admin) return res.status(404).json({ message: 'Administrator not found' });
    if (admin._id.equals(req.user!._id)) {
        return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    admin.isActive = parsed.data.isActive;
    await admin.save();
    res.json({ admin: adminView(admin, req.user!._id.toString()) });
}

export async function resetAdminPassword(req: Request, res: Response) {
    const admin = await findAdmin(req.params.id as string);
    if (!admin) return res.status(404).json({ message: 'Administrator not found' });
    if (admin._id.equals(req.user!._id)) {
        return res.status(400).json({ message: 'Use Change password for your own account' });
    }

    const tempPassword = generateTempPassword();
    admin.passwordHash = await bcrypt.hash(tempPassword, 10);
    admin.mustChangePassword = true;
    await admin.save();

    res.json({ admin: adminView(admin, req.user!._id.toString()), tempPassword });
}

export async function makeAdmin(req: Request, res: Response) {
    const lecturer = await findLecturer(req.params.id as string);
    if (!lecturer) return res.status(404).json({ message: 'Lecturer not found' });
    if (!lecturer.isActive) {
        return res.status(400).json({ message: 'Reactivate this lecturer first' });
    }

    const open = await Project.countDocuments({
        supervisor: lecturer._id,
        status: { $in: ['pending', 'revisions_requested'] },
    });
    if (open > 0) {
        return res.status(400).json({
            message: `${lecturer.name} still has ${open} project(s) under review. Reassign them in the Projects tab first.`,
        });
    }

    lecturer.role = 'admin';
    await lecturer.save();
    res.json({ admin: adminView(lecturer, req.user!._id.toString()) });
}