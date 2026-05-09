import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<'/api/reservations/[id]/release'>
) {
  const { id } = await ctx.params

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

  const [released] = await prisma.$transaction([
    prisma.reservation.update({
      where: { id },
      data: { status: 'RELEASED' },
    }),
    // only decrement reserved — total stays the same (units return to available)
    prisma.stock.update({
      where: {
        productId_warehouseId: {
          productId: reservation.productId,
          warehouseId: reservation.warehouseId,
        },
      },
      data: {
        reserved: { decrement: reservation.quantity },
      },
    }),
  ])

  return Response.json(released)
}
