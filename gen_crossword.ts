import { Grid5x5 } from "./lib/grid";
import { Puzzle } from "./lib/puzzles_types";
import { ABBREVIATIONS } from "./lib/abbreviations";
import { VALID_WORDS } from "./lib/valid_words";
import { BLACKOUT_PATTERNS, BlackoutPattern } from "./blackouts";

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

// Helper function to filter a list of words by constraints
// This is useful for narrowing down cached word lists
export function filterWordsByConstraints(
  words: string[],
  constraints: { [index: number]: string },
): string[] {
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

// Helper function to get all words with specific letter constraints
// constraints: { [index: number]: string } - e.g., { 0: 'A', 2: 'T' } means position 0 must be 'A', position 2 must be 'T'
export function getWordsWithConstraints(
  length: number,
  constraints: { [index: number]: string },
): string[] {
  const words = getWordsByLength(length);
  return filterWordsByConstraints(words, constraints);
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

// Helper function to extract all words from a completed grid
function extractWordsFromGrid(grid: Grid5x5, blackout: BlackoutPattern): string[] {
  const words: Set<string> = new Set();

  // Extract horizontal words
  for (let row = 0; row < 5; row++) {
    const startCol = findFirstNonBlackoutInRow(row, blackout);
    if (startCol !== -1) {
      const length = getHorizontalWordLength(row, startCol, blackout);
      if (length > 1) {
        let word = "";
        for (let col = startCol; col < startCol + length; col++) {
          word += grid.getCell(row, col);
        }
        words.add(word);
      }
    }
  }

  // Extract vertical words
  for (let col = 0; col < 5; col++) {
    const startRow = findFirstNonBlackoutInCol(col, blackout);
    if (startRow !== -1) {
      const length = getVerticalWordLength(startRow, col, blackout);
      if (length > 1) {
        let word = "";
        for (let row = startRow; row < startRow + length; row++) {
          word += grid.getCell(row, col);
        }
        words.add(word);
      }
    }
  }

  return Array.from(words);
}

// Generate a 5x5 crossword puzzle
export function generateCrossword5x5(blackout: BlackoutPattern): Puzzle | null {
  const grid = new Grid5x5();

  // Step 1: Fill in the edges

  // Top edge (row 0)
  const topStartCol = findFirstNonBlackoutInRow(0, blackout);
  if (topStartCol !== -1) {
    const topLength = getHorizontalWordLength(0, topStartCol, blackout);
    if (topLength > 0) {
      const topWord = placeHorizontalWord(grid, 0, topStartCol, topLength);
      if (!topWord) return null;
    }
  }

  // Left edge (col 0)
  const leftStartRow = findFirstNonBlackoutInCol(0, blackout);
  if (leftStartRow !== -1) {
    const leftLength = getVerticalWordLength(leftStartRow, 0, blackout);
    if (leftLength > 0) {
      const leftWord = placeVerticalWord(grid, leftStartRow, 0, leftLength);
      if (!leftWord) return null;
    }
  }

  // Bottom edge (row 4)
  const bottomStartCol = findFirstNonBlackoutInRow(4, blackout);
  if (bottomStartCol !== -1) {
    const bottomLength = getHorizontalWordLength(4, bottomStartCol, blackout);
    if (bottomLength > 0) {
      const bottomWord = placeHorizontalWord(grid, 4, bottomStartCol, bottomLength);
      if (!bottomWord) return null;
    }
  }

  // Right edge (col 4)
  const rightStartRow = findFirstNonBlackoutInCol(4, blackout);
  if (rightStartRow !== -1) {
    const rightLength = getVerticalWordLength(rightStartRow, 4, blackout);
    if (rightLength > 0) {
      const rightWord = placeVerticalWord(grid, rightStartRow, 4, rightLength);
      if (!rightWord) return null;
    }
  }

  // Initialize cached possible words for columns 1, 2, 3
  // These will be updated as we place each row
  const columnWordCache: Map<number, string[]> = new Map();

  // Initialize the cache with all possible words for each column based on current grid state
  for (let col = 1; col <= 3; col++) {
    if (!isBlackedOut(1, col, blackout)) {
      const colStartRow = findFirstNonBlackoutInCol(col, blackout);
      if (colStartRow !== -1) {
        const colLength = getVerticalWordLength(colStartRow, col, blackout);
        if (colLength > 1) {
          const colConstraints = getVerticalConstraints(grid, colStartRow, col, colLength);
          const possibleWords = getWordsWithConstraints(colLength, colConstraints);
          if (possibleWords.length === 0) {
            return null;
          }
          columnWordCache.set(col, possibleWords);
        }
      }
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
        // Temporarily place the word to check constraints
        const originalCells: string[] = [];
        for (let i = 0; i < candidateWord.length; i++) {
          originalCells.push(grid.getCell(1, row1StartCol + i) || "");
          grid.setCell(1, row1StartCol + i, candidateWord[i]);
        }

        // Check if this word is compatible with cached column words
        let allColumnsValid = true;
        const updatedColumnCache: Map<number, string[]> = new Map();

        for (let col = 1; col <= 3; col++) {
          if (!isBlackedOut(1, col, blackout)) {
            const cachedWords = columnWordCache.get(col);
            if (cachedWords && cachedWords.length > 0) {
              // Get ALL current constraints from the grid for this column
              const colStartRow = findFirstNonBlackoutInCol(col, blackout);
              const colLength = getVerticalWordLength(colStartRow, col, blackout);
              const colConstraints = getVerticalConstraints(grid, colStartRow, col, colLength);

              // Filter cached words to match all current constraints
              const filteredWords = filterWordsByConstraints(cachedWords, colConstraints);

              if (filteredWords.length === 0) {
                allColumnsValid = false;
                break;
              }
              updatedColumnCache.set(col, filteredWords);
            }
          }
        }

        if (allColumnsValid) {
          // This word works! Keep it and update the cache
          // Update the column cache with filtered words
          for (const [col, filteredWords] of updatedColumnCache.entries()) {
            columnWordCache.set(col, filteredWords);
          }

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
        // Temporarily place the word to check constraints
        const originalCells: string[] = [];
        for (let i = 0; i < candidateWord.length; i++) {
          originalCells.push(grid.getCell(2, row2StartCol + i) || "");
          grid.setCell(2, row2StartCol + i, candidateWord[i]);
        }

        // Check if this word is compatible with cached column words
        let allColumnsValid = true;
        const updatedColumnCache: Map<number, string[]> = new Map();

        for (let col = 1; col <= 3; col++) {
          if (!isBlackedOut(2, col, blackout)) {
            const cachedWords = columnWordCache.get(col);
            if (cachedWords && cachedWords.length > 0) {
              // Get ALL current constraints from the grid for this column
              const colStartRow = findFirstNonBlackoutInCol(col, blackout);
              const colLength = getVerticalWordLength(colStartRow, col, blackout);
              const colConstraints = getVerticalConstraints(grid, colStartRow, col, colLength);

              // Filter cached words to match all current constraints
              const filteredWords = filterWordsByConstraints(cachedWords, colConstraints);

              if (filteredWords.length === 0) {
                allColumnsValid = false;
                break;
              }
              updatedColumnCache.set(col, filteredWords);
            }
          }
        }

        if (allColumnsValid) {
          // This word works! Keep it and update the cache
          // Update the column cache with filtered words
          for (const [col, filteredWords] of updatedColumnCache.entries()) {
            columnWordCache.set(col, filteredWords);
          }

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
        // Temporarily place the word to check constraints
        const originalCells: string[] = [];
        for (let i = 0; i < candidateWord.length; i++) {
          originalCells.push(grid.getCell(3, row3StartCol + i) || "");
          grid.setCell(3, row3StartCol + i, candidateWord[i]);
        }

        // Check if this word is compatible with cached column words
        let allColumnsValid = true;
        const updatedColumnCache: Map<number, string[]> = new Map();

        for (let col = 1; col <= 3; col++) {
          if (!isBlackedOut(3, col, blackout)) {
            const cachedWords = columnWordCache.get(col);
            if (cachedWords && cachedWords.length > 0) {
              // Get ALL current constraints from the grid for this column
              const colStartRow = findFirstNonBlackoutInCol(col, blackout);
              const colLength = getVerticalWordLength(colStartRow, col, blackout);
              const colConstraints = getVerticalConstraints(grid, colStartRow, col, colLength);

              // Filter cached words to match all current constraints
              const filteredWords = filterWordsByConstraints(cachedWords, colConstraints);

              if (filteredWords.length === 0) {
                allColumnsValid = false;
                break;
              }
              updatedColumnCache.set(col, filteredWords);
            }
          }
        }

        if (allColumnsValid) {
          // This word works! Keep it and update the cache
          // Update the column cache with filtered words
          for (const [col, filteredWords] of updatedColumnCache.entries()) {
            columnWordCache.set(col, filteredWords);
          }

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

  // // Step 5: Place the vertical words from the cache
  // for (let col = 1; col <= 3; col++) {
  //   const cachedWords = columnWordCache.get(col);
  //   if (cachedWords && cachedWords.length > 0) {
  //     // Pick the first valid word (they should all work at this point)
  //     const selectedWord = cachedWords[Math.floor(Math.random() * cachedWords.length)];
  //     const colStartRow = findFirstNonBlackoutInCol(col, blackout);
  //     if (colStartRow !== -1) {
  //       const colLength = getVerticalWordLength(colStartRow, col, blackout);

  //       // Place the word
  //       for (let i = 0; i < selectedWord.length; i++) {
  //         grid.setCell(colStartRow + i, col, selectedWord[i]);
  //       }

  //       wordPositions[selectedWord] = Array.from({ length: colLength }, (_, i) => [
  //         colStartRow + i,
  //         col,
  //       ]);
  //     }
  //   }
  // }

  // Extract all words from the completed grid
  const words = extractWordsFromGrid(grid, blackout);

  const currentDate = new Date();
  const formattedDate = `${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}-${currentDate.getFullYear()}`;
  const puzzle = {
    date: formattedDate,
    words: words,
    grid: grid.convertToGameGrid(),
    wordPositions: {},
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

function formatPuzzleOutput(puzzle: Puzzle): string {
  const gridLines = puzzle.grid
    .map((row) => `            [${row.map((cell) => `"${cell}"`).join(", ")}]`)
    .join(",\n");

  return `    {
        "date": "${puzzle.date}",
        "words": [${puzzle.words.map((w) => `"${w}"`).join(", ")}],
        "grid": [
${gridLines},
        ],
        "wordPositions": {},
    }`;
}

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


{
        "date": "1761526849124",
        "words": ["CREDO", "COP", "SEA", "ODE", "OARED", "PROLE", "EST", "RARES", "EROSE", "DELTA"],
        "grid": [
            ["C", "R", "E", "D", "O"],
            ["O", "A", "R", "E", "D"],
            ["P", "R", "O", "L", "E"],
            [" ", "E", "S", "T", " "],
            [" ", "S", "E", "A", " "],
        ],
        "wordPositions": {},
    }

        {
        "date": "1761527165635",
        "words": ["APPLE", "CILIA", "ENACT", "DESKS", "SMS", "ACED", "PINES", "PLASM", "LICKS", "EATS"],
        "grid": [
            ["A", "P", "P", "L", "E"],
            ["C", "I", "L", "I", "A"],
            ["E", "N", "A", "C", "T"],
            ["D", "E", "S", "K", "S"],
            [" ", "S", "M", "S", " "],
        ],
        "wordPositions": { },
    }

     {
        "date": "1761527241645",
        "words": ["TUSK", "UDON", "SONIC", "KNIFE", "CEO"],
        "grid": [
            ["T", "U", "S", "K", " "],
            ["U", "D", "O", "N", " "],
            ["S", "O", "N", "I", "C"],
            ["K", "N", "I", "F", "E"],
            [" ", " ", "C", "E", "O"],
        ],
        "wordPositions": {},
    }

    {
        "date": "1761527472300",
        "words": ["SOT", "CHAI", "PHASE", "EARED", "APES", "PEA", "CHAP", "SHARE", "OASES", "TIED"],
        "grid": [
            [" ", " ", "S", "O", "T"],
            [" ", "C", "H", "A", "I"],
            ["P", "H", "A", "S", "E"],
            ["E", "A", "R", "E", "D"],
            ["A", "P", "E", "S", " "],
        ],
        "wordPositions": {},
    }
*/
