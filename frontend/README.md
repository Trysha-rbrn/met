# Frontend (Web App)

React + Vite + TypeScript klijentska aplikacija za MET Finance Tracker.

## Stack
- React 19 + TypeScript
- Vite
- TailwindCSS v4
- Framer Motion
- Recharts
- React Toastify
- Axios

## Pokretanje
1. Instalacija:
```bash
npm install
```
2. Dev server:
```bash
npm run dev
```
3. Otvori:
- `http://localhost:5173`

Za pristup sa telefona (ista mreza):
- `npm run dev` vec koristi `vite --host`
- otvori `http://<LAN_IP_LAPTOPA>:5173`

## API povezivanje
Frontend koristi:
- `VITE_API_BASE_URL` ako je definisan
- inace runtime fallback: `http://<browser-host>:3000/api`

Implementacija:
- `src/api/baseUrl.ts`

## Glavne stranice
- `/` Dashboard
- `/transactions` Transactions + account picker + kreiranje transakcija
- `/categories` Upravljanje kategorijama
- `/settings` Profil, tema, valuta, bezbednost

## UX/Session ponasanje
- Tema: `system`/`light`/`dark` (menja se u Settings)
- Sidebar je collapsible (desktop), postoji mobile bottom nav.
- Footer je responsive i uvek na dnu layout-a.
- Toast notifikacije su globalne (`react-toastify`).
- Ako korisnik izgubi konekciju pa se vrati online -> auto logout i potreban novi login.
- Heartbeat proverava sesiju periodicno; na `401` korisnik se izloguje.

## Lokalni storage kljucevi
- `met_token`
- `met_theme_mode`
- `met_currency`
- `met_account_id`

## Build
```bash
npm run build
npm run preview
```
