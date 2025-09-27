// PLEASE DO NOT CHANGE THIS FILE
// IT IS CRITICAL THAT THIS FILE NOT CHANGE OR ELSE THINGS WILL BREAK AND MY GRANDMA WILL BE KILLED

import { Grid8x8 } from "./grid";

export type GridCell = string;
export type GridRow = [
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell
];
export type GameGrid = [
  GridRow,
  GridRow,
  GridRow,
  GridRow,
  GridRow,
  GridRow,
  GridRow,
  GridRow
];

export interface Puzzle {
  name: string;
  words: string[];
  grid: GameGrid;
  wordpositions: Map<string, [number, number][]>;
}

export type Difficulty = "normal" | "hard";

export interface PuzzleCollection {
  normal: Puzzle[];
  hard: Puzzle[];
}

const puzzles: PuzzleCollection = {
  normal: [
    {
      name: "Mini Crossword",
      words: ["CARET", "TOAST", "READY", "CATER"],
      grid: [
        [" ", " ", " ", " ", " ", " ", " ", " "],
        [" ", "C", "A", "R", "E", "T", " ", " "],
        [" ", "A", " ", "E", " ", " ", " ", " "],
        [" ", "T", "O", "A", "S", "T", " ", " "],
        [" ", "E", " ", "D", " ", " ", " ", " "],
        [" ", "R", " ", "Y", " ", " ", " ", " "],
        [" ", " ", " ", " ", " ", " ", " ", " "],
        [" ", " ", " ", " ", " ", " ", " ", " "],
      ],
      wordpositions: new Map([
        [
          "CARET",
          [
            [1, 1],
            [1, 2],
            [1, 3],
            [1, 4],
            [1, 5],
          ],
        ],
        [
          "TOAST",
          [
            [3, 1],
            [3, 2],
            [3, 3],
            [3, 4],
            [3, 5],
          ],
        ],
        [
          "READY",
          [
            [1, 3],
            [2, 3],
            [3, 3],
            [4, 3],
            [5, 3],
          ],
        ],
        [
          "CATER",
          [
            [1, 1],
            [2, 1],
            [3, 1],
            [4, 1],
            [5, 1],
          ],
        ],
      ]),
    },
    {
      name: "Animal Cross",
      words: ["MUCH", "TIGER", "NICE", "HORSE"],
      grid: [
        [" ", " ", " ", "T", " ", " ", " ", " "],
        [" ", "M", " ", "I", " ", "N", " ", " "],
        [" ", "U", " ", "G", " ", "I", " ", " "],
        [" ", "C", " ", "E", " ", "C", " ", " "],
        [" ", "H", "O", "R", "S", "E", " ", " "],
        [" ", " ", " ", " ", " ", " ", " ", " "],
        [" ", " ", " ", " ", " ", " ", " ", " "],
        [" ", " ", " ", " ", " ", " ", " ", " "],
      ],
      wordpositions: new Map([
        [
          "MUCH",
          [
            [1, 1],
            [2, 1],
            [3, 1],
            [4, 1],
          ],
        ],
        [
          "TIGER",
          [
            [0, 3],
            [1, 3],
            [2, 3],
            [3, 3],
            [4, 3],
          ],
        ],
        [
          "NICE",
          [
            [1, 5],
            [2, 5],
            [3, 5],
            [4, 5],
          ],
        ],
        [
          "HORSE",
          [
            [4, 1],
            [4, 2],
            [4, 3],
            [4, 4],
            [4, 5],
          ],
        ],
      ]),
    },
    {
      name: "Travel Time",
      words: ["PLANE", "TRAIN", "SLACK", "TRADE"],
      grid: [
        [" ", " ", " ", " ", " ", " ", " ", " "],
        [" ", "S", " ", "T", " ", "E", " ", " "],
        [" ", " ", "L", "R", "D", " ", " ", " "],
        [" ", "P", "L", "A", "N", "E", " ", " "],
        [" ", " ", "R", "I", "C", " ", " ", " "],
        [" ", "T", " ", "N", " ", "K", " ", " "],
        [" ", " ", " ", " ", " ", " ", " ", " "],
        [" ", " ", " ", " ", " ", " ", " ", " "],
      ],
      wordpositions: new Map([
        [
          "PLANE",
          [
            [3, 1],
            [3, 2],
            [3, 3],
            [3, 4],
            [3, 5],
          ],
        ],
        [
          "TRAIN",
          [
            [1, 3],
            [2, 3],
            [3, 3],
            [4, 3],
            [5, 3],
          ],
        ],
        [
          "SLACK",
          [
            [1, 1],
            [2, 2],
            [3, 3],
            [4, 4],
            [5, 5],
          ],
        ],
        [
          "TRADE",
          [
            [5, 1],
            [4, 2],
            [3, 3],
            [2, 4],
            [1, 5],
          ],
        ],
      ]),
    },
  ],
  hard: [
    {
      name: "Complex Web",
      words: ["TENNIS", "PLANET", "MASTER", "STREAM"],
      grid: [
        [" ", " ", "T", " ", " ", " ", " ", " "],
        [" ", " ", "E", " ", " ", " ", " ", " "],
        ["P", " ", "N", " ", "S", " ", " ", " "],
        ["L", "A", "N", "E", "T", " ", " ", " "],
        [" ", " ", "I", " ", "R", " ", " ", " "],
        ["M", "A", "S", "T", "E", "R", " ", " "],
        [" ", " ", " ", " ", "A", " ", " ", " "],
        [" ", " ", " ", " ", "M", " ", " ", " "],
      ],
      wordpositions: new Map([
        [
          "TENNIS",
          [
            [0, 2],
            [1, 2],
            [2, 2],
            [3, 2],
            [4, 2],
            [5, 2],
          ],
        ],
        [
          "PLANET",
          [
            [2, 0],
            [3, 0],
            [3, 1],
            [3, 2],
            [3, 3],
            [3, 4],
          ],
        ],
        [
          "MASTER",
          [
            [5, 0],
            [5, 1],
            [5, 2],
            [5, 3],
            [5, 4],
            [5, 5],
          ],
        ],
        [
          "STREAM",
          [
            [5, 2],
            [5, 3],
            [4, 4],
            [5, 4],
            [6, 4],
            [7, 4],
          ],
        ],
      ]),
    },
    {
      name: "Triple Cross",
      words: ["ORANGE", "DANGER", "GARDEN"],
      grid: [
        [" ", " ", " ", " ", " ", " ", " ", " "],
        [" ", " ", " ", "D", " ", " ", " ", " "],
        [" ", " ", " ", "A", " ", " ", " ", " "],
        ["O", "R", "A", "N", "G", "E", " ", " "],
        [" ", " ", " ", "G", " ", " ", " ", " "],
        [" ", " ", " ", "E", " ", " ", " ", " "],
        [" ", "G", "A", "R", "D", "E", "N", " "],
        [" ", " ", " ", " ", " ", " ", " ", " "],
      ],
      wordpositions: new Map([
        [
          "ORANGE",
          [
            [3, 0],
            [3, 1],
            [3, 2],
            [3, 3],
            [3, 4],
            [3, 5],
          ],
        ],
        [
          "DANGER",
          [
            [1, 3],
            [2, 3],
            [3, 3],
            [4, 3],
            [5, 3],
            [6, 3],
          ],
        ],
        [
          "GARDEN",
          [
            [6, 1],
            [6, 2],
            [6, 3],
            [6, 4],
            [6, 5],
            [6, 6],
          ],
        ],
      ]),
    },
    {
      name: "Word Storm",
      words: ["RATHER", "HISTORY", "HEATHEN", "THUNDER"],
      grid: [
        ["R", "A", "T", "H", "E", "R", " ", " "],
        [" ", " ", " ", "E", " ", " ", " ", " "],
        [" ", " ", " ", "A", " ", " ", " ", " "],
        ["H", "I", "S", "T", "O", "R", "Y", " "],
        [" ", " ", " ", "H", " ", " ", " ", " "],
        [" ", " ", " ", "E", " ", " ", " ", " "],
        ["T", "H", "U", "N", "D", "E", "R", " "],
        [" ", " ", " ", " ", " ", " ", " ", " "],
      ],
      wordpositions: new Map([
        [
          "RATHER",
          [
            [0, 0],
            [0, 1],
            [0, 2],
            [0, 3],
            [0, 4],
            [0, 5],
          ],
        ],
        [
          "HISTORY",
          [
            [3, 0],
            [3, 1],
            [3, 2],
            [3, 3],
            [3, 4],
            [3, 5],
            [3, 6],
          ],
        ],
        [
          "HEATHEN",
          [
            [0, 3],
            [1, 3],
            [2, 3],
            [3, 3],
            [4, 3],
            [5, 3],
            [6, 3],
          ],
        ],
        [
          "THUNDER",
          [
            [6, 0],
            [6, 1],
            [6, 2],
            [6, 3],
            [6, 4],
            [6, 5],
            [6, 6],
          ],
        ],
      ]),
    },
    {
      name: "Ultimate Challenge",
      words: ["COMPUTER", "PRINTER", "MONITOR", "NETWORK"],
      grid: [
        ["C", "O", "M", "P", "U", "T", "E", "R"],
        [" ", " ", " ", "R", " ", " ", " ", " "],
        [" ", " ", " ", "I", " ", " ", " ", " "],
        [" ", " ", " ", "N", "E", "T", "W", "O"],
        [" ", " ", " ", "T", " ", " ", " ", "R"],
        [" ", " ", " ", "E", " ", " ", " ", "K"],
        [" ", " ", " ", "R", " ", " ", " ", " "],
        ["M", "O", "N", "I", "T", "O", "R", " "],
      ],
      wordpositions: new Map([
        [
          "COMPUTER",
          [
            [0, 0],
            [0, 1],
            [0, 2],
            [0, 3],
            [0, 4],
            [0, 5],
            [0, 6],
            [0, 7],
          ],
        ],
        [
          "PRINTER",
          [
            [0, 3],
            [1, 3],
            [2, 3],
            [3, 3],
            [4, 3],
            [5, 3],
            [6, 3],
          ],
        ],
        [
          "MONITOR",
          [
            [7, 0],
            [7, 1],
            [7, 2],
            [7, 3],
            [7, 4],
            [7, 5],
            [7, 6],
          ],
        ],
        [
          "NETWORK",
          [
            [3, 3],
            [3, 4],
            [3, 5],
            [3, 6],
            [3, 7],
            [4, 7],
            [5, 7],
          ],
        ],
      ]),
    },
  ],
};

