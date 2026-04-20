import { createAsyncThunk } from "@reduxjs/toolkit";
import { API, ApiError, Auth } from "@/lib/api-client";
import { getGameForDay, addGuess, completeGame, getCurrentStreak, getCurrentLoseStreak } from "@/lib/game-storage";
import type { RootState } from "../index";
import type { Guess, SavedGameState } from "@shared/lib/schema";
import type { Puzzle } from "@shared/lib/puzzles_types";
import { getPuzzleByDate } from "@shared/lib/puzzle-lookup";
import { getTodayInPacificTime } from "@shared/lib/time-utils";
import { setPuzzle, setLoading, setError } from "../slices/puzzleSlice";
import {
  makeLetterGuess,
  makeWordGuess,
  updateGameStatus,
  updateStreak,
  updateLoseStreak,
  restoreGameState,
  setPuzzleDate,
  resetGameToInitial,
} from "../slices/gameSlice";
import { setHistoryEntry } from "../slices/historySlice";
import { selectRevealedCount } from "../selectors/gridSelectors";
import { selectCurrentPuzzle, selectPuzzleGrid } from "../selectors/puzzleSelectors";
import { getTotalLettersInGrid } from "@/lib/grid-helpers";

interface LoadedPuzzle {
  puzzle: Puzzle;
  savedState: SavedGameState | undefined;
  currentStreak: number;
}

async function loadPuzzleAuthenticated(
  difficulty: "normal" | "hard",
  date: string | undefined,
): Promise<LoadedPuzzle> {
  // Refresh ahead of expiry when we can — the server rejects expired tokens,
  // so refresh-on-401 wouldn't work for an already-expired token.
  // If refresh fails (network blip or the token is already past expiry), we
  // don't handle it here — the next `getPuzzle` call will 401/403 and
  // `loadPuzzle` will log out and fall back to the local bundle.
  if (Auth.shouldRefreshToken()) {
    await API.refreshToken();
  }

  const response = await API.getPuzzle(date, difficulty);
  if (!response.date) {
    throw new Error("Puzzle data missing date property");
  }
  const puzzle: Puzzle = {
    date: response.date,
    words: response.words,
    grid: response.grid,
    wordPositions: response.wordPositions,
  };
  const localSavedState = getGameForDay(puzzle.date);
  return {
    puzzle,
    savedState: response.savedState ?? localSavedState,
    currentStreak: response.currentStreak ?? getCurrentStreak(),
  };
}

function loadPuzzleLocal(
  difficulty: "normal" | "hard",
  date: string | undefined,
): LoadedPuzzle {
  const today = getTodayInPacificTime();
  const puzzle = getPuzzleByDate(date ?? today, difficulty, today);
  if (puzzle === null) {
    throw new Error("No puzzle available for this date");
  }
  return {
    puzzle,
    savedState: getGameForDay(puzzle.date),
    currentStreak: getCurrentStreak(),
  };
}

async function loadPuzzle(
  difficulty: "normal" | "hard",
  date: string | undefined,
): Promise<LoadedPuzzle> {
  if (!Auth.isAuthenticated()) {
    return loadPuzzleLocal(difficulty, date);
  }
  try {
    return await loadPuzzleAuthenticated(difficulty, date);
  } catch (error) {
    // Auth failed (expired/invalid token). Drop the stale token so we stop
    // retrying, and fall back to the local bundle so the user can still play.
    // Non-auth errors (network, 5xx) surface to the caller.
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      Auth.logout();
      return loadPuzzleLocal(difficulty, date);
    }
    throw error;
  }
}

// Fetch puzzle (from API when authenticated, from local data otherwise)
// and restore saved state if available.
export const fetchPuzzleThunk = createAsyncThunk(
  "game/fetchPuzzle",
  async (
    params: { difficulty: "normal" | "hard"; date?: string },
    { dispatch, rejectWithValue },
  ) => {
    try {
      dispatch(setLoading(true));

      const { difficulty, date } = params;
      const { puzzle, savedState, currentStreak } = await loadPuzzle(difficulty, date);

      dispatch(setPuzzle(puzzle));
      dispatch(setPuzzleDate(puzzle.date));

      if (savedState && savedState.guesses && savedState.guesses.length > 0) {
        dispatch(
          restoreGameState({
            ...savedState,
            streak: currentStreak,
          }),
        );

        // If restoring a completed loss, calculate lose streak
        if (savedState.isComplete && !savedState.wonGame) {
          if (Auth.isAuthenticated()) {
            try {
              const loseStreakResponse = await API.getLoseStreak();
              dispatch(updateLoseStreak(loseStreakResponse.loseStreak));
            } catch {
              dispatch(updateLoseStreak(getCurrentLoseStreak()));
            }
          } else {
            dispatch(updateLoseStreak(getCurrentLoseStreak()));
          }
        }
      } else {
        // No saved state, start fresh
        dispatch(resetGameToInitial());
        dispatch(updateStreak(currentStreak));
        dispatch(setPuzzleDate(puzzle.date));
      }

      dispatch(setLoading(false));
      return puzzle;
    } catch (error) {
      console.error("Failed to load puzzle:", error);
      dispatch(setError(error instanceof Error ? error.message : "Failed to load puzzle"));
      return rejectWithValue(error);
    }
  },
);

