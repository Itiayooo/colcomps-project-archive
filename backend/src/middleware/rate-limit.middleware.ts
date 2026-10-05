import { rateLimit } from 'express-rate-limit';

const isProd = process.env.NODE_ENV === 'production';

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: isProd ? 10 : 1000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many attempts. Please wait 15 minutes and try again.' },
});