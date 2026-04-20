import PUZZLES_HISTORICAL from "../lib/puzzles_normal_historical.js";
import {
  getPuzzleByDate as lookupPuzzleByDate,
  compareDates,
} from "../lib/puzzle-lookup.js";
import type { Puzzle, Difficulty } from "../lib/puzzles_types.js";
import { getTodayInPacificTime } from "../lib/time-utils.js";

/**
 * Get a puzzle by date, falling back to the normal historical archive for
 * past dates when the primary puzzle sets don't have a match. The historical
 * archive is server-only (not bundled into the client) so this fallback lives
 * here rather than in `lib/puzzle-lookup.ts`.
 *
 * @param date Date string in format MM-DD-YYYY
 * @param difficulty Puzzle difficulty (normal or hard)
 * @returns Puzzle if found, null otherwise
 */
export function getPuzzleByDate(date: string, difficulty: Difficulty = "normal"): Puzzle | null {
  const today = getTodayInPacificTime();
  const puzzle = lookupPuzzleByDate(date, difficulty, today);
  if (puzzle !== null) {
    return puzzle;
  }

  // `compareDates` on malformed input yields NaN comparisons that are always
  // false, so this also filters out bogus dates reaching the archive lookup.
  if (difficulty === "normal" && compareDates(date, today) < 0) {
    const historical = PUZZLES_HISTORICAL.find((p) => p.date === date);
    if (historical !== undefined) {
      return historical;
    }
  }

  return null;
}

/**
 * Get today's puzzle (based on Pacific Time)
 * @param difficulty Puzzle difficulty (normal or hard)
 * @returns Puzzle for today if available, null otherwise
 */
export function getTodaysPuzzle(difficulty: Difficulty = "normal"): Puzzle | null {
  return getPuzzleByDate(getTodayInPacificTime(), difficulty);
}
