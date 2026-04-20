import PUZZLES_NORMAL from "./puzzles_normal.js";
import PUZZLES_HARD from "./puzzles_hard.js";
import type { Puzzle, Difficulty } from "./puzzles_types.js";

function getPuzzleSet(difficulty: Difficulty): Puzzle[] {
  switch (difficulty) {
    case "hard":
      return PUZZLES_HARD;
    case "normal":
    default:
      return PUZZLES_NORMAL;
  }
}

/**
 * Compare two MM-DD-YYYY date strings.
 * @returns negative if date1 < date2, positive if date1 > date2, 0 if equal
 */
export function compareDates(date1: string, date2: string): number {
  const [m1, d1, y1] = date1.split("-").map(Number);
  const [m2, d2, y2] = date2.split("-").map(Number);
  if (y1 !== y2) return y1 - y2;
  if (m1 !== m2) return m1 - m2;
  return d1 - d2;
}

/**
 * Look up a puzzle by date in the current puzzle sets. Returns null for
 * future dates, malformed input, and unknown dates. The historical archive
 * is server-only and not consulted here — callers that need the fallback
 * should go through `server/puzzles.ts`. `today` (MM-DD-YYYY in Pacific
 * Time) is supplied by the caller so the module has no time dependency.
 */
export function getPuzzleByDate(
  date: string,
  difficulty: Difficulty,
  today: string,
): Puzzle | null {
  if (!/^\d{2}-\d{2}-\d{4}$/.test(date)) {
    return null;
  }
  if (compareDates(date, today) > 0) {
    return null;
  }

  const puzzle = getPuzzleSet(difficulty).find((p) => p.date === date);
  return puzzle ?? null;
}
