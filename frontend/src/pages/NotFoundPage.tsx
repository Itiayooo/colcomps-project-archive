import { Link } from 'react-router-dom';

export default function NotFoundPage() {
    return (
        <div className="wrap page">
            <h1 className="pg">Page not found</h1>
            <p>
                The page you are looking for does not exist. <Link className="lnk" to="/">Back to the archive</Link>
            </p>
        </div>
    );
}