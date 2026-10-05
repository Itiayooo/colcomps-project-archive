import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { STATUS_LABEL } from '../lib/status';
import type { Project } from '../types';

export default function MyProjectsPage() {
    const notice = (useLocation().state as { notice?: string } | null)?.notice;

    const [projects, setProjects] = useState<Project[] | null>(null);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState('');

    const load = useCallback(async () => {
        try {
            const d = await api.get<{ projects: Project[] }>('/projects/mine');
            setProjects(d.projects);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load your projects');
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    async function resubmit(id: string) {
        setError('');
        setBusyId(id);
        try {
            await api.post(`/projects/${id}/resubmit`);
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not resubmit');
        } finally {
            setBusyId('');
        }
    }

    return (
        <div className="wrap page">
            <h1 className="pg">My projects</h1>

            {notice && <p className="notice" style={{ marginTop: 16 }}>{notice}</p>}
            {error && <p className="error" style={{ marginTop: 16 }} role="alert">{error}</p>}

            {projects === null && !error && <p style={{ marginTop: 16, color: 'var(--mute)' }}>Loading...</p>}

            {projects?.length === 0 && (
                <div className="empty">
                    <p><b>You have not submitted a project yet.</b></p>
                    <p style={{ marginTop: 12 }}><Link className="btn" to="/submit">Submit a project</Link></p>
                </div>
            )}

            {projects?.map((p) => {
                const s = STATUS_LABEL[p.status];
                const editable = p.status === 'pending' || p.status === 'revisions_requested';
                return (
                    <article key={p._id} className="item" style={{ gridTemplateColumns: '1fr' }}>
                        <div>
                            <h3>
                                {p.status === 'approved' ? <Link to={`/projects/${p._id}`}>{p.title}</Link> : p.title}
                            </h3>
                            <p className={s.cls} style={{ fontWeight: 500, marginBottom: 6 }}>{s.label}</p>

                            {p.reviewNote && (p.status === 'revisions_requested' || p.status === 'rejected') && (
                                <div className="note">
                                    <b>Feedback from your supervisor</b>
                                    {p.reviewNote}
                                </div>
                            )}

                            <div className="meta">
                                {p.supervisor && <span>Supervisor: {p.supervisor.name}</span>}
                                <span>Submitted {new Date(p.createdAt).toLocaleDateString('en-GB')}</span>
                                <span>{p.pdfUrl ? 'PDF uploaded' : 'No PDF yet'}</span>
                            </div>

                            {editable && (
                                <div className="meta" style={{ marginTop: 10, gap: 16 }}>
                                    <Link className="lnk" to={`/my-projects/${p._id}/edit`}>Edit</Link>
                                    {p.status === 'revisions_requested' && (
                                        <button className="lnk" disabled={busyId === p._id} onClick={() => resubmit(p._id)}>
                                            {busyId === p._id ? 'Resubmitting...' : 'Resubmit for review'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </article>
                );
            })}
        </div>
    );
}