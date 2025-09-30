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
    GridCell,
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
  wordPositions: Record<string, [number, number][]>;
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
            wordPositions: {
                "CARET": [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5]],
                "TOAST": [[3, 1], [3, 2], [3, 3], [3, 4], [3, 5]],
                "READY": [[1, 3], [2, 3], [3, 3], [4, 3], [5, 3]],
                "CATER": [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1]],
            },
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
            wordPositions: {
                "MUCH": [[1, 1], [2, 1], [3, 1], [4, 1]],
                "TIGER": [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3]],
                "NICE": [[1, 5], [2, 5], [3, 5], [4, 5]],
                "HORSE": [[4, 1], [4, 2], [4, 3], [4, 4], [4, 5]],
            },
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
            wordPositions: {
                "PLANE": [[3, 1], [3, 2], [3, 3], [3, 4], [3, 5]],
                "TRAIN": [[1, 3], [2, 3], [3, 3], [4, 3], [5, 3]],
                "SLACK": [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]],
                "TRADE": [[5, 1], [4, 2], [3, 3], [2, 4], [1, 5]],
            },
        },
        {
            "name": "34sdf",
            "words": ["DROP", "DRAW", "HEAR", "HARD"],
            "grid": [
                [" ", " ", " ", " ", " ", " ", " ", " "],
                [" ", " ", " ", "D", " ", " ", " ", " "],
                [" ", " ", "R", " ", " ", " ", " ", " "],
                [" ", "A", " ", "W", " ", " ", " ", " "],
                ["H", "E", "A", "R", " ", " ", " ", " "],
                [" ", "R", " ", " ", " ", " ", " ", " "],
                ["D", "R", "O", "P", " ", " ", " ", " "],
                [" ", " ", " ", " ", " ", " ", " ", " "],
            ],
            "wordPositions": {
                "DROP": [[6, 0], [6, 1], [6, 2], [6, 3]],
                "DRAW": [[6, 0], [5, 1], [4, 2], [3, 3]],
                "HEAR": [[4, 0], [4, 1], [4, 2], [4, 3]],
                "HARD": [[4, 0], [3, 1], [2, 2], [1, 3]],
            },
        },
        {
            "name": "asdlfkj",
            "words": ["HIGH", "SHARP", "BEGIN", "SHOW"],
            "grid": [
                [" ", " ", " ", " ", "B", " ", " ", " "],
                [" ", " ", "S", " ", "E", "S", " ", " "],
                [" ", " ", "H", "I", "G", "H", " ", " "],
                [" ", " ", "A", " ", "I", "O", " ", " "],
                [" ", " ", "R", " ", "N", "W", " ", " "],
                [" ", " ", "P", " ", " ", " ", " ", " "],
                [" ", " ", " ", " ", " ", " ", " ", " "],
                [" ", " ", " ", " ", " ", " ", " ", " "],
            ],
            "wordPositions": {
                "HIGH": [[2, 2], [2, 3], [2, 4], [2, 5]],
                "SHARP": [[1, 2], [2, 2], [3, 2], [4, 2], [5, 2]],
                "BEGIN": [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4]],
                "SHOW": [[1, 5], [2, 5], [3, 5], [4, 5]],
            },
        },
        {
            "name": "asdf",
            "words": ["BLANK", "CARD", "TODAY", "FORCE"],
            "grid": [
                [" ", " ", "C", " ", " ", " ", " ", " "],
                ["B", "L", "A", "N", "K", " ", " ", " "],
                ["F", "O", "R", "C", "E", " ", " ", " "],
                ["T", "O", "D", "A", "Y", " ", " ", " "],
                [" ", " ", " ", " ", " ", " ", " ", " "],
                [" ", " ", " ", " ", " ", " ", " ", " "],
                [" ", " ", " ", " ", " ", " ", " ", " "],
                [" ", " ", " ", " ", " ", " ", " ", " "],
            ],
            "wordPositions": {
                "BLANK": [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]],
                "CARD": [[0, 2], [1, 2], [2, 2], [3, 2]],
                "TODAY": [[3, 0], [3, 1], [3, 2], [3, 3], [3, 4]],
                "FORCE": [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]],
            },
        },
        {
            "name": "1759016422684",
            "words": ["HOTEL", "FLASH", "FINE", "TREE"],
            "grid": [
                [" ", " ", " ", "H", " ", " ", " ", " "],
                [" ", " ", " ", "O", " ", " ", " ", " "],
                [" ", " ", " ", "T", "R", "E", "E", " "],
                ["F", "I", "N", "E", " ", " ", " ", " "],
                [" ", " ", "F", "L", "A", "S", "H", " "],
                [" ", " ", " ", " ", " ", " ", " ", " "],
                [" ", " ", " ", " ", " ", " ", " ", " "],
                [" ", " ", " ", " ", " ", " ", " ", " "],
            ],
            "wordPositions": {
                "HOTEL": [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3]],
                "FLASH": [[4, 2], [4, 3], [4, 4], [4, 5], [4, 6]],
                "FINE": [[3, 0], [3, 1], [3, 2], [3, 3]],
                "TREE": [[2, 3], [2, 4], [2, 5], [2, 6]],
            },
        },
        {
            "name": "1759016480709",
            "words": ["ROCKET", "TAUGHT", "BEHAVE", "METHOD"],
            "grid": [
                ["R", " ", " ", " ", " ", " ", " ", " "],
                ["O", " ", " ", " ", " ", " ", " ", " "],
                ["C", "B", " ", " ", "M", " ", " ", " "],
                ["K", "E", " ", " ", "E", " ", " ", " "],
                ["E", "H", " ", " ", "T", " ", " ", " "],
                ["T", "A", "U", "G", "H", "T", " ", " "],
                [" ", "V", " ", " ", "O", " ", " ", " "],
                [" ", "E", " ", " ", "D", " ", " ", " "],
            ],
            "wordPositions": {
                "ROCKET": [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]],
                "TAUGHT": [[5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5]],
                "BEHAVE": [[2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1]],
                "METHOD": [[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4]],
            },
        },
    ],
    hard: [],
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
