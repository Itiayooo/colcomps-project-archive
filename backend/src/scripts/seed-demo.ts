import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/user.model';
import { Project } from '../models/project.model';
import { connectDB } from '../config/db';

const PASSWORD = 'password123';

async function upsertUser(email: string, fields: Record<string, unknown>, passwordHash: string) {
    return User.findOneAndUpdate(
        { email: email.toLowerCase() },
        { $set: { ...fields, email: email.toLowerCase(), passwordHash, isActive: true, mustChangePassword: false } },
        { upsert: true, new: true }
    );
}

async function seedDemo() {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Do not run the demo seed in production');
    }
    await connectDB();
    const hash = await bcrypt.hash(PASSWORD, 10);

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    await upsertUser(adminEmail, { name: process.env.ADMIN_NAME || 'Admin', role: 'admin' }, hash);

    const lecturer = await upsertUser(
        'lecturer@example.com',
        { name: 'Dr. Test Lecturer', role: 'supervisor', department: 'Computer Science' },
        hash
    );
    const student = await upsertUser(
        'student@example.com',
        { name: 'Test Student', role: 'student', department: 'Computer Science', matricNo: '20236537' },
        hash
    );

    const samples = [
        {
            title: 'Distributed Malware Detection in Cloud Infrastructure Using eBPF Tracing',
            abstract:
                'A lightweight, real-time anomaly detection framework for containerized cloud environments. eBPF probes capture kernel events at low overhead, and a temporal graph model flags zero-day malware behaviour before execution.',
            keywords: ['eBPF', 'Cloud Security', 'Malware Analysis'],
        },
        {
            title: 'Predictive Analytics for Student Retention and Academic Intervention',
            abstract:
                'An interpretable XGBoost pipeline with SHAP explanations, trained on engagement data from four cohorts, that alerts advisors to students at risk of probation while protecting student data.',
            keywords: ['Machine Learning', 'Educational Mining', 'Interpretable AI'],
        },
    ];

    for (const s of samples) {
        await Project.updateOne(
            { title: s.title },
            {
                $setOnInsert: {
                    ...s,
                    department: 'Computer Science',
                    year: 2026,
                    student: student._id,
                    supervisor: lecturer._id,
                    status: 'approved',
                },
            },
            { upsert: true }
        );
    }

    console.log('Demo data ready. All three accounts use password:', PASSWORD);
    console.log('Admin:   ', adminEmail);
    console.log('Lecturer: lecturer@example.com');
    console.log('Student:  student@example.com');
}

seedDemo()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());