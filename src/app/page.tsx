import { prisma } from '@/lib/prisma'
import ReserveButton from './components/ReserveButton'

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

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-1">Allo Inventory</h1>
      <p className="text-sm text-gray-500 mb-8">
        Reserve a product to hold your unit for 10 minutes while you complete payment.
      </p>

      <div className="flex flex-col gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="border border-gray-200 rounded-xl p-6 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">{product.name}</h2>
                {product.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{product.description}</p>
                )}
              </div>
              <span className="text-lg font-bold text-indigo-600">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-medium">Warehouse</th>
                  <th className="pb-2 font-medium">Available</th>
                  <th className="pb-2 font-medium">Reserved</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {product.stocks.map((stock) => {
                  const available = stock.total - stock.reserved
                  return (
                    <tr key={stock.warehouseId} className="border-b border-gray-50 last:border-0">
                      <td className="py-2">
                        <span className="font-medium">{stock.warehouse.name}</span>
                        <span className="ml-1 text-gray-400 text-xs">
                          {stock.warehouse.location}
                        </span>
                      </td>
                      <td className="py-2">
                        <span
                          className={
                            available === 0
                              ? 'text-red-500'
                              : available <= 3
                              ? 'text-amber-500'
                              : 'text-green-600'
                          }
                        >
                          {available}
                        </span>
                      </td>
                      <td className="py-2 text-gray-400">{stock.reserved}</td>
                      <td className="py-2 text-right">
                        {available > 0 ? (
                          <ReserveButton
                            productId={product.id}
                            warehouseId={stock.warehouseId}
                            productName={product.name}
                            warehouseName={stock.warehouse.name}
                          />
                        ) : (
                          <span className="text-xs text-gray-400">Out of stock</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </main>
  )
}