// Make a guess (letter or word)
export const makeGuessThunk = createAsyncThunk(
  "game/makeGuess",
  async (guess: Guess, { dispatch, getState }) => {
    const state = getState() as RootState;
    const gameState = state.game;
    const puzzleState = selectCurrentPuzzle(state);
    const gridMatrix = selectPuzzleGrid(state);

    if (gameState.gameStatus !== "playing" || gameState.totalGuessesRemaining <= 0) {
      return;
    }

    if (puzzleState == null) {
      return;
    }

    if (guess.type === "letter") {
      const letter = guess.value.toUpperCase();

      // Don't process if already guessed this letter
      if (gameState.guesses.some((g) => g.length === 1 && g.toUpperCase() === letter)) {
        return;
      }

      dispatch(makeLetterGuess(letter));
    } else if (guess.type === "word") {
      const word = guess.value.toUpperCase();
      dispatch(makeWordGuess({ word }));
    }

    // Check win/lose conditions after state updates
    const updatedState = (getState() as RootState).game;
    const revealedCount = selectRevealedCount(getState() as RootState);
    const totalLetters = getTotalLettersInGrid(gridMatrix);

    let isGameComplete = false;

    // Check win condition - all letters revealed
    if (revealedCount === totalLetters) {
      dispatch(updateGameStatus("won"));
      isGameComplete = true;
    }
    // Check lose condition
    else if (updatedState.totalGuessesRemaining <= 0) {
      dispatch(updateGameStatus("lost"));
      isGameComplete = true;
    }

    // Persist to storage
    if (puzzleState.date) {
      addGuess(
        puzzleState.date,
        updatedState.totalGuessesRemaining,
        guess.value,
      );

      if (isGameComplete) {
        const wonGame = revealedCount === totalLetters;

        // Always complete in local storage
        const localStreak = completeGame(puzzleState.date, wonGame);

        // Sync completion into the history slice so the history modal reflects
        // the updated state without needing to re-fetch from the server.
        dispatch(
          setHistoryEntry({
            date: puzzleState.date,
            savedState: {
              date: puzzleState.date,
              guessesRemaining: updatedState.totalGuessesRemaining,
              guesses: [...updatedState.guesses],
              isComplete: true,
              wonGame,
            },
            status: {
              isComplete: true,
              wonGame,
              score: { revealed: revealedCount, total: totalLetters },
            },
          }),
        );

        // Submit result to API if user is authenticated
        if (Auth.isAuthenticated()) {
          dispatch(
            submitResultThunk({
              puzzleId: `puzzle_${puzzleState.date.replace(/-/g, "_")}`,
              wonGame,
            }),
          );
        } else {
          // Not authenticated, use local storage streak
          dispatch(updateStreak(localStreak));
          if (!wonGame) {
            dispatch(updateLoseStreak(getCurrentLoseStreak()));
          }
        }
      }
    }
  },
);

// Submit game result to API (called automatically when game completes if authenticated)
export const submitResultThunk = createAsyncThunk(
  "game/submitResult",
  async (params: { puzzleId: string; wonGame: boolean }, { dispatch, getState }) => {
    try {
      const state = getState() as RootState;
      const puzzleDate = state.puzzle.currentPuzzle?.date;

      if (puzzleDate == null) {
        return;
      }

      const savedGame = getGameForDay(puzzleDate);
      const guesses = savedGame.guesses || [];

      const response = await API.submitResult(params.puzzleId, guesses, params.wonGame);

      // Use the streak from the API response
      if (response.streak != null) {
        dispatch(updateStreak(response.streak));
      }

      // Fetch lose streak from API only after a loss
      if (!params.wonGame) {
        try {
          const loseStreakResponse = await API.getLoseStreak();
          dispatch(updateLoseStreak(loseStreakResponse.loseStreak));
        } catch {
          // Fall back to local calculation on error
          dispatch(updateLoseStreak(getCurrentLoseStreak()));
        }
      }

      return response;
    } catch (error) {
      console.error("Failed to submit result to API:", error);
      // Fall back to local storage streak on error
      const state = getState() as RootState;
      const localStreak = state.game.currentStreak;
      dispatch(updateStreak(localStreak));
      throw error;
    }
  },
);
