# Allo Inventory

Inventory and order-fulfillment platform with race-condition-safe stock reservations for multi-warehouse retail.

Built with Next.js 16 (App Router) · Prisma 7 · PostgreSQL (Supabase) · Redis (Upstash) · Zod · Tailwind CSS

---

## Problem

In high-concurrency checkout, payment confirmation can take several minutes (3DS, UPI, wallet redirects). During that window, many shoppers may attempt to buy the same item.

Two naive approaches both fail:

- **Decrement at payment** — allows two customers to pay for the same physical unit. Overselling.
- **Decrement at add-to-cart** — 80% of carts are abandoned, so visible inventory tanks and conversion suffers.

**Solution:** A temporary reservation. When a customer proceeds to checkout, units are held for 10 minutes. Payment success confirms the hold permanently. Payment failure or timeout releases it back to available stock.

---

## How it works

### Reservation lifecycle

```
checkout initiated
      ↓
POST /api/reservations       ← Redis lock ensures exactly one wins
      ↓
PENDING (10 min window)
      ↓
POST /api/reservations/:id/confirm   → CONFIRMED  (stock permanently decremented)
POST /api/reservations/:id/release   → RELEASED   (stock returned to available)
expiresAt passed (no action)         → RELEASED via expiry mechanism
```

### Concurrency guarantee

If two requests arrive simultaneously for the last unit of a SKU, exactly one succeeds. The mechanism:

1. Acquire a Redis lock keyed to `lock:stock:{productId}:{warehouseId}` using `SET NX PX` (atomic, expires in 10s)
2. Read current `stock.total - stock.reserved`
3. If sufficient: create reservation + increment `stock.reserved` in a Postgres transaction
4. Release lock

The second concurrent request either finds the lock held (returns 503, client retries) or finds no available stock after the lock is released (returns 409).

---

## Running locally

### Prerequisites

- Node.js 20+
- A hosted PostgreSQL instance (Supabase, Neon, or Railway)
- A Redis instance (Upstash)

### 1. Clone and install

```bash
git clone <repo-url>
cd allo-inventory
npm install
```

### 2. Environment variables

Create a `.env` file at the project root:

```env
DATABASE_URL="postgresql://..."   # Supabase / Neon / Railway connection string
REDIS_URL="rediss://..."          # Upstash Redis URL
```

### 3. Run migrations

```bash
npx prisma migrate deploy
```

### 4. Seed the database

```bash
npm run seed
```

Seeds 3 warehouses, 4 products, and 12 stock entries. Includes intentional edge cases: one warehouse with 0 stock, one with 1 unit (for concurrency testing).

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Expiry mechanism in production

Reservations that are not confirmed before `expiresAt` must be released so units return to available stock.

### Primary: lazy cleanup on read

Every call to `GET /api/products` triggers `expireReservations()` before returning data. This finds all `PENDING` reservations past their `expiresAt`, marks them `RELEASED`, and decrements `stock.reserved` in a single transaction. No background process required.

**Why this works:** The products page is the entry point for all shoppers. It is called frequently — any expired reservation is cleaned up within one browsing session.

### Secondary: scheduled cleanup via Vercel Cron

A dedicated endpoint at `GET /api/cron/expire` runs the same cleanup. In production, add this to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/expire",
      "schedule": "* * * * *"
    }
  ]
}
```

This runs every minute as a safety net, catching expired reservations even when no user is actively browsing.

---

## Idempotency (bonus)

The `POST /api/reservations` and `POST /api/reservations/:id/confirm` endpoints support the `Idempotency-Key` header.

If a client retries with the same key, the server returns the original response without repeating the side effect. The key and response body are stored in the `IdempotencyKey` table. Only successful (2xx) responses are cached — errors like 409 are not stored, so clients can retry freely if stock becomes available.

```bash
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: <uuid>" \
  -d '{"productId":"...","warehouseId":"...","quantity":1}'
```

---

## API reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | List products with available stock per warehouse |
| GET | `/api/warehouses` | List warehouses |
| POST | `/api/reservations` | Reserve units. 409 if insufficient stock |
| POST | `/api/reservations/:id/confirm` | Confirm reservation. 410 if expired |
| POST | `/api/reservations/:id/release` | Release reservation early |
| GET | `/api/cron/expire` | Trigger expiry cleanup (for Vercel Cron) |

---

## Trade-offs and what I'd do differently

**Redis lock TTL**
The lock TTL is 10s. For a DB operation that completes in milliseconds, this is conservative. A tighter TTL (2–3s) would reduce worst-case head-of-line blocking. I kept 10s to avoid lock expiry under a slow database.

**503 on lock contention vs. retry**
When the lock is held, I return 503 rather than waiting and retrying. A short retry loop (e.g., 3× with 100ms backoff) would give a better experience for the client, but adds complexity. With more time I'd implement this.

**Lazy cleanup only — no queue**
The lazy cleanup approach works well under normal traffic but has a gap: if no one browses the product listing for a long time, reservations stay logically held even after expiry. The Vercel Cron endpoint closes this gap in production.

**No quantity selector on the listing page**
The Reserve button always reserves 1 unit. Adding a quantity input would be a straightforward extension but is out of scope for this exercise.

**No authentication**
Reservations are not tied to a user session. In production, you'd associate each reservation with a user ID and gate the confirm/release endpoints on ownership.

**Lock is not re-entrant**
If the same server process tries to acquire a lock it already holds (e.g., nested call), it will return false. This is fine for the current linear flow but worth noting.
