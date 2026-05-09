import { z } from 'zod'

export const WarehouseSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string(),
})

export const StockPerWarehouseSchema = z.object({
  warehouseId: z.string(),
  warehouseName: z.string(),
  warehouseLocation: z.string(),
  total: z.number(),
  reserved: z.number(),
  available: z.number(),
})

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  imageUrl: z.string().nullable(),
  stocks: z.array(StockPerWarehouseSchema),
})

export const ReserveRequestSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number().int().positive(),
})

export type Warehouse = z.infer<typeof WarehouseSchema>
export type Product = z.infer<typeof ProductSchema>
export type ReserveRequest = z.infer<typeof ReserveRequestSchema>
