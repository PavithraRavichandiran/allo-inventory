'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  productId: string
  warehouseId: string
  productName: string
  warehouseName: string
}

export default function ReserveButton({
  productId,
  warehouseId,
  productName,
  warehouseName,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReserve() {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
    })

    if (res.status === 201) {
      const reservation = await res.json()
      router.push(`/reservations/${reservation.id}`)
      return
    }

    const data = await res.json()
    setError(
      res.status === 409
        ? 'No stock available — someone just took the last unit.'
        : (data.error ?? 'Something went wrong.')
    )
    setLoading(false)
  }

  return (
    <div>
      <button
        onClick={handleReserve}
        disabled={loading}
        className="px-3 py-1.5 text-sm font-medium rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        style={{ backgroundColor: '#6E42E5' }}
        onMouseEnter={e => !loading && ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#572AC8')}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6E42E5')}
      >
        {loading ? 'Reserving…' : 'Reserve'}
      </button>
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
