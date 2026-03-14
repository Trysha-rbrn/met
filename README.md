# MET - Micro Economics Tool

MET je full-stack aplikacija za pracenje licnih finansija (income/expense), sa autentikacijom, kategorijama, vise naloga i dashboard analitikom.

## Stack
- Frontend: React + Vite + TypeScript + TailwindCSS v4 + Framer Motion + Recharts + React Toastify
- Backend: Node.js + Express + TypeScript
- Auth: JWT + bcrypt
- Baza: PostgreSQL + Prisma ORM
- Lokalno okruzenje: Docker Compose

## Folderi
- `frontend/` React aplikacija
- `backend/` API + Prisma

## Brzi Start
1. Pokreni bazu iz root-a projekta:
```bash
docker compose up -d
```
2. Pokreni backend:
```bash
cd backend
npm run dev
```
3. Pokreni frontend u novom terminalu:
```bash
cd frontend
npm run dev
```
4. Otvori app:
- `http://localhost:5173`

## Pristup sa telefona (dok je laptop upaljen)
1. Laptop i telefon moraju biti na istoj Wi-Fi mrezi.
2. Frontend je vec podesen da slusa na mrezi (`vite --host`).
3. Nadji lokalni IP laptopa (npr. `ipconfig` -> `192.168.1.25`).
4. Na telefonu otvori:
- `http://<IP_LAPTOPA>:5173`
- primer: `http://192.168.1.25:5173`
5. Ako ne radi, proveri firewall pravila za portove `5173` i `3000`.

Napomena:
- Frontend API URL je dinamicki i koristi host iz browsera (`http://<host>:3000/api`) ako nije zadat `VITE_API_BASE_URL`.

## Najvaznije funkcije
- Auth: register/login/getMe/update profile/delete account
- Transactions: CRUD + kategorija + account vezivanje
- Categories: hijerarhija (category/subcategory)
- Dashboard: trenutno stanje + period filteri + grafikoni (`1D`, `7D`, `30D`, `YTD`, `ALL`, `CUSTOM`)
- Theme: bira se iskljucivo u `Settings` (`system`, `light`, `dark`)
- Settings:
  - promena display name
  - promena valute
  - promena lozinke (`current password` + `new password`)
  - brisanje naloga uz potvrdu lozinkom
- Notifikacije: globalno preko React Toastify
- Currencies: USD, EUR, CAD, RUB, RSD, TRY

## Account sistem (bank style)
- Svaki novi korisnik automatski dobija default nalog: `Primary`
- Korisnik moze da ima maksimalno 3 naloga
- Preporuceni nazivi:
  - `Primary`
  - `Savings`
  - `Reserve`
- Kreiranje naloga je dostupno na `Transactions` stranici
- Transakcije i Dashboard se gledaju po aktivnom nalogu

## Navigacija (frontend)
- `/` Dashboard (analitika i stanje za aktivni nalog)
- `/transactions` Pregled transakcija + New Transaction + Account selector
- `/categories` Upravljanje kategorijama
- `/settings` Podešavanja profila, teme i bezbednosti

## API Endpoints (backend)
### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
  - podrzava: `name`, `currentPassword`, `newPassword`
- `DELETE /api/auth/profile`
  - zahteva: `password`

### Accounts
- `GET /api/accounts`
- `POST /api/accounts`

### Transactions
- `GET /api/transactions?accountId=...`
- `GET /api/transactions/summary?accountId=...`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`

### Categories
- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`

## Prisma / Migracije
Schema: `backend/prisma/schema.prisma`

Nova migracija za account sistem:
- `backend/prisma/migrations/20260314103000_add_accounts/migration.sql`

Posle pull-a obavezno:
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

Ako `prisma generate` padne sa `EPERM` na Windows-u:
- ugasi backend proces koji drzi Prisma engine lock (`npm run dev`),
- pa ponovi `npx prisma generate`.

## Napomene za dalji rad
- Aktivni account: `localStorage['met_account_id']`
- Token: `localStorage['met_token']`
- Theme mode: `localStorage['met_theme_mode']` (`system|light|dark`)
- Valuta: `localStorage['met_currency']`

## Dizajn
- Primarna paleta sajta:
  - `#fce3f7`
  - `#ff9eff`
  - `#dc89e1`
  - `#a569b0`
  - `#6a4d8b`
- Income ostaje zelen, expense ostaje crven.

## Author
- Trysha-rbrn
- GitHub: https://github.com/Trysha-rbrn

## Footer i Branding
- Globalni responsive footer je ukljucen i za auth i za app layout.
- Footer je uvek na kraju stranice (`mt-auto` u flex layout-u) i ima jasnu gornju separator liniju.
- Footer obavezno prikazuje:
  - ime projekta: `MET Finance Tracker`
  - godinu: `2026`
  - napomenu o AI asistenciji: `OpenAI, Gemini, Claude`

## Metadata za Deployment
- `frontend/index.html` sadrzi pripremljene meta tagove:
  - SEO: `description`, `keywords`, `author`, `robots`, `theme-color`, `application-name`
  - Open Graph: `og:type`, `og:title`, `og:description`, `og:site_name`, `og:image`
  - Twitter: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
  - AI disclosure: `meta name="ai-assisted"`
- Pre produkcije dopuni:
  - `og:url` sa produkcionim domenom
  - `canonical` link
  - dedicated social preview sliku umesto `favicon.svg`

## Troubleshooting: Login sa Telefona
Ako na telefonu dobijes "An unexpected error occurred" ili poruku da server nije dostupan:
- Proveri da su laptop i telefon na istoj Wi-Fi mrezi.
- Backend mora da radi i da slusa na `HOST=0.0.0.0` i `PORT=3000`.
- U `.env` backend-a drzi `ALLOW_PRIVATE_NETWORK_ORIGINS=true` za development.
- `CORS_ORIGINS` treba da sadrzi tvoju LAN adresu frontend-a (npr. `http://192.168.8.25:5173`).
- Ako i dalje ne radi, otvori Windows Firewall za port `3000` (backend) i `5173` (frontend).

## Session Pravila (Bezbednost)
- Token sada sadrzi server-instance identifikator (`sid`).
- Posle restarta backend servera, svi prethodno izdati tokeni postaju nevalidni i korisnici se automatski izloguju pri sledecoj proveri.
- Frontend radi heartbeat proveru sesije na svakih 15 sekundi (`/api/auth/me`) i pri `401` radi auto-logout.
- Ako korisnik izgubi konekciju (offline -> online), aplikacija obavezno radi logout i trazi novo logovanje.

## GitHub Actions (CI/CD)
Repo sada ima workflow-e za automatizaciju kvaliteta, sigurnosti, dokumentacije i Docker image-a:

- `.github/workflows/ci.yml`
  - Frontend: `npm ci`, `lint`, `typecheck`, `build`
  - Backend: `npm ci`, `prisma generate`, `typecheck`

- `.github/workflows/security.yml`
  - `npm audit` (high+) za frontend i backend
  - CodeQL analiza za JavaScript/TypeScript

- `.github/workflows/docs.yml`
  - Automatski generise docs artefakte (`docs/auto`) putem `scripts/generate-docs.mjs`
  - Uploaduje artefakt na svaki PR/push/main/manual run

- `.github/workflows/docker.yml`
  - Gradi Docker image-e za frontend i backend
  - Na `main` push-u publikuje na GHCR:
    - `ghcr.io/<owner>/met-backend`
    - `ghcr.io/<owner>/met-frontend`

## Docker fajlovi
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/nginx.conf` (SPA fallback)
- `.dockerignore` fajlovi za oba servisa
