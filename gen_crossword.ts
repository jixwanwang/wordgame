import { Grid5x5 } from "./lib/grid";
import { Puzzle } from "./lib/puzzles_types";
import { ABBREVIATIONS } from "./lib/abbreviations";
import { VALID_WORDS } from "./lib/valid_words";
import { BLACKOUT_PATTERNS, BlackoutPattern } from "./blackouts";
import { formatPuzzleOutput } from "./gen_puzzle";

// Global word map organized by length for fast lookup
// Combines scrabble words and abbreviations
const WORDS_BY_LENGTH: Map<number, string[]> = new Map();

// Initialize word maps
function initializeWordMaps() {
  // Add all words from the curated valid words list
  for (const word of VALID_WORDS) {
    const length = word.length;
    if (!WORDS_BY_LENGTH.has(length)) {
      WORDS_BY_LENGTH.set(length, []);
    }
    WORDS_BY_LENGTH.get(length)!.push(word.toUpperCase());
  }

  // Add abbreviations
  for (const [lengthStr, abbrevList] of Object.entries(ABBREVIATIONS)) {
    const length = parseInt(lengthStr);
    if (!WORDS_BY_LENGTH.has(length)) {
      WORDS_BY_LENGTH.set(length, []);
    }
    for (const abbrev of abbrevList) {
      WORDS_BY_LENGTH.get(length)!.push(abbrev.toUpperCase());
    }
  }
}

// Initialize on module load
initializeWordMaps();

// Helper function to check if a word is valid
export function isValidWord(word: string): boolean {
  const length = word.length;
  const words = WORDS_BY_LENGTH.get(length);
  return words ? words.includes(word.toUpperCase()) : false;
}

// Helper function to get all words of a specific length
export function getWordsByLength(length: number): string[] {
  return WORDS_BY_LENGTH.get(length) || [];
}

// Helper function to get a random word of a specific length
export function getRandomWordOfLength(length: number): string | null {
  const words = getWordsByLength(length);
  return words.length > 0 ? words[Math.floor(Math.random() * words.length)] : null;
}

// Helper function to get all words with specific letter constraints
// constraints: { [index: number]: string } - e.g., { 0: 'A', 2: 'T' } means position 0 must be 'A', position 2 must be 'T'
export function getWordsWithConstraints(
  length: number,
  constraints: { [index: number]: string },
): string[] {
  const words = getWordsByLength(length);
  if (words.length === 0) return [];

  // Filter words that match all constraints
  const matchingWords = words.filter((word) => {
    for (const [indexStr, letter] of Object.entries(constraints)) {
      const index = parseInt(indexStr);
      if (word[index] !== letter.toUpperCase()) {
        return false;
      }
    }
    return true;
  });

  return matchingWords;
}

// Helper function to get a random word with specific letter constraints
export function getRandomWordWithConstraints(
  length: number,
  constraints: { [index: number]: string },
): string | null {
  const matchingWords = getWordsWithConstraints(length, constraints);
  if (matchingWords.length === 0) return null;
  return matchingWords[Math.floor(Math.random() * matchingWords.length)];
}

// Get a random blackout pattern
export function getRandomBlackoutPattern(): BlackoutPattern {
  const patterns = Object.values(BLACKOUT_PATTERNS);
  return patterns[Math.floor(Math.random() * patterns.length)];
}

// Check if a position is blacked out
export function isBlackedOut(row: number, col: number, blackout: BlackoutPattern): boolean {
  return blackout.some(([r, c]) => r === row && c === col);
}

// Find the first non-blackout square in a row
function findFirstNonBlackoutInRow(row: number, blackout: BlackoutPattern): number {
  for (let col = 0; col < 5; col++) {
    if (!isBlackedOut(row, col, blackout)) {
      return col;
    }
  }
  return -1; // All squares are blacked out
}

// Find the first non-blackout square in a column
function findFirstNonBlackoutInCol(col: number, blackout: BlackoutPattern): number {
  for (let row = 0; row < 5; row++) {
    if (!isBlackedOut(row, col, blackout)) {
      return row;
    }
  }
  return -1; // All squares are blacked out
}

// Calculate word length for horizontal word starting at position
function getHorizontalWordLength(row: number, startCol: number, blackout: BlackoutPattern): number {
  let length = 0;
  for (let col = startCol; col < 5; col++) {
    if (isBlackedOut(row, col, blackout)) {
      break;
    }
    length++;
  }
  return length;
}

