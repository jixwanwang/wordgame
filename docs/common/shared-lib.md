# Shared Library (`lib/`)

The `lib/` directory contains code imported by both the client and the server. Nothing in `lib/` should reference browser APIs or Node.js-only modules.

## `lib/schema.ts` — Types

Canonical TypeScript types shared across the stack:

| Type | Description |
|---|---|
| `Guess` | A single guess attempt |
| `GameState` | State of an in-progress game |
| `SavedGameState` | Serialized game state (for localStorage) |
| `GameHistory` | Map of date → `SavedGameState`, plus streak metadata |
| `Stats` | User statistics (streak, total games, wins) |

Constants: `GRID_ROWS = 8`, `GRID_COLS = 8`.

## `lib/game-utils.ts` — Game Logic

| Export | Description |
|---|---|
| `NUM_GUESSES = 15` | Maximum guesses per puzzle |
| `GAME_START_DATE` | September 6, 2025 — the first puzzle date |
| `parseDate(dateString)` | Parses `MM-DD-YYYY` → `Date` |
| `getGameNumber(dateString)` | Returns the ordinal puzzle number for a given date |
| `areConsecutiveDays(date1, date2)` | Returns `true` if dates are consecutive calendar days |
| `calculateRevealedLetterCount(...)` | Counts letters currently revealed in the grid |
| `getTotalLetterCount(...)` | Counts all letters in a puzzle |

All dates are represented as `MM-DD-YYYY` strings throughout the codebase.

## `lib/grid.ts` — Grid

`Grid8x8` — a class encapsulating the state of the 8×8 game grid. Used by the server to validate and process puzzle data, and by the client to compute revealed cells.

## Puzzle Data Files

Pre-generated puzzle data is stored as static TypeScript modules. There is no runtime puzzle generation.

| File | Contents |
|---|---|
| `lib/puzzles_normal.ts` | Current and upcoming normal-difficulty puzzles |
| `lib/puzzles_hard.ts` | Hard-difficulty puzzles |
| `lib/puzzles_normal_historical.ts` | Past normal puzzles |
| `lib/puzzles_practice.ts` | Practice mode puzzles |

Puzzles are indexed by date string for O(1) lookup in `server/puzzles.ts`.

## Dictionary Files

Word validation is done against static word lists.

| File | Contents |
|---|---|
| `lib/dictionary_*.ts` | Word lists partitioned by word length (3–7 characters) |
| `lib/all_words.ts` | Complete combined word list |

`isValidWord(word)` is the public API for validation, used when checking guesses.
