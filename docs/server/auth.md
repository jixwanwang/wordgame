# Authentication

## Strategy

Authentication is JWT-based. Tokens are issued on login or registration and stored in a browser cookie by the client. The server verifies the token on protected endpoints via a middleware that reads the `Authorization: Bearer <token>` header.

## JWT

- **Expiry:** 15 days from issuance
- **Payload:** `{ username: string }` — the normalized (lowercase) username
- **Secret:** `JWT_SECRET` environment variable
- **Library:** `jsonwebtoken`

### Token Refresh

The client checks the remaining lifetime of its stored token before each API call. If fewer than 5 days remain, it automatically calls `POST /api/refresh-token` to obtain a fresh token. The server issues a new JWT if the current one is still valid.

## Passwords

- Stored as bcrypt hashes with 10 salt rounds.
- Minimum password length: 10 characters.
- Verified via `bcrypt.compare()` on login.

## Usernames

- 3–20 characters, alphanumeric only.
- Stored in two forms:
  - `username` (column): normalized to lowercase, used as the primary key and for all lookups.
  - `originalUsername` (column): preserves the user's chosen casing, used for display.
- The JWT payload carries the lowercase username.

## Auth Middleware

All data endpoints — including `GET /api/puzzle` — use `authenticateToken`, which returns `401` if the token is missing and `403` if it is invalid or expired. Unauthenticated users never reach the API: they read puzzles client-side from `lib/puzzle-lookup.ts` and persist play history to localStorage only.
