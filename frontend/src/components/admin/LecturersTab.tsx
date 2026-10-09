import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { formalName } from '../../lib/names';
import type { Department, Lecturer } from '../../types';

const TITLES = ['Prof.', 'Dr.', 'Engr.', 'Mr.', 'Mrs.', 'Miss'];

interface Credentials {
    name: string;
    email: string;
    tempPassword: string;
}

export default function LecturersTab() {
    const [lecturers, setLecturers] = useState<Lecturer[] | null>(null);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [form, setForm] = useState({ title: '', name: '', email: '', department: '' });
    const [creds, setCreds] = useState<Credentials | null>(null);
    const [copied, setCopied] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [busyId, setBusyId] = useState('');

    const load = useCallback(async () => {
        try {
            const [l, d] = await Promise.all([
                api.get<{ lecturers: Lecturer[] }>('/admin/lecturers'),
                api.get<{ departments: Department[] }>('/departments'),
            ]);
            setLecturers(l.lecturers);
            setDepartments(d.departments);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load lecturers');
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    function showCreds(c: Credentials) {
        setCreds(c);
        setCopied(false);
    }

    async function handleCreate(e: FormEvent) {
        e.preventDefault();
        setError('');
        setNotice('');
        setBusy(true);
        try {
            const d = await api.post<{ lecturer: Lecturer; tempPassword: string }>('/admin/lecturers', {
                ...form,
                title: form.title || undefined,
            });
            showCreds({
                name: formalName(d.lecturer),
                email: d.lecturer.email,
                tempPassword: d.tempPassword,
            });
            setForm({ title: '', name: '', email: '', department: form.department });
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not add the lecturer');
        } finally {
            setBusy(false);
        }
    }

    async function toggleActive(l: Lecturer) {
        const action = l.isActive ? 'Deactivate' : 'Reactivate';
        const warning = l.isActive ? ' They will be logged out and unable to sign in.' : '';
        if (!window.confirm(`${action} ${formalName(l)}?${warning}`)) return;
        setError('');
        setNotice('');
        setBusyId(l.id);
        try {
            const d = await api.patch<{ openProjects: number }>(`/admin/lecturers/${l.id}/status`, {
                isActive: !l.isActive,
            });
            if (d.openProjects > 0) {
                setNotice(
                    `${formalName(l)} still has ${d.openProjects} project(s) under review. Reassign them in the Projects tab.`
                );
            }
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not update the lecturer');
        } finally {
            setBusyId('');
        }
    }

    async function resetPassword(l: Lecturer) {
        if (!window.confirm(`Reset the password for ${formalName(l)}? Their current password will stop working.`)) return;
        setError('');
        setNotice('');
        setBusyId(l.id);
        try {
            const d = await api.post<{ tempPassword: string }>(`/admin/lecturers/${l.id}/reset-password`);
            showCreds({ name: formalName(l), email: l.email, tempPassword: d.tempPassword });
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not reset the password');
        } finally {
            setBusyId('');
        }
    }

    async function makeAdmin(l: Lecturer) {
        if (
            !window.confirm(
                `Make ${formalName(l)} an administrator? They will stop being a lecturer and lose their review queue.`
            )
        )
            return;
        setError('');
        setNotice('');
        setBusyId(l.id);
        try {
            await api.post(`/admin/lecturers/${l.id}/make-admin`);
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not make this lecturer an administrator');
        } finally {
            setBusyId('');
        }
    }

    async function copyCreds() {
        if (!creds) return;
        try {
            await navigator.clipboard.writeText(`Email: ${creds.email}\nTemporary password: ${creds.tempPassword}`);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    }

    return (
        <div>
            {creds && (
                <div className="cred" role="status">
                    <p><b>Login details for {creds.name}</b></p>
                    <p>Email: <code>{creds.email}</code></p>
                    <p>Temporary password: <code>{creds.tempPassword}</code></p>
                    <p style={{ color: 'var(--mute)' }}>
                        Copy this now and send it to the lecturer. It will not be shown again. They will be asked to choose a new password when they first log in.
                    </p>
                    <p style={{ display: 'flex', gap: 16 }}>
                        <button className="lnk" onClick={copyCreds}>{copied ? 'Copied' : 'Copy login details'}</button>
                        <button className="lnk" onClick={() => setCreds(null)}>Dismiss</button>
                    </p>
                </div>
            )}

            {notice && <p className="notice">{notice}</p>}
            {error && <p className="error" role="alert">{error}</p>}

            <h2 className="sh">Add a lecturer</h2>
            {departments.length === 0 ? (
                <p style={{ color: 'var(--mute)', marginBottom: 28 }}>Add a department first, in the Departments tab.</p>
            ) : (
                <form className="row-form" onSubmit={handleCreate}>
                    <div className="f">
                        <label htmlFor="l-title">Title</label>
                        <select id="l-title" className="inp" value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}>
                            <option value="">None</option>
                            {TITLES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    <div className="f">
                        <label htmlFor="l-name">Full name (without title)</label>
                        <input id="l-name" className="inp" value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div className="f">
                        <label htmlFor="l-email">Email</label>
                        <input id="l-email" className="inp" type="email" value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                    </div>
                    <div className="f">
                        <label htmlFor="l-dept">Department</label>
                        <select id="l-dept" className="inp" value={form.department}
                            onChange={(e) => setForm({ ...form, department: e.target.value })} required>
                            <option value="" disabled>Choose department</option>
                            {departments.map((d) => (
                                <option key={d._id} value={d.name}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                    <button className="btn" type="submit" disabled={busy}>{busy ? 'Adding...' : 'Add lecturer'}</button>
                </form>
            )}

            <h2 className="sh">All lecturers</h2>
            {lecturers === null && !error && <p style={{ color: 'var(--mute)' }}>Loading...</p>}
            {lecturers?.length === 0 && <p style={{ color: 'var(--mute)' }}>No lecturers have been added yet.</p>}

            {lecturers && lecturers.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                    <table>
                        <thead>
                            <tr><th>Lecturer</th><th>Department</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {lecturers.map((l) => (
                                <tr key={l.id}>
                                    <td><b>{formalName(l)}</b><div className="id">{l.email}</div></td>
                                    <td>{l.department}</td>
                                    <td>
                                        {!l.isActive ? (
                                            <span className="rev">Deactivated</span>
                                        ) : l.mustChangePassword ? (
                                            <span className="wait">Has not set a password yet</span>
                                        ) : (
                                            <span className="ok">Active</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="acts">
                                            <button className="lnk" disabled={busyId === l.id} onClick={() => resetPassword(l)}>
                                                Reset password
                                            </button>
                                            <button className="lnk" disabled={busyId === l.id} onClick={() => toggleActive(l)}>
                                                {l.isActive ? 'Deactivate' : 'Reactivate'}
                                            </button>
                                            {l.isActive && (
                                                <button className="lnk" disabled={busyId === l.id} onClick={() => makeAdmin(l)}>
                                                    Make administrator
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}