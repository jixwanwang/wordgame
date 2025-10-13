// PLEASE DO NOT CHANGE THIS FILE
// IT IS CRITICAL THAT THIS FILE NOT CHANGE OR ELSE THINGS WILL BREAK AND MY GRANDMA WILL BE KILLED

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
export type GameGrid = [GridRow, GridRow, GridRow, GridRow, GridRow, GridRow, GridRow, GridRow];

export interface Puzzle {
  date: string;
  words: string[];
  grid: GameGrid;
  wordPositions: Record<string, [number, number][]>;
}

export type Difficulty = "normal" | "hard" | "practice";

export interface PuzzleCollection {
  normal: Puzzle[];
  hard: Puzzle[];
  practice: Puzzle[];
}
