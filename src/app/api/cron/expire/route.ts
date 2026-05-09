import { expireReservations } from '@/lib/expireReservations'

export async function GET() {
  const count = await expireReservations()
  return Response.json({ expired: count })
}
