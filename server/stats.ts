import { PuzzleResult } from "./db";
import { parseDate, areConsecutiveDays } from "../lib/game-utils.js";
import type { Stats } from "../lib/schema.js";

/**
 * Compute stats from a user's puzzle history
 * @param puzzles - Array of puzzle results for a user
 * @returns Stats object with firstGame, bestStreak, and bestGame
 */
function computeStatsFromHistory(puzzles: PuzzleResult[]): Stats {
  if (puzzles.length === 0) {
    return {
      numGames: 0,
      numWon: 0,
      firstGame: null,
      bestStreak: null,
      bestGame: null,
      favoriteFirstGuess: null,
    };
  }

  // Sort puzzles by date (oldest first)
  const sortedPuzzles = [...puzzles].sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    return dateA.getTime() - dateB.getTime();
  });

  // First game is the earliest puzzle
  const firstGame = sortedPuzzles[0].date;

  // Calculate best streak and best game in single pass - iterate forward (oldest to newest)
  let currentStreak = 0;
  let currentStreakEndDate: string | null = null;
  let bestStreakCount = 0;
  let bestStreakEndDate: string | null = null;
  let previousDate: Date | null = null;

  let bestGameDate: string | null = null;
  let bestGameGuesses = Infinity;

  let firstGuesses: Record<string, number> = {};

  for (const puzzle of sortedPuzzles) {
    // handle the case where there's no guess somehow, and the first guess is a word (not possible anymore, but possible before)
    if (puzzle.guesses.length > 0 && puzzle.guesses[0].length === 1) {
      firstGuesses[puzzle.guesses[0].toUpperCase()] =
        (firstGuesses[puzzle.guesses[0].toUpperCase()] ?? 0) + 1;
    }

    // Track best game (won with fewest guesses)
    if (puzzle.won && puzzle.numGuesses < bestGameGuesses) {
      bestGameDate = puzzle.date;
      bestGameGuesses = puzzle.numGuesses;
    }

    if (!puzzle.won) {
      // Loss breaks the streak - check if current streak is best before resetting
      if (currentStreak > bestStreakCount) {
        bestStreakCount = currentStreak;
        bestStreakEndDate = currentStreakEndDate;
      }
      currentStreak = 0;
      currentStreakEndDate = null;
      previousDate = null;
      continue;
    }

    const currentDate = parseDate(puzzle.date);

    if (previousDate === null) {
      // First win in a new streak
      currentStreak = 1;
      currentStreakEndDate = puzzle.date;
      previousDate = currentDate;
    } else {
      // Check if this is consecutive (next day)
      if (areConsecutiveDays(currentDate, previousDate)) {
        // Consecutive day - extend streak
        currentStreak += 1;
        currentStreakEndDate = puzzle.date;
        previousDate = currentDate;
      } else {
        // Gap in streak - check if current was best, then reset
        if (currentStreak >= bestStreakCount) {
          bestStreakCount = currentStreak;
          bestStreakEndDate = currentStreakEndDate;
        }
        currentStreak = 1;
        currentStreakEndDate = puzzle.date;
        previousDate = currentDate;
      }
    }
  }

  // Check final streak after loop ends
  if (currentStreak >= bestStreakCount) {
    bestStreakCount = currentStreak;
    bestStreakEndDate = currentStreakEndDate;
  }

  let numLetters = 0;
  let favoriteLetter = "A";
  Object.keys(firstGuesses).forEach((letter) => {
    const uses = firstGuesses[letter];
    numLetters += uses;
    if (uses > firstGuesses[favoriteLetter]) {
      favoriteLetter = letter;
    }
  });

  return {
    firstGame,
    bestStreak:
      bestStreakCount > 0 ? { dateEnded: bestStreakEndDate!, streak: bestStreakCount } : null,
    bestGame:
      bestGameGuesses === Infinity ? null : { date: bestGameDate!, guesses: bestGameGuesses },
    favoriteFirstGuess:
      numLetters > 0
        ? { guess: favoriteLetter, percent: firstGuesses[favoriteLetter] / numLetters }
        : null,
    numGames: sortedPuzzles.length,
    numWon: sortedPuzzles.filter((puzzle) => puzzle.won).length,
  };
}

/**
 * Compute the current streak from a user's puzzle history
 * @param puzzles - Array of puzzle results for a user
 * @returns Object with currentStreak and lastCompletedDate
 */
function computeCurrentStreakFromHistory(puzzles: PuzzleResult[]): {
  currentStreak: number;
  lastCompletedDate: string | null;
} {
  if (puzzles.length === 0) {
    return {
      currentStreak: 0,
      lastCompletedDate: null,
    };
  }

  // Sort puzzles by date (newest first)
  const sortedPuzzles = [...puzzles].sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    return dateB.getTime() - dateA.getTime();
  });

  // Most recent puzzle
  const lastCompleted = sortedPuzzles[0];
  const lastCompletedDate = lastCompleted.date;

  // If most recent puzzle was lost, streak is 0
  if (!lastCompleted.won) {
    return {
      currentStreak: 0,
      lastCompletedDate,
    };
  }

  // Count consecutive wins from the most recent win backwards
  let currentStreak = 1;
  let previousDate = parseDate(lastCompleted.date);

  for (let i = 1; i < sortedPuzzles.length; i++) {
    const puzzle = sortedPuzzles[i];

    // If this puzzle was lost, streak ends
    if (!puzzle.won) {
      break;
    }

    const currentDate = parseDate(puzzle.date);

    // Check if this is consecutive with the previous date (going backwards in time)
    // areConsecutiveDays(date1, date2) checks if date2 is one day before date1
    // previousDate is newer, currentDate is older, so check if currentDate is one day before previousDate
    if (areConsecutiveDays(previousDate, currentDate)) {
      currentStreak += 1;
      previousDate = currentDate;
    } else {
      // Gap in streak, stop counting
      break;
    }
  }

  return {
    currentStreak,
    lastCompletedDate,
  };
}

export { computeStatsFromHistory, computeCurrentStreakFromHistory };
