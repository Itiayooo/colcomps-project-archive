import { useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { User } from '../types';
import { AuthContext, type RegisterInput } from './auth-context';

export default function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api
            .get<{ user: User }>('/auth/me')
            .then((d) => setUser(d.user))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    async function login(identifier: string, password: string) {
        const d = await api.post<{ user: User }>('/auth/login', { identifier, password });
        setUser(d.user);
        return d.user;
    }

    async function register(input: RegisterInput) {
        const d = await api.post<{ user: User }>('/auth/register', input);
        setUser(d.user);
        return d.user;
    }

    async function logout() {
        await api.post('/auth/logout');
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
            {children}
        </AuthContext.Provider>
    );
}