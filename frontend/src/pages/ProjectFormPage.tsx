import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Project } from '../types';

interface Supervisor {
    id: string;
    name: string;
}

const MAX_PDF = 25 * 1024 * 1024;

function uploadPdf(projectId: string, file: File) {
    const body = new FormData();
    body.append('pdf', file);
    return api.post(`/projects/${projectId}/pdf`, body);
}

export default function ProjectFormPage() {
    const { id } = useParams();
    const editing = Boolean(id);
    const navigate = useNavigate();

    const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
    const [form, setForm] = useState({
        title: '',
        abstract: '',
        keywords: '',
        supervisorId: '',
        githubUrl: '',
        demoUrl: '',
    });
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [blocked, setBlocked] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                if (editing) {
                    const d = await api.get<{ projects: Project[] }>('/projects/mine');
                    if (cancelled) return;
                    const p = d.projects.find((x) => x._id === id);
                    if (!p) setBlocked('Project not found.');
                    else if (!['pending', 'revisions_requested'].includes(p.status)) {
                        setBlocked('This project can no longer be changed.');
                    } else {
                        setForm({
                            title: p.title,
                            abstract: p.abstract,
                            keywords: p.keywords.join(', '),
                            supervisorId: '',
                            githubUrl: p.githubUrl ?? '',
                            demoUrl: p.demoUrl ?? '',
                        });
                    }
                } else {
                    const d = await api.get<{ supervisors: Supervisor[] }>('/projects/supervisors');
                    if (!cancelled) setSupervisors(d.supervisors);
                }
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the form');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [editing, id]);

    function set(field: keyof typeof form, value: string) {
        setForm((f) => ({ ...f, [field]: value }));
    }

    function handleFile(e: ChangeEvent<HTMLInputElement>) {
        const picked = e.target.files?.[0] ?? null;
        setError('');
        if (picked && picked.type !== 'application/pdf') {
            setError('Only PDF files are allowed');
            e.target.value = '';
            setFile(null);
            return;
        }
        if (picked && picked.size > MAX_PDF) {
            setError('The PDF must be under 25 MB');
            e.target.value = '';
            setFile(null);
            return;
        }
        setFile(picked);
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');
        setBusy(true);

        const keywords = form.keywords.split(',').map((k) => k.trim()).filter(Boolean);
        const fields = {
            title: form.title,
            abstract: form.abstract,
            keywords,
            githubUrl: form.githubUrl.trim(),
            demoUrl: form.demoUrl.trim(),
        };

        try {
            let projectId = id as string;
            if (editing) {
                await api.patch(`/projects/${projectId}`, fields);
            } else {
                const d = await api.post<{ project: Project }>('/projects', {
                    ...fields,
                    supervisorId: form.supervisorId,
                });
                projectId = d.project._id;
            }

            if (file) {
                try {
                    await uploadPdf(projectId, file);
                } catch {
                    navigate('/my-projects', {
                        state: { notice: 'Your project was saved, but the PDF did not upload. Choose Edit to try the PDF again.' },
                    });
                    return;
                }
            }

            navigate('/my-projects', {
                state: {
                    notice: editing
                        ? 'Your changes were saved.'
                        : 'Project submitted. Your supervisor will review it.',
                },
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
            setBusy(false);
        }
    }

    if (loading) {
        return (
            <div className="wrap page">
                <p style={{ color: 'var(--mute)' }}>Loading...</p>
            </div>
        );
    }
    if (blocked) {
        return (
            <div className="wrap page">
                <p>{blocked} <Link className="lnk" to="/my-projects">Back to my projects</Link></p>
            </div>
        );
    }
    if (!editing && supervisors.length === 0) {
        return (
            <div className="wrap page">
                <h1 className="pg">Submit your final year project</h1>
                {error && <p className="error" role="alert">{error}</p>}
                <p style={{ marginTop: 12, maxWidth: 560 }}>
                    There are no lecturers registered in your department yet, so there is nobody to review your project.
                    Please ask the administrator to add your supervisor.
                </p>
            </div>
        );
    }

    return (
        <div className="wrap page">
            <form className="form" onSubmit={handleSubmit}>
                <h1 className="pg">{editing ? 'Edit your project' : 'Submit your final year project'}</h1>
                <p style={{ color: 'var(--mute)' }}>
                    {editing
                        ? 'Make your changes, then save. If revisions were requested, resubmit from My projects afterwards.'
                        : 'Your supervisor reviews every submission before it appears in the archive.'}
                </p>

                {error && <p className="error" style={{ marginTop: 16 }} role="alert">{error}</p>}

                <h2>Your project</h2>
                <div className="f">
                    <label htmlFor="title">Title</label>
                    <input id="title" className="inp" value={form.title}
                        onChange={(e) => set('title', e.target.value)} required />
                    <small>Use the title your project committee approved.</small>
                </div>
                <div className="f">
                    <label htmlFor="abstract">Abstract</label>
                    <textarea id="abstract" className="inp" rows={6} value={form.abstract}
                        onChange={(e) => set('abstract', e.target.value)} required />
                    <small>Cover the problem, your method and your results. At least 50 characters.</small>
                </div>
                <div className="f">
                    <label htmlFor="keywords">Keywords</label>
                    <input id="keywords" className="inp" value={form.keywords}
                        onChange={(e) => set('keywords', e.target.value)} required />
                    <small>Separate with commas. Up to 8.</small>
                </div>

                {!editing && (
                    <div className="f">
                        <label htmlFor="supervisor">Supervisor</label>
                        <select id="supervisor" className="inp" value={form.supervisorId}
                            onChange={(e) => set('supervisorId', e.target.value)} required>
                            <option value="" disabled>Choose your supervisor</option>
                            {supervisors.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <h2>Files and links</h2>
                <div className="f">
                    <label htmlFor="pdf">Final manuscript (PDF, up to 25 MB)</label>
                    <input id="pdf" className="inp" type="file" accept="application/pdf"
                        onChange={handleFile} required={!editing} />
                    {editing && <small>Leave this empty to keep the PDF you already uploaded.</small>}
                </div>
                <div className="two">
                    <div className="f">
                        <label htmlFor="github">GitHub repository (optional)</label>
                        <input id="github" className="inp" type="url" placeholder="https://github.com/..."
                            value={form.githubUrl} onChange={(e) => set('githubUrl', e.target.value)} />
                    </div>
                    <div className="f">
                        <label htmlFor="demo">Live demo (optional)</label>
                        <input id="demo" className="inp" type="url" placeholder="https://"
                            value={form.demoUrl} onChange={(e) => set('demoUrl', e.target.value)} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                    <button className="btn" type="submit" disabled={busy}>
                        {busy ? 'Saving...' : editing ? 'Save changes' : 'Submit project'}
                    </button>
                    <Link className="btn alt" to="/my-projects">Cancel</Link>
                </div>
            </form>
        </div>
    );
}