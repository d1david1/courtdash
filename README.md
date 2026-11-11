# CourtDash — bookings & revenue dashboard

A management dashboard for a small sports venue (a four-court padel & tennis
club), showing revenue, bookings, occupancy and busiest times at a glance.

Built with **React (Vite) + Recharts** on the front end and
**Node.js/Express + SQLite** on the back end, with password login
(bcrypt-hashed, HMAC-signed session cookies). All reporting is plain SQL —
aggregates, joins and GROUP BY over a realistic seeded dataset.

**Demo login:** `demo@courtdash.app` / `demo1234`

## What's on the dashboard

- **KPI tiles** — revenue, bookings, occupancy and average booking value for
  the selected range, each with the change vs the previous period.
- **Revenue by day** — line chart with crosshair tooltips.
- **Revenue by court** — ranked bars, coloured by sport, direct-labelled.
- **Busiest times** — weekday × hour heatmap, darker = more bookings.
- **Top customers** and **recent bookings** tables (with booking status).
- **One date-range filter row** (7 / 30 / 90 days) that scopes everything
  below it, so every number on the page agrees.
- Every chart has a **table view** toggle, so no value depends on hover or
  on telling colours apart.

## Run it locally

```bash
# 1. Server — seeds ~6 months of demo data on first run
cd server
npm install
npm start            # http://localhost:3002

# 2. Client (separate terminal, for development)
cd client
npm install
npm run dev          # http://localhost:5173 (proxies /api to :3002)
```

For production, `cd client && npm run build`, then the server serves the
built app itself on :3002.

## How the pieces fit

```
client/  React + Recharts UI (login, KPI tiles, charts, tables)
server/
  src/db.js      schema (users, courts, customers, bookings)
  src/seed.js    deterministic demo data: evenings/weekends busier,
                 summer busier than winter, ~5% cancellations
  src/auth.js    bcrypt login, stateless signed session cookie
  src/stats.js   all reporting SQL (summary, by day, by court,
                 busy hours, top customers)
```

## Tests

```bash
cd server && npm test
```

Seven tests cover session signing/tampering, login failures, auth-gated
endpoints, KPI arithmetic (the by-day series must sum to the summary total),
ranking order and response shapes — against an in-memory SQLite database.

## Notes & limits

- SQLite keeps setup at zero; the SQL is standard enough to move to Postgres
  by swapping the driver and the `strftime` calls.
- Single-user by design (a venue manager); roles would come with a real
  client's requirements.
- Prices and the booking model are deliberately simple — no deposits,
  memberships or block bookings.
