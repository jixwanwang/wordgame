import { useMemo, useRef } from "react";
import { useAppSelector } from "@/store/hooks";
import { selectGameStatus } from "@/store/selectors/gameSelectors";
import { selectRevealedLetters } from "@/store/selectors/gridSelectors";
import { selectCurrentPuzzle } from "@/store/selectors/puzzleSelectors";
import type { RootState } from "@/store/index";

const selectGuesses = (state: RootState) => state.game.guesses;

/**
 * Returns a contextual hint string for brand-new users, cycling through four
 * stages as they progress. Returns null when no hint should be shown.
 */
export function useHintText(): string | null {
  const gameStatus = useAppSelector(selectGameStatus);
  const revealedLetters = useAppSelector(selectRevealedLetters);
  const currentPuzzle = useAppSelector(selectCurrentPuzzle);
  const guesses = useAppSelector(selectGuesses);

  const isNewUser = useRef(localStorage.getItem("wordgame-history") === null).current;

  // Find the letter at a grid cell shared by 2+ words to suggest in hint 1.
  const bestSharedLetter = useMemo(() => {
    if (currentPuzzle == null) return null;
    const cellWordCount: Record<string, number> = {};
    for (const positions of Object.values(currentPuzzle.wordPositions)) {
      for (const [row, col] of positions) {
        const key = `${row},${col}`;
        cellWordCount[key] = (cellWordCount[key] ?? 0) + 1;
      }
    }
    const intersectionKey = Object.entries(cellWordCount).find(([, count]) => count >= 2)?.[0];
    if (intersectionKey == null) return null;
    const [row, col] = intersectionKey.split(",").map(Number);
    return currentPuzzle.grid[row][col].toUpperCase();
  }, [currentPuzzle]);

  if (!isNewUser || gameStatus !== "playing" || currentPuzzle == null) {
    return null;
  }

  // Stage 1: no guesses yet — suggest a letter at a word intersection.
  if (guesses.length === 0) {
    if (bestSharedLetter != null) {
      return `Start by guessing a letter. Hint: ${bestSharedLetter}`;
    }
    return "Start by guessing a letter";
  }

  const puzzleWords = currentPuzzle.words.map((w) => w.toUpperCase());

  const firstCorrectWordIdx = guesses.findIndex(
    (g) => g.length > 1 && puzzleWords.includes(g.toUpperCase()),
  );

  // Stage 4: a word was just guessed correctly — show once, then stop. No more hints until the game is over.
  if (firstCorrectWordIdx !== -1) {
    const guessesAfter = guesses.length - 1 - firstCorrectWordIdx;
    if (guessesAfter === 0) {
      return "Nice! Guessing a word correctly reveals ALL of its letters!";
    }
    return null;
  }

  // Stage 3: a word has exactly 2 unrevealed squares — name it.
  const closeWord = currentPuzzle.words.find((word) => {
    const positions = currentPuzzle.wordPositions[word.toUpperCase()];
    if (positions == null) return false;
    const unrevealedCount = positions.filter(
      ([row, col]) => !revealedLetters.includes(currentPuzzle.grid[row][col].toUpperCase()),
    ).length;
    return unrevealedCount === 2;
  });

  if (closeWord != null) {
    return `You can guess words too. Hint: ${closeWord.toUpperCase()}`;
  }

  // Stage 2: keep guessing letters.
  return "Guess more letters to uncover words";
}
