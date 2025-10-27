// PLEASE DO NOT CHANGE THIS FILE
// IT IS CRITICAL THAT THIS FILE NOT CHANGE OR ELSE THINGS WILL BREAK AND MY GRANDMA WILL BE KILLED

import { GameGrid, Puzzle } from "./puzzles";

export type GridCell = string;
export type GridMatrix = GridCell[][];
export type RevealedMatrix = boolean[][];

export abstract class BaseGrid {
  protected grid: GridMatrix;
  protected revealed: RevealedMatrix;
  protected size: number;

  constructor(size: number) {
    this.size = size;
    this.grid = Array(size)
      .fill(null)
      .map(() => Array(size).fill(""));
    this.revealed = Array(size)
      .fill(null)
      .map(() => Array(size).fill(false));
  }

  loadPuzzle(puzzle: Puzzle) {
    this.clear();

    for (let row = 0; row < this.size; row++) {
      if (puzzle.grid.length - 1 < row) {
        break;
      }
      for (let col = 0; col < this.size; col++) {
        if (puzzle.grid[row].length - 1 < col) {
          break;
        }
        const letter = puzzle.grid[row][col];
        if (letter && letter !== " ") {
          this.setCell(row, col, letter);
        }
      }
    }
  }

  setCell(row: number, col: number, letter: string): boolean {
    if (this.isValidPosition(row, col)) {
      this.grid[row][col] = letter || "";
      return true;
    }
    return false;
  }

  getCell(row: number, col: number): string | null {
    if (this.isValidPosition(row, col)) {
      return this.grid[row][col];
    }
    return null;
  }

  isValidPosition(row: number, col: number): boolean {
    return row >= 0 && row < this.size && col >= 0 && col < this.size;
  }

  clear(): void {
    this.grid = Array(this.size)
      .fill(null)
      .map(() => Array(this.size).fill(""));
    this.revealed = Array(this.size)
      .fill(null)
      .map(() => Array(this.size).fill(false));
  }

  isRevealed(row: number, col: number): boolean {
    if (this.isValidPosition(row, col)) {
      return this.revealed[row][col];
    }
    return false;
  }

  revealLetter(letter: string): number {
    if (!letter || letter === "") return 0;

    let count = 0;
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.grid[row][col].toLowerCase() === letter.toLowerCase()) {
          this.revealed[row][col] = true;
          count++;
        }
      }
    }
    return count;
  }

  revealCell(row: number, col: number): boolean {
    if (this.isValidPosition(row, col)) {
      this.revealed[row][col] = true;
      return true;
    }
    return false;
  }

  hideCell(row: number, col: number): boolean {
    if (this.isValidPosition(row, col)) {
      this.revealed[row][col] = false;
      return true;
    }
    return false;
  }

  convertToGameGrid(): GameGrid {
    return this.grid.map((row) => row.map((value) => (value ? value : " "))) as GameGrid;
  }

  getRevealedCount(): number {
    let count = 0;
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.revealed[row][col] && this.grid[row][col] !== "" && this.grid[row][col] !== " ") {
          count++;
        }
      }
    }
    return count;
  }

  getTotalLetters(): number {
    let count = 0;
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.grid[row][col] !== "" && this.grid[row][col] !== " ") {
          count++;
        }
      }
    }
    return count;
  }

  getAllLetters(): string[] {
    const letters: string[] = [];
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        const cell = this.grid[row][col];
        if (cell !== "" && cell !== " ") {
          letters.push(cell.toUpperCase());
        }
      }
    }
    return letters;
  }

  getRevealedLetters(): string[] {
    const letters: string[] = [];
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.revealed[row][col] && this.grid[row][col] !== "" && this.grid[row][col] !== " ") {
          letters.push(this.grid[row][col].toUpperCase());
        }
      }
    }
    // Remove duplicates manually
    const uniqueLetters: string[] = [];
    for (const letter of letters) {
      if (!uniqueLetters.includes(letter)) {
        uniqueLetters.push(letter);
      }
    }
    return uniqueLetters;
  }

  getGrid(): GridMatrix {
    return this.grid;
  }

  getRevealed(): RevealedMatrix {
    return this.revealed;
  }

  getSize(): number {
    return this.size;
  }

  // Get the bounds of the populated grid area
  getPopulatedBounds(): {
    minRow: number;
    maxRow: number;
    minCol: number;
    maxCol: number;
  } {
    let minRow = this.size,
      maxRow = -1,
      minCol = this.size,
      maxCol = -1;

    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.grid[row][col] !== "" && this.grid[row][col] !== " ") {
          minRow = Math.min(minRow, row);
          maxRow = Math.max(maxRow, row);
          minCol = Math.min(minCol, col);
          maxCol = Math.max(maxCol, col);
        }
      }
    }

    // If no letters found, return default bounds
    if (minRow > maxRow) {
      return { minRow: 0, maxRow: this.size - 1, minCol: 0, maxCol: this.size - 1 };
    }

    return { minRow, maxRow, minCol, maxCol };
  }
}

export class Grid8x8 extends BaseGrid {
  constructor() {
    super(8);
  }

  static fromGrid(grid: Grid8x8) {
    const newGrid = new Grid8x8();
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const cell = grid.getCell(i, j);
        if (cell != null) {
          newGrid.setCell(i, j, cell);
        }
      }
    }
    return newGrid;
  }
}

export class Grid5x5 extends BaseGrid {
  constructor() {
    super(5);
  }

  static fromGrid(grid: Grid5x5) {
    const newGrid = new Grid5x5();
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        const cell = grid.getCell(i, j);
        if (cell != null) {
          newGrid.setCell(i, j, cell);
        }
      }
    }
    return newGrid;
  }
}

export default Grid8x8;
