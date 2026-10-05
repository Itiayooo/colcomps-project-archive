import type { Role } from '../types';

export function homePath(role: Role) {
    if (role === 'admin') return '/admin';
    if (role === 'supervisor') return '/review';
    return '/my-projects';
}