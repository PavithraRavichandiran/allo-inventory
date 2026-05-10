import { prisma } from '@/lib/prisma'
import ReserveButton from './components/ReserveButton'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    include: {
      stocks: {
        include: { warehouse: true },
        orderBy: { warehouse: { name: 'asc' } },
      },
    },
    orderBy: { name: 'asc' },
  })

  const totalAvailable = products.reduce(
    (acc, p) => acc + p.stocks.reduce((a, s) => a + (s.total - s.reserved), 0),
    0
  )

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <p className="text-xl font-semibold mb-2" style={{ color: '#21143F' }}>Products That Deliver Results</p>
        <p className="text-sm text-slate-500">
          Reserve a product to hold your unit for 10 minutes while you complete payment.{' '}
          <span className="font-medium text-slate-700">{totalAvailable} units</span> available across all warehouses.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {products.map((product) => {
          const totalAvailableForProduct = product.stocks.reduce(
            (a, s) => a + (s.total - s.reserved),
            0
          )

          return (
            <div
              key={product.id}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Product header */}
              <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h2 className="text-lg font-semibold" style={{ color: '#21143F' }}>{product.name}</h2>
                      {totalAvailableForProduct === 0 && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                          Out of stock
                        </span>
                      )}
                      {totalAvailableForProduct > 0 && totalAvailableForProduct <= 5 && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          Low stock
                        </span>
                      )}
                    </div>
                    {product.description && (
                      <p className="text-sm text-slate-500">{product.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-2xl font-bold" style={{ color: '#6E42E5' }}>
                      ₹{product.price.toLocaleString('en-IN')}
                    </span>
                    <p className="text-xs text-slate-400 mt-0.5">per unit</p>
                  </div>
                </div>
              </div>

              {/* Warehouse rows */}
              <div className="divide-y divide-slate-50">
                {product.stocks.map((stock) => {
                  const available = stock.total - stock.reserved
                  const pct = stock.total > 0 ? (available / stock.total) * 100 : 0

                  return (
                    <div key={stock.warehouseId} className="px-6 py-3.5 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <svg
                            className="w-3.5 h-3.5 text-slate-400 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                          <span className="text-sm font-medium text-slate-700">
                            {stock.warehouse.name}
                          </span>
                          <span className="text-xs text-slate-400">{stock.warehouse.location}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                available === 0
                                  ? 'bg-red-400'
                                  : available <= 3
                                  ? 'bg-amber-400'
                                  : ''
                              }`}
                              style={{
                                width: `${pct}%`,
                                ...(available > 3 ? { backgroundColor: '#0D6027' } : {}),
                              }}
                            />
                          </div>
                          <span
                            className={available === 0 ? 'text-xs font-medium text-red-500' : available <= 3 ? 'text-xs font-medium text-amber-600' : 'text-xs font-medium'}
                            style={available > 3 ? { color: '#0D6027' } : undefined}
                          >
                            {available} available
                          </span>
                          {stock.reserved > 0 && (
                            <span className="text-xs text-slate-400">
                              · {stock.reserved} reserved
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {available > 0 ? (
                          <ReserveButton
                            productId={product.id}
                            warehouseId={stock.warehouseId}
                            productName={product.name}
                            warehouseName={stock.warehouse.name}
                          />
                        ) : (
                          <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">
                            Unavailable
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
