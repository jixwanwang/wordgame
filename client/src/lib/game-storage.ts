// Local storage utilities for game state persistence

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

const STORAGE_KEY = "wordgame-history";

export function getGameHistory(): GameHistory {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {
        games: {},
        currentStreak: 0,
        lastCompletedDate: null,
      };
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error loading game history:", error);
    return {
      games: {},
      currentStreak: 0,
      lastCompletedDate: null,
    };
  }
}

export function saveGameState(state: SavedGameState): void {
  try {
    const history = getGameHistory();
    history.games[state.date] = state;

    // Update streak if game was completed successfully
    if (state.isComplete && state.wonGame) {
      const gameDate = new Date(state.date);
      const lastDate = history.lastCompletedDate ? new Date(history.lastCompletedDate) : null;

      if (!lastDate) {
        // First completed game
        history.currentStreak = 1;
        history.lastCompletedDate = state.date;
      } else {
        // Check if this is consecutive day
        const dayDiff = Math.floor(
          (gameDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (dayDiff === 1) {
          // Consecutive day
          history.currentStreak += 1;
          history.lastCompletedDate = state.date;
        } else if (dayDiff === 0) {
          // Same day, just update the date
          history.lastCompletedDate = state.date;
        } else {
          // Streak broken
          history.currentStreak = 1;
          history.lastCompletedDate = state.date;
        }
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Error saving game state:", error);
  }
}

export function getGameStateForDate(date: string): SavedGameState | null {
  const history = getGameHistory();
  return history.games[date] || null;
}

export function getCurrentStreak(): number {
  const history = getGameHistory();
  return history.currentStreak;
}

export function clearGameHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
