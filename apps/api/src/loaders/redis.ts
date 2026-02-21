import Redis from 'ioredis';
import config from '@codera/config';

export const redis = new Redis(config.redisUrl);

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

export default redis;
