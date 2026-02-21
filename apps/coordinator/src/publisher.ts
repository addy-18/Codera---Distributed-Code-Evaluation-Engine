import Redis from 'ioredis';
import config from '@codera/config';
import type { SubmissionEvent } from '@codera/types';

let publisherClient: Redis | null = null;

function getPublisher(): Redis {
  if (!publisherClient) {
    publisherClient = new Redis(config.redisUrl);
    publisherClient.on('error', (err) =>
      console.error('[Publisher] Redis error:', err.message)
    );
  }
  return publisherClient;
}

/**
 * Publish a submission event to Redis Pub/Sub.
 *
 * Channel: `submission:{submissionId}`
 *
 * The API server subscribes to these channels and forwards events
 * to connected WebSocket clients.
 */
export async function publishSubmissionEvent(
  submissionId: string,
  event: SubmissionEvent
): Promise<void> {
  const channel = `submission:${submissionId}`;
  const message = JSON.stringify(event);

  await getPublisher().publish(channel, message);
  console.log(`[Publisher] Published ${event.type} to ${channel}`);
}

export async function shutdown(): Promise<void> {
  if (publisherClient) {
    await publisherClient.quit();
    publisherClient = null;
  }
}
