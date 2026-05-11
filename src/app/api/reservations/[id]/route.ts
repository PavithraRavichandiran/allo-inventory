import { z } from 'zod'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { acquireLockWithRetry, releaseLock } from '@/lib/redis'

const UpdateQuantitySchema = z.object({
  quantity: z.number().int().positive(),
})

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<'/api/reservations/[id]'>
) {
  const { id } = await ctx.params
  const body = await req.json()
  const parsed = UpdateQuantitySchema.safeParse(body)

  if (!parsed.success) {
    return Response.json({ error: 'Invalid quantity.' }, { status: 400 })
  }

  const { quantity: newQuantity } = parsed.data

  const reservation = await prisma.reservation.findUnique({ where: { id } })

  if (!reservation) {
    return Response.json({ error: 'Reservation not found.' }, { status: 404 })
  }

  if (reservation.status !== 'PENDING') {
    return Response.json({ error: 'Only pending reservations can be updated.' }, { status: 400 })
  }

  if (reservation.expiresAt < new Date()) {
    return Response.json({ error: 'Reservation has expired.' }, { status: 410 })
  }

  if (newQuantity === reservation.quantity) {
    return Response.json(reservation)
  }

  const lockKey = `lock:stock:${reservation.productId}:${reservation.warehouseId}`
  const acquired = await acquireLockWithRetry(lockKey)
  if (!acquired) {
    return Response.json({ error: 'Server busy, please retry.' }, { status: 503 })
  }

  try {
    const stock = await prisma.stock.findUnique({
      where: {
        productId_warehouseId: {
          productId: reservation.productId,
          warehouseId: reservation.warehouseId,
        },
      },
    })

    const diff = newQuantity - reservation.quantity

    if (diff > 0) {
      const available = stock ? stock.total - stock.reserved : 0
      if (available < diff) {
        return Response.json({ error: 'Not enough stock available.' }, { status: 409 })
      }
    }

    const [updated] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id },
        data: { quantity: newQuantity },
      }),
      prisma.stock.update({
        where: {
          productId_warehouseId: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: { reserved: { increment: diff } },
      }),
    ])

    return Response.json(updated)
  } finally {
    await releaseLock(lockKey)
  }
}
