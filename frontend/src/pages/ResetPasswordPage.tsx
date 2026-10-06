import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function ResetPasswordPage() {
    const [params] = useSearchParams();
    const token = params.get('token') ?? '';
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');
        if (newPassword !== confirm) {
            setError('The two passwords do not match');
            return;
        }
        setBusy(true);
        try {
            await api.post('/auth/reset-password', { token, newPassword });
            navigate('/login', { state: { notice: 'Your password was changed. Log in with your new password.' } });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not reset your password');
            setBusy(false);
        }
    }

    if (!token) {
        return (
            <div className="wrap page">
                <p>
                    This reset link is not valid. <Link className="lnk" to="/forgot-password">Request a new one</Link>
                </p>
            </div>
        );
    }

    return (
        <div className="wrap page">
            <form className="form" onSubmit={handleSubmit}>
                <h1 className="pg">Choose a new password</h1>

                {error && (
                    <p className="error" style={{ marginTop: 16 }} role="alert">
                        {error}{' '}
                        {error.includes('expired') && <Link className="lnk" to="/forgot-password">Request a new link</Link>}
                    </p>
                )}

                <div className="f" style={{ marginTop: 24 }}>
                    <label htmlFor="new">New password</label>
                    <input id="new" className="inp" type="password" minLength={8} value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)} required autoFocus />
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