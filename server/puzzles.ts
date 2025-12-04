import PUZZLES from '../lib/puzzles_normal.js';
import type { Puzzle } from '../lib/puzzles_types.js';

/**
 * Get a puzzle by date
 * @param date Date string in format YYYY-MM-DD
 * @returns Puzzle if found, null otherwise
 */
export function getPuzzleByDate(date: string): Puzzle | null {
  // Convert YYYY-MM-DD to MM-DD-YYYY format used in puzzles
  const [year, month, day] = date.split('-');
  const puzzleDate = `${month}-${day}-${year}`;

  const puzzle = PUZZLES.find((p) => p.date === puzzleDate);
  return puzzle || null;
}

/**
 * Get today's puzzle
 * @returns Puzzle for today if available, null otherwise
 */
export function getTodaysPuzzle(): Puzzle | null {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;

  return getPuzzleByDate(dateString);
}

/**
 * Get all available puzzle dates (for listing/calendar)
 * @returns Array of date strings in YYYY-MM-DD format
 */
export function getAvailablePuzzleDates(): string[] {
  return PUZZLES.map((p) => {
    // Convert MM-DD-YYYY to YYYY-MM-DD
    const [month, day, year] = p.date.split('-');
    return `${year}-${month}-${day}`;
  });
}

/**
 * Check if a puzzle exists for a given date
 * @param date Date string in format YYYY-MM-DD
 * @returns true if puzzle exists, false otherwise
 */
export function hasPuzzleForDate(date: string): boolean {
  return getPuzzleByDate(date) !== null;
}
