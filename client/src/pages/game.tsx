import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { CrosswordGrid } from "@/components/crossword-grid";
import { GameStats } from "@/components/game-stats";
import { GameKeyboard } from "@/components/game-keyboard";
import { HowToPlayModal } from "@/components/how-to-play-modal";
import { GameOverStats } from "@/components/game-over-stats";
import { useGameState } from "@/hooks/use-game-state";
import { SquareInput } from "@/components/square-input";
import { HelpCircle } from "lucide-react";
import { getGameNumber, NUM_GUESSES, calculateRevealedLetterCount } from "@shared/lib/game-utils";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { isValidWord } from "@shared/lib/all_words";

interface GameProps {
  difficulty: "normal" | "hard" | "practice";
}

export default function Game({ difficulty }: GameProps) {
  const {
    gameState,
    grid,
    makeGuess,
    isLetterRevealed,
    getKeyboardLetterState,
    currentPuzzle,
    resetGame,
  } = useGameState(difficulty);

  const [inputValue, setInputValue] = useState("");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const toastTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Show how to play modal for first-time users
  useEffect(() => {
    const hasHistory = localStorage.getItem("wordgame-history");
    if (!hasHistory) {
      setTimeout(() => {
        setShowHowToPlay(true);
      }, 1000);
    }
  }, []);

  const showToast = useCallback((text: string) => {
    // Clear any existing timeout
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setToastMessage(text);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage("");
      toastTimeoutRef.current = null;
    }, 1500);
  }, []);

  const handleGuess = useCallback(() => {
    if (gameState.gameStatus !== "playing") return;

    const guess = inputValue.trim().toUpperCase();
    if (!guess) return;

    if (guess.length === 1) {
      if (gameState.guessedLetters.includes(guess)) {
        showToast(`Already guessed`);
        return;
      }
      makeGuess({ type: "letter", value: guess });
    } else {
      if (guess.length < 4) {
        showToast(`Words are at least 4 letters`);
        return;
      } else if (!isValidWord(guess)) {
        showToast(`Not in the word list`);
        return;
      }
      makeGuess({ type: "word", value: guess });
    }

    setInputValue("");
  }, [inputValue, gameState.guessedLetters, makeGuess, showToast, gameState.gameStatus]);

  const handleLetterClick = useCallback(
    (letter: string) => {
      if (gameState.gameStatus !== "playing") return;
      setInputValue((prev) => {
        if (prev.length < 6) {
          return prev + letter;
        } else {
          showToast("Longest word is 6 letters");
          return prev;
        }
      });
    },
    [gameState.gameStatus, showToast],
  );

  const handleBackspaceClick = useCallback(() => {
    if (gameState.gameStatus !== "playing") return;
    setInputValue((prev) => prev.slice(0, -1));
  }, [gameState.gameStatus]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.gameStatus !== "playing") return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "Enter") {
        handleGuess();
      } else if (e.key === "Backspace") {
        handleBackspaceClick();
      } else if (e.key.match(/[a-zA-Z]/) && e.key.length === 1) {
        // Only add single letter characters
        const letter = e.key.toUpperCase();
        setInputValue((prev) => {
          // Limit to 6 characters max (longest word is 6 letters)
          if (prev.length < 6) {
            return prev + letter;
          } else {
            showToast("Longest word is 6 letters");
            return prev;
          }
        });
      }

      // Prevent default behavior for handled keys
      if (e.key === "Enter" || e.key === "Backspace" || e.key.match(/[a-zA-Z]/)) {
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleGuess, handleBackspaceClick, gameState.gameStatus, showToast]);

  if (currentPuzzle == null) {
    return <div>SOMETHING WENT REALLY WRONG</div>;
  }
  const puzzleNumber = getGameNumber(currentPuzzle.date);

  return (
    <div className="bg-white font-game min-h-screen">
      {/* Header */}
      <header className="text-center py-3" data-testid="game-header">
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-dark">
              Crosses {difficulty !== "practice" ? `#${puzzleNumber}` : ""}
            </h1>
          </div>
          <button
            onClick={() => setShowHowToPlay(true)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            data-testid="help-button"
            aria-label="How to play"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
          {difficulty === "practice" && (
            <span
              className="text-xs text-gray-500 px-2 py-1 rounded-sm bg-blue-300 font-medium"
              data-testid="practice-subtitle"
              onClick={() => {
                window.location.reload();
              }}
            >
              practice
            </span>
          )}
        </div>
      </header>

      {/* How to Play Modal */}
      <HowToPlayModal
        open={showHowToPlay}
        onOpenChange={setShowHowToPlay}
        isPractice={gameState.difficulty === "practice"}
      />

      <main className="container mx-auto px-2 sm:px-4 pb-4 max-w-2xl">
        <div className="relative">
          <CrosswordGrid
            grid={grid}
            isLetterRevealed={isLetterRevealed}
            currentPuzzle={currentPuzzle}
            gameStatus={gameState.gameStatus}
          />
        </div>

        <div className="flex justify-center">
          <div className="inline-flex flex-col">
            {/* Input Section, only visible when playing */}
            {gameState.gameStatus === "playing" ? (
              <div className="relative w-full mb-3 flex flex-col gap-3">
                {/* Square input - centered */}
                <div className="flex justify-center">
                  <SquareInput value={inputValue} maxLength={6} />
                </div>

                {/* Guesses and button row */}
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex justify-start pl-1">
                    <GameStats gameState={gameState} grid={grid} />
                  </div>
                  <button
                    onClick={handleGuess}
                    disabled={!inputValue}
                    className="px-2 py-1 bg-gray-200 hover:bg-gray-300 border-2 border-gray-300 rounded-lg text-sm font-bold text-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-200"
                    data-testid="guess-button"
                  >
                    {inputValue.length <= 1 ? "GUESS" : "GUESS WORD"}
                  </button>
                </div>

                {/* Toast message - absolutely positioned at the bottom of the grid */}
                {toastMessage && (
                  <div
                    className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-[8px] bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium shadow-lg z-10 whitespace-nowrap"
                    data-testid="toast-message"
                  >
                    {toastMessage}
                  </div>
                )}
              </div>
            ) : null}

            {/* On-screen Keyboard or Game Over Stats */}
            {gameState.gameStatus === "playing" ? (
              <GameKeyboard
                onLetterClick={handleLetterClick}
                onBackspaceClick={handleBackspaceClick}
                getLetterState={getKeyboardLetterState}
              />
            ) : gameState.difficulty !== "practice" ? (
              <div className="mb-2 flex flex-col items-center gap-4">
                <GameStats gameState={gameState} grid={grid} />
                <GameOverStats
                  won={gameState.gameStatus === "won"}
                  numGuesses={NUM_GUESSES - gameState.totalGuessesRemaining}
                  totalLettersRevealed={calculateRevealedLetterCount(
                    currentPuzzle.words,
                    grid.getRevealedLetters(),
                  )}
                  puzzleNumber={puzzleNumber}
                />
              </div>
            ) : (
              <div className="flex gap-4">
                <Button
                  className="bg-gray-600 mt-4 hover:bg-gray-700 text-white"
                  onClick={() => resetGame}
                  data-testid="practice-button"
                >
                  {"Practice again"}
                </Button>
                <Link href={"/"}>
                  <Button
                    className="bg-gray-600 mt-4 hover:bg-gray-700 text-white"
                    onClick={() => {}}
                  >
                    {"Back to today's puzzle"}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 mt-6 sm:mt-10">
          © 2025 Jixuan Wang. All Rights Reserved{" "}
        </div>
      </main>
    </div>
  );
}
