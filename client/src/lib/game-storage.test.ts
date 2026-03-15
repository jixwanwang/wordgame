import { describe, it } from "node:test";
import assert from "node:assert";
import { calculateStreakFromHistory, type GameHistory } from "./game-storage.js";
import {
  extractRevealedLettersFromGuesses,
  deriveRevealedCells,
  deriveRevealedLetters,
  deriveKeyboardLetterState,
} from "./grid-helpers.js";

describe("calculateStreakFromHistory", () => {
  describe("Fall DST - User's actual history", () => {
    it("should calculate streak of 3 across DST boundary (Nov 2-3, 2025)", () => {
      // DST ends on Nov 2, 2025 at 2:00 AM (fall back 1 hour)
      // This creates a 25-hour day
      const history: GameHistory = {
        currentStreak: 1, // Old value, should be recalculated
        lastCompletedDate: "11-03-2025",
        games: {
          "11-03-2025": {
            date: "11-03-2025",
            guessesRemaining: 2,
            guesses: ["E", "A", "O", "KITE", "R", "T", "S", "N", "L", "I", "D", "M", "G"],
            isComplete: true,
            wonGame: true,
          },
          "11-02-2025": {
            date: "11-02-2025",
            guessesRemaining: 0,
            guesses: ["E", "O", "N", "R", "D", "S", "T", "A", "L", "C", "Z", "B", "H", "G", "J"],
            isComplete: true,
            wonGame: true,
          },
          "11-01-2025": {
            date: "11-01-2025",
            guessesRemaining: 1,
            guesses: ["E", "A", "N", "RIVER", "P", "U", "L", "K", "V", "D", "T", "S", "G", "M"],
            isComplete: true,
            wonGame: true,
          },
        },
      };

      const streak = calculateStreakFromHistory(history);
      assert.strictEqual(streak, 3, "Should calculate streak of 3 consecutive wins across Fall DST");
    });

    it("should return 0 if most recent game is a loss", () => {
      const history: GameHistory = {
        currentStreak: 0,
        lastCompletedDate: "11-03-2025",
        games: {
          "11-03-2025": {
            date: "11-03-2025",
            guessesRemaining: 0,
            guesses: ["E", "WRONG"],
            isComplete: true,
            wonGame: false, // Lost
          },
          "11-02-2025": {
            date: "11-02-2025",
            guessesRemaining: 5,
            guesses: ["E"],
            isComplete: true,
            wonGame: true,
          },
        },
      };

      const streak = calculateStreakFromHistory(history);
      assert.strictEqual(streak, 0, "Should return 0 when most recent game is a loss");
    });
  });

  describe("Spring DST", () => {
    it("should calculate streak across Spring DST boundary (Mar 9-10, 2025)", () => {
      // DST starts on Mar 9, 2025 at 2:00 AM (spring forward 1 hour)
      // This creates a 23-hour day
      const history: GameHistory = {
        currentStreak: 0,
        lastCompletedDate: "03-10-2025",
        games: {
          "03-10-2025": {
            date: "03-10-2025",
            guessesRemaining: 5,
            guesses: ["E", "A", "R"],
            isComplete: true,
            wonGame: true,
          },
          "03-09-2025": {
            date: "03-09-2025",
            guessesRemaining: 3,
            guesses: ["T", "O", "N"],
            isComplete: true,
            wonGame: true,
          },
          "03-08-2025": {
            date: "03-08-2025",
            guessesRemaining: 7,
            guesses: ["S", "I"],
            isComplete: true,
            wonGame: true,
          },
        },
      };

      const streak = calculateStreakFromHistory(history);
      assert.strictEqual(streak, 3, "Should calculate streak of 3 consecutive wins across Spring DST");
    });
  });

  describe("Leap year", () => {
    it("should calculate streak across leap year Feb 28-29, 2024", () => {
      // 2024 is a leap year
      const history: GameHistory = {
        currentStreak: 0,
        lastCompletedDate: "03-01-2024",
        games: {
          "03-01-2024": {
            date: "03-01-2024",
            guessesRemaining: 4,
            guesses: ["E", "A"],
            isComplete: true,
            wonGame: true,
          },
          "02-29-2024": {
            date: "02-29-2024",
            guessesRemaining: 6,
            guesses: ["T", "O"],
            isComplete: true,
            wonGame: true,
          },
          "02-28-2024": {
            date: "02-28-2024",
            guessesRemaining: 8,
            guesses: ["S"],
            isComplete: true,
            wonGame: true,
          },
        },
      };

      const streak = calculateStreakFromHistory(history);
      assert.strictEqual(streak, 3, "Should calculate streak of 3 consecutive wins across leap year");
    });
  });

  describe("Edge cases", () => {
    it("should return 0 for empty game history", () => {
      const history: GameHistory = {
        currentStreak: 0,
        lastCompletedDate: null,
        games: {},
      };

      const streak = calculateStreakFromHistory(history);
      assert.strictEqual(streak, 0, "Should return 0 for empty history");
    });

    it("should return 1 for single win", () => {
      const history: GameHistory = {
        currentStreak: 0,
        lastCompletedDate: "11-03-2025",
        games: {
          "11-03-2025": {
            date: "11-03-2025",
            guessesRemaining: 5,
            guesses: ["E"],
            isComplete: true,
            wonGame: true,
          },
        },
      };

      const streak = calculateStreakFromHistory(history);
      assert.strictEqual(streak, 1, "Should return 1 for single win");
    });

    it("should stop counting at gap in consecutive days", () => {
      const history: GameHistory = {
        currentStreak: 0,
        lastCompletedDate: "11-05-2025",
        games: {
          "11-05-2025": {
            date: "11-05-2025",
            guessesRemaining: 5,
            guesses: ["E", "HELLO"],
            isComplete: true,
            wonGame: true,
          },
          "11-04-2025": {
            date: "11-04-2025",
            guessesRemaining: 3,
            guesses: ["T"],
            isComplete: true,
            wonGame: true,
          },
          // Gap here - missing 11-03-2025
          "11-02-2025": {
            date: "11-02-2025",
            guessesRemaining: 7,
            guesses: ["S"],
            isComplete: true,
            wonGame: true,
          },
          "11-01-2025": {
            date: "11-01-2025",
            guessesRemaining: 9,
            guesses: ["I"],
            isComplete: true,
            wonGame: true,
          },
        },
      };

      const streak = calculateStreakFromHistory(history);
      assert.strictEqual(streak, 2, "Should stop counting at gap, returning 2");
    });

    it("should stop counting at first loss in history", () => {
      const history: GameHistory = {
        currentStreak: 0,
        lastCompletedDate: "11-05-2025",
        games: {
          "11-05-2025": {
            date: "11-05-2025",
            guessesRemaining: 5,
            guesses: ["E"],
            isComplete: true,
            wonGame: true,
          },
          "11-04-2025": {
            date: "11-04-2025",
            guessesRemaining: 3,
            guesses: ["T"],
            isComplete: true,
            wonGame: true,
          },
          "11-03-2025": {
            date: "11-03-2025",
            guessesRemaining: 0,
            guesses: ["S", "WRONG", "B"],
            isComplete: true,
            wonGame: false, // Loss
          },
          "11-02-2025": {
            date: "11-02-2025",
            guessesRemaining: 7,
            guesses: ["R"],
            isComplete: true,
            wonGame: true,
          },
        },
      };

      const streak = calculateStreakFromHistory(history);
      assert.strictEqual(streak, 2, "Should stop counting at first loss, returning 2");
    });
  });
});

