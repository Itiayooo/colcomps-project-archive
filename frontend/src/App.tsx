import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ArchivePage from './pages/ArchivePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import NotFoundPage from './pages/NotFoundPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProjectFormPage from './pages/ProjectFormPage';
import MyProjectsPage from './pages/MyProjectsPage';
import ReviewQueuePage from './pages/ReviewQueuePage';
import ReviewDetailPage from './pages/ReviewDetailPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ArchivePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ChangePasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={['student']} guestRedirect="/register" />}>
          <Route path="/submit" element={<ProjectFormPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={['student']} />}>
          <Route path="/my-projects" element={<MyProjectsPage />} />
          <Route path="/my-projects/:id/edit" element={<ProjectFormPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={['supervisor']} />}>
          <Route path="/review" element={<ReviewQueuePage />} />
          <Route path="/review/:id" element={<ReviewDetailPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}