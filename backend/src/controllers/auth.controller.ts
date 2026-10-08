import type { Request, Response } from 'express';
import type { HydratedDocument } from 'mongoose';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User, type IUser } from '../models/user.model';
import { signToken, setAuthCookie, clearAuthCookie } from '../utils/token';
import crypto from 'crypto';
import { sendMail } from '../utils/mail';

const registerSchema = z.object({
    name: z.string().trim().min(2, 'Enter your full name'),
    email: z.string().trim().email('Enter a valid email'),
    matricNo: z
        .string()
        .trim()
        .regex(/^\d{8}$/, 'Matric number must be 8 digits, like 20234532')
        .refine((v) => {
            const admissionYear = Number(v.slice(0, 4));
            return admissionYear >= 2000 && admissionYear <= new Date().getFullYear();
        }, 'Check your matric number, the first 4 digits should be your admission year'),
    department: z.string().trim().min(1, 'Choose a department'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
    identifier: z.string().trim().min(1),
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
        return res.status(400).json({ message: 'Enter your email or matric number, and your password' });
    }
    const { identifier, password } = parsed.data;

    const query = /^\d{8}$/.test(identifier)
        ? { matricNo: identifier }
        : { email: identifier.toLowerCase() };
    const user = await User.findOne(query).select('+passwordHash');
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

const forgotSchema = z.object({ email: z.string().trim().email('Enter a valid email') });

const resetSchema = z.object({
    token: z.string().min(1),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

export async function forgotPassword(req: Request, res: Response) {
    const parsed = forgotSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message });
    }

    const user = await User.findOne({ email: parsed.data.email.toLowerCase() });

    if (user && user.isActive) {
        const token = crypto.randomBytes(32).toString('hex');
        await User.updateOne(
            { _id: user._id },
            { $set: { resetTokenHash: sha256(token), resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000) } }
        );

        const link = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
        if (process.env.NODE_ENV !== 'production') {
            console.log('Password reset link (dev only):', link);
        }

        sendMail(
            { email: user.email, name: user.name },
            'Reset your COLCOMPS Project Archive password',
            `<p>Hello ${user.name},</p>
       <p>We received a request to reset your password. Use the link below to choose a new one. It expires in 1 hour.</p>
       <p><a href="${link}">Reset my password</a></p>
       <p>If you did not ask for this, you can ignore this email and your password will stay the same.</p>`
        ).catch((err) => console.error('Could not send reset email:', err));
    }

    res.json({ message: 'If that email has an account, we have sent a reset link.' });
}

export async function resetPassword(req: Request, res: Response) {
    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message });
    }

    const user = await User.findOne({
        resetTokenHash: sha256(parsed.data.token),
        resetTokenExpires: { $gt: new Date() },
    });
    if (!user) {
        return res.status(400).json({ message: 'This reset link is invalid or has expired' });
    }

    await User.updateOne(
        { _id: user._id },
        {
            $set: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10), mustChangePassword: false },
            $unset: { resetTokenHash: 1, resetTokenExpires: 1 },
        }
    );

    res.json({ message: 'Password changed. You can now log in.' });
}