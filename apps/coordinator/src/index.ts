import express from 'express';
import cors from 'cors';
import config from '@codera/config';
import { startWorker } from './worker';
import { callbackRouter } from './callback';

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ── Health Check ──
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'coordinator',
    timestamp: new Date().toISOString(),
  });
});

// ── Callback endpoint — Judge0 calls this after each testcase ──
app.use(callbackRouter);

// ── 404 ──
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Start ──
const server = app.listen(config.coordinatorPort, async () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║              Codera Coordinator Started                   ║
╠══════════════════════════════════════════════════════════╣
║  Port:         ${String(config.coordinatorPort).padEnd(40)}║
║  Judge0:       ${config.judge0Url.padEnd(40)}║
║  Callback:     ${config.coordinatorCallbackUrl.padEnd(40)}║
╚══════════════════════════════════════════════════════════╝
  `);

  // Start BullMQ worker
  startWorker();
});

// ── Graceful Shutdown ──
async function shutdown() {
  console.log('[Coordinator] Shutting down...');
  server.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;
