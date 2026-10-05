import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ArchivePage from './pages/ArchivePage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ArchivePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}