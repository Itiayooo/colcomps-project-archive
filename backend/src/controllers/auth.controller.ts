import type { Request, Response } from 'express';
import type { HydratedDocument } from 'mongoose';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User, type IUser } from '../models/user.model';
import { signToken, setAuthCookie, clearAuthCookie } from '../utils/token';

const registerSchema = z.object({
    name: z.string().trim().min(2, 'Enter your full name'),
    email: z.string().trim().email('Enter a valid email'),
    matricNo: z
        .string()
        .trim()
        .regex(/^\d{4}\/[A-Za-z]{2,4}\/\d{3,5}$/, 'Matric number should look like 2020/CS/0192'),
    department: z.string().trim().min(1, 'Choose a department'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
});

function publicUser(u: HydratedDocument<IUser>) {
    return {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        matricNo: u.matricNo,
        mustChangePassword: u.mustChangePassword,
    };
}

export async function register(req: Request, res: Response) {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message });
    }
    const { name, email, matricNo, department, password } = parsed.data;

    const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { matricNo }] });
    if (exists) {
        return res.status(409).json({ message: 'An account with this email or matric number already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
        name,
        email,
        matricNo,
        department,
        passwordHash,
        role: 'student',
    });

    setAuthCookie(res, signToken({ id: user._id.toString(), role: user.role }));
    res.status(201).json({ user: publicUser(user) });
}

export async function login(req: Request, res: Response) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Enter your email and password' });
    }
    const { email, password } = parsed.data;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    const valid = user && user.isActive && (await bcrypt.compare(password, user.passwordHash));
    if (!user || !valid) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    setAuthCookie(res, signToken({ id: user._id.toString(), role: user.role }));
    res.json({ user: publicUser(user) });
}

export function logout(_req: Request, res: Response) {
    clearAuthCookie(res);
    res.json({ message: 'Logged out' });
}

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export function me(req: Request, res: Response) {
    if (!req.user) return res.status(401).json({ message: 'Please log in' });
    res.json({ user: publicUser(req.user) });
}

export async function changePassword(req: Request, res: Response) {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message });
    }
    const { currentPassword, newPassword } = parsed.data;

    const user = await User.findById(req.user?._id).select('+passwordHash');
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
        return res.status(401).json({ message: 'Current password is incorrect' });
    }
    if (currentPassword === newPassword) {
        return res.status(400).json({ message: 'New password must be different' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    await user.save();

    res.json({ user: publicUser(user) });
}