import { useState } from 'react';
import LecturersTab from '../components/admin/LecturersTab';
import DepartmentsTab from '../components/admin/DepartmentsTab';
import ProjectsTab from '../components/admin/ProjectsTab';
import AdminsTab from '../components/admin/AdminsTab';

const TABS = [
    { key: 'lecturers', label: 'Lecturers' },
    { key: 'projects', label: 'Projects' },
    { key: 'admins', label: 'Administrators' },
    { key: 'departments', label: 'Departments' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function AdminPage() {
    const [tab, setTab] = useState<TabKey>('lecturers');

    return (
        <div className="wrap page">
            <h1 className="pg">Administration</h1>

            <div className="tabs">
                {TABS.map((t) => (
                    <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'lecturers' && <LecturersTab />}
            {tab === 'projects' && <ProjectsTab />}
            {tab === 'admins' && <AdminsTab />}
            {tab === 'departments' && <DepartmentsTab />}
        </div>
    );
}