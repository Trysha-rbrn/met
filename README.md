# MET - Finance Tracker

A full-stack personal finance platform for tracking income, expenses, budgets, subscriptions, and account-level analytics.

MET is built as a production-style monorepo with a React frontend, an Express API, PostgreSQL, Prisma ORM, Docker support, and CI/CD workflows.

## Highlights

- JWT authentication with profile management
- Multi-account finance tracking (Primary, Savings, etc.)
- Transaction management with summaries and charts
- Recurring transactions (Premium/Admin)
- Category rules, bulk category assignment, and split transactions (Premium/Admin)
- Budget goals and monthly budget tracking (Premium/Admin)
- Data transfer logs for import/export actions
- Role system: `BASIC`, `PREMIUM`, `ADMIN`
- Admin panel endpoints (user management, audit logs, promo codes)
- Docker image build pipeline and security workflows

## Monorepo Structure

```text
.
|- backend/      # Express + TypeScript + Prisma API
|- frontend/     # React + Vite + TypeScript app
|- docs/         # generated/auxiliary documentation artifacts
|- scripts/      # repo utility scripts
|- .github/      # CI/CD workflows
`- docker-compose.yml  # local PostgreSQL service
```

## Tech Stack

- Frontend: React 19, Vite, TypeScript, Tailwind CSS v4, Recharts, Framer Motion
- Backend: Node.js, Express 5, TypeScript, Prisma
- Database: PostgreSQL 15
- Auth/Security: JWT, bcrypt, CORS policy, rate limiting
- CI/CD: GitHub Actions (CI, Security, Docker, Docs)
- Containers: Docker, Docker Compose

## Quick Start

### 1. Prerequisites

- Node.js 22+
- npm 10+
- Docker (for local PostgreSQL)

### 2. Start PostgreSQL

From repository root:

```bash
docker compose up -d
```

This starts PostgreSQL on `localhost:5432` with the credentials from `docker-compose.yml`.

### 3. Configure backend environment

Create `backend/.env` with at least:

```env
DATABASE_URL=postgresql://met_user:met_password@localhost:5432/met_db?schema=public
JWT_SECRET=replace_with_a_strong_secret
```

Optional values are documented in [backend/README.md](./backend/README.md).

### 4. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 5. Run database migration and Prisma client generation

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 6. Start apps

In one terminal:

```bash
cd backend
npm run dev
```

In another terminal:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`.

## Local URLs

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- Health check: `GET http://localhost:3000/health`
- PostgreSQL: `localhost:5432`

## Main Product Areas

- Authentication and account/profile lifecycle
- Account-scoped transactions and summaries
- Categories, rules, and budget planning
- Premium-only analytics and automation
- Admin moderation and audit tooling

For endpoint-level documentation, see [backend/README.md](./backend/README.md).

## Available Scripts

### Root

- Database startup is handled via `docker compose up -d`

### Frontend

- `npm run dev`
- `npm run lint`
- `npm run typecheck`
- `npm run check`
- `npm run build`
- `npm run preview`

### Backend

- `npm run dev`
- `npm run start`
- `npm run typecheck`
- `npm run check`
- `npm run prisma:generate`

Note: `npm run check` is the current quality gate in both projects (lint/typecheck). Automated unit/integration test suites are not set up yet.

## CI/CD Workflows

Defined in `.github/workflows`:

- `ci.yml` - frontend/backend install, checks, and build
- `security.yml` - npm audit + CodeQL
- `docker.yml` - Docker image build (and push to GHCR on `main`)
- `docs.yml` - auto-generated docs artifact
- `post-deploy-smoke.yml` - post-push Render health and CORS smoke checks
- `uptime-monitor.yml` - scheduled backend uptime monitor with GitHub issue alerting

## Deployment Automation Setup

To enable smoke tests and uptime alerting, configure repository secrets in GitHub:

- `RENDER_HEALTH_URL` (example: `https://ekonomija-backend.onrender.com/health`)
- `RENDER_API_BASE_URL` (example: `https://ekonomija-backend.onrender.com/api`)
- `FRONTEND_ORIGIN` (example: `https://met-five.vercel.app`)

For frontend preview deployments, `frontend/src/api/baseUrl.ts` now supports:

- `VITE_API_BASE_URL` (preferred explicit API base for build envs)
- `VITE_VERCEL_FALLBACK_API_BASE_URL` (optional fallback for `*.vercel.app` hosts)

## Public Repository Readiness Checklist

Before publishing broadly, verify:

1. No secrets or private tokens are committed.
2. `backend/.env` is excluded and never tracked.
3. A proper `LICENSE` file is added at repo root.
4. Production values are set for CORS, JWT secret, and database credentials.
5. GHCR/package permissions match your publication model.

## Security

Security policy and reporting notes are in [SECURITY.md](./SECURITY.md).

## Maintainer

- GitHub: [@Trysha-rbrn](https://github.com/Trysha-rbrn)
