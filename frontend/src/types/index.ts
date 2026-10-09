export type Role = 'student' | 'supervisor' | 'admin';

export interface User {
    id: string;
    name: string;
    title?: string;
    email: string;
    role: Role;
    department?: string;
    matricNo?: string;
    mustChangePassword: boolean;
}

export interface Project {
    _id: string;
    title: string;
    abstract: string;
    keywords: string[];
    department: string;
    year: number;
    status: 'pending' | 'approved' | 'revisions_requested' | 'rejected';
    supervisor?: { _id: string; name: string; title?: string; isActive?: boolean };
    student?: { _id: string; name: string; matricNo?: string; email?: string };
    githubUrl?: string;
    demoUrl?: string;
    pdfUrl?: string;
    reviewNote?: string;
    views: number;
    downloads: number;
    createdAt: string;
}

export interface ArchiveFilters {
    departments: { name: string; count: number }[];
    years: number[];
    supervisors: { id: string; name: string; title?: string }[];
}

export interface Lecturer {
    id: string;
    name: string;
    title?: string;
    email: string;
    department?: string;
    isActive: boolean;
    mustChangePassword: boolean;
}

export interface Department {
    _id: string;
    name: string;
}