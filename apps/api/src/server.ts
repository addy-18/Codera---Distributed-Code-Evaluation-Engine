import http from 'http';
import config from '@codera/config';
import app from './app';
import { setupWebSocket } from './utils/websocket';
import { redis } from './loaders/redis';

const server = http.createServer(app);

// Attach WebSocket server
setupWebSocket(server);

// Start
server.listen(config.port, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║              Codera API Server Started                   ║
╠══════════════════════════════════════════════════════════╣
║  Server ID:    ${config.serverId.padEnd(40)}║
║  HTTP Port:    ${String(config.port).padEnd(40)}║
║  WebSocket:    ws://localhost:${config.port}/ws${' '.repeat(24)}║
║  Environment:  ${config.nodeEnv.padEnd(40)}║
╚══════════════════════════════════════════════════════════╝
  `);
});

// ── Graceful Shutdown ──
async function shutdown() {
  console.log('[Server] Shutting down...');
  server.close();
  await redis.quit();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default server;
