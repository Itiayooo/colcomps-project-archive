import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { Project } from '../models/project.model';
import { User } from '../models/user.model';
import cloudinary from '../config/cloudinary';

const optionalUrl = z.string().trim().url('Enter a valid link').optional().or(z.literal(''));

const submitSchema = z.object({
    title: z.string().trim().min(5, 'Enter the full project title'),
    abstract: z.string().trim().min(50, 'Abstract should be at least 50 characters'),
    keywords: z.array(z.string().trim().min(1)).min(1, 'Add at least one keyword').max(8),
    supervisorId: z.string().refine((v) => isValidObjectId(v), 'Choose a supervisor'),
    githubUrl: optionalUrl,
    demoUrl: optionalUrl,
});

export async function listSupervisors(req: Request, res: Response) {
    const supervisors = await User.find({
        role: 'supervisor',
        isActive: true,
        department: req.user?.department,
    }).sort('name');

    res.json({ supervisors: supervisors.map((s) => ({ id: s._id.toString(), name: s.name })) });
}

export async function submitProject(req: Request, res: Response) {
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message });
    }
    const { title, abstract, keywords, supervisorId, githubUrl, demoUrl } = parsed.data;

    const student = req.user!;
    if (!student.department) {
        return res.status(400).json({ message: 'Your account has no department' });
    }

    const supervisor = await User.findOne({
        _id: supervisorId,
        role: 'supervisor',
        isActive: true,
        department: student.department,
    });
    if (!supervisor) {
        return res.status(400).json({ message: 'Choose a supervisor from your department' });
    }

    const project = await Project.create({
        title,
        abstract,
        keywords,
        department: student.department,
        year: new Date().getFullYear(),
        student: student._id,
        supervisor: supervisor._id,
        githubUrl: githubUrl || undefined,
        demoUrl: demoUrl || undefined,
    });

    res.status(201).json({ project });
}

export async function myProjects(req: Request, res: Response) {
    const projects = await Project.find({ student: req.user!._id })
        .populate('supervisor', 'name')
        .sort('-createdAt');
    res.json({ projects });
}

export async function uploadProjectPdf(req: Request, res: Response) {
    const id = req.params.id as string;
    if (!isValidObjectId(id)) {
        return res.status(404).json({ message: 'Project not found' });
    }

    const project = await Project.findOne({ _id: id, student: req.user!._id });
    if (!project) {
        return res.status(404).json({ message: 'Project not found' });
    }
    if (!['pending', 'revisions_requested'].includes(project.status)) {
        return res.status(400).json({ message: 'This project can no longer be changed' });
    }

    const file = req.file;
    if (!file) {
        return res.status(400).json({ message: 'Attach a PDF file' });
    }
    if (file.buffer.subarray(0, 4).toString() !== '%PDF') {
        return res.status(400).json({ message: 'That file is not a valid PDF' });
    }

    try {
        const url = await new Promise<string>((resolve, reject) => {
            cloudinary.uploader
                .upload_stream(
                    {
                        folder: 'colcomps-archive',
                        resource_type: 'raw',
                        public_id: `${project._id}-${Date.now()}.pdf`,
                    },
                    (err, result) => (err || !result ? reject(err) : resolve(result.secure_url))
                )
                .end(file.buffer);
        });

        project.pdfUrl = url;
        await project.save();
        res.json({ project });
    } catch {
        res.status(502).json({ message: 'Upload failed, please try again' });
    }
}