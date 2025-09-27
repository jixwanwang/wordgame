// PLEASE DO NOT CHANGE THIS FILE
// IT IS CRITICAL THAT THIS FILE NOT CHANGE OR ELSE THINGS WILL BREAK AND MY GRANDMA WILL BE KILLED

import { GameGrid } from "./puzzles";

export type GridCell = string;
export type GridMatrix = GridCell[][];
export type RevealedMatrix = boolean[][];

export class Grid8x8 {
    private grid: GridMatrix;
    private revealed: RevealedMatrix;

    constructor() {
        this.grid = Array(8)
            .fill(null)
            .map(() => Array(8).fill(""));
        this.revealed = Array(8)
            .fill(null)
            .map(() => Array(8).fill(false));
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
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    clear(): void {
        this.grid = Array(8)
            .fill(null)
            .map(() => Array(8).fill(""));
        this.revealed = Array(8)
            .fill(null)
            .map(() => Array(8).fill(false));
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
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
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

    display(): void {
        console.log("  0 1 2 3 4 5 6 7");
        this.grid.forEach((row, i) => {
            console.log(
                `${i} ${row
                    .map((cell, j) => {
                        if (cell === "" || cell === " ") return ".";
                        return this.revealed[i][j] ? cell.toUpperCase() : "_";
                    })
                    .join(" ")}`,
            );
        });
    }

    convertToGameGrid(): GameGrid {
        return this.grid.map(row => [...row]) as GameGrid;
    }

    getRevealedCount(): number {
        let count = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (
                    this.revealed[row][col] &&
          this.grid[row][col] !== "" &&
          this.grid[row][col] !== " "
                ) {
                    count++;
                }
            }
        }
        return count;
    }

    getTotalLetters(): number {
        let count = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.grid[row][col] !== "" && this.grid[row][col] !== " ") {
                    count++;
                }
            }
        }
        return count;
    }

    getAllLetters(): string[] {
        const letters: string[] = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
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
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (
                    this.revealed[row][col] &&
          this.grid[row][col] !== "" &&
          this.grid[row][col] !== " "
                ) {
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

    // Get the bounds of the populated grid area
    getPopulatedBounds(): {
    minRow: number;
    maxRow: number;
    minCol: number;
    maxCol: number;
    } {
        let minRow = 8,
            maxRow = -1,
            minCol = 8,
            maxCol = -1;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
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
            return { minRow: 0, maxRow: 7, minCol: 0, maxCol: 7 };
        }

        return { minRow, maxRow, minCol, maxCol };
    }
}

export default Grid8x8;
