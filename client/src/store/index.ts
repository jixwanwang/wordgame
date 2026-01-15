import { configureStore } from "@reduxjs/toolkit";
import gameReducer from "./slices/gameSlice";
import puzzleReducer from "./slices/puzzleSlice";

export const store = configureStore({
  reducer: {
    game: gameReducer,
    puzzle: puzzleReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
