import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed'));
        }
        cb(null, true);
    },
}).single('pdf');

export function handleUpload(req: Request, res: Response, next: NextFunction) {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'PDF must be under 25 MB' });
        }
        if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
}