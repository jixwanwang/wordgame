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
    GridRow,
];

export interface Puzzle {
    name: string;
    words: string[];
    grid: GameGrid;
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
        },
        {
            name: "Travel Time",
            words: ["PLANE", "TRAIN", "ROAD", "TRAVEL", "SLACK"],
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
