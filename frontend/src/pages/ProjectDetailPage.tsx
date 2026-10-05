import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import type { Project } from '../types';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ project: Project }>(`/projects/${id}`)
      .then((d) => {
        if (!cancelled) setProject(d.project);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof Error ? err.message : 'Could not load this project');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (notFound) {
    return (
      <div className="wrap page">
        <h1 className="pg">Project not found</h1>
        <p>
          It may have been removed, or it has not been approved yet.{' '}
          <Link className="lnk" to="/">Back to the archive</Link>
        </p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="wrap page">
        <p className="error" role="alert">{error}</p>
      </div>
    );
  }
  if (!project) {
    return (
      <div className="wrap page">
        <p style={{ color: 'var(--mute)' }}>Loading...</p>
      </div>
    );
  }

  const author = project.student?.name ?? 'Unknown author';
  const citation = `${author}, "${project.title}," B.Sc. dissertation, Dept. of ${project.department}, College of Computing Sciences, ${project.year}.`;
  const deposited = new Date(project.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  async function copyCitation() {
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="wrap page">
      <div className="crumb">
        <Link className="lnk" to="/">Browse</Link> / {project.department}
      </div>

      <h1 className="pg">{project.title}</h1>
      <p>{author}</p>

      <div className="art">
        <div>
          <h2>Abstract</h2>
          <p>{project.abstract}</p>

          <h2>Keywords</h2>
          <p>{project.keywords.join(', ')}</p>

          <h2>Cite this project</h2>
          <div className="cite">{citation}</div>
          <p style={{ marginTop: 8 }}>
            <button className="lnk" onClick={copyCitation}>
              {copied ? 'Copied' : 'Copy citation'}
            </button>
          </p>
        </div>

        <div>
          <div className="panel" style={{ marginBottom: 16, display: 'grid', gap: 10 }}>
            {project.pdfUrl ? (
              <a className="btn" href={`/api/projects/${project._id}/download`} target="_blank" rel="noreferrer">
                Download PDF
              </a>
            ) : (
              <p style={{ color: 'var(--mute)', fontSize: 14 }}>No PDF available for this project.</p>
            )}
            {project.githubUrl && (
              <a className="lnk" href={project.githubUrl} target="_blank" rel="noreferrer">Source code</a>
            )}
            {project.demoUrl && (
              <a className="lnk" href={project.demoUrl} target="_blank" rel="noreferrer">Live demo</a>
            )}
          </div>

          <dl className="panel">
            <dt>Department</dt>
            <dd>{project.department}</dd>
            {project.supervisor && (
              <>
                <dt>Supervisor</dt>
                <dd>{project.supervisor.name}</dd>
              </>
            )}
            <dt>Session</dt>
            <dd>{project.year}</dd>
            <dt>Deposited</dt>
            <dd>{deposited}</dd>
            <dt>Views and downloads</dt>
            <dd style={{ marginBottom: 0 }}>
              {project.views} views, {project.downloads} downloads
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
}