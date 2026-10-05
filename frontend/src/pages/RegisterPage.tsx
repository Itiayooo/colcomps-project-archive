import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

interface Department {
    _id: string;
    name: string;
}

export default function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const from = (useLocation().state as { from?: string } | null)?.from;

    const [departments, setDepartments] = useState<Department[]>([]);
    const [form, setForm] = useState({ name: '', email: '', matricNo: '', department: '', password: '' });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        api
            .get<{ departments: Department[] }>('/departments')
            .then((d) => setDepartments(d.departments))
            .catch(() => setError('Could not load departments. Refresh the page.'));
    }, []);

    function set(field: keyof typeof form, value: string) {
        setForm((f) => ({ ...f, [field]: value }));
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            await register(form);
            navigate(from ?? '/submit', { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not create your account');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="wrap page">
            <form className="form" onSubmit={handleSubmit}>
                <h1 className="pg">Create a student account</h1>
                <p style={{ color: 'var(--mute)', marginBottom: 24 }}>
                    You need an account to submit a project and follow its review.
                </p>

                {error && <p className="error" role="alert">{error}</p>}

                <div className="f">
                    <label htmlFor="name">Full name</label>
                    <input id="name" className="inp" value={form.name}
                        onChange={(e) => set('name', e.target.value)} required autoFocus />
                </div>
                <div className="two">
                    <div className="f">
                        <label htmlFor="matric">Matric number</label>
                        <input id="matric" className="inp" inputMode="numeric" maxLength={8} value={form.matricNo}
                            onChange={(e) => set('matricNo', e.target.value.replace(/\D/g, ''))} required />
                        <small>8 digits, like 20234532</small>
                    </div>
                    <div className="f">
                        <label htmlFor="department">Department</label>
                        <select id="department" className="inp" value={form.department}
                            onChange={(e) => set('department', e.target.value)} required>
                            <option value="" disabled>Choose department</option>
                            {departments.map((d) => (
                                <option key={d._id} value={d.name}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="f">
                    <label htmlFor="email">Email</label>
                    <input id="email" className="inp" type="email" value={form.email}
                        onChange={(e) => set('email', e.target.value)} required />
                </div>
                <div className="f">
                    <label htmlFor="password">Password</label>
                    <input id="password" className="inp" type="password" minLength={8} value={form.password}
                        onChange={(e) => set('password', e.target.value)} required />
                    <small>At least 8 characters</small>
                </div>

                <button className="btn" type="submit" disabled={busy}>
                    {busy ? 'Creating account...' : 'Create account'}
                </button>

                <p style={{ marginTop: 20, fontSize: 14 }}>
                    Already have an account? <Link className="lnk" to="/login" state={{ from }}>Log in</Link>
                </p>
            </form>
        </div>
    );
}