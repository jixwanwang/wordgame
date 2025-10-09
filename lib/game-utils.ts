// Utility functions for game calculations

const GAME_START_DATE = new Date("2025-09-06");
export const NUM_GUESSES = 15;

/**
 * Calculate game number based on days since 09-06-2025
 * @param dateString - Date string in format MM-DD-YYYY
 * @returns Game number (1-indexed)
 */
export function getGameNumber(dateString: string): number {
  const date = new Date(dateString);
  const diffTime = date.getTime() - GAME_START_DATE.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

/**
 * Format date string for display
 * @param dateString - Date string in format MM-DD-YYYY
 * @returns Formatted date string
 */
export function formatPuzzleDate(dateString: string): string {
  return dateString;
}

/**
 * Calculate total revealed letters based on word membership.
 * Intersecting letters count once per word they're part of.
 * @param words - Array of words in the puzzle
 * @param revealedLetters - Array of revealed letters
 * @returns Total count where intersecting letters count multiple times
 */
export function calculateRevealedLetterCount(words: string[], revealedLetters: string[]): number {
  let count = 0;
  const revealedSet = new Set(revealedLetters.map(l => l.toUpperCase()));

  for (const word of words) {
    for (const letter of word) {
      if (revealedSet.has(letter.toUpperCase())) {
        count++;
      }
    }
  }

  return count;
}

/**
 * Calculate total letters in puzzle based on word lengths.
 * @param words - Array of words in the puzzle
 * @returns Total count of letters across all words
 */
export function getTotalLetterCount(words: string[]): number {
  return words.reduce((sum, word) => sum + word.length, 0);
}
