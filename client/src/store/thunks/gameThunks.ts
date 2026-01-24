import { createAsyncThunk } from "@reduxjs/toolkit";
import { API, Auth } from "@/lib/api-client";
import { getGameForDay, addGuess, completeGame, getCurrentStreak } from "@/lib/game-storage";
import type { RootState } from "../index";
import type { Guess } from "@shared/lib/schema";
import { setPuzzle, setLoading, setError } from "../slices/puzzleSlice";
import {
  makeLetterGuess,
  makeWordGuess,
  updateGameStatus,
  updateStreak,
  restoreGameState,
  setPuzzleDate,
  resetGameToInitial,
} from "../slices/gameSlice";
import { selectRevealedCount } from "../selectors/gridSelectors";
import { selectCurrentPuzzle, selectPuzzleGrid } from "../selectors/puzzleSelectors";
import { getTotalLettersInGrid } from "@/lib/grid-helpers";

// Fetch puzzle from API and restore saved state if available
export const fetchPuzzleThunk = createAsyncThunk(
  "game/fetchPuzzle",
  async (params: { difficulty: "normal" | "hard" }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setLoading(true));

      const { difficulty } = params;

      // Fetch puzzle from server
      const response = await API.getPuzzle(undefined, difficulty);
      const puzzle = {
        date: response.date,
        words: response.words,
        grid: response.grid,
        wordPositions: response.wordPositions,
      };

      console.log("*****", response);
      // Guard against missing puzzle date
      if (!puzzle.date) {
        throw new Error("Puzzle data missing date property");
      }

      // Set puzzle data
      dispatch(setPuzzle(puzzle));
      dispatch(setPuzzleDate(puzzle.date));

      // Get saved state (server takes precedence over local storage)
      const serverSavedState = response.savedState;
      const localSavedState = getGameForDay(puzzle.date);
      const savedState = serverSavedState || localSavedState;

      // Get current streak
      let currentStreak = getCurrentStreak();
      if (Auth.isAuthenticated() && response.currentStreak != null) {
        currentStreak = response.currentStreak;
      }

      // Restore game state if saved state exists
      if (savedState && savedState.guessedLetters.length > 0) {
        // Merge guessed letters from guesses array
        const guessedLetters = [...savedState.guessedLetters];
        savedState.guesses?.forEach((guess) => {
          guess.split("").forEach((letter) => {
            if (!guessedLetters.includes(letter)) {
              guessedLetters.push(letter);
            }
          });
        });

        dispatch(
          restoreGameState({
            ...savedState,
            guessedLetters,
            streak: currentStreak,
          }),
        );
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

    if (!puzzleState) {
      return;
    }

    let newGuessedLetters: string[] = [];

    if (guess.type === "letter") {
      const letter = guess.value.toUpperCase();

      // Don't process if already guessed this letter
      if (gameState.guessedLetters.includes(letter)) {
        return;
      }

      dispatch(makeLetterGuess(letter));
      newGuessedLetters = [letter];
    } else if (guess.type === "word") {
      const word = guess.value.toUpperCase();

      // Check if word exists in the puzzle's word list
      if (puzzleState.words.includes(word)) {
        const wordLetters = word.split("");
        const lettersToReveal: string[] = [];

        wordLetters.forEach((letter) => {
          if (!gameState.guessedLetters.includes(letter)) {
            newGuessedLetters.push(letter);
            lettersToReveal.push(letter);
          }
        });

        dispatch(makeWordGuess({ word, letters: newGuessedLetters }));
      } else {
        // Word not valid, still decrement guesses
        dispatch(makeWordGuess({ word, letters: [] }));
      }
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
        newGuessedLetters,
        updatedState.totalGuessesRemaining,
        guess.value,
      );

      if (isGameComplete) {
        const wonGame = revealedCount === totalLetters;

        // Always complete in local storage
        const localStreak = completeGame(puzzleState.date, wonGame);

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

      if (!puzzleDate) {
        return;
      }

      const savedGame = getGameForDay(puzzleDate);
      const guesses = savedGame.guesses || [];

      const response = await API.submitResult(params.puzzleId, guesses, params.wonGame);

      // Use the streak from the API response
      if (response.streak != null) {
        dispatch(updateStreak(response.streak));
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
