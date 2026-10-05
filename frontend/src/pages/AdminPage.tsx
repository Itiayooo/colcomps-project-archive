import { useState } from 'react';
import LecturersTab from '../components/admin/LecturersTab';
import DepartmentsTab from '../components/admin/DepartmentsTab';

export default function AdminPage() {
    const [tab, setTab] = useState<'lecturers' | 'departments'>('lecturers');

    return (
        <div className="wrap page">
            <h1 className="pg">Administration</h1>

            <div className="tabs">
                <button className={tab === 'lecturers' ? 'on' : ''} onClick={() => setTab('lecturers')}>Lecturers</button>
                <button className={tab === 'departments' ? 'on' : ''} onClick={() => setTab('departments')}>Departments</button>
            </div>

            {tab === 'lecturers' ? <LecturersTab /> : <DepartmentsTab />}
        </div>
    );
}