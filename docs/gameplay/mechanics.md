# Gameplay Mechanics

This document describes the rules, scoring, streaks, stats, and history systems as implemented in the codebase.

---

## The Puzzle

Each puzzle is an 8×8 grid containing hidden words placed across rows and columns. The grid cells are either letters or spaces. Not every cell contains a letter — only the cells that are part of a word count toward the game.

Each puzzle has a fixed set of **20 letters** to reveal. The player's goal is to reveal all 20 of them.

Puzzles are date-keyed (`MM-DD-YYYY`) and tied to a difficulty. Two sets exist:

- **Normal** — `lib/puzzles_normal.ts`
- **Hard** — `lib/puzzles_hard.ts`

Historical puzzles (no longer the daily puzzle) are in `lib/puzzles_normal_historical.ts`. The server falls back to this list if the requested date is not found in the main normal set.

A new puzzle is published daily at midnight **Pacific Time** (`server/time-utils.ts:8–23`). The game began on **September 6, 2025** (`lib/game-utils.ts:3`).

**Puzzle number** is computed as days elapsed since the start date plus 1 (`lib/game-utils.ts:25–30`):

```
puzzleNumber = floor(daysElapsed) + 1
```

---

## Guessing

Players have **15 guesses** (`NUM_GUESSES = 15`, `lib/game-utils.ts:4`). There are two guess types:

| Type | Description | Effect |
|---|---|---|
| **Letter guess** | Single character | Reveals all instances of that letter in the grid |
| **Word guess** | Multi-character string | If the word is in the puzzle, all its constituent letters are revealed |

Either type costs exactly 1 guess regardless of result.

**Word guess behavior** (`client/src/store/thunks/gameThunks.ts:100–218`):
- If the word is in the puzzle's word list: all its constituent letters are revealed in the grid.
- If the word is not in the puzzle: the guess is still consumed. No letters are revealed.

A letter already guessed can be skipped — if a player submits a letter they already guessed, it does not consume a guess.

**Keyboard state** per letter (`client/src/lib/grid-helpers.ts:74–90`):
- `"default"` — not yet guessed
- `"absent"` — guessed but not in the puzzle (gray)
- `"revealed"` — guessed and present in the puzzle (green)

---

## Win and Loss

**Win**: All 20 letters in the grid have been revealed (`client/src/store/thunks/gameThunks.ts:158–166`).

**Loss**: The player exhausts all 15 guesses before revealing every letter.

Game status lives in Redux as `"playing"`, `"won"`, or `"lost"` (`client/src/store/slices/gameSlice.ts:37–39`).

---

## Difficulty

Normal and hard modes are separate puzzle lists but share the same rules: same 8×8 grid, same 15-guess limit. Difficulty is selected before play and stored in Redux (`client/src/store/slices/gameSlice.ts:51–52`). It can also be set via the URL parameter `?difficulty=hard`.

---

## Scoring

There is no point system. The result shown at game-over is:

```
Crosses#[PUZZLE_NUMBER] [LETTERS_REVEALED]/[GUESSES_USED] 🔥[STREAK]
```

- `LETTERS_REVEALED` — count of grid cells revealed, max 20
- `GUESSES_USED` — guesses consumed out of 15
- `STREAK` — current win streak (only shown on a win)

The score display is built in `client/src/components/game-over-stats.tsx:22–26`. There are no bonuses, multipliers, or penalties beyond what is captured in these two numbers.

---

## Streaks

A streak is the count of consecutive daily wins.

### What Breaks a Streak

- A **loss** resets the streak to 0.
- A **skipped day** — winning on day N and not playing day N+1 — resets the streak on the next win (it starts back at 1).

### Consecutive Day Check

`areConsecutiveDays()` in `server/time-utils.ts:62–79` (and mirrored client-side in `lib/game-utils.ts:78–87`) checks that exactly one calendar day separates two dates. It tolerates DST transitions (23–25 hour days).

### Server Streak Calculation

