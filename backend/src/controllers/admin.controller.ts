import type { Request, Response } from 'express';
import type { HydratedDocument } from 'mongoose';
import { isValidObjectId } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { User, type IUser } from '../models/user.model';
import { Department } from '../models/department.model';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generateTempPassword(length = 10) {
    return Array.from(crypto.randomBytes(length), (b) => ALPHABET[b % ALPHABET.length]).join('');
}

function lecturerView(u: HydratedDocument<IUser>) {
    return {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        department: u.department,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
    };
}

const createSchema = z.object({
    name: z.string().trim().min(2, 'Enter the lecturer name'),
    email: z.string().trim().email('Enter a valid email'),
    department: z.string().trim().min(1, 'Choose a department'),
});

const statusSchema = z.object({ isActive: z.boolean() });

async function findLecturer(id: string) {
    if (!isValidObjectId(id)) return null;
    return User.findOne({ _id: id, role: 'supervisor' });
}

export async function createLecturer(req: Request, res: Response) {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message });
    }
    const { name, email, department } = parsed.data;

    if (!(await Department.exists({ name: department }))) {
        return res.status(400).json({ message: 'That department does not exist' });
    }
    if (await User.exists({ email: email.toLowerCase() })) {
        return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const tempPassword = generateTempPassword();
    const user = await User.create({
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
    res.json({ lecturer: lecturerView(lecturer) });
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