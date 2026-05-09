import { prisma } from '@/lib/prisma'
import { expireReservations } from '@/lib/expireReservations'

export async function GET() {
  await expireReservations()
  const products = await prisma.product.findMany({
    include: {
      stocks: {
        include: { warehouse: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  const response = products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    imageUrl: product.imageUrl,
    stocks: product.stocks.map((stock) => ({
      warehouseId: stock.warehouseId,
      warehouseName: stock.warehouse.name,
      warehouseLocation: stock.warehouse.location,
      total: stock.total,
      reserved: stock.reserved,
      available: stock.total - stock.reserved,
    })),
  }))

  return Response.json(response)
}
