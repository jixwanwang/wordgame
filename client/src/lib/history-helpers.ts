import { Grid8x8 } from "@shared/lib/grid";
import type { Puzzle } from "@shared/lib/puzzles";
import { extractRevealedLettersFromGuesses } from "./grid-helpers";

export function calculateScore(puzzle: Puzzle, guesses: string[]): { revealed: number; total: number } {
  const grid = new Grid8x8();
  grid.loadPuzzle(puzzle);

  const revealedSet = extractRevealedLettersFromGuesses(guesses, puzzle.words);
  let revealed = 0;
  let total = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const letter = grid.getCell(row, col);
      if (letter && letter !== " ") {
        total++;
        if (revealedSet.has(letter.toUpperCase())) {
          revealed++;
        }
      }
    }
  }

  return { revealed, total };
}
