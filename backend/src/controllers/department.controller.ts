import type { Request, Response } from 'express';
import { z } from 'zod';
import { Department } from '../models/department.model';

const createSchema = z.object({
    name: z.string().trim().min(2, 'Enter a department name'),
});

export async function listDepartments(_req: Request, res: Response) {
    const departments = await Department.find().sort('name');
    res.json({ departments });
}

export async function createDepartment(req: Request, res: Response) {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message });
    }

    const exists = await Department.findOne({ name: parsed.data.name });
    if (exists) {
        return res.status(409).json({ message: 'This department already exists' });
    }

    const department = await Department.create({ name: parsed.data.name });
    res.status(201).json({ department });
}