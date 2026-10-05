import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { homePath } from '../lib/roles';
import type { User } from '../types';

export default function ChangePasswordPage() {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();

    const [currentPassword, setCurrent] = useState('');
    const [newPassword, setNew] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');
        if (newPassword !== confirm) {
            setError('The two new passwords do not match');
            return;
        }
        setBusy(true);
        try {
            const d = await api.patch<{ user: User }>('/auth/change-password', { currentPassword, newPassword });
            setUser(d.user);
            navigate(homePath(d.user.role), { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not change your password');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="wrap page">
            <form className="form" onSubmit={handleSubmit}>
                <h1 className="pg">Change your password</h1>
                <p style={{ color: 'var(--mute)', marginBottom: 24 }}>
                    {user?.mustChangePassword
                        ? 'Choose a new password before you continue. Use the temporary password you were given as the current one.'
                        : 'Enter your current password and choose a new one.'}
                </p>

                {error && <p className="error" role="alert">{error}</p>}

                <div className="f">
                    <label htmlFor="current">Current password</label>
                    <input id="current" className="inp" type="password" value={currentPassword}
                        onChange={(e) => setCurrent(e.target.value)} required autoFocus />
                </div>
                <div className="f">
                    <label htmlFor="new">New password</label>
                    <input id="new" className="inp" type="password" minLength={8} value={newPassword}
                        onChange={(e) => setNew(e.target.value)} required />
                    <small>At least 8 characters</small>
                </div>
                <div className="f">
                    <label htmlFor="confirm">Confirm new password</label>
                    <input id="confirm" className="inp" type="password" value={confirm}
                        onChange={(e) => setConfirm(e.target.value)} required />
                </div>

                <button className="btn" type="submit" disabled={busy}>
                    {busy ? 'Saving...' : 'Save password'}
                </button>
            </form>
        </div>
    );
}