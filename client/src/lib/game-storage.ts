import { NUM_GUESSES } from "@shared/lib/game-utils";

export const getDefaultGameState = (date: string) => ({
  date,
  guessesRemaining: NUM_GUESSES,
  guessedLetters: [],
  isComplete: false,
  wonGame: false,
});

// this should eventually be replaced by api calls
export interface SavedGameState {
  date: string;
  guessesRemaining: number;
  guessedLetters: string[];
  isComplete: boolean;
  wonGame: boolean;
}

interface GameHistory {
  games: Record<string, SavedGameState>;
  currentStreak: number;
  lastCompletedDate: string | null;
}

const STORAGE_KEY = "wordgame-history";

function getGameHistory(): GameHistory {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored == null) {
    return {
      games: {},
      currentStreak: 0,
      lastCompletedDate: null,
    };
  }
  return JSON.parse(stored);
}

function saveGameHistory(history: GameHistory): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

// Action: Get the game state for a specific day
export function getGameForDay(date: string): SavedGameState {
  const history = getGameHistory();
  return history.games[date] ?? getDefaultGameState(date);
}

// Action: Add a guess for a day
export function addGuess(date: string, letters: string[], guessesRemaining: number): void {
  const history = getGameHistory();
  const existingGame = history.games[date];

  if (existingGame) {
    // Update existing game
    existingGame.guessedLetters = [...existingGame.guessedLetters, ...letters];
    existingGame.guessesRemaining = guessesRemaining;
  } else {
    // Create new game state
    history.games[date] = {
      date,
      guessesRemaining,
      guessedLetters: [...letters],
      isComplete: false,
      wonGame: false,
    };
  }

  saveGameHistory(history);
}

// Action: Complete the game for a day (returns updated streak)
export function completeGame(date: string, wonGame: boolean): number {
  const history = getGameHistory();

  // Mark the game as complete in the games record
  const existingGame = history.games[date];
  if (existingGame) {
    existingGame.isComplete = true;
    existingGame.wonGame = wonGame;
  } else {
    // If game doesn't exist yet (shouldn't happen in normal flow), create it
    history.games[date] = {
      date,
      guessesRemaining: 0,
      guessedLetters: [],
      isComplete: true,
      wonGame,
    };
  }

  if (wonGame) {
    const gameDate = new Date(date);
    const lastDate = history.lastCompletedDate ? new Date(history.lastCompletedDate) : null;

    if (lastDate == null) {
      // First completed game
      history.currentStreak = 1;
    } else {
      // Normalize both dates to midnight to compare calendar days, not time
      const gameDateNormalized = new Date(
        gameDate.getFullYear(),
        gameDate.getMonth(),
        gameDate.getDate(),
      );
      const lastDateNormalized = new Date(
        lastDate.getFullYear(),
        lastDate.getMonth(),
        lastDate.getDate(),
      );

      const timeDiff = gameDateNormalized.getTime() - lastDateNormalized.getTime();
      // small window to account for inexact timing
      const isConsecutiveDay =
        timeDiff > 1000 * 60 * 60 * 24 - 1000 && timeDiff < 1000 * 60 * 60 * 24 + 1000;

      if (isConsecutiveDay) {
        history.currentStreak += 1;
      } else {
        // broken streak, reset
        history.currentStreak = 1;
      }
    }
  } else {
    history.currentStreak = 0;
  }

  history.lastCompletedDate = date;

  saveGameHistory(history);
  return history.currentStreak;
}

export function getCurrentStreak(): number {
  const history = getGameHistory();
  return history.currentStreak ?? 0;
}

// Action: Clear all game history
export function clearGameHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