// Calculate word length for vertical word starting at position
function getVerticalWordLength(startRow: number, col: number, blackout: BlackoutPattern): number {
  let length = 0;
  for (let row = startRow; row < 5; row++) {
    if (isBlackedOut(row, col, blackout)) {
      break;
    }
    length++;
  }
  return length;
}

// Helper to extract horizontal constraints from grid
function getHorizontalConstraints(
  grid: Grid5x5,
  row: number,
  startCol: number,
  length: number,
): { [index: number]: string } {
  const constraints: { [index: number]: string } = {};
  for (let i = 0; i < length; i++) {
    const col = startCol + i;
    const existingCell = grid.getCell(row, col);
    if (existingCell && existingCell !== "" && existingCell !== " ") {
      constraints[i] = existingCell;
    }
  }
  return constraints;
}

// Helper to extract vertical constraints from grid
function getVerticalConstraints(
  grid: Grid5x5,
  startRow: number,
  col: number,
  length: number,
): { [index: number]: string } {
  const constraints: { [index: number]: string } = {};
  for (let i = 0; i < length; i++) {
    const row = startRow + i;
    const existingCell = grid.getCell(row, col);
    if (existingCell && existingCell !== "" && existingCell !== " ") {
      constraints[i] = existingCell;
    }
  }
  return constraints;
}

// Try to place a horizontal word, respecting existing letters
function placeHorizontalWord(
  grid: Grid5x5,
  row: number,
  startCol: number,
  length: number,
): string | null {
  // Get constraints from existing letters
  const constraints = getHorizontalConstraints(grid, row, startCol, length);

  // Get a word that matches the constraints
  const word = getRandomWordWithConstraints(length, constraints);
  if (!word) return null;

  // Place the word
  for (let i = 0; i < word.length; i++) {
    grid.setCell(row, startCol + i, word[i]);
  }

  return word;
}

// Try to place a vertical word, respecting existing letters
function placeVerticalWord(
  grid: Grid5x5,
  startRow: number,
  col: number,
  length: number,
): string | null {
  // Get constraints from existing letters
  const constraints = getVerticalConstraints(grid, startRow, col, length);

  // Get a word that matches the constraints
  const word = getRandomWordWithConstraints(length, constraints);
  if (!word) return null;

  // Place the word
  for (let i = 0; i < word.length; i++) {
    grid.setCell(startRow + i, col, word[i]);
  }

  return word;
}