describe("extractRevealedLettersFromGuesses", () => {
  const puzzleWords = ["HELLO", "WORLD", "CAT"];

  it("should reveal single-letter guesses", () => {
    const result = extractRevealedLettersFromGuesses(["A", "B", "C"], puzzleWords);
    assert.deepStrictEqual(result, new Set(["A", "B", "C"]));
  });

  it("should reveal letters from a valid word guess", () => {
    const result = extractRevealedLettersFromGuesses(["HELLO"], puzzleWords);
    assert.deepStrictEqual(result, new Set(["H", "E", "L", "O"]));
  });

  it("should not reveal letters from an invalid word guess", () => {
    const result = extractRevealedLettersFromGuesses(["WRONG"], puzzleWords);
    assert.strictEqual(result.size, 0);
  });

  it("should handle mix of letter guesses and valid word guesses", () => {
    const result = extractRevealedLettersFromGuesses(["A", "HELLO", "Z"], puzzleWords);
    assert.deepStrictEqual(result, new Set(["A", "H", "E", "L", "O", "Z"]));
  });

  it("should handle mix of letter guesses, valid words, and invalid words", () => {
    const result = extractRevealedLettersFromGuesses(
      ["A", "HELLO", "WRONG", "B", "CAT"],
      puzzleWords,
    );
    assert.deepStrictEqual(result, new Set(["A", "H", "E", "L", "O", "B", "C", "T"]));
  });

  it("should be case-insensitive for word matching", () => {
    const result = extractRevealedLettersFromGuesses(["hello"], puzzleWords);
    assert.deepStrictEqual(result, new Set(["H", "E", "L", "O"]));
  });

  it("should be case-insensitive for letter guesses", () => {
    const result = extractRevealedLettersFromGuesses(["a", "b"], puzzleWords);
    assert.deepStrictEqual(result, new Set(["A", "B"]));
  });

  it("should return empty set for empty guesses", () => {
    const result = extractRevealedLettersFromGuesses([], puzzleWords);
    assert.strictEqual(result.size, 0);
  });

  it("should deduplicate letters from overlapping guesses", () => {
    // "HELLO" reveals H,E,L,O. Then guessing "H" as a letter doesn't double-count.
    const result = extractRevealedLettersFromGuesses(["HELLO", "H", "E"], puzzleWords);
    assert.deepStrictEqual(result, new Set(["H", "E", "L", "O"]));
  });
});

