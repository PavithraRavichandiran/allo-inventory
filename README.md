# allo-inventory
Inventory reservation system for multi-warehouse retail — built with Next.js, Prisma, Redis

# Allo Inventory

Inventory and order-fulfillment platform with race-condition-safe stock reservations for multi-warehouse retail.

---

## Problem Understanding

In high-concurrency checkout systems, payment confirmation may take several
minutes due to 3DS authentication, UPI redirects, or wallet verification.

During that window, thousands of users may attempt to purchase the same item.

Two naive approaches both fail:

### 1. Decrement stock only after payment
- Prevents abandoned-cart stock blocking
- But allows overselling under concurrent checkout

### 2. Decrement stock at add-to-cart
- Prevents overselling
- But heavily reduces visible inventory
- Causes artificial stock depletion from abandoned carts

## Proposed Solution

Introduce a temporary inventory reservation during checkout.

Reservation lifecycle:
1. Customer initiates checkout
2. Units are reserved for 10 minutes
3. Payment success → reservation confirmed
4. Payment failure/timeout → reservation released

This balances:
- inventory accuracy
- checkout fairness
- conversion rate

---

## Core Concurrency Challenge

If two customers attempt to reserve the final unit simultaneously,
exactly one request must succeed.

A naive read-then-write flow is unsafe:

1. Request A reads stock = 1
2. Request B reads stock = 1
3. Both reserve successfully
4. Inventory becomes negative

This is a classic race condition and requires atomic coordination.

---

## Architecture Decisions

### Next.js App Router
Used for full-stack API + frontend development with a single deployment target.

### Prisma + Postgres
Provides transactional guarantees and type-safe database access.

### Redis Distributed Locking
A per-product lock using `SET NX EX` ensures only one reservation flow
can mutate inventory at a time across distributed instances.

### Zod Validation
Shared runtime validation between frontend forms and API routes.

### Tailwind + shadcn/ui
Used for rapid UI development with accessible components.

---

## Reservation Strategy

1. Acquire Redis lock
2. Start Prisma transaction
3. Validate available inventory
4. Create reservation
5. Increment reserved quantity
6. Release lock

---

## Expiration Handling

Reservations include an `expiresAt` timestamp.

Expired reservations are released using:
- lazy cleanup during reads
- optional production cron worker (Vercel Cron / queue worker)

---

## Planned Improvements

- Background reservation cleanup worker
- Idempotent payment confirmation
- Reservation event audit log
- Metrics + observability
- Multi-region lock strategy
- Load testing for concurrent reservations

---

## Status

- [x] Project setup
- [ ] Database schema
- [ ] Reservation engine
- [ ] Redis locking
- [ ] API routes
- [ ] Frontend
- [ ] Deployment
