import { getRandomWord } from "./lib/dictionary";
import Grid8x8 from "./lib/grid";
import { Difficulty, Puzzle } from "./lib/puzzles_types";
import { validate_puzzle } from "./test_puzzle";
import * as fs from "fs";

function placeWord(
  word: string,
  grid: Grid8x8,
): { grid: Grid8x8; positions: [number, number][] } | null {
  const newGrid = Grid8x8.fromGrid(grid);

  // Find all existing letters in the grid and their positions
  const existingLetters: { letter: string; row: number; col: number }[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = grid.getCell(row, col);
      if (cell && cell !== "" && cell !== " ") {
        existingLetters.push({ letter: cell, row, col });
      }
    }
  }

  // If no existing letters, cannot place word (need at least one overlap)
  if (existingLetters.length === 0) {
    return null;
  }

  // Define directions: horizontal, vertical, and diagonal
  const directions = [
    { dr: 0, dc: 1 }, // horizontal right
    { dr: 1, dc: 0 }, // vertical down
    { dr: 1, dc: 1 }, // diagonal down-right
    { dr: -1, dc: 1 }, // diagonal up-right
  ];

  // Try to place the word by finding overlaps with existing letters
  for (const existingLetter of existingLetters) {
    // Check if any letter in the word matches the existing letter
    for (let wordIndex = 0; wordIndex < word.length; wordIndex++) {
      if (word[wordIndex] === existingLetter.letter) {
        // Try each direction
        for (const direction of directions) {
          // Calculate starting position for this word placement
          const startRow = existingLetter.row - wordIndex * direction.dr;
          const startCol = existingLetter.col - wordIndex * direction.dc;

          // Check if word fits within grid bounds
          const endRow = startRow + (word.length - 1) * direction.dr;
          const endCol = startCol + (word.length - 1) * direction.dc;

          if (
            startRow < 0 ||
            startRow >= 8 ||
            startCol < 0 ||
            startCol >= 8 ||
            endRow < 0 ||
            endRow >= 8 ||
            endCol < 0 ||
            endCol >= 8
          ) {
            continue; // Word doesn't fit in grid
          }

          // Check if placement is valid (no conflicts with existing letters)
          let canPlace = true;
          for (let i = 0; i < word.length; i++) {
            const checkRow = startRow + i * direction.dr;
            const checkCol = startCol + i * direction.dc;
            const existingCell = grid.getCell(checkRow, checkCol);

            // If there's already a letter there, it must match
            if (existingCell && existingCell !== "" && existingCell !== " ") {
              if (existingCell !== word[i]) {
                canPlace = false;
                break;
              }
            }
          }

          if (canPlace) {
            // Place the word and track positions
            const positions: [number, number][] = [];
            for (let i = 0; i < word.length; i++) {
              const placeRow = startRow + i * direction.dr;
              const placeCol = startCol + i * direction.dc;
              newGrid.setCell(placeRow, placeCol, word[i]);
              positions.push([placeRow, placeCol]);
            }
            return { grid: newGrid, positions };
          }
        }
      }
    }
  }

  // If we get here, no valid placement was found
  return null;
}

