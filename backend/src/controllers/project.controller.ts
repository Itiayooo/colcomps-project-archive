import type { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { Project } from '../models/project.model';
import { User } from '../models/user.model';
import cloudinary from '../config/cloudinary';
import { deletePdf } from '../utils/pdf';
import { notifySupervisor } from '../utils/notify';

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

    res.json({ supervisors: supervisors.map((s) => ({ id: s._id.toString(), name: s.name, title: s.title })) });
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
        .populate('supervisor', 'name title')
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
        const uploaded = await new Promise<{ url: string; publicId: string }>((resolve, reject) => {
            cloudinary.uploader
                .upload_stream(
                    {
                        folder: 'colcomps-archive',
                        resource_type: 'raw',
                        public_id: `${project._id}-${Date.now()}.pdf`,
                    },
                    (err, result) =>
                        err || !result ? reject(err) : resolve({ url: result.secure_url, publicId: result.public_id })
                )
                .end(file.buffer);
        });

        const oldUrl = project.pdfUrl;
        const oldId = project.pdfPublicId;
        project.pdfUrl = uploaded.url;
        project.pdfPublicId = uploaded.publicId;
        await project.save();
        await deletePdf(oldUrl, oldId);
        if (!oldUrl && project.status === 'pending') notifySupervisor(project._id.toString());

        res.json({ project });
    } catch {
        res.status(502).json({ message: 'Upload failed, please try again' });
    }
}

function escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const listSchema = z.object({
    q: z.string().trim().optional(),
    department: z.string().trim().optional(),
    year: z.coerce.number().int().optional(),
    supervisor: z.string().optional(),
    sort: z.enum(['new', 'downloads', 'title']).default('new'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
});

const SORTS = { new: '-createdAt', downloads: '-downloads', title: 'title' } as const;

export async function listArchive(req: Request, res: Response) {
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid search options' });
    }
    const { q, department, year, supervisor, sort, page, limit } = parsed.data;

    const filter: Record<string, unknown> = { status: 'approved' };
    if (department) filter.department = department;
    if (year) filter.year = year;
    if (supervisor && isValidObjectId(supervisor)) filter.supervisor = supervisor;

    if (q) {
        const rx = new RegExp(escapeRegex(q), 'i');
        const students = await User.find({
            role: 'student',
            $or: [{ name: rx }, { matricNo: rx }],
        }).select('_id');

        filter.$or = [
            { title: rx },
            { abstract: rx },
            { keywords: rx },
            { student: { $in: students.map((s) => s._id) } },
        ];
    }

    const [projects, total] = await Promise.all([
        Project.find(filter)
            .sort(SORTS[sort])
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('supervisor', 'name title')
            .populate('student', 'name matricNo')
            .select('-reviewNote'),
        Project.countDocuments(filter),
    ]);

    res.json({ projects, total, page, pages: Math.ceil(total / limit) });
}

export async function archiveFilters(_req: Request, res: Response) {
    const [departments, years, supervisorIds] = await Promise.all([
        Project.aggregate([
            { $match: { status: 'approved' } },
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]),
        Project.distinct('year', { status: 'approved' }),
        Project.distinct('supervisor', { status: 'approved' }),
    ]);

    const supervisors = await User.find({ _id: { $in: supervisorIds } })
        .select('name title')
        .sort('name');

    res.json({
        departments: departments.map((d) => ({ name: d._id, count: d.count })),
        years: years.sort((a, b) => b - a),
        supervisors: supervisors.map((s) => ({ id: s._id.toString(), name: s.name, title: s.title })),
    });
}

export async function getProject(req: Request, res: Response) {
    const id = req.params.id as string;
    if (!isValidObjectId(id)) {
        return res.status(404).json({ message: 'Project not found' });
    }

    const project = await Project.findOneAndUpdate(
        { _id: id, status: 'approved' },
        { $inc: { views: 1 } },
        { new: true }
    )
        .populate('supervisor', 'name title')
        .populate('student', 'name matricNo')
        .select('-reviewNote');

    if (!project) {
        return res.status(404).json({ message: 'Project not found' });
    }
    res.json({ project });
}

const updateSchema = submitSchema
    .omit({ supervisorId: true })
    .partial()
    .refine((d) => Object.keys(d).length > 0, { message: 'Nothing to update' });

export async function updateProject(req: Request, res: Response) {
    const id = req.params.id as string;
    if (!isValidObjectId(id)) {
        return res.status(404).json({ message: 'Project not found' });
    }

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message });
    }

    const project = await Project.findOne({ _id: id, student: req.user!._id });
    if (!project) {
        return res.status(404).json({ message: 'Project not found' });
    }
    if (!['pending', 'revisions_requested'].includes(project.status)) {
        return res.status(400).json({ message: 'This project can no longer be changed' });
    }

    const { title, abstract, keywords, githubUrl, demoUrl } = parsed.data;
    if (title !== undefined) project.title = title;
    if (abstract !== undefined) project.abstract = abstract;
    if (keywords !== undefined) project.keywords = keywords;
    if (githubUrl !== undefined) project.githubUrl = githubUrl || undefined;
    if (demoUrl !== undefined) project.demoUrl = demoUrl || undefined;
    await project.save();

    res.json({ project });
}

export async function resubmitProject(req: Request, res: Response) {
    const id = req.params.id as string;
    if (!isValidObjectId(id)) {
        return res.status(404).json({ message: 'Project not found' });
    }

    const project = await Project.findOne({ _id: id, student: req.user!._id });
    if (!project) {
        return res.status(404).json({ message: 'Project not found' });
    }
    if (project.status !== 'revisions_requested') {
        return res.status(400).json({ message: 'Only projects with requested revisions can be resubmitted' });
    }
    if (!project.pdfUrl) {
        return res.status(400).json({ message: 'Upload the PDF before resubmitting' });
    }

    project.status = 'pending';
    project.reviewNote = undefined;
    await project.save();
    notifySupervisor(project._id.toString(), true);

    res.json({ project });
}

export async function downloadProject(req: Request, res: Response) {
    const id = req.params.id as string;
    if (!isValidObjectId(id)) {
        return res.status(404).json({ message: 'Project not found' });
    }

    const project = await Project.findOneAndUpdate(
        { _id: id, status: 'approved', pdfUrl: { $exists: true, $ne: null } },
        { $inc: { downloads: 1 } }
    );
    if (!project?.pdfUrl) {
        return res.status(404).json({ message: 'Project not found' });
    }

    res.redirect(project.pdfUrl);
}

export async function deleteProject(req: Request, res: Response) {
    const id = req.params.id as string;
    if (!isValidObjectId(id)) {
        return res.status(404).json({ message: 'Project not found' });
    }

    const project = await Project.findOne({ _id: id, student: req.user!._id });
    if (!project) {
        return res.status(404).json({ message: 'Project not found' });
    }
    if (project.status === 'approved') {
        return res.status(400).json({
            message: 'Approved projects are part of the archive. Contact the administrator to have one removed.',
        });
    }

    await project.deleteOne();
    await deletePdf(project.pdfUrl, project.pdfPublicId);

    res.json({ message: 'Project deleted' });
}