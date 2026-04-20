/**
 * Utility to convert localStorage game history to database format
 */

import { NUM_GUESSES } from "../lib/game-utils.js";
import { compareDates } from "../lib/puzzle-lookup.js";
import type { GameHistory, SavedGameState } from "../lib/schema.js";

export interface ConvertedGameResult {
  date: string;
  guesses: string[];
  numGuesses: number;
  won: boolean;
}

/**
 * Convert a single game from localStorage format to database format
 */
export function convertGameToResult(game: SavedGameState): ConvertedGameResult {
  const totalGuesses = NUM_GUESSES - game.guessesRemaining;
  const guesses = game.guesses ?? [];

  return {
    date: game.date,
    guesses,
    numGuesses: totalGuesses,
    won: game.wonGame,
  };
}

/**
 * Convert entire localStorage history to array of database results.
 * Only converts completed games with a well-formed, non-future date —
 * malformed or future-dated entries are dropped so a compromised client
 * cannot seed the database with bogus results.
 */
export function convertHistoryToResults(
  history: GameHistory,
  today: string,
): ConvertedGameResult[] {
  return Object.values(history.games)
    .filter((game) => game.isComplete)
    .filter((game) => /^\d{2}-\d{2}-\d{4}$/.test(game.date))
    .filter((game) => compareDates(game.date, today) <= 0)
    .map(convertGameToResult);
}
