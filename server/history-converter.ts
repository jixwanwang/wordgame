/**
 * Utility to convert localStorage game history to database format
 */

import { NUM_GUESSES } from "../lib/game-utils.js";
import type { GameHistory, SavedGameState } from "../lib/schema.js";

export interface ConvertedGameResult {
  date: string;
  guesses: string[];
  numGuesses: number;
  won: boolean;
}

/**
 * Convert a single game from localStorage format to database format
 *
 * Strategy:
 * - If guesses array exists (new format), use it directly
 * - Otherwise (old format), reconstruct from guessedLetters:
 *   - Each individual guessed letter becomes a single-letter guess
 *   - If there are remaining letters after accounting for individual guesses,
 *     combine them into a final "word" guess to match the total number of guesses
 */
export function convertGameToResult(game: SavedGameState): ConvertedGameResult {
  const totalGuesses = NUM_GUESSES - game.guessesRemaining;

  let guesses: string[] = [];

  // If guesses array exists (new format), use it directly
  if (game.guesses && game.guesses.length > 0) {
    guesses = game.guesses;
  } else {
    // Old format: reconstruct from guessedLetters
    const guessedLetters = game.guessedLetters;

    // Add individual letter guesses
    for (let i = 0; i < guessedLetters.length && guesses.length < totalGuesses - 1; i++) {
      guesses.push(guessedLetters[i]);
    }

    // If we still need more guesses to reach totalGuesses, create a final "word" guess
    // from remaining letters
    if (guesses.length < totalGuesses && guessedLetters.length > guesses.length) {
      const remainingLetters = guessedLetters.slice(guesses.length);
      guesses.push(remainingLetters.join(""));
    }

    // Edge case: if we have more guesses than letters, pad with the first letter repeatedly.
    // it is possible for a user to guess words that miss and result in fewer letters than guesses.
    while (guesses.length < totalGuesses) {
      guesses.push(guessedLetters[0]);
    }
  }

  return {
    date: game.date,
    guesses,
    numGuesses: totalGuesses,
    won: game.wonGame,
  };
}

/**
 * Convert entire localStorage history to array of database results
 * Only converts completed games
 */
export function convertHistoryToResults(history: GameHistory): ConvertedGameResult[] {
  const completedGames = Object.values(history.games).filter((game) => game.isComplete);
  return completedGames.map(convertGameToResult);
}
