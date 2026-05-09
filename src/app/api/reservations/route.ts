import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { acquireLock, releaseLock } from '@/lib/redis'
import { ReserveRequestSchema } from '@/lib/schemas'
import { getIdempotentResponse, saveIdempotentResponse } from '@/lib/idempotency'

const ENDPOINT = 'POST /api/reservations'

export async function POST(request: Request) {
  const idempotencyKey = request.headers.get('Idempotency-Key')

  if (idempotencyKey) {
    const cached = await getIdempotentResponse(idempotencyKey, ENDPOINT)
    if (cached) {
      return Response.json(cached.responseBody, { status: cached.statusCode })
    }
  }

  const body = await request.json()
  const parsed = ReserveRequestSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json({ error: z.flattenError(parsed.error) }, { status: 400 })
  }

  const { productId, warehouseId, quantity } = parsed.data
  const lockKey = `lock:stock:${productId}:${warehouseId}`

  const acquired = await acquireLock(lockKey)
  if (!acquired) {
    return Response.json(
      { error: 'Server busy, please retry in a moment.' },
      { status: 503 }
    )
  }

  try {
    const stock = await prisma.stock.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
    })

    const available = stock ? stock.total - stock.reserved : 0

    if (available < quantity) {
      return Response.json(
        { error: 'Not enough stock available.' },
        { status: 409 }
      )
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    const [reservation] = await prisma.$transaction([
      prisma.reservation.create({
        data: { productId, warehouseId, quantity, expiresAt },
      }),
      prisma.stock.update({
        where: { productId_warehouseId: { productId, warehouseId } },
        data: { reserved: { increment: quantity } },
      }),
    ])

    if (idempotencyKey) {
      await saveIdempotentResponse(idempotencyKey, ENDPOINT, 201, reservation, reservation.id)
    }

    return Response.json(reservation, { status: 201 })
  } finally {
    await releaseLock(lockKey)
  }
}
