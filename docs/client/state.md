# State Management

Redux Toolkit is used for all global client state. The store is configured in `client/src/store/` and is **entirely ephemeral** — no Redux Persist or rehydration. State resets on page reload; offline play history is preserved via localStorage separately (see [Client Storage](storage.md)).

## Slices

### `gameSlice`
Tracks the live game session.

Key state: current guesses, letter states, streak, puzzle date, difficulty, whether the game is over, and the win/loss result.

Actions cover: adding a guess, revealing letters, resetting the game, and setting outcome.

### `puzzleSlice`
Holds the loaded puzzle data.

Key state: the word list, grid layout, word positions, loading/error state, and difficulty.

Populated by an async thunk that calls `GET /api/puzzle`.

### `historySlice`
Holds per-date puzzle data and play results used by the history modal.

Key state: `entries` — a `Record<string, HistoryEntry>` keyed by date, each with an optional `puzzle`, `savedState`, and `DateStatus` (isComplete, wonGame, score). Also tracks `loadingByDate` and `errorByDate`.

Entries are populated in two ways:
- `fetchHistoryEntryThunk` — fetches puzzle and/or status for a date. Uses an in-memory cache: skips the network call if the entry already exists in the slice.
- `makeGuessThunk` — when a game completes, immediately dispatches `setHistoryEntry` to write the fresh completion data, bypassing the cache so the history modal reflects the result without a re-fetch.

## Thunks

Async operations live in dedicated thunk files:

| File | Operations |
|---|---|
| `gameThunks` | `fetchPuzzleThunk` — loads puzzle for today or a specific date (`date?: string` param); restores saved state. `makeGuessThunk` — processes a guess, persists to storage, submits to API on completion, and syncs `historySlice`. `submitResultThunk` — POSTs result to API. |
| `authThunks` | Login, register, validate token, refresh token |
| `historyThunks` | `fetchHistoryEntryThunk` — fetches puzzle and/or status for a specific date; cached per date |

## Selectors

Selectors live in `gameSelectors`, `puzzleSelectors`, and `gridSelectors`. They compute derived values consumed by components:

- Which grid cells are currently revealed
- How many letters have been revealed so far
- Total letter count in the puzzle
- Current guess validity

Selectors are memoized via `createSelector` where appropriate.
