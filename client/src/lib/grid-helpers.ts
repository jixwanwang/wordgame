/**
 * Helper functions to derive grid and keyboard state from guesses and puzzle
 * These are pure functions with no side effects
 */

/**
 * Extract the set of revealed letters from guesses.
 * Single-letter guesses always reveal that letter.
 * Multi-letter (word) guesses only reveal their letters if the word is in puzzleWords.
 */
export function extractRevealedLettersFromGuesses(
  guesses: string[],
  puzzleWords: string[],
): Set<string> {
  const letters = new Set<string>();
  const upperWords = new Set(puzzleWords.map((w) => w.toUpperCase()));
  for (const g of guesses) {
    if (g.length === 1) {
      letters.add(g.toUpperCase());
    } else if (upperWords.has(g.toUpperCase())) {
      for (const ch of g.toUpperCase()) {
        letters.add(ch);
      }
    }
  }
  return letters;
}

/**
 * Derive which cells are revealed based on guesses, puzzle words, and puzzle grid
 */
export function deriveRevealedCells(
  guesses: string[],
  puzzleWords: string[],
  puzzleGrid: string[][],
): boolean[][] {
  const revealed: boolean[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(false));

  const letters = extractRevealedLettersFromGuesses(guesses, puzzleWords);

  letters.forEach((upperLetter) => {
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
  guesses: string[],
  puzzleWords: string[],
  puzzleGrid: string[][],
): string[] {
  const letters = extractRevealedLettersFromGuesses(guesses, puzzleWords);
  const revealedSet = new Set<string>();

  letters.forEach((upperLetter) => {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (puzzleGrid[row][col].toUpperCase() === upperLetter) {
          revealedSet.add(upperLetter);
          break;
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
  guesses: string[],
  revealedLetters: string[],
): "default" | "absent" | "revealed" {
  const upperLetter = letter.toUpperCase();

  if (revealedLetters.includes(upperLetter)) {
    return "revealed"; // Green - in puzzle
  }

  // A letter is "absent" if it was guessed as a single letter but not in the puzzle
  if (guesses.some((g) => g.length === 1 && g.toUpperCase() === upperLetter)) {
    return "absent";
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
