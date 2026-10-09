import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { formalName } from '../../lib/names';
import type { AdminUser } from '../../types';

interface Credentials {
    name: string;
    email: string;
    tempPassword: string;
}

export default function AdminsTab() {
    const [admins, setAdmins] = useState<AdminUser[] | null>(null);
    const [form, setForm] = useState({ title: '', name: '', email: '' });
    const [creds, setCreds] = useState<Credentials | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [busyId, setBusyId] = useState('');

    const load = useCallback(async () => {
        try {
            const d = await api.get<{ admins: AdminUser[] }>('/admin/admins');
            setAdmins(d.admins);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load administrators');
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
        setBusy(true);
        try {
            const d = await api.post<{ admin: AdminUser; tempPassword: string }>('/admin/admins', {
                ...form,
                title: form.title || undefined,
            });
            showCreds({ name: formalName(d.admin), email: d.admin.email, tempPassword: d.tempPassword });
            setForm({ title: '', name: '', email: '' });
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not add the administrator');
        } finally {
            setBusy(false);
        }
    }

    async function toggleActive(a: AdminUser) {
        if (!window.confirm(`${a.isActive ? 'Deactivate' : 'Reactivate'} ${formalName(a)}?`)) return;
        setError('');
        setBusyId(a.id);
        try {
            await api.patch(`/admin/admins/${a.id}/status`, { isActive: !a.isActive });
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not update the administrator');
        } finally {
            setBusyId('');
        }
    }

    async function resetPassword(a: AdminUser) {
        if (!window.confirm(`Reset the password for ${formalName(a)}? Their current password will stop working.`)) return;
        setError('');
        setBusyId(a.id);
        try {
            const d = await api.post<{ tempPassword: string }>(`/admin/admins/${a.id}/reset-password`);
            showCreds({ name: formalName(a), email: a.email, tempPassword: d.tempPassword });
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not reset the password');
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
                        Copy this now and send it over. It will not be shown again. They choose a new password when they first log in.
                    </p>
                    <p style={{ display: 'flex', gap: 16 }}>
                        <button className="lnk" onClick={copyCreds}>{copied ? 'Copied' : 'Copy login details'}</button>
                        <button className="lnk" onClick={() => setCreds(null)}>Dismiss</button>
                    </p>
                </div>
            )}

            {error && <p className="error" role="alert">{error}</p>}

            <h2 className="sh">Add an administrator</h2>
            <form className="row-form" style={{ gridTemplateColumns: '110px 1fr 1fr auto' }} onSubmit={handleCreate}>
                <div className="f">
                    <label htmlFor="a-title">Title</label>
                    <select id="a-title" className="inp" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}>
                        <option value="">None</option>
                        {['Prof.', 'Dr.', 'Engr.', 'Mr.', 'Mrs.', 'Miss'].map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="f">
                    <label htmlFor="a-name">Full name (without title)</label>
                    <input id="a-name" className="inp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="f">
                    <label htmlFor="a-email">Email</label>
                    <input id="a-email" className="inp" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <button className="btn" type="submit" disabled={busy}>{busy ? 'Adding...' : 'Add administrator'}</button>
            </form>

            <h2 className="sh">All administrators</h2>
            {admins === null && !error && <p style={{ color: 'var(--mute)' }}>Loading...</p>}
            {admins && (
                <div style={{ overflowX: 'auto' }}>
                    <table>
                        <thead><tr><th>Administrator</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            {admins.map((a) => (
                                <tr key={a.id}>
                                    <td><b>{formalName(a)}</b>{a.isYou && ' (you)'}<div className="id">{a.email}</div></td>
                                    <td>
                                        {!a.isActive ? <span className="rev">Deactivated</span>
                                            : a.mustChangePassword ? <span className="wait">Has not set a password yet</span>
                                                : <span className="ok">Active</span>}
                                    </td>
                                    <td>
                                        {a.isYou ? (
                                            <span style={{ color: 'var(--mute)' }}>Use Change password in the header</span>
                                        ) : (
                                            <div className="acts">
                                                <button className="lnk" disabled={busyId === a.id} onClick={() => resetPassword(a)}>Reset password</button>
                                                <button className="lnk" disabled={busyId === a.id} onClick={() => toggleActive(a)}>
                                                    {a.isActive ? 'Deactivate' : 'Reactivate'}
                                                </button>
                                            </div>
                                        )}
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