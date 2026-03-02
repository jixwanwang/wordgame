import * as React from "react";
import { useState, useCallback, useEffect, useMemo } from "react";
import { CrosswordGrid } from "@/components/crossword-grid";
import { GameStats } from "@/components/game-stats";
import { GameKeyboard } from "@/components/game-keyboard";
import { GameOverStats } from "@/components/game-over-stats";
import { AuthModal } from "@/components/auth-modal";
import { StatsModal } from "@/components/stats-modal";
import { HistoryModal } from "@/components/history-modal";
import { SquareInput } from "@/components/square-input";
import { CircleUserRound, UserRound, ChartColumnBig, LogOut, Calendar } from "lucide-react";
import { getGameNumber, NUM_GUESSES, calculateRevealedLetterCount } from "@shared/lib/game-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isValidWord } from "@shared/lib/dictionary";
import { API, Auth } from "@/lib/api-client";
import { getGameHistory } from "@/lib/game-storage";
import { Grid8x8 } from "@shared/lib/grid";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchPuzzleThunk, makeGuessThunk } from "@/store/thunks/gameThunks";
import { handleLoginSuccess, handleLogout } from "@/store/thunks/authThunks";
import {
  selectGameState,
  selectGameStatus,
  selectGuessedLetters,
  selectTotalGuessesRemaining,
  selectCurrentStreak,
} from "@/store/selectors/gameSelectors";
import { selectCurrentPuzzle, selectIsLoading } from "@/store/selectors/puzzleSelectors";
import {
  selectRevealedCells,
  selectRevealedLetters,
  selectRevealedCount,
} from "@/store/selectors/gridSelectors";
import { setDifficulty } from "@/store/slices/gameSlice";
import { cn } from "@/lib/utils";
import { GuessesModal } from "@/components/guesses-modal";
import { useSearch, useLocation } from "wouter";
import { getTodayInPacificTime } from "../../../server/time-utils";

// separate the storage layer with a proper api for actions rather than whole state updates
// use the error popup for tutorial. start with guess a letter (and give a suggestion that will guarantee multiple)
// prompt users to guess a word if they get close to a word (2 letters off), like g_ar_ or something

