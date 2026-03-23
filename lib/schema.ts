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
  guesses: string[];
  currentPuzzle: string;
  difficulty: "normal" | "hard";
  currentStreak: number;
  loseStreak: number;
}

export interface SavedGameState {
  date: string;
  guessesRemaining: number;
  guesses: string[];
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
