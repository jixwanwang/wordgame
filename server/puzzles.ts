import PUZZLES_NORMAL from "../lib/puzzles_normal.js";
import PUZZLES_HARD from "../lib/puzzles_hard.js";
import PUZZLES_HISTORICAL from "../lib/puzzles_normal_historical.js";
import type { Puzzle, Difficulty } from "../lib/puzzles_types.js";
import { getTodayInPacificTime } from "./time-utils.js";

function getPuzzleSet(difficulty: Difficulty) {
  switch (difficulty) {
    case "hard":
      return PUZZLES_HARD;
    case "normal":
    default:
      return PUZZLES_NORMAL;
  }
}

/**
 * Compare two date strings in MM-DD-YYYY format
 * @returns negative if date1 < date2, positive if date1 > date2, 0 if equal
 */
function compareDates(date1: string, date2: string): number {
  const [m1, d1, y1] = date1.split("-").map(Number);
  const [m2, d2, y2] = date2.split("-").map(Number);
  if (y1 !== y2) return y1 - y2;
  if (m1 !== m2) return m1 - m2;
  return d1 - d2;
}

/**
 * Get a puzzle by date
 * @param date Date string in format MM-DD-YYYY
 * @param difficulty Puzzle difficulty (normal or hard)
 * @returns Puzzle if found, null otherwise
 */
export function getPuzzleByDate(date: string, difficulty: Difficulty = "normal"): Puzzle | null {
  const [month, day, year] = date.split("-");
  const puzzleDate = `${month}-${day}-${year}`;

  const puzzles = getPuzzleSet(difficulty);
  const puzzle = puzzles.find((p) => p.date === puzzleDate);

  if (puzzle !== undefined) {
    return puzzle;
  }

  // If not found and date is before today, check historical puzzles (normal difficulty only)
  if (difficulty === "normal") {
    const today = getTodayInPacificTime();
    if (compareDates(puzzleDate, today) < 0) {
      const historicalPuzzle = PUZZLES_HISTORICAL.find((p) => p.date === puzzleDate);
      if (historicalPuzzle !== undefined) {
        return historicalPuzzle;
      }
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
  const dateString = getTodayInPacificTime();
  return getPuzzleByDate(dateString, difficulty);
}

/**
 * Get all available puzzle dates (for listing/calendar)
 * @param difficulty Puzzle difficulty (normal or hard)
 * @returns Array of date strings in YYYY-MM-DD format
 */
export function getAvailablePuzzleDates(difficulty: Difficulty = "normal"): string[] {
  const puzzles = getPuzzleSet(difficulty);
  return puzzles.map((p) => {
    // Convert MM-DD-YYYY to YYYY-MM-DD
    const [month, day, year] = p.date.split("-");
    return `${year}-${month}-${day}`;
  });
}

/**
 * Check if a puzzle exists for a given date
 * @param date Date string in format YYYY-MM-DD
 * @param difficulty Puzzle difficulty (normal or hard)
 * @returns true if puzzle exists, false otherwise
 */
export function hasPuzzleForDate(date: string, difficulty: Difficulty = "normal"): boolean {
  return getPuzzleByDate(date, difficulty) !== null;
}
