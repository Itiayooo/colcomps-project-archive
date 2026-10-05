import { createContext } from 'react';
import type { User } from '../types';

export interface RegisterInput {
    name: string;
    email: string;
    matricNo: string;
    department: string;
    password: string;
}

export interface AuthState {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<User>;
    register: (input: RegisterInput) => Promise<User>;
    logout: () => Promise<void>;
    setUser: (user: User | null) => void;
}

export const AuthContext = createContext<AuthState | null>(null);