On `POST /api/submit` (`server/index.ts`):
1. The puzzle date is compared to today's date in Pacific Time. If they differ, the result is stored with `playedLate = true` and streak is not modified.
2. If the user has already submitted for today's date, the existing record is returned unchanged.
3. If **won** (on time): check if `lastCompletedDate` is the day before today. If yes, `currentStreak += 1`. Otherwise reset to 1.
4. If **lost** (on time): reset `currentStreak` to 0.
5. Write updated streak and `lastCompletedDate` to the `user_stats` table.

Results with `playedLate = true` are excluded from streak computation entirely — they do not extend, break, or reset a streak.

### Client Streak Calculation

Unauthenticated users get a streak calculated locally from localStorage (`client/src/lib/game-storage.ts:99–148`) using the same consecutive-day logic. When a user later registers or logs in, their localStorage history is submitted to the server and the server value takes precedence going forward.

### Best Streak

Computed in `server/stats.ts:33–100` by walking the sorted result history oldest-to-newest and tracking the longest consecutive-win run. Stored as `{ dateEnded, streak }`.

---

## Statistics

Stats are computed fresh from the full result history on every `GET /api/history` call (`server/stats.ts:10–125`). They are not stored in the database — only raw results are persisted.

| Stat | Description |
|---|---|
| `firstGame` | Date of the player's first completed puzzle |
| `numGames` | Total puzzles completed |
| `numWon` | Total puzzles won |
| `bestStreak` | `{ dateEnded, streak }` — longest consecutive win run |
| `bestGame` | `{ date, guesses }` — win using the fewest guesses |
| `favoriteFirstGuess` | Most common first guess (single-letter only), with frequency as a percent |

The `Stats` interface is defined in `lib/schema.ts:36–43`.

---

## History Storage

### Client (localStorage)

Key: `"wordgame-history"` (`client/src/lib/game-storage.ts`).

```
GameHistory {
  games: Record<"MM-DD-YYYY", SavedGameState>
  currentStreak: number
  lastCompletedDate: string | null   // MM-DD-YYYY
}

SavedGameState {
  date: string                // MM-DD-YYYY
  guessesRemaining: number    // remaining out of 15
  guesses: string[]           // all guess inputs in order
  isComplete: boolean
  wonGame: boolean
}
```

`addGuess()` appends each guess as the game progresses. `completeGame()` marks the game done and updates `currentStreak` / `lastCompletedDate`.

### Server (PostgreSQL)

Two tables, defined in `server/schema.ts`.

**`results`** — one row per user per puzzle date:

| Column | Type | Notes |
|---|---|---|
| `username` | varchar | FK → `users.username` |
| `date` | varchar | `MM-DD-YYYY` |
| `guesses` | text | JSON-serialized `string[]` |
| `numGuesses` | integer | total guesses consumed |
| `won` | boolean | |
| `submittedAt` | timestamp | |
| `playedLate` | boolean | `true` if submitted after the puzzle's day; default `false` |

Primary key is `(username, date)`.

**`user_stats`** — one row per user:

| Column | Type | Notes |
|---|---|---|
| `username` | varchar | PK, FK → `users.username` |
| `currentStreak` | integer | default 0 |
| `lastCompletedDate` | varchar | `MM-DD-YYYY`, nullable |
| `updatedAt` | timestamp | |

### History Sync on Login / Register

When a user registers or logs in, the client sends its `GameHistory` in the request body. The server converts it to `PuzzleResult[]` via `convertHistoryToResults()` (`server/history-converter.ts:25–71`) and inserts each row with `onConflictDoNothing` — existing server records are never overwritten by client data. After import the server recalculates the streak from all results.

---

## Playing Past Puzzles

Any past puzzle can be played via URL parameters:

```
/?date=MM-DD-YYYY
/?date=MM-DD-YYYY&difficulty=hard
```

The server validates that the requested date is not in the future before returning the puzzle (`server/index.ts:306–319`). Past puzzle results are saved to history the same way as the daily puzzle, but they do not affect the streak (streaks are computed solely from the sequence of `submittedAt` dates in the results table).

---

## Feedback

Authenticated users can submit feedback via the user dropdown menu (last item before "Logout"). The feedback modal (`client/src/components/feedback-modal.tsx`) provides:

- A **type dropdown** with three options: "Missing word", "Word should be removed", "Other"
- A **text input** (textarea) with a 280-character limit

