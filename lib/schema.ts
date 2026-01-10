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
  guesses?: string[]; // Array of guess inputs (letters or words) - optional for backward compatibility
  isComplete: boolean;
  wonGame: boolean;
}

export interface GameHistory {
  games: Record<string, SavedGameState>;
  currentStreak: number;
  lastCompletedDate: string | null;
}

export interface Stats {
  firstGame: string | null;
  bestStreak: { dateEnded: string; streak: number } | null;
  bestGame: { date: string; guesses: number } | null;
  favoriteFirstGuess: { guess: string; percent: number } | null;
  numGames: number;
  numWon: number;
}
