# MediTrack API Contract (v1)

Base URL: `http://localhost:4000/api`. All bodies are JSON. All list endpoints
return an envelope; all errors return a consistent shape.

## Conventions

- Money is a `number` in INR with 2-decimal precision.
- Dates/timestamps are ISO-8601 strings (`2026-08-03T16:34:13.000Z`).
- Plain dates (production/expiry) are `YYYY-MM-DD`.
- Success (single): the resource object directly.
- Success (list): `{ "data": [...], "page": 1, "pageSize": 20, "total": 137 }`
- Error: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }`
  - Codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403),
    `NOT_FOUND` (404), `CONFLICT` (409), `INSUFFICIENT_STOCK` (409),
    `INTERNAL` (500).
- Common list query params: `page` (default 1), `pageSize` (default 20, max 100),
  `search`, `sort` (`field:asc|desc`).

## Auth

JWT bearer. Access token (15 min) in `Authorization: Bearer <token>`;
refresh token (7 days) in an httpOnly cookie named `mt_refresh`.

Roles: `ADMIN`, `PHARMACIST`.

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| POST | `/auth/login` | public | `{ email, password }` -> `{ accessToken, user }` |
| POST | `/auth/refresh` | cookie | -> `{ accessToken, user }` |
| POST | `/auth/logout` | auth | clears refresh cookie |
| GET | `/auth/me` | auth | -> `User` |
| PATCH | `/auth/password` | auth | `{ currentPassword, newPassword }` |

Seeded admin: `admin@meditrack.dev` / `Admin@123`.
Seeded pharmacist: `mark@meditrack.dev` / `Mark@123`.

### User

```json
{
  "id": "clx...", "name": "Admin", "email": "admin@meditrack.dev",
  "role": "ADMIN", "phone": "9800000000", "address": "Someplace India",
  "dob": "1995-12-23", "salary": 50000, "active": true,
  "createdAt": "...", "updatedAt": "..."
}
```

## Users (ADMIN only, except `GET /users` which any role may call for the
message recipient picker — it returns `id`, `name`, `email`, `role` only for
PHARMACIST callers)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/users` | list, `search` on name/email, filter `role`, `active` |
| POST | `/users` | `{ name, email, password, role, phone?, address?, dob?, salary? }` |
| GET | `/users/:id` | |
| PATCH | `/users/:id` | any subset of the above, plus `active` |
| DELETE | `/users/:id` | soft delete (`active=false`); 409 on self-delete |

## Companies (suppliers)

`{ id, name, address, phone, email, drugCount, createdAt, updatedAt }`

| Method | Path | Role |
| --- | --- | --- |
| GET | `/companies` | auth |
| POST | `/companies` | ADMIN |
| GET | `/companies/:id` | auth |
| PATCH | `/companies/:id` | ADMIN |
| DELETE | `/companies/:id` | ADMIN — 409 if drugs/purchases reference it |

## Drugs (inventory)

```json
{
  "id": "clx...", "name": "Novalo", "barcode": "8901234567890",
  "type": "TABLET", "dose": "500mg", "code": "3d00",
  "costPrice": 2, "sellingPrice": 3,
  "companyId": "clx...", "company": { "id": "...", "name": "Med City" },
  "productionDate": "2025-03-03", "expirationDate": "2027-03-03",
  "place": "N-Right", "quantity": 40, "reorderLevel": 10,
  "status": "IN_STOCK",
  "createdAt": "...", "updatedAt": "..."
}
```

- `type` enum: `TABLET`, `CAPSULE`, `SYRUP`, `INJECTION`, `OINTMENT`, `DROPS`, `INHALER`, `OTHER`.
- `status` is derived server-side: `EXPIRED` (expirationDate < today) >
  `OUT_OF_STOCK` (quantity === 0) > `EXPIRING_SOON` (expires within 90 days) >
  `LOW_STOCK` (quantity <= reorderLevel) > `IN_STOCK`.

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET | `/drugs` | auth | `search` (name/barcode/code), `companyId`, `type`, `status`, `sort` |
| POST | `/drugs` | ADMIN | 409 on duplicate barcode |
| GET | `/drugs/:id` | auth | |
| GET | `/drugs/barcode/:barcode` | auth | POS scan lookup |
| PATCH | `/drugs/:id` | ADMIN | |
| DELETE | `/drugs/:id` | ADMIN | 409 if referenced by sale items |
| GET | `/drugs/alerts` | auth | `{ lowStock: Drug[], expiringSoon: Drug[], expired: Drug[] }` |

