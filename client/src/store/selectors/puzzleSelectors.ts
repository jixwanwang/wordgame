import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../index";

// Stable empty references for equality
const EMPTY_WORDS: string[] = [];
const EMPTY_GRID: string[][] = [];

// Basic selectors
export const selectCurrentPuzzle = (state: RootState) => state.puzzle.currentPuzzle;
export const selectIsLoading = (state: RootState) => state.puzzle.isLoading;
export const selectPuzzleError = (state: RootState) => state.puzzle.error;

// Memoized selectors
export const selectPuzzleWords = createSelector(
  [selectCurrentPuzzle],
  (puzzle) => puzzle?.words ?? EMPTY_WORDS,
);

export const selectPuzzleGrid = createSelector(
  [selectCurrentPuzzle],
  (puzzle) => puzzle?.grid ?? EMPTY_GRID,
);

export const selectPuzzleDate = createSelector(
  [selectCurrentPuzzle],
  (puzzle) => puzzle?.date || "",
);
