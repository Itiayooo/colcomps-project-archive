import type { Request, Response, ErrorRequestHandler } from 'express';

export function notFound(req: Request, res: Response) {
    res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}


export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err?.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'Request body is not valid JSON' });
    }
    if (err?.code === 11000) {
        return res.status(409).json({ message: 'That value already exists' });
    }
    if (err?.name === 'ValidationError') {
        return res.status(400).json({ message: 'Some of the data is invalid' });
    }
    if (err?.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid id' });
    }

    console.error(err);
    res.status(500).json({ message: 'Something went wrong on our side' });
};