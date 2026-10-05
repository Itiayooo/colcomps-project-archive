import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { homePath } from '../lib/roles';

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const from = (useLocation().state as { from?: string } | null)?.from;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            const user = await login(email, password);
            if (user.mustChangePassword) navigate('/change-password', { replace: true });
            else navigate(from ?? homePath(user.role), { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not log in');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="wrap page">
            <form className="form" onSubmit={handleSubmit}>
                <h1 className="pg">Log in</h1>
                <p style={{ color: 'var(--mute)', marginBottom: 24 }}>
                    Students, lecturers and administrators log in here.
                </p>

                {error && <p className="error" role="alert">{error}</p>}

                <div className="f">
                    <label htmlFor="email">Email</label>
                    <input id="email" className="inp" type="email" value={email}
                        onChange={(e) => setEmail(e.target.value)} required autoFocus />
                </div>
                <div className="f">
                    <label htmlFor="password">Password</label>
                    <input id="password" className="inp" type="password" value={password}
                        onChange={(e) => setPassword(e.target.value)} required />
                </div>

                <button className="btn" type="submit" disabled={busy}>
                    {busy ? 'Logging in...' : 'Log in'}
                </button>

                <p style={{ marginTop: 20, fontSize: 14 }}>
                    New student? <Link className="lnk" to="/register" state={{ from }}>Create an account</Link>
                </p>
            </form>
        </div>
    );
}