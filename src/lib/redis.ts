import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis?: Redis
}

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}

// Acquire distributed lock
export async function acquireLock(
  key: string,
  ttlMs = 10_000
): Promise<boolean> {
  const result = await redis.set(key, 'locked', 'PX', ttlMs, 'NX')

  return result === 'OK'
}

// Release distributed lock
export async function releaseLock(key: string): Promise<void> {
  await redis.del(key)
}