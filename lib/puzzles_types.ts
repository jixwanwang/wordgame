// PLEASE DO NOT CHANGE THIS FILE
// IT IS CRITICAL THAT THIS FILE NOT CHANGE OR ELSE THINGS WILL BREAK AND MY GRANDMA WILL BE KILLED

export type GridCell = string;
export type GridRow = Array<GridCell>;
export type GameGrid = Array<GridRow>;

export interface Puzzle {
  date: string;
  words: string[];
  grid: GameGrid;
  wordPositions: Record<string, [number, number][]>;
}

export type Difficulty = "normal" | "hard" | "practice" | "crossword";

export interface PuzzleCollection {
  normal: Puzzle[];
  hard: Puzzle[];
  practice: Puzzle[];
  crossword: Puzzle[];
}
