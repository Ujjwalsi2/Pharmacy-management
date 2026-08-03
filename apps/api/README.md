# MediTrack API

Backend for MediTrack, a pharmacy management platform. Express 5 + TypeScript
(strict, ESM/NodeNext) + Prisma ORM on SQLite, validated with zod, tested with
Vitest + supertest.

Implements the contract in [`../../docs/API_CONTRACT.md`](../../docs/API_CONTRACT.md)
exactly (routes, field names, enums, error codes, status codes, envelopes,
derived drug status precedence, and the money/tax formulas). See
[Deviations / gaps](#deviations--gaps-from-the-contract) below for the one
place where the contract was silent and a judgement call was made.

## Stack

- Node.js 20+, TypeScript (strict, NodeNext ESM)
- Express 5
- Prisma ORM + SQLite (`prisma/dev.db`)
- zod (request validation), bcryptjs (password hashing), jsonwebtoken (JWT)
- cookie-parser, cors, helmet, morgan, dotenv
- Vitest + supertest (tests), ESLint + typescript-eslint (lint), tsx (dev), tsc (build)

## Getting started

From the repo root (this package is part of an npm workspace):

```bash
npm install                          # installs all workspaces
cp apps/api/.env.example apps/api/.env
npm run db:reset -w @meditrack/api   # creates dev.db, applies migrations, seeds demo data
npm run dev -w @meditrack/api        # starts the API on http://localhost:4000
```

Or from inside `apps/api/`:

```bash
cp .env.example .env
npm run db:reset
npm run dev
```

Health check: `GET http://localhost:4000/api/health` -> `{ "status": "ok", "uptime": 123.4 }`.

## Environment variables

Copy `.env.example` to `.env` and adjust as needed. All variables are
validated (via zod) on startup in `src/env.ts`.

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `4000` | HTTP port the server listens on |
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `DATABASE_URL` | `file:./dev.db` | Prisma SQLite connection string, relative to `apps/api` |
| `JWT_ACCESS_SECRET` | `dev-access-secret-change-me` | Signs access tokens (15 min TTL) |
| `JWT_REFRESH_SECRET` | `dev-refresh-secret-change-me` | Signs refresh tokens (7 day TTL), stored in the `mt_refresh` httpOnly cookie |
| `ACCESS_TOKEN_TTL` | `15m` | jsonwebtoken `expiresIn` string |
| `REFRESH_TOKEN_TTL` | `7d` | jsonwebtoken `expiresIn` string |
| `CORS_ORIGIN` | `http://localhost:5173` | Origin allowed by CORS (the web app), sent with `credentials: true` |

**Production safety:** if `NODE_ENV=production` and either JWT secret is still
set to its placeholder default, the server refuses to start. Always set real
random secrets before deploying.

## npm scripts

Run from `apps/api/` (or with `-w @meditrack/api` from the repo root):

| Script | Description |
| --- | --- |
| `npm run dev` | Start the API with `tsx watch` (auto-reload) |
| `npm run build` | Type-check + compile to `dist/` and regenerate the Prisma client |
| `npm run start` | Run the compiled server from `dist/index.js` |
| `npm run typecheck` | `tsc --noEmit` across `src/**` and `prisma/seed.ts` |
| `npm run lint` | ESLint over `src/**/*.ts` |
| `npm run test` | Run the Vitest + supertest suite against an isolated SQLite file |
| `npm run seed` | Seed the database with demo data (idempotent — clears tables first) |
| `npm run db:reset` | Drop + recreate the SQLite db, apply migrations, then seed |
| `npm run prisma:generate` | Regenerate the Prisma client |
| `npm run prisma:migrate` | Create/apply a dev migration |

## Seeded demo accounts

After `npm run db:reset` (or `npm run seed`):

| Email | Password | Role | Notes |
| --- | --- | --- | --- |
| `admin@meditrack.dev` | `Admin@123` | ADMIN | |
| `mark@meditrack.dev` | `Mark@123` | PHARMACIST | |
| `clark@meditrack.dev` | `Clark@123` | PHARMACIST | |
| `tony@meditrack.dev` | `Tony@123` | PHARMACIST | seeded **inactive** (`active: false`) to exercise the login-rejects-inactive-user path |

Also seeded: 6 companies, 40 drugs (all 8 drug types, and deliberately spread
across all 5 derived status buckets), 25 purchases, 120 sales spread over the
last ~60 days, and 10 internal messages.

## Routes

Base URL: `/api`. Full field/behaviour details are in the API contract; this
is a quick index by resource.

### Health

- `GET /health` — public, `{ status: "ok", uptime }`

### Auth (`/auth`)

- `POST /auth/login` — public, rate-limited (20 requests / 15 min per IP)
- `POST /auth/refresh` — reads the `mt_refresh` cookie
- `POST /auth/logout` — auth required, clears the refresh cookie
- `GET /auth/me` — auth required
- `PATCH /auth/password` — auth required, `{ currentPassword, newPassword }`

### Users (`/users`) — ADMIN only, except `GET /users` (any role; reduced shape for PHARMACIST)

- `GET /users`, `POST /users`, `GET /users/:id`, `PATCH /users/:id`
- `DELETE /users/:id` — soft delete (`active=false`); 409 on self-delete

### Companies (`/companies`) — auth for GET, ADMIN for writes

- `GET /companies`, `POST /companies`, `GET /companies/:id`,
  `PATCH /companies/:id`, `DELETE /companies/:id` (409 if referenced by drugs/purchases)

### Drugs (`/drugs`) — auth for GET, ADMIN for writes

- `GET /drugs` — `search`, `companyId`, `type`, `status`, `sort`
- `POST /drugs` — 409 on duplicate barcode
- `GET /drugs/:id`
- `GET /drugs/barcode/:barcode` — POS scan lookup
- `PATCH /drugs/:id`
- `DELETE /drugs/:id` — 409 if referenced by sale items
- `GET /drugs/alerts` — `{ lowStock, expiringSoon, expired }`

### Purchases (`/purchases`) — auth for GET, ADMIN for POST

- `GET /purchases` — `search`, `companyId`, `from`, `to`
- `POST /purchases` — `{ companyId, notes?, items: [{ drugId, quantity, unitCost }] }`;
  atomically increments stock and generates a sequential `reference` (`PO-<year>-<seq>`)
- `GET /purchases/:id`

### Sales (`/sales`) — auth

- `GET /sales` — `search`, `userId`, `from`, `to`; PHARMACIST callers only see their own sales
- `POST /sales` — `{ customerName?, customerPhone?, paymentMode, discount?, taxRate?, items: [{ drugId, quantity }] }`;
  atomically decrements stock, rejects `INSUFFICIENT_STOCK` (409) or expired
  drugs (`VALIDATION_ERROR`, 400), recomputes `tax`/`total` server-side, and
  generates a sequential `invoiceNo` (`INV-<year>-<seq>`)
- `GET /sales/:id` — full invoice; PHARMACIST callers get 403 on other users' sales

### Messages (`/messages`) — auth

- `GET /messages` — `box=inbox|sent` (default `inbox`)
- `POST /messages` — `{ toUserId, body }`
- `PATCH /messages/:id/read` — marks own received message read (idempotent)
- `GET /messages/unread-count` — `{ count }`

### Dashboard + reports — auth

- `GET /dashboard/summary` — KPIs, 30-day zero-filled revenue trend, top drugs, alerts, recent sales
- `GET /reports/sales` — `?from&to&groupBy=day|month`
- `GET /reports/top-drugs` — `?from&to&limit=5`
- `GET /reports/inventory-value` — `{ costValue, retailValue, potentialProfit, byType }`

## Testing

```bash
npm run test
```

Uses Vitest + supertest against an isolated SQLite file
(`tests/test.db`, created/torn down automatically), so it never touches
`dev.db`. Covers auth (including inactive-user rejection and refresh-cookie
flow), role/permission rules, drug status derivation, atomic stock
increment/decrement with server-side money recomputation, insufficient-stock
and expired-drug rejection, soft-delete + self-delete conflict, message
flows, dashboard shape, and validation error envelopes.

## Deviations / gaps from the contract

The contract's error-code table (`VALIDATION_ERROR`, `UNAUTHORIZED`,
`FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INSUFFICIENT_STOCK`, `INTERNAL`) has no
dedicated code for HTTP 429 (rate limiting). `POST /auth/login` is
rate-limited (20 requests / 15 minutes per IP); when the limit is exceeded it
returns `429` with `{ "error": { "code": "CONFLICT", "message": "..." } }`,
reusing the closest existing code rather than inventing a new one outside the
contract. If the frontend needs to distinguish this case, add a dedicated
`RATE_LIMITED` code to the contract and this handler.

## Notable implementation details

- **SQLite has no native enum support in Prisma.** `Role`, `DrugType`, and
  `PaymentMode` are plain `String` columns in `schema.prisma`; the allowed
  values are enforced at the application layer via zod schemas and the
  `Role`/`DrugType`/`PaymentMode` TypeScript union types in `src/types/index.ts`.
- **Prisma stores SQLite `DateTime` columns as epoch-milliseconds**, not ISO
  strings. Raw SQL in `dashboardService.ts` / `reportService.ts` accounts for
  this (`strftime('%Y-%m-%d', createdAt / 1000, 'unixepoch')` and comparisons
  against `.getTime()`).
- **Sequential `invoiceNo` / `reference` generation** uses a `Counter` table
  updated via `upsert` inside the same `$transaction` as the sale/purchase
  write (see `src/services/sequenceService.ts`), so numbering stays
  contiguous and race-safe under concurrent requests.
- Money values are always recomputed server-side from `drug.sellingPrice`,
  `discount`, and `taxRate` — client-sent totals are ignored.
