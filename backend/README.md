# Backend (API)

Express + TypeScript + Prisma API za MET Finance Tracker.

## Stack
- Node.js + Express
- TypeScript (ESM)
- Prisma ORM + PostgreSQL
- JWT autentikacija + bcrypt

## Pokretanje
1. Instalacija:
```bash
npm install
```
2. Pokretanje development servera:
```bash
npm run dev
```

API je podrazumevano na:
- `http://localhost:3000`

Health check:
- `GET /health`

## Env promenljive
Minimalno:
- `DATABASE_URL`
- `JWT_SECRET`

Koriscene promenljive:
- `NODE_ENV` (`development`/`production`)
- `HOST` (npr. `0.0.0.0`)
- `PORT` (npr. `3000`)
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN` (npr. `7d`)
- `BCRYPT_ROUNDS` (npr. `12`)
- `CORS_ORIGINS` (comma-separated lista origin-a)
- `ALLOW_PRIVATE_NETWORK_ORIGINS` (`true` samo za dev LAN testiranje)
- `AUTH_RATE_LIMIT_WINDOW_MS` (npr. `900000`)
- `AUTH_RATE_LIMIT_MAX` (npr. `20`)

## Bezbednosna pravila
- Login/Register imaju rate limit.
- CORS radi preko whitelist-e.
- Validacija inputa je dodata za auth i transaction rute.
- Globalni error handler vraca genericke 500 greske.
- JWT token sadrzi server `sid`; nakon restarta servera svi prethodni tokeni postaju nevalidni.

## Glavne rute
Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `DELETE /api/auth/profile`

Accounts:
- `GET /api/accounts`
- `POST /api/accounts`

Transactions:
- `GET /api/transactions`
- `GET /api/transactions/summary`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`

Categories:
- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`

## Prisma
Schema:
- `prisma/schema.prisma`

Komande:
```bash
npx prisma migrate dev
npx prisma generate
```

## Admin role i panel
- Role sistem: `BASIC` i `ADMIN`.
- `ADMIN` se dodeljuje pri registraciji ako je email u `ADMIN_EMAILS`.
- Novi middleware: `auth` puni `userId` + `userRole` i blokira banovane korisnike.
- Novi admin routes (`/api/admin`):
  - `GET /users`
  - `GET /users/:id`
  - `PATCH /users/:id/ban`
  - `DELETE /users/:id`
  - `GET /audit-logs`

## Audit
- Dodata `AuditLog` tabela za kljucne user/admin akcije.

## Dodatni env
- `ADMIN_EMAILS` (comma-separated lista admin email adresa)

## Premium
- Novi env parametar: `PREMIUM_ACCESS_CODE`
- Novi env parametar: `BILLING_WEBHOOK_SECRET`
- Endpoint: `POST /api/auth/activate-premium` (`{ code }`)
- Endpoint: `GET /api/auth/subscription`
- Endpoint: `POST /api/auth/subscription/upgrade` (`{ billingInterval, code? }`)
- Endpoint: `POST /api/auth/subscription/downgrade` (`{ immediate? }`)
- Endpoint: `POST /api/auth/subscription/resume`
- Endpoint: `POST /api/auth/billing-hook` (`x-billing-hook-secret`)
- Account limit po roli:
  - BASIC: 3
  - PREMIUM: 10
  - ADMIN: 20
- Billing hook event-ovi:
  - `subscription.activated`
  - `subscription.renewed`
  - `subscription.canceled`
  - `subscription.expired`
  - `subscription.payment_failed`

## Billing webhook primeri

Header:
- `x-billing-hook-secret: <BILLING_WEBHOOK_SECRET>`

### `subscription.activated`
```json
{
  "eventId": "evt_sub_activated_001",
  "type": "subscription.activated",
  "userId": "11111111-1111-1111-1111-111111111111",
  "externalSubscriptionId": "sub_demo_001",
  "billingInterval": "MONTHLY",
  "currentPeriodStart": "2026-03-14T10:00:00.000Z",
  "currentPeriodEnd": "2026-04-14T10:00:00.000Z",
  "occurredAt": "2026-03-14T10:00:01.000Z"
}
```

### `subscription.payment_failed`
```json
{
  "eventId": "evt_sub_failed_001",
  "type": "subscription.payment_failed",
  "externalSubscriptionId": "sub_demo_001",
  "billingInterval": "MONTHLY",
  "occurredAt": "2026-03-20T08:30:00.000Z"
}
```

### `subscription.expired`
```json
{
  "eventId": "evt_sub_expired_001",
  "type": "subscription.expired",
  "externalSubscriptionId": "sub_demo_001",
  "occurredAt": "2026-04-14T10:05:00.000Z"
}
```

### PowerShell test poziv
```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/auth/billing-hook" `
  -Headers @{ "x-billing-hook-secret" = "<BILLING_WEBHOOK_SECRET>" } `
  -ContentType "application/json" `
  -Body (@{
    eventId = "evt_sub_activated_001"
    type = "subscription.activated"
    userId = "11111111-1111-1111-1111-111111111111"
    externalSubscriptionId = "sub_demo_001"
    billingInterval = "MONTHLY"
    currentPeriodStart = "2026-03-14T10:00:00.000Z"
    currentPeriodEnd = "2026-04-14T10:00:00.000Z"
    occurredAt = "2026-03-14T10:00:01.000Z"
  } | ConvertTo-Json)
```
