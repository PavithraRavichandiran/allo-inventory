'use client'

import { useEffect, useRef, useState } from 'react'
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

export default function ReservationCheckout({
  reservation,
  maxQuantity,
}: {
  reservation: Reservation
  maxQuantity: number
}) {
  const [status, setStatus] = useState(reservation.status)
  const [quantity, setQuantity] = useState(reservation.quantity)
  const [savingQty, setSavingQty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedQtyRef = useRef(reservation.quantity)
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
  const progressPct = Math.max(0, Math.min(100, (remaining / (10 * 60 * 1000)) * 100))

  async function handleConfirm() {
    setLoading('confirm')
    setError(null)
    const res = await fetch(`/api/reservations/${reservation.id}/confirm`, { method: 'POST' })
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

  function handleQuantityChange(newQty: number) {
    if (newQty < 1 || newQty > maxQuantity || savingQty) return
    setQuantity(newQty)
    setError(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSavingQty(true)
      const res = await fetch(`/api/reservations/${reservation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      })
      if (res.ok) {
        lastSavedQtyRef.current = newQty
      } else {
        const data = await res.json()
        setError(data.error ?? 'Could not update quantity.')
        setQuantity(lastSavedQtyRef.current)
      }
      setSavingQty(false)
    }, 600)
  }

  async function handleCancel() {
    setLoading('cancel')
    setError(null)
    const res = await fetch(`/api/reservations/${reservation.id}/release`, { method: 'POST' })
    if (res.ok) {
      setStatus('RELEASED')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong.')
    }
    setLoading(null)
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center px-4 py-2 mb-6 rounded-lg border text-sm font-medium transition-colors"
        style={{ color: '#572AC8', borderColor: '#572AC8' }}
      >
        Back to products
      </Link>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Gradient header */}
        <div className="px-6 pt-6 pb-5 border-b border-slate-100" style={{ background: 'linear-gradient(135deg, #ede9fb 0%, #f8fafc 100%)' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <StatusBadge status={status} />
              <h1 className="text-xl font-bold mt-2" style={{ color: '#21143F' }}>
                {reservation.product.name}
              </h1>
              {reservation.product.description && (
                <p className="text-sm text-slate-500 mt-0.5">{reservation.product.description}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold" style={{ color: '#6E42E5' }}>
                ₹{(reservation.product.price * quantity).toLocaleString('en-IN')}
              </p>
              {quantity > 1 && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {quantity} × ₹{reservation.product.price.toLocaleString('en-IN')}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          {/* Details */}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm mb-6">
            <div>
              <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Warehouse</dt>
              <dd className="font-medium" style={{ color: '#21143F' }}>{reservation.warehouse.name}</dd>
              <dd className="text-xs text-slate-400">{reservation.warehouse.location}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Quantity</dt>
              {isPending ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center rounded-lg border border-slate-300 bg-white">
                    <button
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={savingQty || quantity <= 1}
                      className="w-8 h-8 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed rounded-l-lg transition-colors"
                    >
                      &minus;
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-slate-800 tabular-nums select-none border-x border-slate-300">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={savingQty || quantity >= maxQuantity}
                      className="w-8 h-8 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed rounded-r-lg transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              ) : (
                <dd className="font-medium" style={{ color: '#21143F' }}>{quantity} unit{quantity !== 1 ? 's' : ''}</dd>
              )}
            </div>
            <div className="col-span-2">
              <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Reservation ID</dt>
              <dd className="font-mono text-xs text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded-lg break-all">{reservation.id}</dd>
            </div>
          </dl>

          {/* Countdown */}
          {isPending && (
            <div
              className={`rounded-xl p-4 text-center mb-5 border ${
                isExpired
                  ? 'bg-red-50 border-red-100'
                  : remaining < 60_000
                  ? 'bg-amber-50 border-amber-100'
                  : 'bg-slate-50 border-slate-100'
              }`}
            >
              <p className="text-xs font-medium text-slate-400 mb-2">Hold expires in</p>
              <p
                className={`text-5xl font-mono font-bold tabular-nums tracking-tight ${
                  isExpired ? 'text-red-500' : remaining < 60_000 ? 'text-amber-500' : ''
                }`}
                style={!isExpired && remaining >= 60_000 ? { color: '#21143F' } : undefined}
              >
                {isExpired ? 'Expired' : formatCountdown(remaining)}
              </p>
              {!isExpired && (
                <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${progressPct}%`,
                      backgroundColor: remaining < 60_000 ? '#f59e0b' : '#6E42E5',
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Confirmed state */}
          {status === 'CONFIRMED' && (
            <div className="rounded-xl bg-green-50 border border-green-100 p-5 text-center mb-5">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: '#0D6027' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold mb-1" style={{ color: '#0D6027' }}>Order confirmed!</p>
              <p className="text-sm" style={{ color: '#0D6027' }}>Your units have been permanently reserved.</p>
            </div>
          )}

          {/* Released state */}
          {status === 'RELEASED' && (
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-5 text-center mb-5">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-slate-700 font-semibold mb-1">Reservation cancelled</p>
              <p className="text-sm text-slate-400">Stock has been returned to available inventory.</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 p-3.5 mb-4 flex gap-2.5">
              <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions — pending & active */}
          {isPending && !isExpired && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleConfirm}
                disabled={!!loading}
                className="flex-1 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: '#6E42E5' }}
                onMouseEnter={e => !loading && ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#572AC8')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6E42E5')}
              >
                {loading === 'confirm' ? 'Confirming…' : 'Confirm purchase'}
              </button>
              <button
                onClick={handleCancel}
                disabled={!!loading}
                className="flex-1 py-3 rounded-xl border font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ color: '#572AC8', borderColor: '#572AC8' }}
              >
                {loading === 'cancel' ? 'Cancelling…' : 'Cancel'}
              </button>
            </div>
          )}

          {/* Actions — expired */}
          {isPending && isExpired && (
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-4">This hold has expired. Go back and reserve again.</p>
              <Link
                href="/"
                className="inline-flex items-center px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors"
                style={{ backgroundColor: '#6E42E5' }}
              >
                Browse products
              </Link>
            </div>
          )}

          {/* Actions — confirmed or released */}
          {(status === 'CONFIRMED' || status === 'RELEASED') && (
            <Link
              href="/"
              className="flex items-center justify-center py-2.5 rounded-xl border text-sm font-medium transition-colors"
              style={{ color: '#572AC8', borderColor: '#572AC8' }}
            >
              Browse more products
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}

function StatusBadge({ status }: { status: 'PENDING' | 'CONFIRMED' | 'RELEASED' }) {
  const styles = {
    PENDING: 'bg-amber-100 text-amber-700',
    CONFIRMED: 'bg-green-100',
    RELEASED: 'bg-slate-100 text-slate-500',
  }
  const dots = {
    PENDING: 'bg-amber-400',
    CONFIRMED: 'bg-green-500',
    RELEASED: 'bg-slate-400',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${styles[status]}`}
      style={status === 'CONFIRMED' ? { color: '#0D6027' } : undefined}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]}`} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}
