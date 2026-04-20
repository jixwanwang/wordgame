# Client Storage

The client uses two browser storage mechanisms and a custom API client.

## Date Format

Dates are represented as `MM-DD-YYYY` strings (e.g., `01-15-2025`) throughout localStorage, API requests, and URL parameters. The helper `getTodayInPacificTime()` (from `lib/time-utils`, shared between client and server) returns today's date in this format and is the canonical source for "today".

## localStorage

**Key:** `wordgame-history`
**File:** `client/src/lib/` (storage helpers)

Stores a `GameHistory` object (type defined in `lib/schema.ts`) — a map of game results indexed by date, plus the current streak and last completed date.

Functions:
- `getGameHistory()` — reads and deserializes from localStorage
- `saveGameHistory()` — serializes and writes
- `completeGame()` — marks a game as won or lost, updates streak
- `addGuess()` — appends a guess to an in-progress game

This is the **only** storage for unauthenticated users — unauth clients never hit the API. Puzzles are looked up directly from the static bundle (`lib/puzzle-lookup.ts`, keyed on today's date in Pacific Time), and game state / streaks are read and written via `game-storage.ts`. When a user logs in, their local history is synced to the server as part of the login/register response (the client sends localStorage data along with auth credentials, and the server merges it, dropping any future-dated entries).

## Cookies

**File:** `client/src/lib/` (Auth helper class)

Two cookies are set on successful authentication:

| Cookie | Content | Expiry |
|---|---|---|
| `auth_token` | JWT string | 30 days |
| `username` | Plaintext username | 30 days |

The `Auth` helper provides:
- `Auth.setToken(token, username)` — writes both cookies
- `Auth.getToken()` — reads the JWT
- `Auth.clearToken()` — clears both cookies on logout

Note: cookies are not `httpOnly`, so they are accessible from JavaScript. The JWT itself contains only the username and expiry, no sensitive data.

## API Client

**File:** `client/src/lib/api-client.ts`

A custom `fetch` wrapper (no Axios). All API calls go through this client, which:
- Attaches the JWT from cookies to each authenticated request
- Checks token expiry before requests; refreshes automatically if fewer than 5 days remain
- Normalizes error responses

The client is the primary path for authenticated users. Unauthenticated traffic goes through `getPuzzleByDate` in `lib/puzzle-lookup.ts` and never makes a network request — see `fetchPuzzleThunk` in `client/src/store/thunks/gameThunks.ts`. If an authenticated request fails with 401/403 (token expired and refresh failed), the thunk clears the stale token and falls back to the local path so the user can still play.

Methods:
- `register(username, password, localHistory?)`
- `login(username, password, localHistory?)`
- `getPuzzle(date?, difficulty?)`
- `submitResult(result)`
- `getHistory()`
- `submitFeedback(feedback)` — sends feedback text to `POST /api/feedback`
- `checkAuthToken()`
- `refreshToken()`

The `localHistory` parameter on register/login is how offline history is synced to the server on first authentication.
