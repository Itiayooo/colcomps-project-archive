export type Role = 'student' | 'supervisor' | 'admin';

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    department?: string;
    matricNo?: string;
    mustChangePassword: boolean;
}