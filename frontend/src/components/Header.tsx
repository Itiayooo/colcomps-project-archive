import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { shortName } from '../lib/names';

export default function Header() {
    const { user, loading, logout } = useAuth();
    const navigate = useNavigate();

    async function handleLogout() {
        await logout();
        navigate('/');
    }

    return (
        <header className="site">
            <div className="wrap bar">
                <Link to="/" className="brand">
                    <b>COLCOMPS Project Archive</b>
                    <span>College of Computing Sciences</span>
                </Link>

                <nav className="main">
                    <NavLink to="/" end>Browse</NavLink>
                    {(!user || user.role === 'student') && <NavLink to="/submit">Submit a project</NavLink>}
                    {user?.role === 'student' && <NavLink to="/my-projects">My projects</NavLink>}
                    {user?.role === 'supervisor' && <NavLink to="/review">Review queue</NavLink>}
                    {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
                    {!loading &&
                        (user ? (
                            <>
                                <span className="who">{shortName(user)}</span>
                                <NavLink to="/change-password">Change password</NavLink>
                                <button className="lnk" onClick={handleLogout}>Log out</button>
                            </>
                        ) : (
                            <NavLink to="/login">Log in</NavLink>
                        ))}
                </nav>
            </div>
        </header>
    );
}