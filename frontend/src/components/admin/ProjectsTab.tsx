import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formalName } from '../../lib/names';
import { STATUS_LABEL } from '../../lib/status';
import type { Lecturer, Project } from '../../types';

export default function ProjectsTab() {
    const [projects, setProjects] = useState<Project[] | null>(null);
    const [lecturers, setLecturers] = useState<Lecturer[]>([]);
    const [status, setStatus] = useState('');
    const [q, setQ] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState('');
    const [reassign, setReassign] = useState<Project | null>(null);
    const [target, setTarget] = useState('');

    useEffect(() => {
        api.get<{ lecturers: Lecturer[] }>('/admin/lecturers').then((d) => setLecturers(d.lecturers)).catch(() => { });
    }, [reloadKey]);

    useEffect(() => {
        let cancelled = false;
        const t = setTimeout(() => {
            const params = new URLSearchParams();
            if (status) params.set('status', status);
            if (q.trim()) params.set('q', q.trim());
            api
                .get<{ projects: Project[] }>(`/admin/projects?${params}`)
                .then((d) => {
                    if (cancelled) return;
                    setProjects(d.projects);
                    setError('');
                })
                .catch((err) => {
                    if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load projects');
                });
        }, 250);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [q, status, reloadKey]);

    async function act(p: Project, kind: 'unpublish' | 'delete') {
        const message =
            kind === 'unpublish'
                ? `Remove "${p.title}" from the public archive? It goes back to the supervisor's queue as pending.`
                : `Permanently delete "${p.title}" and its PDF? This cannot be undone.`;
        if (!window.confirm(message)) return;

        setError('');
        setBusyId(p._id);
        try {
            if (kind === 'unpublish') await api.patch(`/admin/projects/${p._id}/unpublish`);
            else await api.delete(`/admin/projects/${p._id}`);
            setReloadKey((k) => k + 1);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Action failed');
        } finally {
            setBusyId('');
        }
    }

    async function saveReassign() {
        if (!reassign || !target) return;
        setError('');
        setBusyId(reassign._id);
        try {
            await api.patch(`/admin/projects/${reassign._id}/supervisor`, { supervisorId: target });
            setReassign(null);
            setTarget('');
            setReloadKey((k) => k + 1);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not reassign');
        } finally {
            setBusyId('');
        }
    }

    const eligible = reassign
        ? lecturers.filter((l) => l.isActive && l.department === reassign.department && l.id !== reassign.supervisor?._id)
        : [];

    return (
        <div>
            {reassign && (
                <div className="panel" style={{ marginBottom: 20, maxWidth: 520 }}>
                    <p style={{ marginBottom: 12 }}><b>Reassign</b> "{reassign.title}"</p>
                    {eligible.length === 0 ? (
                        <p style={{ color: 'var(--mute)', marginBottom: 12 }}>
                            No other active lecturer in {reassign.department}. Add one in the Lecturers tab first.
                        </p>
                    ) : (
                        <div className="f">
                            <label htmlFor="target">New supervisor</label>
                            <select id="target" className="inp" value={target} onChange={(e) => setTarget(e.target.value)}>
                                <option value="" disabled>Choose a lecturer</option>
                                {eligible.map((l) => <option key={l.id} value={l.id}>{formalName(l)}</option>)}
                            </select>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn" disabled={!target || busyId === reassign._id} onClick={saveReassign}>Reassign</button>
                        <button className="btn alt" onClick={() => { setReassign(null); setTarget(''); }}>Cancel</button>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                <input className="inp" style={{ maxWidth: 320 }} placeholder="Search by title" aria-label="Search by title"
                    value={q} onChange={(e) => setQ(e.target.value)} />
                <select className="inp" style={{ maxWidth: 220 }} aria-label="Filter by status"
                    value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">All statuses</option>
                    <option value="approved">Archived</option>
                    <option value="pending">Awaiting review</option>
                    <option value="revisions_requested">Sent back</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>

            {error && <p className="error" role="alert">{error}</p>}
            {projects === null && !error && <p style={{ color: 'var(--mute)' }}>Loading...</p>}
            {projects?.length === 0 && <p style={{ color: 'var(--mute)' }}>No projects match.</p>}

            {projects && projects.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                    <table>
                        <thead>
                            <tr><th>Project</th><th>Student</th><th>Supervisor</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {projects.map((p) => {
                                const s = STATUS_LABEL[p.status];
                                const open = p.status === 'pending' || p.status === 'revisions_requested';
                                return (
                                    <tr key={p._id}>
                                        <td style={{ maxWidth: 320 }}>
                                            {p.status === 'approved' ? <Link className="lnk" to={`/projects/${p._id}`}>{p.title}</Link> : <b>{p.title}</b>}
                                            <div className="id">{p.department}, {p.year}</div>
                                        </td>
                                        <td>{p.student?.name}<div className="id">{p.student?.matricNo}</div></td>
                                        <td>
                                            {p.supervisor ? formalName(p.supervisor) : '-'}
                                            {p.supervisor?.isActive === false && <div className="id rev">Deactivated</div>}
                                        </td>
                                        <td className={s.cls}>{s.label}</td>
                                        <td>
                                            <div className="acts">
                                                {open && (
                                                    <button className="lnk" onClick={() => { setReassign(p); setTarget(''); }}>Reassign</button>
                                                )}
                                                {p.status === 'approved' && (
                                                    <button className="lnk" disabled={busyId === p._id} onClick={() => act(p, 'unpublish')}>Unpublish</button>
                                                )}
                                                <button className="lnk danger" disabled={busyId === p._id} onClick={() => act(p, 'delete')}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            {projects && projects.length === 100 && (
                <p style={{ marginTop: 12, fontSize: 14, color: 'var(--mute)' }}>
                    Showing the 100 most recent. Use search or a status filter to narrow it down.
                </p>
            )}
        </div>
    );
}