import { createSelector } from "@reduxjs/toolkit";
import {
  deriveRevealedCells,
  deriveRevealedLetters,
  deriveRevealedCount,
  deriveKeyboardLetterState,
} from "@/lib/grid-helpers";
import { selectGuesses } from "./gameSelectors";
import { selectPuzzleGrid, selectPuzzleWords } from "./puzzleSelectors";

// Derived selectors using helper functions
export const selectRevealedCells = createSelector(
  [selectGuesses, selectPuzzleWords, selectPuzzleGrid],
  (guesses, puzzleWords, puzzleGrid) => deriveRevealedCells(guesses, puzzleWords, puzzleGrid),
);

export const selectRevealedLetters = createSelector(
  [selectGuesses, selectPuzzleWords, selectPuzzleGrid],
  (guesses, puzzleWords, puzzleGrid) => deriveRevealedLetters(guesses, puzzleWords, puzzleGrid),
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
    [selectGuesses, selectRevealedLetters],
    (guesses, revealedLetters) =>
      deriveKeyboardLetterState(letter, guesses, revealedLetters),
  );
