import { useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { selectGameStatus } from "@/store/selectors/gameSelectors";
import { selectRevealedLetters } from "@/store/selectors/gridSelectors";
import { selectCurrentPuzzle } from "@/store/selectors/puzzleSelectors";
import type { RootState } from "@/store/index";

const selectGuesses = (state: RootState) => state.game.guesses;

/**
 * Watches game state and returns a contextual hint string for brand-new users
 * (no localStorage history), cycling through four hint stages. Returns null
 * when no hint should be shown.
 *
 * Hint stages:
 *   1. Game start (no guesses): suggest a letter shared across multiple words.
 *   2. After first guess: "Guess more letters to reveal them and make words."
 *      Stays until a word has ≤2 unique unrevealed letters.
 *   3. A word is close: "You're close to a word — try guessing it!"
 *      Stays until the user submits a correct word guess.
 *   4. Correct word guessed: "Guessing a word correctly reveals all of its letters!"
 *      Disappears after one more guess.
 */
export function useHintText(): string | null {
  const gameStatus = useAppSelector(selectGameStatus);
  const revealedLetters = useAppSelector(selectRevealedLetters);
  const currentPuzzle = useAppSelector(selectCurrentPuzzle);
  const guesses = useAppSelector(selectGuesses);

  // Computed once on mount: only show hints to brand-new users.
  const isNewUser = useMemo(() => localStorage.getItem("wordgame-history") === null, []);

  // Find the letter at an intersection cell (a grid cell shared by 2+ words) for hint 1.
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

  // Hint 1: no guesses yet — suggest the most cross-word letter.
  if (guesses.length === 0) {
    if (bestSharedLetter != null) {
      return `Start by guessing a letter. Hint: ${bestSharedLetter}`;
    }
    return "Start by guessing a letter";
  }

  const puzzleWords = currentPuzzle.words.map((w) => w.toUpperCase());

  // Find the index of the first correct word guess (word submitted that is in the puzzle).
  const firstCorrectWordIdx = guesses.findIndex(
    (g) => g.length > 1 && puzzleWords.includes(g.toUpperCase()),
  );

  // Hint 4: just guessed a word correctly — show once, then disappear after one more guess.
  if (firstCorrectWordIdx !== -1) {
    const guessesAfter = guesses.length - 1 - firstCorrectWordIdx;
    if (guessesAfter === 0) {
      return "Nice! Guessing a word correctly reveals ALL of its letters!";
    }
    return null;
  }

  // Hint 3: a word has exactly 2 unrevealed squares — name it.
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

  // Hint 2: keep guessing letters.
  return "Guess more letters to uncover words";
}
