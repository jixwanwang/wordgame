import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { CrosswordGrid } from "@/components/crossword-grid";
import { GameStats } from "@/components/game-stats";
import { GameKeyboard } from "@/components/game-keyboard";
import { HowToPlayModal } from "@/components/how-to-play-modal";
import { GameOverModal } from "@/components/game-over-modal";
import { useGameState } from "@/hooks/use-game-state";
import { Input } from "@/components/ui/input";
import { HelpCircle } from "lucide-react";
import { getCurrentStreak } from "@/lib/game-storage";
import { getGameNumber, NUM_GUESSES, calculateRevealedLetterCount } from "@shared/lib/game-utils";

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
    isLoadingPuzzle,
  } = useGameState(difficulty);

  const [inputValue, setInputValue] = useState("");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const toastTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

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

  // Show game over modal when game ends
  useEffect(() => {
    if (gameState.gameStatus === "won" || gameState.gameStatus === "lost") {
        setTimeout(() => {
            setShowGameOver(true);
        }, 1500);
    }
  }, [gameState.gameStatus]);


  const handleGuess = useCallback(() => {
    if (gameState.gameStatus !== "playing") return;

    const guess = inputValue.trim().toUpperCase();
    if (!guess) return;

    if (guess.length === 1) {
      if (gameState.guessedLetters.includes(guess)) {
        showToast(`${guess} already guessed`);
        return;
      }
      makeGuess({ type: "letter", value: guess });
    } else {
      makeGuess({ type: "word", value: guess });
    }

    setInputValue("");
  }, [inputValue, gameState.guessedLetters, makeGuess, showToast, gameState.gameStatus]);

  const handleLetterClick = useCallback(
    (letter: string) => {
      console.log("handleLetterClick called with letter:", letter, gameState.gameStatus);
      if (gameState.gameStatus !== "playing") return;
      setInputValue((prev) => prev + letter);
    },
    [gameState.gameStatus],
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
          // Limit to reasonable length (10 characters max)
          if (prev.length < 10) {
            return prev + letter;
          }
          return prev;
        });
      }

      // Prevent default behavior for handled keys
      if (e.key === "Enter" || e.key === "Backspace" || e.key.match(/[a-zA-Z]/)) {
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleGuess, handleBackspaceClick, gameState.gameStatus]);



if (currentPuzzle == null) {
    return <div>SOMETHING WENT REALLY WRONG</div>
}
const puzzleNumber = getGameNumber(currentPuzzle.date)

  return (
    <div className="bg-white font-game min-h-screen">
      {/* Header */}
      <header className="text-center py-3" data-testid="game-header">
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-dark">
              Crosses{" "}
              {difficulty !== "practice" ?
                  `#${puzzleNumber}`
              : ''}
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

      {/* Game Over Modal */}
      <GameOverModal
        open={showGameOver}
        onOpenChange={setShowGameOver}
        won={gameState.gameStatus === "won"}
        numGuesses={NUM_GUESSES - gameState.totalGuessesRemaining}
        totalLettersRevealed={calculateRevealedLetterCount(
          currentPuzzle.words,
          grid.getRevealedLetters()
        )}
        puzzleNumber={puzzleNumber}
        currentStreak={getCurrentStreak()}
      />

      <main className="container mx-auto px-2 sm:px-4 pb-4 max-w-2xl">
        {/* Crossword Grid or Loading Spinner */}
        {isLoadingPuzzle ? (
          <div className="flex justify-center items-center mb-6 h-64" data-testid="puzzle-loading">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <CrosswordGrid
            grid={grid}
            isLetterRevealed={isLetterRevealed}
            currentPuzzle={currentPuzzle}
            gameStatus={gameState.gameStatus}
          />
        )}

        {/* Input Section */}
        <div className="flex justify-center my-3">
          <div className="flex flex-col items-center gap-1 relative">
            {/* Toast message - absolutely positioned over the input area */}
            {toastMessage && (
              <div
                className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-[8px] bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium shadow-lg z-10 whitespace-nowrap"
                data-testid="toast-message"
              >
                {toastMessage}
              </div>
            )}
            <GameStats gameState={gameState} grid={grid} />
            <Input
              type="text"
              placeholder="Guess a letter or word"
              className="px-4 py-2 min-w-[270px] text-xs sm:text-sm border-2 border-gray-300 rounded-lg font-bold uppercase text-center focus:border-correct focus:outline-none"
              maxLength={10}
              value={inputValue}
              readOnly
              disabled
              tabIndex={-1}
              data-testid="guess-input"
            />
          </div>
        </div>

        {/* On-screen Keyboard */}
        <GameKeyboard
          onLetterClick={handleLetterClick}
          onEnterClick={handleGuess}
          onBackspaceClick={handleBackspaceClick}
          getLetterState={getKeyboardLetterState}
        />

        <div className="text-center text-xs text-gray-400 mt-6 sm:mt-10">© 2025 Jixuan Wang. All Rights Reserved </div>
      </main>
    </div>
  );
}
