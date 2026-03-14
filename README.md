# MET - Micro Economics Tool

MET je full-stack aplikacija za pracenje licnih finansija (income/expense), sa autentikacijom, kategorijama, vise naloga i dashboard analitikom.

## Stack
- Frontend: React + Vite + TypeScript + TailwindCSS v4 + Framer Motion + Recharts
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

## Najvaznije funkcije
- Auth: register/login/getMe/update profile/delete account
- Transactions: CRUD + kategorija + account vezivanje
- Categories: hijerarhija (category/subcategory)
- Dashboard: trenutno stanje + period filteri + grafikoni (`1D`, `7D`, `30D`, `YTD`, `ALL`, `CUSTOM`)
- Theme: dark/light toggle u dnu sidebara
- Settings: profil, valuta, lozinka, delete account
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
- `/settings` Podešavanja profila i valute

## API Endpoints (backend)
### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `DELETE /api/auth/profile`

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
- Aktivni account se cuva u `localStorage` kao `met_account_id`
- Token je u `localStorage` kao `met_token`
- Theme je u `localStorage` kao `met_theme`
- Preferirana valuta je u `localStorage` kao `met_currency`

## Poznati UX detalji
- Sidebar collapse je optimizovan, ali dashboard grafikoni su i dalje najtezi deo UI-ja (Recharts resize)
- Tema toggle je namerno premestena u donji levi deo sidebara i ostaje vidljiva i kad je sidebar suzen

## Author
- Trysha-rbrn
- GitHub: https://github.com/Trysha-rbrn
