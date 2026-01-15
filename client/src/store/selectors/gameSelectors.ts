import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../index";

// Basic selectors
export const selectGameState = (state: RootState) => state.game;
export const selectGameStatus = (state: RootState) => state.game.gameStatus;
export const selectGuessedLetters = (state: RootState) => state.game.guessedLetters;
export const selectTotalGuessesRemaining = (state: RootState) =>
  state.game.totalGuessesRemaining;
export const selectCurrentStreak = (state: RootState) => state.game.currentStreak;
export const selectDifficulty = (state: RootState) => state.game.difficulty;
export const selectCurrentPuzzleDate = (state: RootState) => state.game.currentPuzzle;

// Memoized selectors
export const selectIsPlaying = createSelector(
  [selectGameStatus],
  (status) => status === "playing",
);
