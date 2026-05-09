'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Reservation = {
  id: string
  quantity: number
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED'
  expiresAt: string
  product: { name: string; description: string | null; price: number }
  warehouse: { name: string; location: string }
}

function formatCountdown(ms: number) {
  if (ms <= 0) return '00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function ReservationCheckout({ reservation }: { reservation: Reservation }) {
  const [status, setStatus] = useState(reservation.status)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<'confirm' | 'cancel' | null>(null)
  const [remaining, setRemaining] = useState(
    new Date(reservation.expiresAt).getTime() - Date.now()
  )

  useEffect(() => {
    if (status !== 'PENDING') return

    const interval = setInterval(() => {
      const ms = new Date(reservation.expiresAt).getTime() - Date.now()
      setRemaining(ms)
      if (ms <= 0) clearInterval(interval)
    }, 1000)

    return () => clearInterval(interval)
  }, [reservation.expiresAt, status])

  const isExpired = remaining <= 0
  const isPending = status === 'PENDING'

  async function handleConfirm() {
    setLoading('confirm')
    setError(null)

    const res = await fetch(`/api/reservations/${reservation.id}/confirm`, {
      method: 'POST',
    })

    if (res.ok) {
      setStatus('CONFIRMED')
    } else {
      const data = await res.json()
      setError(
        res.status === 410
          ? 'Your reservation expired before payment could be confirmed.'
          : (data.error ?? 'Something went wrong.')
      )
    }
    setLoading(null)
  }

  async function handleCancel() {
    setLoading('cancel')
    setError(null)

    const res = await fetch(`/api/reservations/${reservation.id}/release`, {
      method: 'POST',
    })

    if (res.ok) {
      setStatus('RELEASED')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong.')
    }
    setLoading(null)
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <Link href="/" className="text-sm text-indigo-600 hover:underline mb-6 inline-block">
        ← Back to products
      </Link>

      <div className="border border-gray-200 rounded-xl p-6 shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">{reservation.product.name}</h1>
            {reservation.product.description && (
              <p className="text-sm text-gray-500 mt-0.5">{reservation.product.description}</p>
            )}
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Details */}
        <dl className="grid grid-cols-2 gap-3 text-sm mb-6">
          <div>
            <dt className="text-gray-400">Warehouse</dt>
            <dd className="font-medium">{reservation.warehouse.name}</dd>
            <dd className="text-xs text-gray-400">{reservation.warehouse.location}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Quantity</dt>
            <dd className="font-medium">{reservation.quantity}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Price</dt>
            <dd className="font-medium text-indigo-600">
              ₹{reservation.product.price.toLocaleString('en-IN')}
            </dd>
          </div>
          <div>
            <dt className="text-gray-400">Reservation ID</dt>
            <dd className="font-mono text-xs text-gray-500 truncate">{reservation.id}</dd>
          </div>
        </dl>

        {/* Countdown */}
        {isPending && (
          <div className="rounded-lg bg-gray-50 p-4 text-center mb-6">
            <p className="text-xs text-gray-400 mb-1">Hold expires in</p>
            <p
              className={`text-4xl font-mono font-bold tabular-nums ${
                isExpired
                  ? 'text-red-500'
                  : remaining < 60_000
                  ? 'text-amber-500'
                  : 'text-gray-800'
              }`}
            >
              {isExpired ? 'Expired' : formatCountdown(remaining)}
            </p>
          </div>
        )}

        {/* Confirmed / Released states */}
        {status === 'CONFIRMED' && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center mb-6">
            <p className="text-green-700 font-medium">Payment confirmed — order placed!</p>
            <p className="text-sm text-green-600 mt-1">
              Your units have been permanently reserved.
            </p>
          </div>
        )}

        {status === 'RELEASED' && (
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-center mb-6">
            <p className="text-gray-600 font-medium">Reservation cancelled</p>
            <p className="text-sm text-gray-400 mt-1">
              Stock has been returned to available inventory.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Actions */}
        {isPending && !isExpired && (
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={!!loading}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading === 'confirm' ? 'Confirming…' : 'Confirm purchase'}
            </button>
            <button
              onClick={handleCancel}
              disabled={!!loading}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading === 'cancel' ? 'Cancelling…' : 'Cancel'}
            </button>
          </div>
        )}

        {isPending && isExpired && (
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-3">
              This hold has expired. Go back and reserve again.
            </p>
            <Link
              href="/"
              className="inline-block px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Browse products
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}

function StatusBadge({ status }: { status: 'PENDING' | 'CONFIRMED' | 'RELEASED' }) {
  const styles = {
    PENDING: 'bg-amber-100 text-amber-700',
    CONFIRMED: 'bg-green-100 text-green-700',
    RELEASED: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${styles[status]}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}
