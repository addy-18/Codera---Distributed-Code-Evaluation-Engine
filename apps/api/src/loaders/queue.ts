import { Queue } from 'bullmq';
import config from '@codera/config';

// Parse Redis URL for BullMQ connection config
function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port, 10) || 6379,
    password: parsed.password || undefined,
    maxRetriesPerRequest: null as null,
  };
}

/**
 * BullMQ Queue — API only enqueues, never consumes.
 */
export const submissionQueue = new Queue('submission-queue', {
  connection: parseRedisUrl(config.redisUrl),
});

export default submissionQueue;
