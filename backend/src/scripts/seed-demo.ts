import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/user.model';
import { Project, type ProjectStatus } from '../models/project.model';
import { connectDB } from '../config/db';

const PASSWORD = 'password123';

const LECTURERS = [
    { title: 'Dr.', name: 'Test Lecturer', email: 'lecturer@example.com', department: 'Computer Science' },
    { title: 'Dr.', name: 'Amina Bello', email: 'amina.bello@example.com', department: 'Software Engineering' },
    { title: 'Prof.', name: 'Chukwuma Eze', email: 'chukwuma.eze@example.com', department: 'Cyber Security' },
    { title: 'Dr.', name: 'Funmi Adeyemi', email: 'funmi.adeyemi@example.com', department: 'Information Technology' },
];

const STUDENTS = [
    { name: 'Test Student', email: 'student@example.com', matricNo: '20200100', department: 'Computer Science' },
    { name: 'Oluwaseun Vance', email: 'oluwaseun.vance@example.com', matricNo: '20190142', department: 'Computer Science' },
    { name: 'Chidinma Okafor', email: 'chidinma.okafor@example.com', matricNo: '20210117', department: 'Software Engineering' },
    { name: 'Tunde Bakare', email: 'tunde.bakare@example.com', matricNo: '20190231', department: 'Cyber Security' },
    { name: 'Aisha Lawal', email: 'aisha.lawal@example.com', matricNo: '20190512', department: 'Information Technology' },
    { name: 'Daniel Wright', email: 'daniel.wright@example.com', matricNo: '20200891', department: 'Computer Science' },
    { name: 'Kemi Adebayo', email: 'kemi.adebayo@example.com', matricNo: '20220064', department: 'Cyber Security' },
];

interface Seed {
    title: string;
    abstract: string;
    keywords: string[];
    student: string;
    supervisor: string;
    year: number;
    status: ProjectStatus;
    note?: string;
    githubUrl?: string;
    demoUrl?: string;
}

const PROJECTS: Seed[] = [
    {
        title: 'Distributed Malware Detection in Cloud Infrastructure Using eBPF Tracing',
        abstract: 'A lightweight, real-time anomaly detection framework for containerized cloud environments. eBPF probes capture kernel events at low overhead, and a temporal graph model flags zero-day malware behaviour before execution.',
        keywords: ['eBPF', 'Cloud Security', 'Malware Analysis'],
        student: 'oluwaseun.vance@example.com', supervisor: 'lecturer@example.com', year: 2026, status: 'approved',
        githubUrl: 'https://github.com/example/ebpf-malware-detect', demoUrl: 'https://example.com/demo',
    },
    {
        title: 'Formal Verification of Smart Contracts for Cross-Chain Liquidity Protocols',
        abstract: 'An automated theorem-proving tool for EVM assembly that detects reentrancy and arithmetic overflow in cross-chain atomic swaps through formal specification.',
        keywords: ['Formal Methods', 'Smart Contracts', 'Blockchain'],
        student: 'chidinma.okafor@example.com', supervisor: 'amina.bello@example.com', year: 2026, status: 'approved',
        githubUrl: 'https://github.com/example/solidity-verifier',
    },
    {
        title: 'WasmFuzz: Differential Fuzzing for WebAssembly Runtime Sandboxes',
        abstract: 'A differential fuzzing engine that finds memory isolation escapes and sandbox breakouts across major WebAssembly engines, with a reproducible report format for maintainers.',
        keywords: ['WebAssembly', 'Fuzzing', 'Vulnerability Research'],
        student: 'kemi.adebayo@example.com', supervisor: 'chukwuma.eze@example.com', year: 2026, status: 'approved',
        githubUrl: 'https://github.com/example/wasmfuzz',
    },
    {
        title: 'Decentralized Key Management for Zero-Trust Healthcare Systems',
        abstract: 'An identity-based key exchange protocol integrated with hardware security modules, giving granular role-based access to patient records without a central key authority.',
        keywords: ['Zero-Trust', 'Cryptography', 'Healthcare IT'],
        student: 'tunde.bakare@example.com', supervisor: 'chukwuma.eze@example.com', year: 2025, status: 'approved',
    },
    {
        title: 'Predictive Analytics for Student Retention and Academic Intervention',
        abstract: 'An interpretable XGBoost pipeline with SHAP explanations, trained on engagement data from four cohorts, that alerts advisors to students at risk of probation while protecting student data.',
        keywords: ['Machine Learning', 'Educational Mining', 'Interpretable AI'],
        student: 'aisha.lawal@example.com', supervisor: 'funmi.adeyemi@example.com', year: 2025, status: 'approved',
        demoUrl: 'https://example.com/retention',
    },
    {
        title: 'Optimizing High-Throughput Stream Processing for IoT Sensor Networks',
        abstract: 'A dynamic event-batching algorithm for Apache Flink that adjusts memory buffer thresholds from network packet-drop statistics, easing bottlenecks on edge nodes.',
        keywords: ['IoT', 'Stream Processing', 'Edge Computing'],
        student: 'daniel.wright@example.com', supervisor: 'lecturer@example.com', year: 2024, status: 'approved',
    },
    {
        title: 'Campus Navigation App With Offline Maps for First-Year Students',
        abstract: 'A mobile app that guides new students around campus using offline vector maps, with a crowd-sourced layer for temporary closures and event venues.',
        keywords: ['Mobile Development', 'Maps', 'Offline First'],
        student: 'student@example.com', supervisor: 'lecturer@example.com', year: 2026, status: 'pending',
    },
    {
        title: 'Automated Timetable Generation Using Genetic Algorithms',
        abstract: 'A scheduling system that produces conflict-free lecture timetables with a genetic algorithm, balancing lecturer availability, room capacity and student clashes.',
        keywords: ['Genetic Algorithms', 'Scheduling', 'Optimization'],
        student: 'student@example.com', supervisor: 'lecturer@example.com', year: 2026, status: 'revisions_requested',
        note: 'The abstract does not state your results. Add the clash rate before and after, and include references for the algorithm.',
    },
];