describe("deriveRevealedCells", () => {
  // Simple 8x8 grid with a few words
  const grid: string[][] = [
    ["C", "A", "T", " ", " ", " ", " ", " "],
    [" ", " ", " ", " ", " ", " ", " ", " "],
    ["D", "O", "G", " ", " ", " ", " ", " "],
    [" ", " ", " ", " ", " ", " ", " ", " "],
    [" ", " ", " ", " ", " ", " ", " ", " "],
    [" ", " ", " ", " ", " ", " ", " ", " "],
    [" ", " ", " ", " ", " ", " ", " ", " "],
    [" ", " ", " ", " ", " ", " ", " ", " "],
  ];
  const puzzleWords = ["CAT", "DOG"];

  it("should reveal cells for single-letter guesses", () => {
    const cells = deriveRevealedCells(["A"], puzzleWords, grid);
    assert.strictEqual(cells[0][1], true, "A at row 0, col 1");
    assert.strictEqual(cells[0][0], false, "C not revealed");
    assert.strictEqual(cells[0][2], false, "T not revealed");
  });

  it("should reveal cells for valid word guess", () => {
    const cells = deriveRevealedCells(["CAT"], puzzleWords, grid);
    assert.strictEqual(cells[0][0], true, "C revealed");
    assert.strictEqual(cells[0][1], true, "A revealed");
    assert.strictEqual(cells[0][2], true, "T revealed");
    assert.strictEqual(cells[2][0], false, "D not revealed");
  });

  it("should not reveal cells for invalid word guess", () => {
    const cells = deriveRevealedCells(["FOX"], puzzleWords, grid);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        assert.strictEqual(cells[r][c], false, `Cell [${r}][${c}] should not be revealed`);
      }
    }
  });

  it("should reveal cells from mixed letter and word guesses", () => {
    const cells = deriveRevealedCells(["D", "CAT"], puzzleWords, grid);
    // CAT letters
    assert.strictEqual(cells[0][0], true);
    assert.strictEqual(cells[0][1], true);
    assert.strictEqual(cells[0][2], true);
    // D letter
    assert.strictEqual(cells[2][0], true);
    // O and G not guessed
    assert.strictEqual(cells[2][1], false);
    assert.strictEqual(cells[2][2], false);
  });
});

describe("deriveRevealedLetters", () => {
  const grid: string[][] = [
    ["C", "A", "T", " ", " ", " ", " ", " "],
    [" ", " ", " ", " ", " ", " ", " ", " "],
    ["D", "O", "G", " ", " ", " ", " ", " "],
    [" ", " ", " ", " ", " ", " ", " ", " "],
    [" ", " ", " ", " ", " ", " ", " ", " "],
    [" ", " ", " ", " ", " ", " ", " ", " "],
    [" ", " ", " ", " ", " ", " ", " ", " "],
    [" ", " ", " ", " ", " ", " ", " ", " "],
  ];
  const puzzleWords = ["CAT", "DOG"];

  it("should return only letters that exist in the grid", () => {
    // Z is guessed but not in the grid
    const revealed = deriveRevealedLetters(["A", "Z"], puzzleWords, grid);
    assert.ok(revealed.includes("A"));
    assert.ok(!revealed.includes("Z"));
  });

  it("should return letters from a valid word guess that are in the grid", () => {
    const revealed = deriveRevealedLetters(["DOG"], puzzleWords, grid);
    assert.ok(revealed.includes("D"));
    assert.ok(revealed.includes("O"));
    assert.ok(revealed.includes("G"));
  });

  it("should not return letters from an invalid word guess", () => {
    const revealed = deriveRevealedLetters(["FOX"], puzzleWords, grid);
    assert.strictEqual(revealed.length, 0);
  });
});

describe("deriveKeyboardLetterState", () => {
  it("should return 'revealed' if letter is in revealedLetters", () => {
    const state = deriveKeyboardLetterState("A", ["A", "B"], ["A"]);
    assert.strictEqual(state, "revealed");
  });

  it("should return 'absent' for a single-letter guess not in puzzle", () => {
    const state = deriveKeyboardLetterState("Z", ["Z"], []);
    assert.strictEqual(state, "absent");
  });

  it("should return 'default' for unguessed letter", () => {
    const state = deriveKeyboardLetterState("X", [], []);
    assert.strictEqual(state, "default");
  });

  it("should not mark a letter absent if it only appears in a word guess", () => {
    // "W" appears in the word "WRONG" but was never guessed as a single letter
    const state = deriveKeyboardLetterState("W", ["WRONG"], []);
    assert.strictEqual(state, "default");
  });

  it("should mark letter absent only when guessed as single letter", () => {
    // "W" guessed as single letter and not in puzzle
    const state = deriveKeyboardLetterState("W", ["W", "HELLO"], []);
    assert.strictEqual(state, "absent");
  });
});