function formatPastPuzzleDate(apiDate: string): string {
  const [month, day, year] = apiDate.split("-").map(Number);
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${monthNames[month - 1]} ${day}, ${year}`;
}

interface GameProps {
  difficulty: "normal" | "hard";
}

export default function Game({ difficulty }: GameProps) {
  const dispatch = useAppDispatch();

  // Redux state
  const gameState = useAppSelector(selectGameState);
  const gameStatus = useAppSelector(selectGameStatus);
  const guessedLetters = useAppSelector(selectGuessedLetters);
  const totalGuessesRemaining = useAppSelector(selectTotalGuessesRemaining);
  const currentStreak = useAppSelector(selectCurrentStreak);
  const currentPuzzle = useAppSelector(selectCurrentPuzzle);
  const isLoading = useAppSelector(selectIsLoading);
  const revealedCells = useAppSelector(selectRevealedCells);
  const revealedLetters = useAppSelector(selectRevealedLetters);
  const revealedCount = useAppSelector(selectRevealedCount);

  // Create Grid8x8 instance and keep it in sync with Redux state
  const grid = useMemo(() => {
    const newGrid = new Grid8x8();

    // Load puzzle if available
    if (currentPuzzle) {
      newGrid.loadPuzzle(currentPuzzle);

      // Sync revealed state from Redux
      revealedLetters.forEach((letter) => {
        newGrid.revealLetter(letter);
      });
    }

    return newGrid;
  }, [currentPuzzle, revealedLetters]);

  // Parse date URL param to support playing past puzzles
  const search = useSearch();
  const rawSearch = search.startsWith("?") ? search.slice(1) : search;
  const urlParams = new URLSearchParams(rawSearch);
  const dateParam = urlParams.get("date") ?? undefined;
  const today = getTodayInPacificTime();
  const isPlayingPastPuzzle = dateParam !== undefined && dateParam !== today;
  const [, navigate] = useLocation();

  // Load puzzle and set difficulty on mount/difficulty change
  useEffect(() => {
    dispatch(setDifficulty(difficulty));
    dispatch(fetchPuzzleThunk({ difficulty, date: dateParam }));
  }, [difficulty, dateParam, dispatch]);

  // Reset to results tab when game ends
  useEffect(() => {
    if (gameStatus !== "playing") {
      setActiveTab("results");
    }
  }, [gameStatus]);

  const [inputValue, setInputValue] = useState("");
  const [activeTab, setActiveTab] = useState<"results" | "guesses">("results");
  const [showGuessesModal, setShowGuessesModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const toastTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const longestWordInPuzzle =
    currentPuzzle?.words.reduce((max, word) => Math.max(max, word.length), 0) ?? 7;

  const handleGoToToday = useCallback(() => {
    navigate(difficulty === "hard" ? "/hard" : "/");
  }, [navigate, difficulty]);

  // Show auth modal if not logged in, and refresh token if needed
  useEffect(() => {
    const checkAuth = async () => {
      // if the user is not authenticated and has game history, pop up the register/login modal.
      if (!Auth.isAuthenticated()) {
        if (getGameHistory().lastCompletedDate != null) {
          setTimeout(() => {
            setShowAuthModal(true);
          }, 500);
        }
        return;
      }

      // Check if token should be refreshed (5 days or less remaining)
      if (Auth.shouldRefreshToken()) {
        const refreshed = await API.refreshToken();
        if (!refreshed) {
          // Refresh failed, log the user out
          dispatch(handleLogout());
          setTimeout(() => {
            setShowAuthModal(true);
          }, 500);
          return;
        }
      } else {
        // Token doesn't need refresh yet, but verify it's still valid
        const isValid = await API.checkAuthToken();
        if (!isValid) {
          dispatch(handleLogout());
          setTimeout(() => {
            setShowAuthModal(true);
          }, 500);
          return;
        }
      }
    };

    checkAuth();
  }, [dispatch]);

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

  // Open stats modal
  const handleFetchHistory = () => {
    setShowStatsModal(true);
  };

  const handleGuess = useCallback(() => {
    if (gameStatus !== "playing") return;

    const guess = inputValue.trim().toUpperCase();
    if (!guess) return;

    if (guess.length === 1) {
      if (guessedLetters.includes(guess)) {
        showToast(`Already guessed`);
        return;
      }
      dispatch(makeGuessThunk({ type: "letter", value: guess }));
    } else {
      // without any revealed letters, we shouldn't allow guessing any words
      if (guessedLetters.length === 0 || revealedCount === 0) {
        showToast("Guess a letter first!");
        return;
      }
      if (guess.length < 3) {
        showToast(`Words are at least 3 letters`);
        return;
      } else if (!isValidWord(guess)) {
        showToast(`Not in the word list`);
        return;
      }
      dispatch(makeGuessThunk({ type: "word", value: guess }));
    }

    setInputValue("");
  }, [inputValue, guessedLetters, dispatch, showToast, gameStatus, revealedCount]);

  const handleLetterClick = useCallback(
    (letter: string) => {
      if (gameStatus !== "playing") return;
      setInputValue((prev) => {
        if (prev.length < longestWordInPuzzle) {
          return prev + letter;
        } else {
          showToast(`Longest word is ${longestWordInPuzzle} letters`);
          return prev;
        }
      });
    },
    [gameStatus, showToast, longestWordInPuzzle],
  );

  const handleBackspaceClick = useCallback(() => {
    if (gameStatus !== "playing") return;
    setInputValue((prev) => prev.slice(0, -1));
  }, [gameStatus]);

  // Callback for isLetterRevealed (for CrosswordGrid)
  const isLetterRevealed = useCallback(
    (row: number, col: number): boolean => {
      return revealedCells[row]?.[col] || false;
    },
    [revealedCells],
  );

  // Callback for getKeyboardLetterState (for GameKeyboard)
  const getKeyboardLetterState = useCallback(
    (letter: string): "default" | "absent" | "revealed" => {
      const upperLetter = letter.toUpperCase();
      if (revealedLetters.includes(upperLetter)) return "revealed";
      if (guessedLetters.includes(upperLetter)) return "absent";
      return "default";
    },
    [revealedLetters, guessedLetters],
  );

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showAuthModal) return;
      if (gameStatus !== "playing") return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "Enter") {
        handleGuess();
      } else if (e.key === "Backspace") {
        handleBackspaceClick();
      } else if (e.key.match(/[a-zA-Z]/) && e.key.length === 1) {
        // Only add single letter characters
        const letter = e.key.toUpperCase();
        setInputValue((prev) => {
          // Limit to longest word in the puzzle
          if (prev.length < longestWordInPuzzle) {
            return prev + letter;
          } else {
            showToast(`Longest word is ${longestWordInPuzzle} letters`);
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
  }, [
    handleGuess,
    handleBackspaceClick,
    gameStatus,
    showToast,
    showAuthModal,
    longestWordInPuzzle,
  ]);

  if (isLoading || currentPuzzle == null) {
    return (
      <div className="bg-white font-game min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-600">Loading puzzle...</div>
        </div>
      </div>
    );
  }
  const puzzleNumber = getGameNumber(currentPuzzle.date);

  return (
    <div className="bg-white font-game min-h-screen">
      {/* Header */}
      <header className="text-center py-3 px-4 max-w-[440px] mx-auto" data-testid="game-header">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isPlayingPastPuzzle ? (
              <button
                onClick={handleGoToToday}
                className="flex items-end gap-1 hover:opacity-70 transition-opacity"
                aria-label="Go to today's puzzle"
              >
                <h1 className="text-2xl sm:text-3xl font-bold text-dark">Crosses</h1>
                <h2 className="pb-1">#{puzzleNumber}</h2>
              </button>
            ) : (
              <div className="flex items-end gap-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-dark">Crosses</h1>
                <h2 className="pb-1">#{puzzleNumber}</h2>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {Auth.isAuthenticated() && (
              <div className="flex items-center gap-2 ml-2">
                <span className="text-sm text-gray-600">{Auth.getUsername()}</span>
              </div>
            )}
            {Auth.isAuthenticated() ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                    data-testid="user-menu-button"
                    aria-label="User menu"
                  >
                    <CircleUserRound className="w-6 h-6" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleFetchHistory}>
                    <ChartColumnBig className="w-4 h-4 mr-2" />
                    Stats
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowHistoryModal(true)}>
                    <Calendar className="w-4 h-4 mr-2" />
                    History
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      dispatch(handleLogout());
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                data-testid="login-button"
                aria-label="Login"
              >
                <UserRound className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
        {dateParam !== undefined && dateParam !== today && (
          <div className="text-sm text-amber-600 font-medium mt-1">
            Playing {formatPastPuzzleDate(dateParam)}
            {" · "}
            <button
              onClick={handleGoToToday}
              className="underline hover:opacity-70 transition-opacity"
            >
              back to today
            </button>
          </div>
        )}
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          dispatch(handleLoginSuccess());
        }}
      />

      {/* Stats Modal */}
      <StatsModal open={showStatsModal} onOpenChange={setShowStatsModal} />

      {/* History Modal */}
      <HistoryModal
        open={showHistoryModal}
        onOpenChange={setShowHistoryModal}
        onPlayDate={(date) => {
          setShowHistoryModal(false);
          navigate(`${difficulty === "hard" ? "/hard" : "/"}?date=${date}`);
        }}
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
            {/* Input Section (playing) or Tab Selector (game over) */}
            {gameState.gameStatus === "playing" ? (
              <div className="relative w-full mb-3 flex flex-col gap-3">
                {/* Square input - centered */}
                <div className="flex justify-center">
                  <SquareInput value={inputValue} maxLength={longestWordInPuzzle} />
                </div>

                {/* Guesses and button row */}
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex justify-start pl-1">
                    <GameStats gameState={gameState} grid={grid} />
                  </div>
                  <button
                    onClick={handleGuess}
                    disabled={!inputValue}
                    className="px-2 py-1 bg-gray-200 hover:bg-gray-300 border-2 border-gray-300 rounded-sm text-sm font-bold text-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-200"
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
            ) : (
              <div className="w-full mb-3 flex justify-center">
                <div className="flex border-b border-gray-200">
                  {(["results", "guesses"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "relative px-8 sm:px-12 py-1.5 text-sm sm:text-base font-medium transition-colors pb-2",
                        activeTab === tab ? "text-gray-900" : "text-gray-500 hover:text-gray-900",
                      )}
                    >
                      {tab === "results" ? "Results" : "Guesses"}
                      <span
                        className={cn(
                          "absolute bottom-0 left-0 w-full h-0.5 transition-colors",
                          activeTab === tab ? "bg-gray-900" : "bg-transparent",
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Keyboard (playing), Results tab, or Guesses tab */}
            {gameStatus === "playing" ? (
              <GameKeyboard
                onLetterClick={handleLetterClick}
                onBackspaceClick={handleBackspaceClick}
                getLetterState={getKeyboardLetterState}
              />
            ) : activeTab === "results" ? (
              <div className="mb-2 flex flex-col items-center gap-2">
                <GameStats gameState={gameState} grid={grid} />
                {!isPlayingPastPuzzle && (
                  <GameOverStats
                    won={gameStatus === "won"}
                    numGuesses={NUM_GUESSES - totalGuessesRemaining}
                    totalLettersRevealed={calculateRevealedLetterCount(
                      currentPuzzle.words,
                      revealedLetters,
                    )}
                    puzzleNumber={puzzleNumber}
                    currentStreak={currentStreak}
                  />
                )}
              </div>
            ) : (
              <div className="mb-2 flex flex-col items-center gap-3 w-full">
                <div className="flex items-center justify-between w-full pl-1">
                  <div className="text-md text-gray-600">
                    <span className="font-bold">{NUM_GUESSES - totalGuessesRemaining}</span>
                    {" / "}
                    {NUM_GUESSES} guesses used
                  </div>
                  <button
                    onClick={() => setShowGuessesModal(true)}
                    className="px-2 py-1 bg-gray-200 hover:bg-gray-300 border-2 border-gray-300 rounded-sm text-sm font-bold text-dark transition-colors"
                  >
                    VIEW
                  </button>
                </div>
                <GameKeyboard
                  onLetterClick={handleLetterClick}
                  onBackspaceClick={handleBackspaceClick}
                  getLetterState={getKeyboardLetterState}
                />
              </div>
            )}
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 mt-6 sm:mt-10">
          © 2025 Jixuan Wang. All Rights Reserved{" "}
        </div>
      </main>

      <GuessesModal
        open={showGuessesModal}
        onOpenChange={setShowGuessesModal}
        guesses={gameState.guesses}
        revealedLetters={revealedLetters}
      />
    </div>
  );
}
