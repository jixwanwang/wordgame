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
  currentStreak: number;
}

export interface SavedGameState {
  date: string;
  guessesRemaining: number;
  guessedLetters: string[];
  isComplete: boolean;
  wonGame: boolean;
}

export interface GameHistory {
  games: Record<string, SavedGameState>;
  currentStreak: number;
  lastCompletedDate: string | null;
}
