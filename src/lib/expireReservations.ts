import { prisma } from './prisma'

export async function expireReservations(): Promise<number> {
  const expired = await prisma.reservation.findMany({
    where: { status: 'PENDING', expiresAt: { lt: new Date() } },
    select: { id: true, productId: true, warehouseId: true, quantity: true },
  })

  if (expired.length === 0) return 0

  // aggregate quantity to return per (productId, warehouseId) pair
  const stockReturns = new Map<
    string,
    { productId: string; warehouseId: string; quantity: number }
  >()

  for (const r of expired) {
    const key = `${r.productId}:${r.warehouseId}`
    const entry = stockReturns.get(key)
    if (entry) {
      entry.quantity += r.quantity
    } else {
      stockReturns.set(key, {
        productId: r.productId,
        warehouseId: r.warehouseId,
        quantity: r.quantity,
      })
    }
  }

  await prisma.$transaction([
    prisma.reservation.updateMany({
      where: { id: { in: expired.map((r) => r.id) } },
      data: { status: 'RELEASED' },
    }),
    ...Array.from(stockReturns.values()).map(({ productId, warehouseId, quantity }) =>
      prisma.stock.update({
        where: { productId_warehouseId: { productId, warehouseId } },
        data: { reserved: { decrement: quantity } },
      })
    ),
  ])

  return expired.length
}
