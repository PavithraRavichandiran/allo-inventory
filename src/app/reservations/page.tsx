import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { expireReservations } from '@/lib/expireReservations'

export const dynamic = 'force-dynamic'

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  RELEASED: 'bg-gray-100 text-gray-500',
}

function formatExpiry(expiresAt: Date, status: string) {
  if (status !== 'PENDING') return '—'
  const diff = expiresAt.getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const mins = Math.floor(diff / 60000)
  const secs = Math.floor((diff % 60000) / 1000)
  return `${mins}m ${secs}s`
}

export default async function ReservationsPage() {
  await expireReservations()

  const reservations = await prisma.reservation.findMany({
    include: { product: true, warehouse: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">All Reservations</h1>
          <p className="text-sm text-gray-500 mt-0.5">{reservations.length} total</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 rounded-lg border text-sm font-medium transition-colors"
          style={{ color: '#572AC8', borderColor: '#572AC8' }}
        >
          Back to Products
        </Link>
      </div>

      {reservations.length === 0 ? (
        <p className="text-gray-400 text-sm">No reservations yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-200">
                <th className="pb-3 font-medium">Product</th>
                <th className="pb-3 font-medium">Warehouse</th>
                <th className="pb-3 font-medium">Qty</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Expires in</th>
                <th className="pb-3 font-medium">Reserved at</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="py-3 font-medium">{r.product.name}</td>
                  <td className="py-3">
                    <span>{r.warehouse.name}</span>
                    <span className="ml-1 text-xs text-gray-400">{r.warehouse.location}</span>
                  </td>
                  <td className="py-3">{r.quantity}</td>
                  <td className="py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[r.status]}`}>
                      {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="py-3 tabular-nums text-gray-500">
                    {formatExpiry(r.expiresAt, r.status)}
                  </td>
                  <td className="py-3 text-gray-400">
                    {new Date(r.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="py-3 text-right">
                    {r.status === 'PENDING' && (
                      <Link
                        href={`/reservations/${r.id}`}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                        style={{ color: '#572AC8', borderColor: '#572AC8' }}
                      >
                        View
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
