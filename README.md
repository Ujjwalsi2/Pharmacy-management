
<br>

<p align="center">
  <h1 align="center">MediTrack</h1>
  <p align="center">Modern pharmacy management platform — inventory, sales, purchasing and reporting in one place.</p>
</p>

<br>

## Quick start

```bash
git clone https://github.com/Ujjwalsi2/Pharmacy-management.git
cd Pharmacy-management
npm run setup        # install dependencies + seed the database
npm run dev          # starts API on :4000 and frontend on :5173
```

Open http://localhost:5173 and sign in:

| Role     | Email                 | Password   |
| -------- | --------------------- | ---------- |
| Admin    | admin@meditrack.dev   | Admin@123  |
| Pharmacist | mark@meditrack.dev | Mark@123   |

> `tony@meditrack.dev` is seeded inactive to exercise the disabled-account path.

<br>

## What it does

- **Dashboard** — revenue, top drugs, low-stock alerts and expiry warnings at a glance.
- **Point of Sale** — add drugs to cart, apply discounts and tax, print invoices. Every sale recalculates money server-side; a rejected sale consumes no stock.
- **Inventory** — 40 seeded drugs spanning every status (in stock, low stock, out of stock, expiring soon, expired). Full CRUD with duplicate-barcode detection.
- **Purchases** — restock drugs with automatic quantity increment. Purchase references are race-safe document numbers (`PO-<year>-<seq>`).
- **Sales history** — list, search, filter by payment mode, drill into individual invoices.
- **Users & companies** — admin-managed with soft delete, self-delete guard and RBAC.
- **Messages** — internal pharmacy messaging.
- **Reports** — sales trends, top drugs, inventory valuation.
- **Dark mode**, responsive down to 390 px, keyboard-accessible.

<br>

## Stack

| Layer | Technology |
| --- | --- |
| Monorepo | npm workspaces (`apps/api`, `apps/web`) |
| Language | TypeScript 5, strict mode |
| Backend | Express 5, Prisma ORM, SQLite (zero external infra) |
| Auth | JWT access token (15 min) + httpOnly refresh cookie (7 days), bcrypt |
| Frontend | React 19, Vite 6, React Router v7, TanStack Query v5 |
| Styling | Tailwind CSS v4, CSS variables for light/dark theming |
| Charts | Recharts |
| Testing | Vitest + supertest (62 tests) |

<br>

## Scripts

| Command | What it does |
| --- | --- |
| `npm run setup` | Install deps + reset and seed the database |
| `npm run dev` | Start API (port 4000) and frontend (port 5173) |
| `npm test` | Run all 62 tests (API 34, web 28) |
| `npm run typecheck` | Type-check both workspaces |
| `npm run lint` | Lint both workspaces |
| `npm run build` | Production build |
| `npm run db:reset` | Wipe and re-seed the database |

<br>

## Project structure

```
├── apps
│   ├── api                  # Express 5 REST API
│   │   ├── prisma/          # schema, migrations, seed
│   │   ├── src/
│   │   │   ├── routes/      # route handlers
│   │   │   ├── services/    # business logic
│   │   │   ├── middleware/   # auth, validation, error handling
│   │   │   └── lib/         # errors, pagination, money, drug status
│   │   └── tests/           # 34 API tests (Vitest + supertest)
│   └── web                  # React 19 + Vite frontend
│       └── src/
│           ├── components/  # layout shell + 25 UI primitives
│           ├── features/    # auth, dashboard, drugs, sales, purchases, companies, messages, reports, users
│           ├── pages/       # page-level components
│           ├── hooks/       # useListQuery, useAuth, useMediaQuery
│           └── lib/         # API client, cn() utility, query-string builder
├── docs/
│   ├── API_CONTRACT.md      # authoritative API specification
│   └── DESIGN_SYSTEM.md     # design tokens, layout, component catalog
└── pharmacy.sql             # legacy schema preserved for reference
```

<br>

## API (port 4000)

Base URL: `http://localhost:4000/api`. Full contract in [docs/API_CONTRACT.md](docs/API_CONTRACT.md).

Health check (unauthenticated): `GET /api/health` → `{ "status": "ok", "uptime": ... }`

All protected endpoints require `Authorization: Bearer <jwt>`. Refresh token lives in the `mt_refresh` httpOnly cookie.

<br>

## Design

Tokens and component specification in [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md). Calm clinical aesthetic (Linear/Stripe-like), light and dark themes via CSS custom properties on `:root` / `.dark`, Inter font, WCAG AA contrast.

<br>

## License

This project is a complete rebuild of the original Java Swing + MySQL pharmacy project. Original `pharmacy.sql` schema preserved for reference.
