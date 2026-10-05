import type { Project } from '../types';

export const STATUS_LABEL: Record<Project['status'], { label: string; cls: string }> = {
    pending: { label: 'Awaiting review', cls: 'wait' },
    approved: { label: 'Archived', cls: 'ok' },
    revisions_requested: { label: 'Revisions requested', cls: 'rev' },
    rejected: { label: 'Rejected', cls: 'rev' },
};