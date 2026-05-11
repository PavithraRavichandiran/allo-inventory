import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ReservationCheckout from '@/app/components/ReservationCheckout'

export default async function ReservationPage(props: PageProps<'/reservations/[id]'>) {
  const { id } = await props.params

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { product: true, warehouse: true },
  })

  if (!reservation) notFound()

  const stock = await prisma.stock.findUnique({
    where: {
      productId_warehouseId: {
        productId: reservation.productId,
        warehouseId: reservation.warehouseId,
      },
    },
  })

  // Available extra = units not yet reserved (reservation already holds its own qty)
  const extraAvailable = stock ? stock.total - stock.reserved : 0
  const maxQuantity = reservation.quantity + extraAvailable

  return (
    <ReservationCheckout
      maxQuantity={maxQuantity}
      reservation={{
        id: reservation.id,
        quantity: reservation.quantity,
        status: reservation.status,
        expiresAt: reservation.expiresAt.toISOString(),
        product: {
          name: reservation.product.name,
          description: reservation.product.description,
          price: reservation.product.price,
        },
        warehouse: {
          name: reservation.warehouse.name,
          location: reservation.warehouse.location,
        },
      }}
    />
  )
}
