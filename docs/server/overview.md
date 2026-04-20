# Server Overview

The backend is an Express 4 app written in TypeScript. It lives in `server/`.

## Entry and Structure

| File | Role |
|---|---|
| `server/start.ts` | Initializes the database, then starts the HTTP server |
| `server/index.ts` | Creates the Express app, registers middleware and routes |
| `server/db.ts` | `Database` interface + `initializeDatabase()` factory |
| `server/postgres-db.ts` | PostgreSQL implementation of `Database` |
| `server/schema.ts` | Drizzle ORM table definitions |
| `server/auth.ts` | JWT signing/verification, bcrypt helpers |
| `server/puzzles.ts` | Puzzle lookup wrapper — delegates to `lib/puzzle-lookup.ts` and adds historical archive fallback |
| `server/stats.ts` | Streak and statistics computation from results |

Date helpers (`getTodayInPacificTime`, `areConsecutiveDays`) live in `lib/time-utils.ts` so they can be shared with the client.

## Middleware

Applied globally in `index.ts`:
- `app.set("trust proxy", 1)` — trust the first hop (Nginx) so `req.ip` reflects the real client
- `cors` — allowlist of specific origins (localhost, Cloudflare staging/prod, crosses.io), credentials enabled
- `express.json()` — parses JSON request bodies
- Auth middleware — `authenticateToken` is applied per-route on every protected endpoint; it reads the JWT from `Authorization: Bearer` header and rejects the request with 401/403 if missing or invalid
- Per-user rate limiter (`server/rate-limit.ts`) — applied per-route immediately after `authenticateToken` on every authenticated endpoint

## Rate Limiting

Two layers, both with per-IP or per-user keys (no server-side sessions exist).

### Nginx (per-IP, frontline)

Configured in `scripts/setup-nginx.sh`:
- **Global:** 10 req/s per IP for anything under `/api/*`, burst 20 (`wg_api_global` zone).
- **Credentials:** 5 req/min per IP for `/api/login` and `/api/register`, burst 3 (`wg_api_auth` zone). Protects against credential stuffing on the two unauthenticated endpoints.
- **`/health`:** exempt, so uptime monitors don't trip the limit.
- **Drop behavior:** `limit_req_status 444` — Nginx closes the TCP connection with no response body, so the client sees a silent drop rather than a `429`.

### Express (per-user, authenticated routes)

`createPerUserLimiter()` in `server/rate-limit.ts` builds a fresh `express-rate-limit` instance per app:
- **Budget:** 60 req/min per JWT `username` (~6× a realistic gameplay session's authed traffic).
- **Scope:** wired into every authenticated route in `index.ts`, after `authenticateToken` so the username key is available.
- **Drop behavior:** `handler` destroys the socket (`res.socket?.destroy()`) — no HTTP response is sent, matching the Nginx layer's silent-drop semantics.

This layer defends against a single authenticated user abusing the API across multiple IPs, which the Nginx layer cannot see.

## Endpoints

All data endpoints require authentication. Unauthenticated clients read puzzles directly from the static bundle (see `lib/puzzle-lookup.ts`) and persist play history to localStorage only — they never reach the server.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/register` | None | Create account; optionally sync local history |
| `POST` | `/api/login` | None | Authenticate; optionally sync local history |
| `GET` | `/api/puzzle` | Required | Fetch puzzle data; query params: `date` (MM-DD-YYYY), `difficulty` |
| `POST` | `/api/submit` | Required | Submit a completed game result |
| `GET` | `/api/history` | Required | Fetch all of the user's past results |
| `GET` | `/api/lose-streak` | Required | Compute current lose streak (not stored; only called after a loss) |
| `POST` | `/api/refresh-token` | Required | Issue a new JWT |
| `GET` | `/api/auth/validate` | Required | Check whether the current token is valid |
| `POST` | `/api/feedback` | Required | Submit user feedback (text blob) |
| `GET` | `/health` | None | Health check; returns 200 |

## Puzzle Serving

`GET /api/puzzle` looks up the puzzle by date (defaults to today in Pacific Time) and difficulty (`normal` or `hard`) via `server/puzzles.ts`, which delegates to the shared `lib/puzzle-lookup.ts` and additionally falls back to `lib/puzzles_normal_historical.ts` for past normal dates. The historical archive is server-only and is not bundled into the client. Puzzle data is static — it comes from pre-generated data files in `lib/` — so no computation is needed at request time.

## Future-Date Hardening

Any endpoint that accepts a date (via `puzzleId` or uploaded history) rejects or drops entries whose date is after today in Pacific Time. This guards against compromised clients seeding the database with bogus future results.

- `POST /api/submit` returns 400 if the `puzzleId` decodes to a future date.
- `convertHistoryToResults` (used by `/api/register` and `/api/login`) filters out malformed and future-dated entries before insertion.

## History Sync on Login/Register

When a user registers or logs in, the client may include a `localHistory` payload in the request body. The server iterates over those results and inserts any that don't already exist in the database. Future-dated entries are dropped. This is how offline-play history is preserved when a user creates or reconnects to an account.
