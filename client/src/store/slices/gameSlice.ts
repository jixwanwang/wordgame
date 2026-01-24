import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { GameState, SavedGameState } from "@shared/lib/schema";
import { NUM_GUESSES } from "@shared/lib/game-utils";

const initialState: GameState = {
  totalGuessesRemaining: NUM_GUESSES,
  gameStatus: "playing",
  guessedLetters: [],
  guesses: [],
  currentPuzzle: "",
  difficulty: "normal",
  currentStreak: 0,
};

const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    makeLetterGuess: (state, action: PayloadAction<string>) => {
      const letter = action.payload.toUpperCase();
      if (!state.guessedLetters.includes(letter)) {
        state.guessedLetters.push(letter);
        state.guesses.push(letter);
        state.totalGuessesRemaining -= 1;
      }
    },
    makeWordGuess: (state, action: PayloadAction<{ word: string; letters: string[] }>) => {
      const { word, letters } = action.payload;
      letters.forEach((letter) => {
        if (!state.guessedLetters.includes(letter)) {
          state.guessedLetters.push(letter);
        }
      });
      state.guesses.push(word);
      state.totalGuessesRemaining -= 1;
    },
    updateGameStatus: (state, action: PayloadAction<"playing" | "won" | "lost">) => {
      state.gameStatus = action.payload;
    },
    updateStreak: (state, action: PayloadAction<number>) => {
      state.currentStreak = action.payload;
    },
    restoreGameState: (state, action: PayloadAction<SavedGameState & { streak: number }>) => {
      const { guessesRemaining, guessedLetters, guesses, isComplete, wonGame, streak } = action.payload;
      state.totalGuessesRemaining = guessesRemaining;
      state.guessedLetters = guessedLetters;
      state.guesses = guesses || [];
      state.gameStatus = isComplete ? (wonGame ? "won" : "lost") : "playing";
      state.currentStreak = streak;
    },
    setDifficulty: (state, action: PayloadAction<"normal" | "hard">) => {
      state.difficulty = action.payload;
    },
    setPuzzleDate: (state, action: PayloadAction<string>) => {
      state.currentPuzzle = action.payload;
    },
    resetGameToInitial: (state) => {
      state.totalGuessesRemaining = NUM_GUESSES;
      state.gameStatus = "playing";
      state.guessedLetters = [];
      state.guesses = [];
      state.currentStreak = 0;
    },
  },
});

export const {
  makeLetterGuess,
  makeWordGuess,
  updateGameStatus,
  updateStreak,
  restoreGameState,
  setDifficulty,
  setPuzzleDate,
  resetGameToInitial,
} = gameSlice.actions;

export default gameSlice.reducer;
