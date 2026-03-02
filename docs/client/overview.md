# Client Overview

The client is a React 18 single-page application built with Vite. It lives entirely in `client/src/`.

## Entrypoints

- `client/src/main.tsx` — Mounts the React app, wraps it in the Redux `Provider`.
- `client/src/App.tsx` — Defines top-level routing via Wouter.
- `client/src/pages/game.tsx` — The only route. Contains the main game orchestration logic.

## Routing

Wouter is used for client-side routing. There are two path-based routes:

| Path | Component |
|---|---|
| `/` | `Game` with `difficulty="normal"` |
| `/hard` | `Game` with `difficulty="hard"` |

Both routes support an optional `?date=MM-DD-YYYY` query parameter. When present, the game loads the puzzle for that specific past date instead of today's. `useSearch()` and `useLocation()` from Wouter are used inside `game.tsx` to read and navigate the query string. Note: variables read from `useSearch()` that appear in `useEffect` dependency arrays must be declared before those `useEffect` calls.

## Component Tree

All components live in `client/src/components/`.

| Component | Purpose |
|---|---|
| `CrosswordGrid` | Renders the 8×8 puzzle grid |
| `GameKeyboard` | Letter/word input interface |
| `GameStats` | Displays live stats: guesses remaining, streak, revealed letters |
| `SquareInput` | A single interactive grid cell |
| `AuthModal` | Login and registration modal |
| `StatsModal` | User statistics summary |
| `HistoryModal` | Browse past puzzles; shows score for completed dates and a "Play [date]" button for unplayed past dates |
| `GameOverModal` | Win/loss screen shown when the game ends |

## Styling

Tailwind CSS 3.4 is used throughout. Radix UI primitives underpin interactive components (dialogs, dropdowns, etc.). Icons come from `lucide-react`.

## Data Flow

1. On mount (or when the `?date=` param changes), `game.tsx` dispatches thunks to load the puzzle for today or the specified past date, and (if authenticated) the user's history.
2. User input flows through `GameKeyboard` → Redux actions → `gameSlice`.
3. On game completion, a submit thunk sends results to the server and updates localStorage.
4. Derived display data (revealed cells, letter counts, etc.) is computed by selectors.

See [State Management](state.md) for Redux internals and [Client Storage](storage.md) for persistence.
