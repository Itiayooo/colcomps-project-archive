import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import type { Project } from '../types';

type Tab = 'pending' | 'revisions_requested' | 'approved' | 'rejected';

const TABS: { key: Tab; label: string }[] = [
    { key: 'pending', label: 'Awaiting review' },
    { key: 'revisions_requested', label: 'Sent back' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
];

const EMPTY: Record<Tab, string> = {
    pending: 'Nothing is waiting for your review.',
    revisions_requested: 'No projects are waiting on student revisions.',
    approved: 'You have not approved any projects yet.',
    rejected: 'You have not rejected any projects.',
};

export default function ReviewQueuePage() {
    const notice = (useLocation().state as { notice?: string } | null)?.notice;

    const [tab, setTab] = useState<Tab>('pending');
    const [projects, setProjects] = useState<Project[] | null>(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        api
            .get<{ projects: Project[]; pendingCount: number }>(`/review?status=${tab}`)
            .then((d) => {
                if (cancelled) return;
                setProjects(d.projects);
                setPendingCount(d.pendingCount);
                setError('');
            })
            .catch((err) => {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the queue');
            });
        return () => {
            cancelled = true;
        };
    }, [tab]);

    function switchTab(next: Tab) {
        setProjects(null);
        setTab(next);
    }

    return (
        <div className="wrap page">
            <h1 className="pg">Review queue</h1>
            <p style={{ color: 'var(--mute)' }}>Projects submitted by students you supervise.</p>

            {notice && <p className="notice" style={{ marginTop: 16 }}>{notice}</p>}

            <div className="tabs">
                {TABS.map((t) => (
                    <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => switchTab(t.key)}>
                        {t.label}
                        {t.key === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
                    </button>
                ))}
            </div>

            {error && <p className="error" role="alert">{error}</p>}
            {projects === null && !error && <p style={{ color: 'var(--mute)' }}>Loading...</p>}
            {projects?.length === 0 && <p className="empty" style={{ padding: '24px 0' }}>{EMPTY[tab]}</p>}

            {projects?.map((p) => (
                <article key={p._id} className="item" style={{ gridTemplateColumns: '1fr' }}>
                    <div>
                        <h3><Link to={`/review/${p._id}`}>{p.title}</Link></h3>
                        <p className="by">
                            {p.student?.name}
                            {p.student?.matricNo ? ` (${p.student.matricNo})` : ''}
                        </p>
                        <div className="meta">
                            <span>Submitted {new Date(p.createdAt).toLocaleDateString('en-GB')}</span>
                            <span>{p.pdfUrl ? 'PDF uploaded' : 'No PDF yet'}</span>
                        </div>
                    </div>
                </article>
            ))}
        </div>
    );
}