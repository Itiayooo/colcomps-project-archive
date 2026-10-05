import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import type { Department } from '../../types';

export default function DepartmentsTab() {
    const [departments, setDepartments] = useState<Department[] | null>(null);
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const d = await api.get<{ departments: Department[] }>('/departments');
            setDepartments(d.departments);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not load departments');
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    async function handleAdd(e: FormEvent) {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            await api.post('/departments', { name });
            setName('');
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not add the department');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div style={{ maxWidth: 520 }}>
            {error && <p className="error" role="alert">{error}</p>}

            <h2 className="sh">Add a department</h2>
            <form onSubmit={handleAdd} style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
                <input className="inp" aria-label="Department name" value={name}
                    onChange={(e) => setName(e.target.value)} required />
                <button className="btn" type="submit" disabled={busy}>{busy ? 'Adding...' : 'Add'}</button>
            </form>

            <h2 className="sh">All departments</h2>
            {departments === null && !error && <p style={{ color: 'var(--mute)' }}>Loading...</p>}
            {departments && (
                <table>
                    <thead><tr><th>Name</th></tr></thead>
                    <tbody>
                        {departments.map((d) => (
                            <tr key={d._id}><td>{d.name}</td></tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}