## Purchases (stock in)

Creating a purchase **increments** `drug.quantity` atomically.

```json
{
  "id": "clx...", "reference": "PO-2026-0001",
  "companyId": "...", "company": { "id": "...", "name": "Cipla" },
  "userId": "...", "user": { "id": "...", "name": "Admin" },
  "notes": "Monthly restock", "total": 800,
  "items": [
    { "id": "...", "drugId": "...", "drug": { "id": "...", "name": "Novalo", "barcode": "..." },
      "quantity": 40, "unitCost": 2, "amount": 80 }
  ],
  "createdAt": "..."
}
```

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET | `/purchases` | auth | `search` (reference/company), `companyId`, `from`, `to` |
| POST | `/purchases` | ADMIN | `{ companyId, notes?, items: [{ drugId, quantity, unitCost }] }` |
| GET | `/purchases/:id` | auth | |

## Sales (POS) + invoices

Creating a sale **decrements** `drug.quantity` atomically inside one
transaction; rejects with `INSUFFICIENT_STOCK` if any line exceeds stock and
with `VALIDATION_ERROR` if any drug is expired.

```json
{
  "id": "clx...", "invoiceNo": "INV-2026-0001",
  "userId": "...", "user": { "id": "...", "name": "Admin" },
  "customerName": "Walk-in", "customerPhone": "",
  "paymentMode": "CASH",
  "subtotal": 240, "discount": 10, "taxRate": 5, "tax": 11.5, "total": 241.5,
  "items": [
    { "id": "...", "drugId": "...", "name": "novafol", "barcode": "...",
      "dose": "normal", "quantity": 6, "unitPrice": 40, "amount": 240 }
  ],
  "createdAt": "..."
}
```

- `paymentMode` enum: `CASH`, `CARD`, `UPI`.
- `tax = round((subtotal - discount) * taxRate / 100, 2)`;
  `total = subtotal - discount + tax`. Server recomputes and ignores
  client-sent totals.

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| GET | `/sales` | auth | `search` (invoiceNo/customer), `userId`, `paymentMode`, `from`, `to`; PHARMACIST sees own sales only |
| POST | `/sales` | auth | `{ customerName?, customerPhone?, paymentMode, discount?, taxRate?, items: [{ drugId, quantity }] }` |
| GET | `/sales/:id` | auth | full invoice |

## Messages (internal inbox)

`{ id, fromUser: {id,name}, toUser: {id,name}, body, readAt, createdAt }`

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/messages` | `box=inbox\|sent` (default `inbox`) |
| POST | `/messages` | `{ toUserId, body }` |
| PATCH | `/messages/:id/read` | marks own received message read |
| GET | `/messages/unread-count` | `{ count: 3 }` |

## Dashboard + reports

| Method | Path | Response |
| --- | --- | --- |
| GET | `/dashboard/summary` | KPIs + trend + alert counts (below) |
| GET | `/reports/sales` | `?from&to&groupBy=day\|month` -> `{ data: [{ period, revenue, orders, units }], totals: {...} }` |
| GET | `/reports/top-drugs` | `?from&to&limit=5` -> `{ data: [{ drugId, name, units, revenue }] }` |
| GET | `/reports/inventory-value` | `{ costValue, retailValue, potentialProfit, byType: [{ type, units, costValue, retailValue }] }` |

`GET /dashboard/summary`:

```json
{
  "revenueToday": 1240.5, "revenueMonth": 38210,
  "ordersToday": 12, "ordersMonth": 310,
  "drugCount": 42, "companyCount": 6, "userCount": 4,
  "inventoryValue": 91500,
  "alerts": { "lowStock": 3, "expiringSoon": 5, "expired": 1 },
  "revenueTrend": [{ "date": "2026-07-05", "revenue": 900, "orders": 7 }],
  "topDrugs": [{ "drugId": "...", "name": "novafol", "units": 34, "revenue": 1360 }],
  "recentSales": [{ "id": "...", "invoiceNo": "INV-2026-0031", "customerName": "Walk-in", "total": 241.5, "createdAt": "..." }]
}
```

`revenueTrend` covers the last 30 days, zero-filled.

## Health

`GET /health` -> `{ "status": "ok", "uptime": 123.4 }` (unauthenticated).
