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

// Retry acquiring lock — waits for the current holder to finish then checks stock
export async function acquireLockWithRetry(
  key: string,
  ttlMs = 10_000,
  maxAttempts = 20,
  retryDelayMs = 150
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await acquireLock(key, ttlMs)) return true
    await new Promise((r) => setTimeout(r, retryDelayMs))
  }
  return false
}