async function seedDemo() {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Do not run the demo seed in production');
    }
    await connectDB();
    const hash = await bcrypt.hash(PASSWORD, 10);

    async function upsertUser(email: string, fields: Record<string, unknown>) {
        return User.findOneAndUpdate(
            { email },
            { $set: { ...fields, email, passwordHash: hash, isActive: true, mustChangePassword: false } },
            { upsert: true, new: true }
        );
    }

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
    await upsertUser(adminEmail, { name: process.env.ADMIN_NAME || 'Admin', role: 'admin' });

    const lecturerIds = new Map<string, mongoose.Types.ObjectId>();

    for (const l of LECTURERS) {
        const u = await upsertUser(l.email, {
            title: l.title,
            name: l.name,
            role: 'supervisor',
            department: l.department,
        });

        lecturerIds.set(l.email, u._id);
    }

    const studentIds = new Map<string, mongoose.Types.ObjectId>();
    for (const s of STUDENTS) {
        const u = await upsertUser(s.email, {
            name: s.name, role: 'student', department: s.department, matricNo: s.matricNo,
        });
        studentIds.set(s.email, u._id);
    }

    const departmentOf = new Map(STUDENTS.map((s) => [s.email, s.department]));
    const pdfUrl = process.env.DEMO_PDF_URL;

    for (const p of PROJECTS) {
        const approved = p.status === 'approved';
        await Project.updateOne(
            { title: p.title },
            {
                $set: {
                    title: p.title,
                    abstract: p.abstract,
                    keywords: p.keywords,
                    department: departmentOf.get(p.student),
                    year: p.year,
                    student: studentIds.get(p.student),
                    supervisor: lecturerIds.get(p.supervisor),
                    status: p.status,
                    reviewNote: p.note,
                    githubUrl: p.githubUrl,
                    demoUrl: p.demoUrl,
                    pdfUrl: pdfUrl || undefined,
                },
                $setOnInsert: { views: approved ? 25 : 0, downloads: approved ? 6 : 0 },
            },
            { upsert: true }
        );
    }

    console.log(`Demo data ready. Every account below uses the password: ${PASSWORD}`);
    console.log(`Admin:    ${adminEmail}`);
    console.log('Lecturer: lecturer@example.com (has 1 project to review)');
    console.log('Student:  student@example.com (1 pending, 1 sent back with feedback)');
}

seedDemo()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());