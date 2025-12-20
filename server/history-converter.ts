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
 * - Each individual guessed letter becomes a single-letter guess
 * - If there are remaining letters after accounting for individual guesses,
 *   combine them into a final "word" guess to match the total number of guesses
 */
export function convertGameToResult(game: SavedGameState): ConvertedGameResult {
  const totalGuesses = NUM_GUESSES - game.guessesRemaining;
  const guessedLetters = game.guessedLetters;

  const guesses: string[] = [];

  // Add individual letter guesses
  for (let i = 0; i < guessedLetters.length && guesses.length < totalGuesses - 1; i++) {
    guesses.push(guessedLetters[i]);
  }

  // If we still need more guesses to reach totalGuesses, create a final "word" guess
  // from remaining letters
  if (guesses.length < totalGuesses && guessedLetters.length > guesses.length) {
    const remainingLetters = guessedLetters.slice(guesses.length);
    guesses.push(remainingLetters.join(''));
  }

  // Edge case: if we have more guesses than letters, pad with empty strings
  // (This shouldn't happen in normal gameplay but handle it gracefully)
  while (guesses.length < totalGuesses) {
    guesses.push('');
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
  const completedGames = Object.values(history.games).filter(game => game.isComplete);
  return completedGames.map(convertGameToResult);
}