// Generate a 5x5 crossword puzzle
export function generateCrossword5x5(blackout: BlackoutPattern): Puzzle | null {
  const grid = new Grid5x5();
  const wordPositions: Record<string, [number, number][]> = {};

  // Step 1: Fill in the edges

  // Top edge (row 0)
  const topStartCol = findFirstNonBlackoutInRow(0, blackout);
  if (topStartCol !== -1) {
    const topLength = getHorizontalWordLength(0, topStartCol, blackout);
    if (topLength > 0) {
      const topWord = placeHorizontalWord(grid, 0, topStartCol, topLength);
      if (!topWord) return null;
      wordPositions[topWord] = Array.from({ length: topLength }, (_, i) => [0, topStartCol + i]);
    }
  }

  // Left edge (col 0)
  const leftStartRow = findFirstNonBlackoutInCol(0, blackout);
  if (leftStartRow !== -1) {
    const leftLength = getVerticalWordLength(leftStartRow, 0, blackout);
    if (leftLength > 0) {
      const leftWord = placeVerticalWord(grid, leftStartRow, 0, leftLength);
      if (!leftWord) return null;
      wordPositions[leftWord] = Array.from({ length: leftLength }, (_, i) => [leftStartRow + i, 0]);
    }
  }

  // Bottom edge (row 4)
  const bottomStartCol = findFirstNonBlackoutInRow(4, blackout);
  if (bottomStartCol !== -1) {
    const bottomLength = getHorizontalWordLength(4, bottomStartCol, blackout);
    if (bottomLength > 0) {
      const bottomWord = placeHorizontalWord(grid, 4, bottomStartCol, bottomLength);
      if (!bottomWord) return null;
      wordPositions[bottomWord] = Array.from({ length: bottomLength }, (_, i) => [
        4,
        bottomStartCol + i,
      ]);
    }
  }

  // Right edge (col 4)
  const rightStartRow = findFirstNonBlackoutInCol(4, blackout);
  if (rightStartRow !== -1) {
    const rightLength = getVerticalWordLength(rightStartRow, 4, blackout);
    if (rightLength > 0) {
      const rightWord = placeVerticalWord(grid, rightStartRow, 4, rightLength);
      if (!rightWord) return null;
      wordPositions[rightWord] = Array.from({ length: rightLength }, (_, i) => [
        rightStartRow + i,
        4,
      ]);
    }
  }

  // Step 2: Fill in row 1 (second row)
  const row1StartCol = findFirstNonBlackoutInRow(1, blackout);
  if (row1StartCol !== -1) {
    const row1Length = getHorizontalWordLength(1, row1StartCol, blackout);
    if (row1Length > 0) {
      // Get constraints for row 1 based on existing letters
      const row1Constraints = getHorizontalConstraints(grid, 1, row1StartCol, row1Length);

      // Get all possible words for row 1
      const row1Candidates = getWordsWithConstraints(row1Length, row1Constraints);

      // Try each candidate word
      let foundValidRow1 = false;
      for (const candidateWord of row1Candidates) {
        // Temporarily place the word
        const originalCells: string[] = [];
        for (let i = 0; i < candidateWord.length; i++) {
          originalCells.push(grid.getCell(1, row1StartCol + i) || "");
          grid.setCell(1, row1StartCol + i, candidateWord[i]);
        }

        // Check if all affected columns (1, 2, 3) have valid words
        let allColumnsValid = true;
        for (let col = 1; col <= 3; col++) {
          if (!isBlackedOut(1, col, blackout)) {
            // Find the start of the vertical word for this column
            const colStartRow = findFirstNonBlackoutInCol(col, blackout);
            if (colStartRow !== -1) {
              const colLength = getVerticalWordLength(colStartRow, col, blackout);
              if (colLength > 1) {
                // Only check if it's a word (length > 1)
                const colConstraints = getVerticalConstraints(grid, colStartRow, col, colLength);
                const colCandidates = getWordsWithConstraints(colLength, colConstraints);

                if (colCandidates.length === 0) {
                  allColumnsValid = false;
                  break;
                }
              }
            }
          }
        }

        if (allColumnsValid) {
          // This word works! Keep it
          wordPositions[candidateWord] = Array.from({ length: row1Length }, (_, i) => [
            1,
            row1StartCol + i,
          ]);
          foundValidRow1 = true;
          break;
        } else {
          // Restore original cells
          for (let i = 0; i < candidateWord.length; i++) {
            if (originalCells[i] === "" || originalCells[i] === " ") {
              grid.setCell(1, row1StartCol + i, "");
            } else {
              grid.setCell(1, row1StartCol + i, originalCells[i]);
            }
          }
        }
      }

      if (!foundValidRow1) {
        return null;
      }
    }
  }

  // Step 3: Fill in row 2 (third row)
  const row2StartCol = findFirstNonBlackoutInRow(2, blackout);
  if (row2StartCol !== -1) {
    const row2Length = getHorizontalWordLength(2, row2StartCol, blackout);
    if (row2Length > 0) {
      // Get constraints for row 2 based on existing letters
      const row2Constraints = getHorizontalConstraints(grid, 2, row2StartCol, row2Length);

      // Get all possible words for row 2
      const row2Candidates = getWordsWithConstraints(row2Length, row2Constraints);

      // Try each candidate word
      let foundValidRow2 = false;
      for (const candidateWord of row2Candidates) {
        // Temporarily place the word
        const originalCells: string[] = [];
        for (let i = 0; i < candidateWord.length; i++) {
          originalCells.push(grid.getCell(2, row2StartCol + i) || "");
          grid.setCell(2, row2StartCol + i, candidateWord[i]);
        }

        // Check if all affected columns (1, 2, 3) have valid words
        let allColumnsValid = true;
        for (let col = 1; col <= 3; col++) {
          if (!isBlackedOut(2, col, blackout)) {
            // Find the start of the vertical word for this column
            const colStartRow = findFirstNonBlackoutInCol(col, blackout);
            if (colStartRow !== -1) {
              const colLength = getVerticalWordLength(colStartRow, col, blackout);
              if (colLength > 1) {
                // Only check if it's a word (length > 1)
                const colConstraints = getVerticalConstraints(grid, colStartRow, col, colLength);
                const colCandidates = getWordsWithConstraints(colLength, colConstraints);

                if (colCandidates.length === 0) {
                  allColumnsValid = false;
                  break;
                }
              }
            }
          }
        }

        if (allColumnsValid) {
          // This word works! Keep it
          wordPositions[candidateWord] = Array.from({ length: row2Length }, (_, i) => [
            2,
            row2StartCol + i,
          ]);
          foundValidRow2 = true;
          break;
        } else {
          // Restore original cells
          for (let i = 0; i < candidateWord.length; i++) {
            if (originalCells[i] === "" || originalCells[i] === " ") {
              grid.setCell(2, row2StartCol + i, "");
            } else {
              grid.setCell(2, row2StartCol + i, originalCells[i]);
            }
          }
        }
      }

      if (!foundValidRow2) {
        return null;
      }
    }
  }

  // Step 4: Fill in row 3 (fourth row)
  const row3StartCol = findFirstNonBlackoutInRow(3, blackout);
  if (row3StartCol !== -1) {
    const row3Length = getHorizontalWordLength(3, row3StartCol, blackout);
    if (row3Length > 0) {
      // Get constraints for row 3 based on existing letters
      const row3Constraints = getHorizontalConstraints(grid, 3, row3StartCol, row3Length);

      // Get all possible words for row 3
      const row3Candidates = getWordsWithConstraints(row3Length, row3Constraints);

      // Try each candidate word
      let foundValidRow3 = false;
      for (const candidateWord of row3Candidates) {
        // Temporarily place the word
        const originalCells: string[] = [];
        for (let i = 0; i < candidateWord.length; i++) {
          originalCells.push(grid.getCell(3, row3StartCol + i) || "");
          grid.setCell(3, row3StartCol + i, candidateWord[i]);
        }

        // Check if all affected columns (1, 2, 3) have valid words
        let allColumnsValid = true;
        for (let col = 1; col <= 3; col++) {
          if (!isBlackedOut(3, col, blackout)) {
            // Find the start of the vertical word for this column
            const colStartRow = findFirstNonBlackoutInCol(col, blackout);
            if (colStartRow !== -1) {
              const colLength = getVerticalWordLength(colStartRow, col, blackout);
              if (colLength > 1) {
                // Only check if it's a word (length > 1)
                const colConstraints = getVerticalConstraints(grid, colStartRow, col, colLength);
                const colCandidates = getWordsWithConstraints(colLength, colConstraints);

                if (colCandidates.length === 0) {
                  allColumnsValid = false;
                  break;
                }
              }
            }
          }
        }

        if (allColumnsValid) {
          // This word works! Keep it
          wordPositions[candidateWord] = Array.from({ length: row3Length }, (_, i) => [
            3,
            row3StartCol + i,
          ]);
          foundValidRow3 = true;
          break;
        } else {
          // Restore original cells
          for (let i = 0; i < candidateWord.length; i++) {
            if (originalCells[i] === "" || originalCells[i] === " ") {
              grid.setCell(3, row3StartCol + i, "");
            } else {
              grid.setCell(3, row3StartCol + i, originalCells[i]);
            }
          }
        }
      }

      if (!foundValidRow3) {
        return null;
      }
    }
  }

  const puzzle = {
    date: `${Date.now()}`,
    words: Object.keys(wordPositions),
    grid: grid.convertToGameGrid(),
    wordPositions: wordPositions,
  };

  return puzzle;
}

