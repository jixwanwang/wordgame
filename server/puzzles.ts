import PUZZLES_NORMAL from "../lib/puzzles_normal.js";
import PUZZLES_HARD from "../lib/puzzles_hard.js";
import type { Puzzle, Difficulty } from "../lib/puzzles_types.js";

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
  return puzzle || null;
}

/**
 * Get today's puzzle
 * @param difficulty Puzzle difficulty (normal or hard)
 * @returns Puzzle for today if available, null otherwise
 */
export function getTodaysPuzzle(difficulty: Difficulty = "normal"): Puzzle | null {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const dateString = `${month}-${day}-${year}`;

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
