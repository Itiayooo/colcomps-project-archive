import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { ArchiveFilters, Project } from '../types';

interface ListResponse {
    projects: Project[];
    total: number;
    page: number;
    pages: number;
}

const PAGE_SIZE = 10;

export default function ArchivePage() {
    const [filters, setFilters] = useState<ArchiveFilters | null>(null);
    const [data, setData] = useState<ListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [q, setQ] = useState('');
    const [department, setDepartment] = useState('');
    const [year, setYear] = useState('');
    const [supervisor, setSupervisor] = useState('');
    const [sort, setSort] = useState('new');
    const [page, setPage] = useState(1);

    useEffect(() => {
        api.get<ArchiveFilters>('/projects/filters').then(setFilters).catch(() => { });
    }, []);

    useEffect(() => {
        const t = setTimeout(() => {
            setQ(search.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        let cancelled = false;
        const params = new URLSearchParams({ sort, page: String(page), limit: String(PAGE_SIZE) });
        if (q) params.set('q', q);
        if (department) params.set('department', department);
        if (year) params.set('year', year);
        if (supervisor) params.set('supervisor', supervisor);

        api
            .get<ListResponse>(`/projects?${params}`)
            .then((d) => {
                if (cancelled) return;
                setData(d);
                setError('');
            })
            .catch((err) => {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load projects');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [q, department, year, supervisor, sort, page]);

    function pick(setter: (v: string) => void, value: string) {
        setter(value);
        setPage(1);
    }

    function clearAll() {
        setSearch('');
        setQ('');
        setDepartment('');
        setYear('');
        setSupervisor('');
        setPage(1);
    }

    function handleSearch(e: FormEvent) {
        e.preventDefault();
        setQ(search.trim());
        setPage(1);
    }

    const hasFilters = q || department || year || supervisor;
    const totalArchived = filters?.departments.reduce((n, d) => n + d.count, 0) ?? 0;

    return (
        <>
            <section className="hero">
                <div className="wrap">
                    <h1>Final year projects from the College of Computing Sciences</h1>
                    <p>
                        {totalArchived > 0 ? `${totalArchived} archived projects. ` : ''}
                        Search by title, topic, student or matric number.
                    </p>
                    <form className="search" onSubmit={handleSearch}>
                        <input
                            aria-label="Search the archive"
                            placeholder="Search projects"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <button type="submit">Search</button>
                    </form>
                </div>
            </section>

            <div className="wrap page">
                <div className="layout">
                    <aside>
                        <div className="fg">
                            <h2 className="sh">Department</h2>
                            <label className="chk">
                                <input type="radio" name="dept" checked={department === ''} onChange={() => pick(setDepartment, '')} />
                                All departments
                            </label>
                            {filters?.departments.map((d) => (
                                <label key={d.name} className="chk">
                                    <input
                                        type="radio"
                                        name="dept"
                                        checked={department === d.name}
                                        onChange={() => pick(setDepartment, d.name)}
                                    />
                                    {d.name}
                                    <i>{d.count}</i>
                                </label>
                            ))}
                        </div>

                        <div className="fg">
                            <h2 className="sh">Session</h2>
                            <select className="inp" value={year} onChange={(e) => pick(setYear, e.target.value)}>
                                <option value="">All sessions</option>
                                {filters?.years.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        <div className="fg">
                            <h2 className="sh">Supervisor</h2>
                            <select className="inp" value={supervisor} onChange={(e) => pick(setSupervisor, e.target.value)}>
                                <option value="">All supervisors</option>
                                {filters?.supervisors.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        {hasFilters && (
                            <button className="lnk" onClick={clearAll}>Clear all filters</button>
                        )}
                    </aside>

                    <div>
                        <div className="top">
                            <span>
                                {data ? `${data.total} ${data.total === 1 ? 'project' : 'projects'}` : 'Loading...'}
                            </span>
                            <label>
                                Sort by{' '}
                                <select value={sort} onChange={(e) => pick(setSort, e.target.value)}>
                                    <option value="new">Newest</option>
                                    <option value="downloads">Most downloaded</option>
                                    <option value="title">Title A to Z</option>
                                </select>
                            </label>
                        </div>

                        {error && <p className="error" style={{ marginTop: 16 }} role="alert">{error}</p>}

                        {!loading && !error && data?.projects.length === 0 && (
                            <div className="empty">
                                <p><b>{hasFilters ? 'No projects match your search.' : 'No projects have been archived yet.'}</b></p>
                                {hasFilters && (
                                    <p>
                                        Check the spelling, use fewer words, or{' '}
                                        <button className="lnk" onClick={clearAll}>clear the filters</button>.
                                    </p>
                                )}
                            </div>
                        )}

                        {data?.projects.map((p) => (
                            <article key={p._id} className="item">
                                <div className="yr">{p.year}</div>
                                <div>
                                    <h3><Link to={`/projects/${p._id}`}>{p.title}</Link></h3>
                                    <p className="by">{p.student?.name}</p>
                                    <p className="abs">{p.abstract}</p>
                                    <div className="meta">
                                        <span>{p.department}</span>
                                        {p.supervisor && <span>Supervisor: {p.supervisor.name}</span>}
                                        {p.pdfUrl && (
                                            <a className="lnk" href={`/api/projects/${p._id}/download`} target="_blank" rel="noreferrer">
                                                Download PDF
                                            </a>
                                        )}
                                        {p.githubUrl && <a className="lnk" href={p.githubUrl} target="_blank" rel="noreferrer">Source code</a>}
                                        {p.demoUrl && <a className="lnk" href={p.demoUrl} target="_blank" rel="noreferrer">Live demo</a>}
                                    </div>
                                </div>
                            </article>
                        ))}

                        {data && data.pages > 1 && (
                            <div className="pager">
                                <button className="lnk" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                                <span>Page {data.page} of {data.pages}</span>
                                <button className="lnk" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}