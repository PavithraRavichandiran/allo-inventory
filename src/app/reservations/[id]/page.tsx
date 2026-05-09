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

  return (
    <ReservationCheckout
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
