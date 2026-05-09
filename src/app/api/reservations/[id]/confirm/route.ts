import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getIdempotentResponse, saveIdempotentResponse } from '@/lib/idempotency'

const ENDPOINT = 'POST /api/reservations/[id]/confirm'

export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/reservations/[id]/confirm'>
) {
  const { id } = await ctx.params
  const idempotencyKey = req.headers.get('Idempotency-Key')

  if (idempotencyKey) {
    const cached = await getIdempotentResponse(idempotencyKey, ENDPOINT)
    if (cached) {
      return Response.json(cached.responseBody, { status: cached.statusCode })
    }
  }

  const reservation = await prisma.reservation.findUnique({ where: { id } })

  if (!reservation) {
    return Response.json({ error: 'Reservation not found.' }, { status: 404 })
  }

  if (reservation.status !== 'PENDING') {
    return Response.json(
      { error: `Reservation is already ${reservation.status.toLowerCase()}.` },
      { status: 400 }
    )
  }

  if (reservation.expiresAt < new Date()) {
    return Response.json({ error: 'Reservation has expired.' }, { status: 410 })
  }

  const [confirmed] = await prisma.$transaction([
    prisma.reservation.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    }),
    prisma.stock.update({
      where: {
        productId_warehouseId: {
          productId: reservation.productId,
          warehouseId: reservation.warehouseId,
        },
      },
      data: {
        reserved: { decrement: reservation.quantity },
        total: { decrement: reservation.quantity },
      },
    }),
  ])

  if (idempotencyKey) {
    await saveIdempotentResponse(idempotencyKey, ENDPOINT, 200, confirmed, id)
  }

  return Response.json(confirmed)
}
