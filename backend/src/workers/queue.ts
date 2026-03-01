import { Queue, QueueEvents } from 'bullmq';
import { config } from '../config';

// Parse redis URL into host/port for BullMQ (avoids ioredis version conflicts)
function parseRedisUrl(url: string) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname || 'localhost',
      port: parseInt(u.port || '6379', 10),
      password: u.password || undefined,
      maxRetriesPerRequest: null as null, // required by BullMQ
    };
  } catch {
    return { host: 'localhost', port: 6379, maxRetriesPerRequest: null as null };
  }
}

export const redisConnection = parseRedisUrl(config.redis.url);

const queueOpts = { connection: redisConnection };

// ─── QUEUES ──────────────────────────────────────────────────────────────────

export const analysisQueue = new Queue('analysis', queueOpts);
export const analysisQueueEvents = new QueueEvents('analysis', queueOpts);

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export async function enqueueAnalysis(analysisId: string, companyId: string, userId: string) {
  await analysisQueue.add(
    'run-analysis',
    { analysisId, companyId, userId },
    {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  );
}

export async function pingRedis(): Promise<boolean> {
  try {
    await analysisQueue.client.then((c) => c.ping());
    return true;
  } catch {
    return false;
  }
}
