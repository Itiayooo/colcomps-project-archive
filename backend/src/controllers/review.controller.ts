import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { Project, PROJECT_STATUSES, type ProjectStatus } from '../models/project.model';

const listSchema = z.object({
    status: z.enum(PROJECT_STATUSES).default('pending'),
});

const decisionSchema = z
    .object({
        decision: z.enum(['approve', 'revisions', 'reject']),
        note: z.string().trim().max(2000).optional(),
    })
    .refine((d) => d.decision === 'approve' || (d.note && d.note.length >= 5), {
        message: 'Write a short note for the student',
        path: ['note'],
    });

const NEW_STATUS: Record<'approve' | 'revisions' | 'reject', ProjectStatus> = {
    approve: 'approved',
    revisions: 'revisions_requested',
    reject: 'rejected',
};

export async function reviewQueue(req: Request, res: Response) {
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid status' });
    }
    const supervisor = req.user!._id;

    const [projects, pendingCount] = await Promise.all([
        Project.find({ supervisor, status: parsed.data.status })
            .populate('student', 'name matricNo email')
            .sort('createdAt'),
        Project.countDocuments({ supervisor, status: 'pending' }),
    ]);

    res.json({ projects, pendingCount });
}

export async function getReviewProject(req: Request, res: Response) {
    const id = req.params.id as string;
    if (!isValidObjectId(id)) {
        return res.status(404).json({ message: 'Project not found' });
    }

    const project = await Project.findOne({ _id: id, supervisor: req.user!._id }).populate(
        'student',
        'name matricNo email'
    );
    if (!project) {
        return res.status(404).json({ message: 'Project not found' });
    }
    res.json({ project });
}

export async function reviewProject(req: Request, res: Response) {
    const id = req.params.id as string;
    if (!isValidObjectId(id)) {
        return res.status(404).json({ message: 'Project not found' });
    }

    const parsed = decisionSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message });
    }
    const { decision, note } = parsed.data;

    const project = await Project.findOne({ _id: id, supervisor: req.user!._id });
    if (!project) {
        return res.status(404).json({ message: 'Project not found' });
    }
    if (project.status !== 'pending') {
        return res.status(400).json({ message: 'This project has already been reviewed' });
    }
    if (decision === 'approve' && !project.pdfUrl) {
        return res.status(400).json({ message: 'The student has not uploaded the PDF yet' });
    }

    project.status = NEW_STATUS[decision];
    project.reviewNote = note || undefined;
    await project.save();

    res.json({ project });
}