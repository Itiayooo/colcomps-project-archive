import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            await api.post('/auth/forgot-password', { email });
            setSent(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setBusy(false);
        }
    }

    if (sent) {
        return (
            <div className="wrap page">
                <div className="form">
                    <h1 className="pg">Check your email</h1>
                    <p style={{ marginTop: 12 }}>
                        If an account exists for <b>{email}</b>, we have sent a link to reset your password. It expires in 1 hour.
                    </p>
                    <p style={{ marginTop: 12, color: 'var(--mute)' }}>
                        Nothing in your inbox after a few minutes? Check your spam folder.
                    </p>
                    <p style={{ marginTop: 20 }}><Link className="lnk" to="/login">Back to log in</Link></p>
                </div>
            </div>
        );
    }

    return (
        <div className="wrap page">
            <form className="form" onSubmit={handleSubmit}>
                <h1 className="pg">Forgot your password?</h1>
                <p style={{ color: 'var(--mute)', marginBottom: 24 }}>
                    Enter your email and we will send you a link to choose a new one.
                </p>

                {error && <p className="error" role="alert">{error}</p>}

                <div className="f">
                    <label htmlFor="email">Email</label>
                    <input id="email" className="inp" type="email" value={email}
                        onChange={(e) => setEmail(e.target.value)} required autoFocus />
                </div>

                <button className="btn" type="submit" disabled={busy}>
                    {busy ? 'Sending...' : 'Send reset link'}
                </button>

                <p style={{ marginTop: 20, fontSize: 14 }}>
                    <Link className="lnk" to="/login">Back to log in</Link>
                </p>
            </form>
        </div>
    );
}