// Helper function to load a puzzle into a grid
function loadPuzzle(grid: Grid8x8, puzzleName: string): Puzzle {
  const allPuzzles: Puzzle[] = [...puzzles.normal, ...puzzles.hard];
  const puzzle = allPuzzles.find((p) => p.name === puzzleName);

  if (!puzzle) {
    throw new Error(`Puzzle "${puzzleName}" not found`);
  }

  grid.clear();

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const letter = puzzle.grid[row][col];
      if (letter && letter !== " ") {
        grid.setCell(row, col, letter);
      }
    }
  }

  return puzzle;
}

// Helper function to get all puzzle names
function getAllPuzzleNames(): string[] {
  const names: string[] = [];
  names.push(...puzzles.normal.map((p) => `${p.name} (Normal)`));
  names.push(...puzzles.hard.map((p) => `${p.name} (Hard)`));
  return names;
}

// Helper function to get puzzle by difficulty
function getPuzzlesByDifficulty(difficulty: Difficulty): Puzzle[] {
  return puzzles[difficulty] || [];
}

// Helper function to get a random puzzle by difficulty
function getRandomPuzzle(difficulty: Difficulty): Puzzle {
  const availablePuzzles = puzzles[difficulty];
  if (!availablePuzzles || availablePuzzles.length === 0) {
    // Fallback to normal if difficulty doesn't exist
    const fallbackPuzzles = puzzles.normal;
    const randomIndex = Math.floor(Math.random() * fallbackPuzzles.length);
    return fallbackPuzzles[randomIndex];
  }

  const randomIndex = Math.floor(Math.random() * availablePuzzles.length);
  return availablePuzzles[randomIndex];
}

export {
  puzzles,
  loadPuzzle,
  getAllPuzzleNames,
  getPuzzlesByDifficulty,
  getRandomPuzzle,
};
