export default function ArchivePage() {
    return (
        <section className="hero">
            <div className="wrap">
                <h1>Final year projects from the College of Computing Sciences</h1>
                <p>Search by title, topic, student or matric number.</p>
                <div className="search">
                    <input aria-label="Search the archive" placeholder="Search projects" />
                    <button>Search</button>
                </div>
            </div>
        </section>
    );
}