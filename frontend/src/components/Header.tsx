import { Link, NavLink } from 'react-router-dom';

export default function Header() {
    return (
        <header className="site">
            <div className="wrap bar">
                <Link to="/" className="brand">
                    <b>COLCOMPS Project Archive</b>
                    <span>College of Computing Sciences</span>
                </Link>
                <nav className="main">
                    <NavLink to="/" end>Browse</NavLink>
                    <NavLink to="/submit">Submit a project</NavLink>
                </nav>
            </div>
        </header>
    );
}