// Generate crossword with retry logic
export function generateCrossword5x5WithRetry(
  blackout?: BlackoutPattern,
  maxAttempts: number = 10000,
): Puzzle | null {
  const pattern = blackout || getRandomBlackoutPattern();

  for (let i = 0; i < maxAttempts; i++) {
    const puzzle = generateCrossword5x5(pattern);
    if (puzzle !== null) {
      console.log("Generated successfully!");
      return puzzle;
    }
  }

  console.log("Failed to generate puzzle after", maxAttempts, "attempts");
  return null;
}

// Test generation with different patterns
console.log("Testing crossword generation...\n");

const testPuzzle = generateCrossword5x5WithRetry();
if (testPuzzle) {
  console.log;
  console.log("\n=== Puzzle Grid ===");
  console.log(formatPuzzleOutput(testPuzzle));
  // testPuzzle.grid.forEach((row) => {
  //   const formatted = row.map((cell) => (cell === " " ? "·" : cell)).join(" ");
  //   console.log(formatted);
  // });
  // console.log("\n=== Words ===");
  // console.log(testPuzzle.words.join(", "));
} else {
  console.log("Failed to generate puzzle");
}

/*
=== Puzzle Grid ===
· · L A G
A L A M O
P A S E O
E M E N D
S A R D ·

=== Words ===
LAG, APES, SARD, GOOD, ALAMO, PASEO, EMEND
*/
