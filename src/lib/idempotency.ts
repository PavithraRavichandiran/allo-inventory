import { prisma } from './prisma'

type CachedResponse = { statusCode: number; responseBody: unknown }

export async function getIdempotentResponse(
  key: string,
  endpoint: string
): Promise<CachedResponse | null> {
  const record = await prisma.idempotencyKey.findUnique({ where: { key } })
  if (!record || record.endpoint !== endpoint) return null
  return { statusCode: record.statusCode, responseBody: record.responseBody }
}

export async function saveIdempotentResponse(
  key: string,
  endpoint: string,
  statusCode: number,
  responseBody: unknown,
  reservationId?: string
): Promise<void> {
  try {
    await prisma.idempotencyKey.create({
      data: {
        key,
        endpoint,
        statusCode,
        responseBody: responseBody as never,
        reservationId,
      },
    })
  } catch {
    // unique constraint violation — a concurrent request already stored it; safe to ignore
  }
}
