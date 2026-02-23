import { Grid8x8 } from "@shared/lib/grid";
import type { Puzzle } from "@shared/lib/puzzles";

export function calculateScore(puzzle: Puzzle, guessedLetters: string[]): { revealed: number; total: number } {
  const grid = new Grid8x8();
  grid.loadPuzzle(puzzle);

  const guessedSet = new Set(guessedLetters.map((l) => l.toUpperCase()));
  let revealed = 0;
  let total = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const letter = grid.getCell(row, col);
      if (letter && letter !== " ") {
        total++;
        if (guessedSet.has(letter.toUpperCase())) {
          revealed++;
        }
      }
    }
  }

  return { revealed, total };
}
