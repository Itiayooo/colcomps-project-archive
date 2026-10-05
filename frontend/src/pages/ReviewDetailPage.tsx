import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { STATUS_LABEL } from '../lib/status';
import type { Project } from '../types';

type Decision = 'approve' | 'revisions' | 'reject';

const CONFIRM: Record<Decision, string> = {
    approve: 'Approve this project and publish it to the public archive?',
    revisions: 'Send this project back to the student for revisions?',
    reject: 'Reject this project? The student will see your note.',
};

const DONE: Record<Decision, string> = {
    approve: 'Project approved and published.',
    revisions: 'Project sent back to the student.',
    reject: 'Project rejected.',
};

export default function ReviewDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        api
            .get<{ project: Project }>(`/review/${id}`)
            .then((d) => {
                if (!cancelled) setProject(d.project);
            })
            .catch((err) => {
                if (cancelled) return;
                if (err instanceof ApiError && err.status === 404) setNotFound(true);
                else setError(err instanceof Error ? err.message : 'Could not load this project');
            });
        return () => {
            cancelled = true;
        };
    }, [id]);

    async function decide(decision: Decision) {
        if (!window.confirm(CONFIRM[decision])) return;
        setError('');
        setBusy(true);
        try {
            await api.patch(`/review/${id}`, { decision, note: note.trim() || undefined });
            navigate('/review', { state: { notice: DONE[decision] } });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save your decision');
            setBusy(false);
        }
    }

    if (notFound) {
        return (
            <div className="wrap page">
                <p>
                    Project not found. <Link className="lnk" to="/review">Back to the review queue</Link>
                </p>
            </div>
        );
    }
    if (!project) {
        return (
            <div className="wrap page">
                {error ? <p className="error" role="alert">{error}</p> : <p style={{ color: 'var(--mute)' }}>Loading...</p>}
            </div>
        );
    }

    const s = STATUS_LABEL[project.status];
    const pending = project.status === 'pending';
    const noteOk = note.trim().length >= 5;

    return (
        <div className="wrap page">
            <div className="crumb">
                <Link className="lnk" to="/review">Review queue</Link> / {project.department}
            </div>

            <h1 className="pg">{project.title}</h1>
            <p>
                {project.student?.name}
                {project.student?.matricNo ? ` (${project.student.matricNo})` : ''}
                {project.student?.email ? `, ${project.student.email}` : ''}
            </p>
            <p className={s.cls} style={{ fontWeight: 500, marginTop: 4 }}>{s.label}</p>

            <div className="art">
                <div>
                    <h2>Abstract</h2>
                    <p>{project.abstract}</p>

                    <h2>Keywords</h2>
                    <p>{project.keywords.join(', ')}</p>

                    <h2>Manuscript and links</h2>
                    <div className="meta" style={{ fontSize: 15, gap: 20 }}>
                        {project.pdfUrl ? (
                            <a className="lnk" href={project.pdfUrl} target="_blank" rel="noreferrer">Open the PDF</a>
                        ) : (
                            <span>The student has not uploaded the PDF yet.</span>
                        )}
                        {project.githubUrl && <a className="lnk" href={project.githubUrl} target="_blank" rel="noreferrer">Source code</a>}
                        {project.demoUrl && <a className="lnk" href={project.demoUrl} target="_blank" rel="noreferrer">Live demo</a>}
                    </div>
                </div>

                <div>
                    {pending ? (
                        <div className="panel">
                            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 10px' }}>Your decision</h2>

                            {error && <p className="error" role="alert">{error}</p>}

                            <div className="f">
                                <label htmlFor="note">Note to the student</label>
                                <textarea id="note" className="inp" rows={5} value={note}
                                    onChange={(e) => setNote(e.target.value)} />
                                <small>Required when sending back or rejecting.</small>
                            </div>

                            <div style={{ display: 'grid', gap: 10 }}>
                                <button className="btn" disabled={busy || !project.pdfUrl} onClick={() => decide('approve')}>
                                    Approve and publish
                                </button>
                                {!project.pdfUrl && (
                                    <small style={{ color: 'var(--mute)' }}>You can approve once the PDF is uploaded.</small>
                                )}
                                <button className="btn alt" disabled={busy || !noteOk} onClick={() => decide('revisions')}>
                                    Request revisions
                                </button>
                                <button className="btn bad" disabled={busy || !noteOk} onClick={() => decide('reject')}>
                                    Reject
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="panel">
                            <p>This project has already been reviewed.</p>
                            {project.reviewNote && (
                                <div className="note">
                                    <b>Your note</b>
                                    {project.reviewNote}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}