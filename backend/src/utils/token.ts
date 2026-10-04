import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import type { Role } from '../models/user.model';

export const COOKIE_NAME = 'token';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface TokenPayload {
    id: string;
    role: Role;
}

export function signToken(payload: TokenPayload) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not set in .env');
    return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export function setAuthCookie(res: Response, token: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: MAX_AGE_MS,
    });
}

export function clearAuthCookie(res: Response) {
    res.clearCookie(COOKIE_NAME);
}