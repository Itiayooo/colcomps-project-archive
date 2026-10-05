import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { homePath } from '../lib/roles';
import type { Role } from '../types';

interface Props {
    roles?: Role[];
    guestRedirect?: string;
}

export default function ProtectedRoute({ roles, guestRedirect = '/login' }: Props) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="wrap page">
                <p style={{ color: 'var(--mute)' }}>Loading...</p>
            </div>
        );
    }
    if (!user) {
        return <Navigate to={guestRedirect} replace state={{ from: location.pathname }} />;
    }
    if (user.mustChangePassword && location.pathname !== '/change-password') {
        return <Navigate to="/change-password" replace />;
    }
    if (roles && !roles.includes(user.role)) {
        return <Navigate to={homePath(user.role)} replace />;
    }
    return <Outlet />;
}