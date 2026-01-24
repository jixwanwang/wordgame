import { createSelector } from "@reduxjs/toolkit";
import {
  deriveRevealedCells,
  deriveRevealedLetters,
  deriveRevealedCount,
  deriveKeyboardLetterState,
} from "@/lib/grid-helpers";
import { selectGuessedLetters } from "./gameSelectors";
import { selectPuzzleGrid } from "./puzzleSelectors";

// Derived selectors using helper functions
export const selectRevealedCells = createSelector(
  [selectGuessedLetters, selectPuzzleGrid],
  (guessedLetters, puzzleGrid) => deriveRevealedCells(guessedLetters, puzzleGrid),
);

export const selectRevealedLetters = createSelector(
  [selectGuessedLetters, selectPuzzleGrid],
  (guessedLetters, puzzleGrid) => deriveRevealedLetters(guessedLetters, puzzleGrid),
);

export const selectRevealedCount = createSelector(
  [selectRevealedCells],
  (revealedCells) => deriveRevealedCount(revealedCells),
);

// Helper to check if a specific cell is revealed
export const selectIsLetterRevealed = (row: number, col: number) =>
  createSelector([selectRevealedCells], (revealedCells) => revealedCells[row]?.[col] || false);

// Helper to get keyboard letter state
export const selectKeyboardLetterState = (letter: string) =>
  createSelector(
    [selectGuessedLetters, selectRevealedLetters],
    (guessedLetters, revealedLetters) =>
      deriveKeyboardLetterState(letter, guessedLetters, revealedLetters),
  );
