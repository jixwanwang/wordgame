import { describe, it } from "node:test";
import assert from "node:assert";
import { calculateStreakFromHistory, type GameHistory } from "./game-storage.js";

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
            guessedLetters: ["E", "A", "O", "K", "R", "T", "S", "N", "L", "I", "D", "M", "G", "C"],
            isComplete: true,
            wonGame: true,
          },
          "11-02-2025": {
            date: "11-02-2025",
            guessesRemaining: 0,
            guessedLetters: ["E", "O", "N", "R", "D", "S", "T", "A", "L", "C", "Z", "B", "H", "G", "J"],
            isComplete: true,
            wonGame: true,
          },
          "11-01-2025": {
            date: "11-01-2025",
            guessesRemaining: 1,
            guessedLetters: ["E", "A", "N", "R", "I", "P", "U", "L", "K", "V", "D", "T", "S", "G", "M"],
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
            guessedLetters: ["E", "A"],
            isComplete: true,
            wonGame: false, // Lost
          },
          "11-02-2025": {
            date: "11-02-2025",
            guessesRemaining: 5,
            guessedLetters: ["E"],
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
            guessedLetters: ["E", "A", "R"],
            isComplete: true,
            wonGame: true,
          },
          "03-09-2025": {
            date: "03-09-2025",
            guessesRemaining: 3,
            guessedLetters: ["T", "O", "N"],
            isComplete: true,
            wonGame: true,
          },
          "03-08-2025": {
            date: "03-08-2025",
            guessesRemaining: 7,
            guessedLetters: ["S", "I"],
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
            guessedLetters: ["E", "A"],
            isComplete: true,
            wonGame: true,
          },
          "02-29-2024": {
            date: "02-29-2024",
            guessesRemaining: 6,
            guessedLetters: ["T", "O"],
            isComplete: true,
            wonGame: true,
          },
          "02-28-2024": {
            date: "02-28-2024",
            guessesRemaining: 8,
            guessedLetters: ["S"],
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
            guessedLetters: ["E"],
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
            guessedLetters: ["E"],
            isComplete: true,
            wonGame: true,
          },
          "11-04-2025": {
            date: "11-04-2025",
            guessesRemaining: 3,
            guessedLetters: ["T"],
            isComplete: true,
            wonGame: true,
          },
          // Gap here - missing 11-03-2025
          "11-02-2025": {
            date: "11-02-2025",
            guessesRemaining: 7,
            guessedLetters: ["S"],
            isComplete: true,
            wonGame: true,
          },
          "11-01-2025": {
            date: "11-01-2025",
            guessesRemaining: 9,
            guessedLetters: ["I"],
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
            guessedLetters: ["E"],
            isComplete: true,
            wonGame: true,
          },
          "11-04-2025": {
            date: "11-04-2025",
            guessesRemaining: 3,
            guessedLetters: ["T"],
            isComplete: true,
            wonGame: true,
          },
          "11-03-2025": {
            date: "11-03-2025",
            guessesRemaining: 0,
            guessedLetters: ["S", "A", "B"],
            isComplete: true,
            wonGame: false, // Loss
          },
          "11-02-2025": {
            date: "11-02-2025",
            guessesRemaining: 7,
            guessedLetters: ["R"],
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
