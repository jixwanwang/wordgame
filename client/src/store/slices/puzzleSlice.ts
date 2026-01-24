import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Puzzle } from "@shared/lib/puzzles";

interface PuzzleState {
  currentPuzzle: Puzzle | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: PuzzleState = {
  currentPuzzle: null,
  isLoading: true,
  error: null,
};

const puzzleSlice = createSlice({
  name: "puzzle",
  initialState,
  reducers: {
    setPuzzle: (state, action: PayloadAction<Puzzle>) => {
      state.currentPuzzle = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
});

export const { setPuzzle, setLoading, setError } = puzzleSlice.actions;

export default puzzleSlice.reducer;
