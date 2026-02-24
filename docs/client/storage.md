# Client Storage

The client uses two browser storage mechanisms and a custom API client.

## localStorage

**Key:** `wordgame-history`
**File:** `client/src/lib/` (storage helpers)

Stores a `GameHistory` object (type defined in `lib/schema.ts`) — a map of game results indexed by date, plus the current streak and last completed date.

Functions:
- `getGameHistory()` — reads and deserializes from localStorage
- `saveGameHistory()` — serializes and writes
- `completeGame()` — marks a game as won or lost, updates streak
- `addGuess()` — appends a guess to an in-progress game

This is the primary storage for unauthenticated users. When a user logs in, their local history is synced to the server as part of the login/register response (the client sends localStorage data along with auth credentials, and the server merges it).

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

Methods:
- `register(username, password, localHistory?)`
- `login(username, password, localHistory?)`
- `getPuzzle(date?, difficulty?)`
- `submitResult(result)`
- `getHistory()`
- `checkAuthToken()`
- `refreshToken()`

The `localHistory` parameter on register/login is how offline history is synced to the server on first authentication.
