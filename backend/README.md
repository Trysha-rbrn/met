# Backend - MET API

Express + TypeScript API for MET Finance Tracker.

This service provides authentication, role-based authorization, finance domain logic, and PostgreSQL persistence through Prisma.

## Stack

- Node.js 22+
- Express 5
- TypeScript (ESM)
- Prisma ORM
- PostgreSQL
- JWT + bcrypt

## Project Structure

```text
backend/
|- prisma/
|  |- schema.prisma
|  `- migrations/
|- src/
|  |- config/
|  |- controllers/
|  |- middleware/
|  |- routes/
|  `- lib/
|- Dockerfile
|- package.json
`- README.md
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `backend/.env`.

Required:

```env
DATABASE_URL=postgresql://met_user:met_password@localhost:5432/met_db?schema=public
JWT_SECRET=replace_with_a_strong_secret
```

### 3. Apply migrations and generate Prisma client

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Start development server

```bash
npm run dev
```

Server defaults to `http://0.0.0.0:3000`.

Health check:

```http
GET /health
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string for Prisma |
| `JWT_SECRET` | Yes | - | Secret used to sign JWT tokens |
| `NODE_ENV` | No | `development` | Runtime mode |
| `HOST` | No | `0.0.0.0` | Bind host |
| `PORT` | No | `3000` | API port |
| `JWT_EXPIRES_IN` | No | `7d` | JWT TTL |
| `BCRYPT_ROUNDS` | No | `10` | Password hashing rounds |
| `CORS_ORIGINS` | No | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated allowed origins |
| `ALLOW_PRIVATE_NETWORK_ORIGINS` | No | `false` | Allows private/LAN origins in dev mode |
| `AUTH_RATE_LIMIT_WINDOW_MS` | No | `900000` | Auth rate-limit window in ms |
| `AUTH_RATE_LIMIT_MAX` | No | `20` | Max auth requests per window |
| `ADMIN_EMAILS` | No | empty | Comma-separated emails auto-assigned `ADMIN` on registration |
| `PREMIUM_ACCESS_CODE` | No | empty | Manual premium activation code |
| `BILLING_WEBHOOK_SECRET` | No | empty | Secret header validation for billing webhook |

## NPM Scripts

- `npm run dev` - start API in watch mode
- `npm run start` - start API once via `tsx`
- `npm run typecheck` - TypeScript type check
- `npm run check` - typecheck quality gate (not a unit test suite)
- `npm run prisma:generate` - generate Prisma client
- `npm run test:security` - `npm audit --audit-level=high`

Note: there is currently no automated backend unit/integration test suite in this repository.

## API Overview

Base path: `/api`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `PUT /auth/profile`
- `DELETE /auth/profile`
- `POST /auth/reset-data`
- `PATCH /auth/benchmark-preference`

### Subscription and Billing

- `GET /auth/subscription`
- `POST /auth/activate-premium`
- `POST /auth/subscription/upgrade`
- `POST /auth/subscription/downgrade`
- `POST /auth/subscription/resume`
- `POST /auth/billing-hook`

### Accounts

- `GET /accounts`
- `POST /accounts`

### Transactions

- `GET /transactions`
- `GET /transactions/summary`
- `POST /transactions`
- `PUT /transactions/:id`
- `DELETE /transactions/:id`
- `GET /transactions/insights` (Premium/Admin)
- `GET /transactions/benchmark` (Premium/Admin)
- `PATCH /transactions/bulk/category` (Premium/Admin)
- `POST /transactions/:id/split` (Premium/Admin)
- `GET /transactions/recurring` (Premium/Admin)
- `POST /transactions/recurring` (Premium/Admin)
- `PUT /transactions/recurring/:id` (Premium/Admin)
- `DELETE /transactions/recurring/:id` (Premium/Admin)
- `POST /transactions/recurring/run-due` (Premium/Admin)

### Categories and Budgets

- `GET /categories`
- `POST /categories`
- `PUT /categories/:id`
- `DELETE /categories/:id`
- `GET /categories/rules` (Premium/Admin)
- `POST /categories/rules` (Premium/Admin)
- `PATCH /categories/rules/:id` (Premium/Admin)
- `DELETE /categories/rules/:id` (Premium/Admin)
- `GET /categories/budgets` (Premium/Admin)
- `POST /categories/budgets` (Premium/Admin)
- `PATCH /categories/budgets/:id` (Premium/Admin)
- `DELETE /categories/budgets/:id` (Premium/Admin)

### Data Transfer Logs

- `GET /data-transfer`
- `POST /data-transfer`

### Admin

All `/admin` endpoints require `ADMIN` role.

- `GET /admin/users`
- `GET /admin/users/:id`
- `PATCH /admin/users/:id/ban`
- `PATCH /admin/users/:id/role`
- `DELETE /admin/users/:id`
- `GET /admin/audit-logs`
- `GET /admin/promo-codes`
- `POST /admin/promo-codes`
- `PATCH /admin/promo-codes/:id/state`

## Role and Access Model

- `BASIC`: default user role
- `PREMIUM`: advanced finance features
- `ADMIN`: administration and moderation capabilities

Premium/Admin-only routes are enforced through middleware.

## Docker

Build image:

```bash
docker build -t met-backend ./backend
```

Run container:

```bash
docker run --rm -p 3000:3000 --env-file backend/.env met-backend
```

## Public Repo Notes

- Do not commit `.env` files.
- Rotate all secrets before public release.
- Restrict production CORS origins.
- Keep webhook secrets private.

## Troubleshooting

### Prisma generate fails on Windows with `EPERM`

1. Stop running backend processes that may lock Prisma engine files.
2. Run:

```bash
npx prisma generate
```

### CORS errors in local network testing

- Include frontend origin in `CORS_ORIGINS`.
- For dev-only LAN testing, set `ALLOW_PRIVATE_NETWORK_ORIGINS=true`.
