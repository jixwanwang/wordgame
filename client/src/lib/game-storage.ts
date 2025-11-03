import { NUM_GUESSES, parseDate } from "@shared/lib/game-utils";

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

export interface GameHistory {
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

  history.currentStreak = calculateStreakFromHistory(history);
  history.lastCompletedDate = date;

  saveGameHistory(history);

  return history.currentStreak;
}

// Helper function to calculate streak from game history
export function calculateStreakFromHistory(history: GameHistory): number {
  // Get all completed games
  const completedGames = Object.values(history.games).filter((game) => game.isComplete);

  if (completedGames.length === 0) {
    return 0;
  }

  // Sort by date in reverse chronological order (most recent first)
  const sortedGames = completedGames.sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    return dateB.getTime() - dateA.getTime();
  });

  // If the most recent game is a loss, streak is 0
  if (!sortedGames[0].wonGame) {
    return 0;
  }

  // Count consecutive wins
  let streak = 0;
  let previousDate: Date | null = null;

  for (const game of sortedGames) {
    // If this game was lost, stop counting
    if (!game.wonGame) {
      break;
    }

    const currentDate = parseDate(game.date);

    if (previousDate === null) {
      // First game (most recent)
      streak = 1;
      previousDate = currentDate;
    } else {
      // Check if this game is the day before the previous game
      const prevDateNormalized = new Date(
        previousDate.getFullYear(),
        previousDate.getMonth(),
        previousDate.getDate(),
      );
      const currDateNormalized = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
      );

      const timeDiff = prevDateNormalized.getTime() - currDateNormalized.getTime();
      // Calculate days difference, accounting for DST (23-25 hour days)
      const daysDiff = Math.round(timeDiff / (1000 * 60 * 60 * 24));
      const isConsecutiveDay = daysDiff === 1;

      if (isConsecutiveDay) {
        streak += 1;
        previousDate = currentDate;
      } else {
        // Gap in streak, stop counting
        break;
      }
    }
  }

  return streak;
}

export function getCurrentStreak(): number {
  const history = getGameHistory();
  return calculateStreakFromHistory(history);
}

// Action: Clear all game history
export function clearGameHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
