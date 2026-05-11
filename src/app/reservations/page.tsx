import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { expireReservations } from '@/lib/expireReservations'

export const dynamic = 'force-dynamic'

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-green-100',
  RELEASED: 'bg-slate-100 text-slate-500',
}

const STATUS_DOT = {
  PENDING: 'bg-amber-400',
  CONFIRMED: 'bg-green-500',
  RELEASED: 'bg-slate-400',
}

function formatExpiry(expiresAt: Date, status: string) {
  if (status !== 'PENDING') return null
  const diff = expiresAt.getTime() - Date.now()
  if (diff <= 0) return { text: 'Expired', urgent: true }
  const mins = Math.floor(diff / 60000)
  const secs = Math.floor((diff % 60000) / 1000)
  return { text: `${mins}m ${secs}s`, urgent: diff < 120_000 }
}

export default async function ReservationsPage() {
  await expireReservations()

  const reservations = await prisma.reservation.findMany({
    include: { product: true, warehouse: true },
    orderBy: { createdAt: 'desc' },
  })

  const pending = reservations.filter((r) => r.status === 'PENDING').length
  const confirmed = reservations.filter((r) => r.status === 'CONFIRMED').length
  const released = reservations.filter((r) => r.status === 'RELEASED').length

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#21143F' }}>All Reservations</h1>
          <p className="text-sm text-slate-500 mt-0.5">{reservations.length} total</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 rounded-lg border text-sm font-medium transition-colors"
          style={{ color: '#572AC8', borderColor: '#572AC8' }}
        >
          Back to Products
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-xs font-medium text-slate-500 mb-0.5">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{pending}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <p className="text-xs font-medium text-slate-500 mb-0.5">Confirmed</p>
          <p className="text-2xl font-bold" style={{ color: '#0D6027' }}>{confirmed}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <p className="text-xs font-medium text-slate-500 mb-0.5">Released</p>
          <p className="text-2xl font-bold text-slate-500">{released}</p>
        </div>
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">No reservations yet</p>
          <p className="text-xs text-slate-400 mb-4">Reserve a product to get started.</p>
          <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: '#6E42E5' }}>
            Browse products
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Warehouse</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Expires in</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reserved at</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reservations.map((r) => {
                  const expiry = formatExpiry(r.expiresAt, r.status)
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-medium" style={{ color: '#21143F' }}>{r.product.name}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-slate-700">{r.warehouse.name}</span>
                        <span className="ml-1.5 text-xs text-slate-400">{r.warehouse.location}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{r.quantity}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[r.status]}`}
                          style={r.status === 'CONFIRMED' ? { color: '#0D6027' } : undefined}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[r.status]}`} />
                          {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 tabular-nums">
                        {expiry ? (
                          <span className={expiry.urgent ? 'text-red-500 font-medium' : 'text-slate-500'}>
                            {expiry.text}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">
                        {new Date(r.createdAt).toLocaleString('en-IN', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-right">
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
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  )
}
