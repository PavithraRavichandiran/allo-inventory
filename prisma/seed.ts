import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  // Clean up stale test data so reserved counts are accurate after re-seeding
  await prisma.idempotencyKey.deleteMany({})
  await prisma.reservation.deleteMany({})

  // Warehouses
  const mumbai = await prisma.warehouse.upsert({
    where: { id: 'wh-mumbai' },
    update: {},
    create: { id: 'wh-mumbai', name: 'Mumbai Central', location: 'Mumbai, MH' },
  })

  const delhi = await prisma.warehouse.upsert({
    where: { id: 'wh-delhi' },
    update: {},
    create: { id: 'wh-delhi', name: 'Delhi North', location: 'Delhi, DL' },
  })

  const bangalore = await prisma.warehouse.upsert({
    where: { id: 'wh-bangalore' },
    update: {},
    create: { id: 'wh-bangalore', name: 'Bangalore South', location: 'Bangalore, KA' },
  })

  // Products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { id: 'prod-testosterone' },
      update: { imageUrl: 'https://images.unsplash.com/photo-1709976142774-ce1ef41a8378?fm=jpg&q=60&w=400&auto=format&fit=crop' },
      create: {
        id: 'prod-testosterone',
        name: 'Testosterone Support Pack',
        description: 'Monthly supplement pack for hormonal balance and energy.',
        price: 1299,
        imageUrl: 'https://images.unsplash.com/photo-1709976142774-ce1ef41a8378?fm=jpg&q=60&w=400&auto=format&fit=crop',
      },
    }),
    prisma.product.upsert({
      where: { id: 'prod-sleep' },
      update: { imageUrl: 'https://images.unsplash.com/photo-1596177583101-26b7dada4f5c?fm=jpg&q=60&w=400&auto=format&fit=crop' },
      create: {
        id: 'prod-sleep',
        name: 'Deep Sleep Formula',
        description: 'Clinician-formulated blend for restful sleep.',
        price: 799,
        imageUrl: 'https://images.unsplash.com/photo-1596177583101-26b7dada4f5c?fm=jpg&q=60&w=400&auto=format&fit=crop',
      },
    }),
    prisma.product.upsert({
      where: { id: 'prod-hairfall' },
      update: { imageUrl: 'https://images.unsplash.com/photo-1729703551867-89f5e3469bd9?fm=jpg&q=60&w=400&auto=format&fit=crop' },
      create: {
        id: 'prod-hairfall',
        name: 'Hair Fall Control Kit',
        description: 'DHT-blocking topical + oral combination kit.',
        price: 1899,
        imageUrl: 'https://images.unsplash.com/photo-1729703551867-89f5e3469bd9?fm=jpg&q=60&w=400&auto=format&fit=crop',
      },
    }),
    prisma.product.upsert({
      where: { id: 'prod-weight' },
      update: { imageUrl: 'https://images.unsplash.com/photo-1729704200257-f0a9265d4b1b?fm=jpg&q=60&w=400&auto=format&fit=crop' },
      create: {
        id: 'prod-weight',
        name: 'Weight Management Bundle',
        description: 'Metabolism booster with dietary guidance booklet.',
        price: 2199,
        imageUrl: 'https://images.unsplash.com/photo-1729704200257-f0a9265d4b1b?fm=jpg&q=60&w=400&auto=format&fit=crop',
      },
    }),
  ])

  // Stock per product per warehouse
  const stockEntries = [
    // Testosterone Support Pack
    { productId: 'prod-testosterone', warehouseId: mumbai.id, total: 50, reserved: 0 },
    { productId: 'prod-testosterone', warehouseId: delhi.id, total: 30, reserved: 0 },
    { productId: 'prod-testosterone', warehouseId: bangalore.id, total: 1, reserved: 0 }, // low stock edge case

    // Deep Sleep Formula
    { productId: 'prod-sleep', warehouseId: mumbai.id, total: 80, reserved: 0 },
    { productId: 'prod-sleep', warehouseId: delhi.id, total: 0, reserved: 0 }, // out of stock edge case
    { productId: 'prod-sleep', warehouseId: bangalore.id, total: 45, reserved: 0 },

    // Hair Fall Control Kit
    { productId: 'prod-hairfall', warehouseId: mumbai.id, total: 25, reserved: 0 },
    { productId: 'prod-hairfall', warehouseId: delhi.id, total: 60, reserved: 0 },
    { productId: 'prod-hairfall', warehouseId: bangalore.id, total: 15, reserved: 0 },

    // Weight Management Bundle
    { productId: 'prod-weight', warehouseId: mumbai.id, total: 40, reserved: 0 },
    { productId: 'prod-weight', warehouseId: delhi.id, total: 20, reserved: 0 },
    { productId: 'prod-weight', warehouseId: bangalore.id, total: 35, reserved: 0 },
  ]

  for (const entry of stockEntries) {
    await prisma.stock.upsert({
      where: {
        productId_warehouseId: {
          productId: entry.productId,
          warehouseId: entry.warehouseId,
        },
      },
      update: { total: entry.total, reserved: entry.reserved },
      create: entry,
    })
  }

  console.log(`Seeded:`)
  console.log(`  ${[mumbai, delhi, bangalore].length} warehouses`)
  console.log(`  ${products.length} products`)
  console.log(`  ${stockEntries.length} stock entries`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
