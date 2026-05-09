import { prisma } from '@/lib/prisma'
import { acquireLock, releaseLock } from '@/lib/redis'
import { ReserveRequestSchema } from '@/lib/schemas'

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = ReserveRequestSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
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

    return Response.json(reservation, { status: 201 })
  } finally {
    await releaseLock(lockKey)
  }
}
