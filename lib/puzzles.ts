// PLEASE DO NOT CHANGE THIS FILE
// IT IS CRITICAL THAT THIS FILE NOT CHANGE OR ELSE THINGS WILL BREAK AND MY GRANDMA WILL BE KILLED

import normalPuzzles from "./puzzles_normal";
import hardPuzzles from "./puzzles_hard";
import practicePuzzles from "./puzzles_practice";
import type { Puzzle, Difficulty, PuzzleCollection } from "./puzzles_types";

export type { GridCell, GridRow, GameGrid, Puzzle, Difficulty, PuzzleCollection } from "./puzzles_types";

const puzzles: PuzzleCollection = {
    normal: normalPuzzles,
    hard: hardPuzzles,
    practice: practicePuzzles,
};

// Helper function to get all puzzle names
function getAllPuzzleNames(): string[] {
    const names: string[] = [];
    names.push(...puzzles.normal.map((p) => `${p.date} (Normal)`));
    names.push(...puzzles.hard.map((p) => `${p.date} (Hard)`));
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
    getAllPuzzleNames,
    getPuzzlesByDifficulty,
    getRandomPuzzle,
};
