import { useState, useCallback, useMemo, useEffect } from "react";
import { GameState, Guess } from "@shared/schema";
import { Grid8x8 } from "@shared/lib/grid";
import { NUM_GUESSES } from "@shared/lib/game-utils";
import { getPuzzlesByDifficulty, type Puzzle } from "@shared/lib/puzzles";
import { getGameForDay, addGuess, completeGame, getCurrentStreak } from "@/lib/game-storage";

function getTodaysPuzzle(difficulty: "normal" | "hard"): Puzzle {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const year = now.getFullYear();
  const todayDate = `${month}-${day}-${year}`;

  const availablePuzzles = getPuzzlesByDifficulty(difficulty);
  const todaysPuzzle = availablePuzzles.find((puzzle: Puzzle) => puzzle.date === todayDate);

  if (!todaysPuzzle) {
    console.log(
      `No puzzle found for ${todayDate}, using fallback puzzle: ${availablePuzzles[0].date}`,
    );
    return availablePuzzles[0];
  }

  return todaysPuzzle;
}

function getRandomPracticePuzzle(): Puzzle {
  const availablePuzzles = getPuzzlesByDifficulty("practice");
  const randomIndex = Math.floor(Math.random() * availablePuzzles.length);
  return availablePuzzles[randomIndex];
}

export function useGameState(difficulty: "normal" | "hard" | "practice" = "normal") {
  // Initialize grid
  const grid = useMemo(() => new Grid8x8(), []);

  // State for current puzzle and loading
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);

  // Initialize game state
  const [gameState, setGameState] = useState<GameState>({
    totalGuessesRemaining: NUM_GUESSES,
    gameStatus: "playing",
    guessedLetters: [],
    currentPuzzle: "",
    difficulty: difficulty,
    currentStreak: 0,
  });

  // Load puzzle data from client-side
  useEffect(() => {
    // Clear the grid completely when switching modes
    grid.clear();

    const isPracticeMode = difficulty === "practice";
    const puzzle = isPracticeMode ? getRandomPracticePuzzle() : getTodaysPuzzle(difficulty);

    // Guard against missing puzzle date
    if (!puzzle.date) {
      console.error("Puzzle data missing date property");
      return;
    }

    setCurrentPuzzle(puzzle);

    // Load puzzle into grid
    grid.loadPuzzle(puzzle);

    // For practice mode, skip saved state; for normal/hard, check for saved state
    if (isPracticeMode) {
      // Practice mode - always start fresh
      setGameState({
        totalGuessesRemaining: NUM_GUESSES,
        gameStatus: "playing",
        guessedLetters: [],
        currentPuzzle: puzzle.date,
        difficulty: difficulty,
        currentStreak: 0,
      });
    } else {
      // Check for saved game state
      const savedState = getGameForDay(puzzle.date);
      const currentStreak = getCurrentStreak();

      // Restore saved state
      setGameState({
        totalGuessesRemaining: savedState.guessesRemaining,
        gameStatus: savedState.isComplete ? (savedState.wonGame ? "won" : "lost") : "playing",
        guessedLetters: savedState.guessedLetters,
        currentPuzzle: puzzle.date,
        difficulty,
        currentStreak: currentStreak,
      });

      // Restore revealed letters in grid
      savedState.guessedLetters.forEach((letter) => {
        grid.revealLetter(letter);
      });
    }
  }, [grid, difficulty]);

  const makeGuess = useCallback(
    (guess: Guess) => {
      if (gameState.gameStatus !== "playing" || gameState.totalGuessesRemaining <= 0) return;
      if (!currentPuzzle) return;

      const isPracticeMode = difficulty === "practice";
      let newGuessedLetters: string[] = [];

      setGameState((prevState) => {
        const newState = { ...prevState };

        if (guess.type === "letter") {
          const letter = guess.value.toUpperCase();

          // Don't process if already guessed this letter
          if (newState.guessedLetters.includes(letter)) return prevState;
          // game's over, no more guessing
          if (prevState.gameStatus === "won" || prevState.gameStatus === "lost") return prevState;

          newState.guessedLetters = [...newState.guessedLetters, letter];
          newState.totalGuessesRemaining -= 1;
          newGuessedLetters = [letter];

          // Reveal letter in grid
          grid.revealLetter(letter);
        } else if (guess.type === "word") {
          const word = guess.value.toUpperCase();
          newState.totalGuessesRemaining -= 1;

          // Check if word exists in the puzzle's word list
          if (currentPuzzle.words.includes(word)) {
            const wordLetters = word.split("");
            wordLetters.forEach((letter) => {
              if (!newState.guessedLetters.includes(letter)) {
                newState.guessedLetters = [...newState.guessedLetters, letter];
                newGuessedLetters.push(letter);
              }
            });

            // Reveal all letters in the word
            wordLetters.forEach((letter) => {
              grid.revealLetter(letter);
            });
          }
        }

        // Check win condition - all letters revealed
        if (grid.getRevealedCount() === grid.getTotalLetters()) {
          newState.gameStatus = "won";
        }
        // Check lose condition
        else if (newState.totalGuessesRemaining <= 0) {
          newState.gameStatus = "lost";
        }

        // Persist to storage layer if not in practice mode
        if (!isPracticeMode && currentPuzzle.date) {
          const isNowComplete = newState.gameStatus === "won" || newState.gameStatus === "lost";

          addGuess(currentPuzzle.date, newGuessedLetters, newState.totalGuessesRemaining);
          if (isNowComplete) {
            const updatedStreak = completeGame(currentPuzzle.date, newState.gameStatus === "won");
            newState.currentStreak = updatedStreak;
          }
        }

        return newState;
      });
    },
    [gameState.gameStatus, gameState.totalGuessesRemaining, grid, currentPuzzle, difficulty],
  );

  const resetGame = useCallback(() => {
    const isPracticeMode = difficulty === "practice";
    // we only allow resetting the game in practice mode
    if (!isPracticeMode) return;

    // Clear the grid
    grid.clear();

    // Reset game state
    setGameState({
      totalGuessesRemaining: NUM_GUESSES,
      gameStatus: "playing",
      guessedLetters: [],
      currentPuzzle: "",
      difficulty: difficulty,
      currentStreak: 0,
    });

    const puzzle = getRandomPracticePuzzle();
    // Clear current puzzle
    setCurrentPuzzle(puzzle);
    grid.loadPuzzle(puzzle);
  }, [difficulty, grid]);

  const isLetterRevealed = useCallback(
    (row: number, col: number): boolean => {
      return grid.isRevealed(row, col);
    },
    [grid],
  );

  const getKeyboardLetterState = useCallback(
    (letter: string): "default" | "absent" | "revealed" => {
      const upperLetter = letter.toUpperCase();
      const revealedLetters = grid.getRevealedLetters();

      // If letter is revealed in grid, mark as green
      if (revealedLetters.includes(upperLetter)) {
        return "revealed";
      }

      // If letter was guessed but not revealed, mark as gray
      if (gameState.guessedLetters.includes(upperLetter)) {
        return "absent";
      }

      // Default state - not guessed yet
      return "default";
    },
    [grid, gameState.guessedLetters],
  );

  return {
    gameState,
    grid,
    makeGuess,
    resetGame,
    isLetterRevealed,
    getKeyboardLetterState,
    currentPuzzle,
  };
}
