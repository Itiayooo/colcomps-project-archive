import { Project } from '../models/project.model';
import { User } from '../models/user.model';
import { sendMail } from './mail';
import { formalName, shortName } from './names';

const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function wrap(body: string) {
    return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#18212b">${body}<p style="color:#5f6b78;font-size:13px">COLCOMPS Project Archive</p></div>`;
}

function button(href: string, label: string) {
    return `<p><a href="${href}" style="display:inline-block;background:#1b4f9c;color:#fff;padding:10px 16px;text-decoration:none;border-radius:2px">${label}</a></p>`;
}

async function deliver(to: { email: string; name: string }, subject: string, html: string) {
    if (/@example\.com$/i.test(to.email)) return;
    await sendMail(to, subject, html);
}

export function notifySupervisor(projectId: string, resubmitted = false) {
    (async () => {
        const project = await Project.findById(projectId);
        if (!project) return;
        const [supervisor, student] = await Promise.all([
            User.findById(project.supervisor),
            User.findById(project.student),
        ]);
        if (!supervisor || !supervisor.isActive) return;

        const link = `${process.env.CLIENT_URL}/review/${project._id}`;
        await deliver(
            { email: supervisor.email, name: supervisor.name },
            resubmitted ? 'A project was resubmitted for your review' : 'A new project is waiting for your review',
            wrap(`<p>Hello ${esc(supervisor.name)},</p>
        <p>${esc(student?.name ?? 'A student')} ${resubmitted ? 'resubmitted' : 'submitted'} <b>${esc(project.title)}</b> for your review.</p>
        ${button(link, 'Review the project')}`)
        );
    })().catch((err) => console.error('Could not send notification:', err));
}

export function notifyStudent(projectId: string) {
    (async () => {
        const project = await Project.findById(projectId);
        if (!project) return;
        const [student, supervisor] = await Promise.all([
            User.findById(project.student),
            User.findById(project.supervisor),
        ]);
        if (!student) return;

        const base = process.env.CLIENT_URL;
        const copy = {
            approved: {
                subject: 'Your project was approved',
                intro: 'was approved and is now in the public archive.',
                link: `${base}/projects/${project._id}`,
                label: 'View in the archive',
            },
            revisions_requested: {
                subject: 'Your project needs revisions',
                intro: 'was sent back for revisions.',
                link: `${base}/my-projects`,
                label: 'See feedback and resubmit',
            },
            rejected: {
                subject: 'Your project was not accepted',
                intro: 'was not accepted.',
                link: `${base}/my-projects`,
                label: 'See feedback',
            },
        } as const;
        const c = copy[project.status as keyof typeof copy];
        if (!c) return;

        const note = project.reviewNote
            ? `<p><b>Feedback from ${esc(supervisor?.name ?? 'your supervisor')}:</b><br>${esc(project.reviewNote)}</p>`
            : '';

        await deliver(
            { email: student.email, name: student.name },
            c.subject,
            wrap(`<p>Hello ${esc(student.name)},</p>
        <p>Your project <b>${esc(project.title)}</b> ${c.intro}</p>
        ${note}
        ${button(c.link, c.label)}`)
        );
    })().catch((err) => console.error('Could not send notification:', err));
}