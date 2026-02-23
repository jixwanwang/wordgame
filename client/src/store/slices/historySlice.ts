import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Puzzle } from "@shared/lib/puzzles";
import type { SavedGameState } from "@shared/lib/schema";

export interface DateStatus {
  isComplete: boolean;
  wonGame: boolean;
  score: { revealed: number; total: number } | null;
}

export interface HistoryEntry {
  puzzle?: Puzzle;
  savedState?: SavedGameState;
  status?: DateStatus;
}

interface HistoryState {
  entries: Record<string, HistoryEntry>;
  loadingByDate: Record<string, boolean>;
  errorByDate: Record<string, string | null>;
}

const initialState: HistoryState = {
  entries: {},
  loadingByDate: {},
  errorByDate: {},
};

const historySlice = createSlice({
  name: "history",
  initialState,
  reducers: {
    setHistoryEntry: (
      state,
      action: PayloadAction<{
        date: string;
        puzzle?: Puzzle;
        savedState?: SavedGameState;
        status?: DateStatus;
      }>,
    ) => {
      const { date, puzzle, savedState, status } = action.payload;
      state.entries[date] = {
        puzzle: puzzle ?? state.entries[date]?.puzzle,
        savedState: savedState ?? state.entries[date]?.savedState,
        status: status ?? state.entries[date]?.status,
      };
    },
    setHistoryLoading: (state, action: PayloadAction<{ date: string; loading: boolean }>) => {
      state.loadingByDate[action.payload.date] = action.payload.loading;
    },
    setHistoryError: (state, action: PayloadAction<{ date: string; error: string | null }>) => {
      state.errorByDate[action.payload.date] = action.payload.error;
    },
    clearHistory: (state) => {
      state.entries = {};
      state.loadingByDate = {};
      state.errorByDate = {};
    },
  },
});

export const { setHistoryEntry, setHistoryLoading, setHistoryError, clearHistory } = historySlice.actions;

export default historySlice.reducer;
