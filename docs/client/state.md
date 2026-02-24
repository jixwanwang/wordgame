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
Holds the authenticated user's historical results fetched from the server.

Key state: array of past game results, loading state.

Populated by an async thunk that calls `GET /api/history`.

## Thunks

Async operations live in dedicated thunk files:

| File | Operations |
|---|---|
| `gameThunks` | Submit game result, load local game state |
| `authThunks` | Login, register, validate token, refresh token |
| `historyThunks` | Fetch history from server |

## Selectors

Selectors live in `gameSelectors`, `puzzleSelectors`, and `gridSelectors`. They compute derived values consumed by components:

- Which grid cells are currently revealed
- How many letters have been revealed so far
- Total letter count in the puzzle
- Current guess validity

Selectors are memoized via `createSelector` where appropriate.
