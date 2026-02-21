import express from 'express';
import cors from 'cors';
import { submissionRouter, problemRouter } from './routes'
import { errorHandler } from './middleware/errorHandler';
import config from '@codera/config';

const app = express();

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (config.nodeEnv === 'development') {
  app.use((req, _res, next) => {
    console.log(`[HTTP] ${req.method} ${req.path}`);
    next();
  });
}

// ── Health Check ──
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    serverId: config.serverId,
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ──
app.use('/submissions', submissionRouter);
app.use('/problems', problemRouter);

// ── 404 ──
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error Handler ──
app.use(errorHandler);

export default app;
