import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, type Role } from '../models/user.model';
import { COOKIE_NAME, type TokenPayload } from '../utils/token';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
        return res.status(401).json({ message: 'Please log in' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
        const user = await User.findById(payload.id);
        if (!user || !user.isActive) {
            return res.status(401).json({ message: 'Please log in' });
        }
        req.user = user;
        next();
    } catch {
        res.status(401).json({ message: 'Session expired, please log in again' });
    }
}

export function requireRole(...roles: Role[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'You do not have access to this' });
        }
        next();
    };
}