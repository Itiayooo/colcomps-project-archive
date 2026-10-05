import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import departmentRoutes from './routes/department.routes';
import adminRoutes from './routes/admin.routes';
import projectRoutes from './routes/project.routes';
import reviewRoutes from './routes/review.routes';
import { notFound, errorHandler } from './middleware/error.middleware';
import helmet from 'helmet';

const app = express();
app.set('trust proxy', 1);
app.use(helmet());

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/review', reviewRoutes);

app.use(notFound);
app.use(errorHandler);



export default app;