export function generate_puzzle_internal(difficulty: Difficulty): Puzzle | null {
  const words =
    difficulty === "practice"
      ? [getRandomWord(4), getRandomWord(4), getRandomWord(4)]
      : difficulty === "normal"
        ? [getRandomWord(6), getRandomWord(5), getRandomWord(5), getRandomWord(4)]
        : [getRandomWord(7), getRandomWord(6), getRandomWord(6), getRandomWord(5)];

  const letterCounts = {};
  let overlapCount = 0;
  words.forEach((word) => {
    word.split("").forEach((letter) => {
      if (letterCounts[letter] == null) {
        letterCounts[letter] = 0;
        overlapCount += 1;
      }
      letterCounts[letter] += 1;
    });
  });

  const minOverlapCount = 3;
  if (overlapCount < minOverlapCount) {
    return null;
  }

  // Check that total unique letters is 13 or less
  if (Object.keys(letterCounts).length > 13) {
    return null;
  }

  // Check that not all vowels are used
  const vowels = new Set(["A", "E", "I", "O", "U", "Y"]);
  const usedVowels = new Set();
  words.forEach((word) => {
    word.split("").forEach((letter) => {
      if (vowels.has(letter)) {
        usedVowels.add(letter);
      }
    });
  });

  if (usedVowels.size === vowels.size) {
    return null;
  }

  let grid = new Grid8x8();
  let wordPositions = {};

  const word = words[0];
  // pick a random position and orientation
  const wordLength = word.length;

  // horizontal
  if (Math.random() < 0.5) {
    const maxCol = 8 - wordLength;
    const startCol = Math.floor(Math.random() * maxCol);
    const row = Math.floor(Math.random() * 8);
    for (let i = 0; i < word.length; i++) {
      grid.setCell(row, startCol + i, word[i]);
    }
    wordPositions[word] = [...Array(wordLength).keys()].map((i) => [row, startCol + i]);
  } else {
    // vertical
    const maxRow = 8 - wordLength;
    const startRow = Math.floor(Math.random() * maxRow);
    const col = Math.floor(Math.random() * 8);
    for (let i = 0; i < word.length; i++) {
      grid.setCell(startRow + i, col, word[i]);
    }
    wordPositions[word] = [...Array(wordLength).keys()].map((i) => [startRow + i, col]);
  }

  for (let i = 1; i < words.length; i++) {
    const result = placeWord(words[i], grid);
    if (result == null) {
      return null;
    }
    grid = result.grid;
    wordPositions[words[i]] = result.positions;
  }

  const puzzle = {
    date: `${Date.now()}`,
    words: words,
    grid: grid.convertToGameGrid(),
    wordPositions: wordPositions,
  };
  if (validate_puzzle(puzzle)) {
    return puzzle;
  }
  return null;
}

function generate_puzzle(difficulty: Difficulty): Puzzle | null {
  while (true) {
    const puzzle = generate_puzzle_internal(difficulty);
    if (puzzle != null) {
      return puzzle;
    }
  }
}

function formatPuzzleOutput(puzzle: Puzzle): string {
  const gridLines = puzzle.grid
    .map((row) => `            [${row.map((cell) => `"${cell}"`).join(", ")}]`)
    .join(",\n");

  const wordPositionLines = Object.entries(puzzle.wordPositions)
    .map(
      ([word, positions]) =>
        `            "${word}": [${positions.map((pos) => `[${pos[0]}, ${pos[1]}]`).join(", ")}]`,
    )
    .join(",\n");

  return `    {
        "date": "${puzzle.date}",
        "words": [${puzzle.words.map((w) => `"${w}"`).join(", ")}],
        "grid": [
${gridLines},
        ],
        "wordPositions": {
${wordPositionLines},
        },
    }`;
}

export function generatePuzzlesForDateRange(
  startDate: string, // mm-dd-yyyy format
  difficulty: Difficulty,
  numPuzzles: number,
): void {
  const [month, day, year] = startDate.split("-").map(Number);
  const currentDate = new Date(year, month - 1, day);

  const puzzles: Puzzle[] = [];

  for (let i = 0; i < numPuzzles; i++) {
    console.log(
      `Generating puzzle ${i + 1}/${numPuzzles} for ${currentDate.toLocaleDateString("en-US")}`,
    );

    const puzzle = generate_puzzle(difficulty);

    if (puzzle) {
      // Format date as mm-dd-yyyy
      const formattedDate = `${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}-${currentDate.getFullYear()}`;
      puzzle.date = formattedDate;
      puzzles.push(puzzle);
    }

    // Increment date by one day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Format the puzzles as TypeScript code
  const puzzlesCode = puzzles.map((p) => formatPuzzleOutput(p)).join(",\n");

  const fileContent = `
// PLEASE DO NOT CHANGE THIS FILE
// IT IS CRITICAL THAT THIS FILE NOT CHANGE OR ELSE THINGS WILL BREAK AND MY GRANDMA WILL BE KILLED

import { Puzzle } from "./puzzles_types";

const PUZZLES: Puzzle[] = [
${puzzlesCode},
];

export default PUZZLES;
`;

  // Write to the appropriate file
  const filePath = `./lib/puzzles_${difficulty}.ts`;

  fs.writeFileSync(filePath, fileContent, "utf-8");
  console.log(`\nSuccessfully generated ${numPuzzles} puzzles and wrote to ${filePath}`);
}

// console.log(UNCOMMON_DICTIONARY[4].length, UNCOMMON_DICTIONARY[5].length, UNCOMMON_DICTIONARY[6].length, UNCOMMON_DICTIONARY[7].length);
generatePuzzlesForDateRange("10-28-2025", "normal", 100);
