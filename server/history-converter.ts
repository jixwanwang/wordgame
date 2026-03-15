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
 * Convert entire localStorage history to array of database results
 * Only converts completed games
 */
export function convertHistoryToResults(history: GameHistory): ConvertedGameResult[] {
  const completedGames = Object.values(history.games).filter((game) => game.isComplete);
  return completedGames.map(convertGameToResult);
}
