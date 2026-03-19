# Frontend - MET Web App

React + Vite + TypeScript client for MET Finance Tracker.

The frontend provides authenticated finance workflows, dashboard analytics, premium feature UX, and admin-only views.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- React Router
- Axios
- Recharts
- Framer Motion
- React Toastify

## Project Structure

```text
frontend/
|- public/
|- src/
|  |- api/
|  |- components/
|  |- pages/
|  |- lib/
|  |- assets/
|  `- main.tsx
|- Dockerfile
|- nginx.conf
|- package.json
`- README.md
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure API base URL (optional)

Create `frontend/.env` if needed:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

If omitted, the app falls back to runtime host-based API resolution.

### 3. Start development server

```bash
npm run dev
```

Open:

- `http://localhost:5173`

The dev server uses `vite --host`, so LAN testing on mobile is supported.

## NPM Scripts

- `npm run dev` - start Vite dev server
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript project checks
- `npm run check` - lint + typecheck (quality gate, not unit tests)
- `npm run build` - production build
- `npm run preview` - preview production build
- `npm run test:security` - `npm audit --audit-level=high`

Note: there is currently no automated frontend unit/integration test suite in this repository.

## Application Routes

- `/` - Dashboard
- `/transactions` - transaction management and account selection
- `/categories` - categories, rules, and budgets
- `/settings` - profile, theme, security, subscription controls
- `/admin` - admin panel (visible only for `ADMIN` users)

## Core Frontend Features

- Auth session bootstrap and protected app shell
- Theme modes: `system`, `light`, `dark`
- Account-scoped dashboard metrics and charts
- Transaction CRUD workflows
- Premium workflows (insights, advanced operations)
- Data transfer actions (import/export logging integration)
- Admin-only navigation and pages
- Responsive layout (desktop sidebar + mobile bottom navigation)
- Session handling on connectivity changes and token invalidation

## Local Storage Keys

- `met_token`
- `met_user_role`
- `met_theme_mode`
- `met_currency`
- `met_account_id`

`met_theme_mode` and `met_currency` are user preferences set from the Settings page (`/settings`) and persisted automatically after the user updates those options.

## API Integration

Client API modules are in `src/api/`:

- `authApi.ts`
- `accountsApi.ts`
- `transactionsApi.ts`
- `categoriesApi.ts`
- `dataTransferApi.ts`
- `adminApi.ts`

Base URL resolution is handled in `src/api/baseUrl.ts`.

## Build and Deployment

### Static build

```bash
npm run build
npm run preview
```

### Docker image

```bash
docker build -t met-frontend ./frontend
```

Container serves production assets via Nginx (`frontend/nginx.conf`).

## Public Repo Notes

- Keep `.env` files out of version control.
- Verify all branding, metadata, and social preview values before release.
- Ensure production backend URL is configured via environment variables.

## Troubleshooting

### Frontend cannot reach backend

- Confirm backend is running on port `3000`.
- Set `VITE_API_BASE_URL` explicitly when needed.
- Check backend CORS configuration.

### Mobile/LAN access issues

- Ensure device and development machine are on the same network.
- Open ports `5173` (frontend) and `3000` (backend) in firewall if needed.
