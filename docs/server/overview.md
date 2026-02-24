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
| `server/puzzles.ts` | Puzzle lookup logic (by date and difficulty) |
| `server/stats.ts` | Streak and statistics computation from results |
| `server/time-utils.ts` | Date helpers (`getTodayInPacificTime`, etc.) |

## Middleware

Applied globally in `index.ts`:
- `cors` — allowlist of specific origins (localhost, Cloudflare staging/prod, crosses.io), credentials enabled
- `express.json()` — parses JSON request bodies
- Optional-auth middleware — reads the JWT from `Authorization: Bearer` header and attaches the decoded username to `req.user` if valid; does not reject unauthenticated requests

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/register` | None | Create account; optionally sync local history |
| `POST` | `/api/login` | None | Authenticate; optionally sync local history |
| `GET` | `/api/puzzle` | Optional | Fetch puzzle data; query params: `date` (MM-DD-YYYY), `difficulty` |
| `POST` | `/api/submit` | Required | Submit a completed game result |
| `GET` | `/api/history` | Required | Fetch all of the user's past results |
| `POST` | `/api/refresh-token` | Required | Issue a new JWT |
| `GET` | `/api/auth/validate` | Required | Check whether the current token is valid |
| `GET` | `/health` | None | Health check; returns 200 |

## Puzzle Serving

`GET /api/puzzle` looks up the puzzle by date (defaults to today in Pacific Time) and difficulty (`normal` or `hard`). Puzzle data is static — it comes from pre-generated data files in `lib/` — so no computation is needed at request time.

## History Sync on Login/Register

When a user registers or logs in, the client may include a `localHistory` payload in the request body. The server iterates over those results and inserts any that don't already exist in the database. This is how offline-play history is preserved when a user creates or reconnects to an account.
