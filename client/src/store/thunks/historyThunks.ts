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
      const savedState =
        response.savedState ??
        ((localSavedState.guesses?.length ?? 0) > 0 ? localSavedState : undefined);

      const isComplete = savedState?.isComplete === true;
      const wonGame = savedState?.wonGame === true;
      const score = savedState?.guesses
        ? calculateScore(puzzle, savedState.guesses)
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
