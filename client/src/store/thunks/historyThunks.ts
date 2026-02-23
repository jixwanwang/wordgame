import { createAsyncThunk } from "@reduxjs/toolkit";
import { API } from "@/lib/api-client";
import type { RootState } from "../index";
import { calculateScore } from "@/lib/history-helpers";
import { getGameForDay } from "@/lib/game-storage";
import { setHistoryEntry, setHistoryError, setHistoryLoading } from "../slices/historySlice";
import type { Puzzle } from "@shared/lib/puzzles";

export const fetchHistoryEntryThunk = createAsyncThunk(
  "history/fetchEntry",
  async (params: { date: string; includePuzzle?: boolean }, { dispatch, getState, rejectWithValue }) => {
    const { date, includePuzzle = true } = params;
    const state = getState() as RootState;
    const existing = state.history.entries[date];
    const alreadyHasPuzzle = Boolean(existing?.puzzle);
    const alreadyHasStatus = Boolean(existing?.status);

    if ((includePuzzle && alreadyHasPuzzle) || (!includePuzzle && alreadyHasStatus)) {
      return null;
    }

    dispatch(setHistoryLoading({ date, loading: true }));
    dispatch(setHistoryError({ date, error: null }));

    try {
      const response = await API.getPuzzle(date);
      if (!response.id) {
        dispatch(setHistoryError({ date, error: "No puzzle available for this date" }));
        return null;
      }

      const puzzle: Puzzle = {
        date: response.date,
        words: response.words,
        grid: response.grid,
        wordPositions: response.wordPositions,
      };
      const localSavedState = getGameForDay(date);
      let savedState =
        response.savedState ??
        (localSavedState.guessedLetters.length > 0 ? localSavedState : undefined);
      if (savedState && savedState.guessedLetters) {
        const merged = [...savedState.guessedLetters];
        savedState.guesses?.forEach((guess) => {
          guess.split("").forEach((letter) => {
            if (!merged.includes(letter)) {
              merged.push(letter);
            }
          });
        });
        savedState = { ...savedState, guessedLetters: merged };
      }

      const isComplete = savedState?.isComplete === true;
      const wonGame = savedState?.wonGame === true;
      const score = savedState?.guessedLetters
        ? calculateScore(puzzle, savedState.guessedLetters)
        : null;

      dispatch(
        setHistoryEntry({
          date,
          puzzle: includePuzzle ? puzzle : undefined,
          savedState: includePuzzle ? savedState : undefined,
          status: { isComplete, wonGame, score },
        }),
      );
      return puzzle;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load puzzle";
      dispatch(setHistoryError({ date, error: message }));
      return rejectWithValue(message);
    } finally {
      dispatch(setHistoryLoading({ date, loading: false }));
    }
  },
);