On submission, the selected type is prepended to the text as a prefix (e.g. `"MISSING WORD: the actual feedback text"`) and sent to `POST /api/feedback`. The server stores the combined string in the `feedback` table. Feedback is write-only — there is no endpoint to read feedback.

Only logged-in users can submit feedback. The server validates that the feedback is non-empty and does not exceed 500 characters (the client enforces the 280-character limit, but the server allows up to 500 to accommodate the type prefix).

---

## Puzzle Generation

Puzzles are generated offline using `gen_puzzle.ts` and written to static TypeScript data files. There is no runtime puzzle generation.

### Running the Generator

```
npx tsx gen_puzzle.ts [count]
```

Generates `count` puzzles (default 90) starting 3 days from today, writing them to `lib/puzzles_normal.ts`.

### Generation Process (`gen_puzzle.ts`)

1. **Word selection** — For each puzzle, random words are drawn from the dictionary (`lib/dictionary.ts`) based on difficulty:
   - **Practice**: 1×5-letter + 1×4-letter (2 words)
   - **Normal** (alternates by seed): 4×5-letter, or 1×7 + 2×5 + 1×3, or 1×6 + 2×5 + 1×4
   - **Hard**: 1×7 + 2×6 + 1×5

2. **Duplicate prevention** — If the same word is selected more than once, the word set is discarded and redrawn.

3. **Validation filters** — Before grid placement, the word set must pass:
   - At least 3 unique letters across all words (overlap requirement)
   - At most 14 unique letters (keeps difficulty manageable)
   - At least one vowel must be hidden (not all vowels used)
   - Minimum Scrabble-value score based on unique letter count

4. **Grid placement** — The first word is placed randomly (horizontal or vertical). Subsequent words are placed using `placeWord()`, which finds valid overlapping positions with existing letters. Supports horizontal, vertical, and diagonal directions.

5. **Puzzle validation** — `validate_puzzle()` (`test_puzzle.ts`) checks letter positions, adjacency, no extra letters before/after words, no duplicate positions within a word, and no duplicate words.

### History Migration

`generateAndMigratePuzzles()` also handles puzzle history management:

1. **Split** — Puzzles in `puzzles_normal.ts` with dates before today are identified as old.
2. **Archive** — Old puzzles are appended to `puzzles_normal_historical.ts` (deduplicated by date).
3. **Generate** — New puzzles are generated starting 3 days from today.
4. **Merge** — New puzzles are combined with remaining current puzzles. If a new puzzle has the same date as an existing one, the new puzzle overwrites it.
5. **Write** — The merged puzzle list is sorted by date and written to `puzzles_normal.ts`.

---

## Key Files

| Area | File | Notable Lines |
|---|---|---|
| Constants | `lib/game-utils.ts` | 3–4 (start date, guess limit), 25–30 (puzzle number), 78–87 (consecutive days) |
| Grid | `lib/grid.ts` | 14–155 (`Grid8x8` class) |
| Schema / types | `lib/schema.ts` | 6–19 (game state types), 36–43 (`Stats` interface) |
| Puzzle generation | `gen_puzzle.ts` | 232–260 (word selection), 138–230 (grid placement), 314–423 (migration) |
| Puzzle validation | `test_puzzle.ts` | 3–104 |
| Puzzle lists | `lib/puzzles_normal.ts`, `lib/puzzles_hard.ts`, `lib/puzzles_normal_historical.ts` | |
| Puzzle lookup | `server/puzzles.ts` | 35–93 |
| Guess thunk | `client/src/store/thunks/gameThunks.ts` | 100–218 |
| Game slice | `client/src/store/slices/gameSlice.ts` | 19–52 |
| Grid helpers | `client/src/lib/grid-helpers.ts` | 61–90 (revealed count, key states) |
| Local storage | `client/src/lib/game-storage.ts` | 16–158 |
| Stats computation | `server/stats.ts` | 10–192 |
| Streak update | `server/index.ts` | 451–474 |
| Time utilities | `server/time-utils.ts` | 8–79 |
| History sync | `server/history-converter.ts` | 25–71 |
