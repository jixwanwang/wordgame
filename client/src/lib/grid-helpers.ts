/**
 * Helper functions to derive grid and keyboard state from guesses and puzzle
 * These are pure functions with no side effects
 */

import type { Puzzle } from "@shared/lib/puzzles";

/**
 * Derive which cells are revealed based on guessed letters and puzzle grid
 */
export function deriveRevealedCells(
  guessedLetters: string[],
  puzzleGrid: string[][],
): boolean[][] {
  const revealed: boolean[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(false));

  guessedLetters.forEach((letter) => {
    const upperLetter = letter.toUpperCase();
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (puzzleGrid[row][col].toUpperCase() === upperLetter) {
          revealed[row][col] = true;
        }
      }
    }
  });

  return revealed;
}

/**
 * Derive which letters are revealed (found in the puzzle)
 */
export function deriveRevealedLetters(
  guessedLetters: string[],
  puzzleGrid: string[][],
): string[] {
  const revealedSet = new Set<string>();

  guessedLetters.forEach((letter) => {
    const upperLetter = letter.toUpperCase();
    // Check if this letter exists in the grid
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (puzzleGrid[row][col].toUpperCase() === upperLetter) {
          revealedSet.add(upperLetter);
          break; // Found at least one, no need to continue
        }
      }
      if (revealedSet.has(upperLetter)) break;
    }
  });

  return Array.from(revealedSet);
}

/**
 * Count how many cells are revealed
 */
export function deriveRevealedCount(revealedCells: boolean[][]): number {
  let count = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (revealedCells[row][col]) count++;
    }
  }
  return count;
}

/**
 * Get keyboard letter state (default, absent, or revealed)
 */
export function deriveKeyboardLetterState(
  letter: string,
  guessedLetters: string[],
  revealedLetters: string[],
): "default" | "absent" | "revealed" {
  const upperLetter = letter.toUpperCase();

  if (revealedLetters.includes(upperLetter)) {
    return "revealed"; // Green - in puzzle
  }

  if (guessedLetters.includes(upperLetter)) {
    return "absent"; // Gray - guessed but not in puzzle
  }

  return "default"; // Not guessed yet
}

/**
 * Count total letters in the puzzle grid
 */
export function getTotalLettersInGrid(puzzleGrid: string[][]): number {
  let count = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (puzzleGrid[row][col] && puzzleGrid[row][col] !== " ") {
        count++;
      }
    }
  }
  return count;
}
