// Schema definitions for the game

export const GRID_ROWS = 8;
export const GRID_COLS = 8;

export interface Guess {
  type: "letter" | "word";
  value: string;
}

export interface GameState {
  totalGuessesRemaining: number;
  gameStatus: "playing" | "won" | "lost";
  guessedLetters: string[];
  currentPuzzle: string;
  difficulty: "normal" | "hard" | "practice";
}

export interface SavedGameState {
  date: string;
  guessesRemaining: number;
  guessedLetters: string[];
  isComplete: boolean;
  wonGame: boolean;
}
