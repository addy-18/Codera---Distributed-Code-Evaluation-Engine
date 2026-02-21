import dotenv from 'dotenv';
import path from 'path';

// Load .env from the monorepo root
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  serverId: process.env.SERVER_ID || 'backend-1',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgres://codera:codera_password@localhost:5433/codera',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6380',

  // Judge0
  judge0Url: process.env.JUDGE0_URL || 'http://20.187.145.10:2358',
  coordinatorCallbackUrl: process.env.COORDINATOR_CALLBACK_URL || 'http://localhost:3001/callback',

  // Coordinator
  coordinatorPort: parseInt(process.env.COORDINATOR_PORT || '3001', 10),

  // Problems
  problemsBasePath: process.env.PROBLEMS_BASE_PATH || path.resolve(__dirname, '..', '..', '..', 'problems'),
} as const;

export type Config = typeof config;
export default config;
