import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import departmentRoutes from './routes/department.routes';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);


app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});

export default app;