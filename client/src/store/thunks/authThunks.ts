import { createAsyncThunk } from "@reduxjs/toolkit";
import { Auth } from "@/lib/api-client";
import type { RootState } from "../index";
import { fetchPuzzleThunk } from "./gameThunks";
import { resetGameToInitial } from "../slices/gameSlice";

// Handle login success - reload puzzle with saved state
export const handleLoginSuccess = createAsyncThunk(
  "auth/loginSuccess",
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    const difficulty = state.game.difficulty;

    // Dispatch fetchPuzzleThunk to reload puzzle with saved state
    await dispatch(fetchPuzzleThunk({ difficulty }));
  },
);

// Handle logout - clear state and reload puzzle without saved state
export const handleLogout = createAsyncThunk(
  "auth/logout",
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    const difficulty = state.game.difficulty;

    // Clear cookies
    Auth.logout();

    // Clear Redux state
    dispatch(resetGameToInitial());

    // Reload puzzle without auth (will get fresh puzzle, no saved state)
    await dispatch(fetchPuzzleThunk({ difficulty }));
  },
);
