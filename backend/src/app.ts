import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import departmentRoutes from './routes/department.routes';
import adminRoutes from './routes/admin.routes';
import projectRoutes from './routes/project.routes';
import reviewRoutes from './routes/review.routes';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/review', reviewRoutes);

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});

export default app;