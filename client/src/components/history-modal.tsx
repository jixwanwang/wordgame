import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CrosswordGrid } from "@/components/crossword-grid";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { API } from "@/lib/api-client";
import { Grid8x8 } from "@shared/lib/grid";
import { Puzzle } from "@shared/lib/puzzles";
import type { SavedGameState } from "@shared/lib/schema";
import { getTodayInPacificTime } from "../../../server/time-utils";
import { cn } from "@/lib/utils";

interface HistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PuzzleData {
  puzzle: Puzzle;
  savedState?: SavedGameState;
}

interface DateStatus {
  isComplete: boolean;
  wonGame: boolean;
  score: { revealed: number; total: number } | null;
}

// Parse MM-DD-YYYY to Date object
function parseApiDate(apiDate: string): Date {
  const [month, day, year] = apiDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Format Date to MM-DD-YYYY
function toApiDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
}

// Get adjacent date
function getAdjacentDate(apiDate: string, offset: number): string {
  const date = parseApiDate(apiDate);
  date.setDate(date.getDate() + offset);
  return toApiDate(date);
}

// Format date for display: "Jan 1"
function formatShortDate(apiDate: string): string {
  const [month, day] = apiDate.split("-").map(Number);
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${monthNames[month - 1]} ${day}`;
}

// Format date for display: "January 1, 2025"
function formatDisplayDate(apiDate: string): string {
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

function isAfterApiDate(a: string, b: string): boolean {
  return parseApiDate(a).getTime() > parseApiDate(b).getTime();
}

// Calculate score: revealed letters / total letters in puzzle
function calculateScore(
  puzzle: Puzzle,
  guessedLetters: string[],
): { revealed: number; total: number } {
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

export function HistoryModal({ open, onOpenChange }: HistoryModalProps) {
  if (!open) {
    return null;
  }
  return <HistoryModalInner open={open} onOpenChange={onOpenChange} />;
}

export function HistoryModalInner({ open, onOpenChange }: HistoryModalProps) {
  const today = getTodayInPacificTime();
  const [selectedDate, setSelectedDate] = useState(today);
  const [puzzleData, setPuzzleData] = useState<PuzzleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjacentStatus, setAdjacentStatus] = useState<Record<string, DateStatus>>({});
  const fetchedDatesRef = useRef<Set<string>>(new Set());
  const contentRef = useRef<HTMLDivElement>(null);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    containScroll: false,
    duration: 12,
    dragFree: false,
    draggable: false,
    loop: false,
  });

  const [dateList, setDateList] = useState(
    [-4, -3, -2, -1, 0, 1].map((offset) => getAdjacentDate(selectedDate, offset)),
  );

  // Scroll to center when embla initializes
  useEffect(() => {
    if (emblaApi) {
      emblaApi.goTo(4, true);
    }
  }, [emblaApi]);

  const isToday = selectedDate === today;
  const canGoNext = !isToday;

  // Compute grid from puzzle data
  const grid = useMemo(() => {
    if (!puzzleData?.puzzle) return new Grid8x8();
    const g = new Grid8x8();
    g.loadPuzzle(puzzleData.puzzle);
    return g;
  }, [puzzleData?.puzzle]);

  // Compute revealed letters set
  const revealedLettersSet = useMemo(() => {
    if (!puzzleData?.savedState?.guessedLetters) return new Set<string>();
    return new Set(puzzleData.savedState.guessedLetters.map((l) => l.toUpperCase()));
  }, [puzzleData?.savedState?.guessedLetters]);

  // isLetterRevealed function for CrosswordGrid
  const isLetterRevealed = useCallback(
    (row: number, col: number): boolean => {
      const letter = grid.getCell(row, col);
      if (!letter || letter === " ") return false;
      return revealedLettersSet.has(letter.toUpperCase());
    },
    [grid, revealedLettersSet],
  );

  // Fetch puzzle when date changes or modal opens
  useEffect(() => {
    if (open && selectedDate) {
      fetchPuzzle(selectedDate);
    }
  }, [open, selectedDate]);

  // Reset to today when modal opens
  useEffect(() => {
    if (open) {
      setSelectedDate(today);
    }
  }, [open, today]);

  const fetchPuzzle = async (apiDate: string) => {
    setLoading(true);
    setError(null);
    setPuzzleData(null);

    try {
      const response = await API.getPuzzle(apiDate);
      if (response.id) {
        setPuzzleData({
          puzzle: {
            date: response.date,
            words: response.words,
            grid: response.grid,
            wordPositions: response.wordPositions,
          },
          savedState: response.savedState,
        });
      } else {
        setError("No puzzle available for this date");
      }
    } catch (err) {
      console.error("Failed to fetch puzzle:", err);
      setError("Failed to load puzzle");
    } finally {
      setLoading(false);
    }
  };

  // Fetch status for a single date (for adjacent dates)
  const fetchDateStatus = async (apiDate: string): Promise<DateStatus | null> => {
    try {
      const response = await API.getPuzzle(apiDate);
      if (response.id) {
        const puzzle: Puzzle = {
          date: response.date,
          words: response.words,
          grid: response.grid,
          wordPositions: response.wordPositions,
        };
        const savedState = response.savedState;
        const isComplete = savedState?.isComplete === true;
        const wonGame = savedState?.wonGame === true;
        const score = savedState?.guessedLetters
          ? calculateScore(puzzle, savedState.guessedLetters)
          : null;
        return { isComplete, wonGame, score };
      }
      return null;
    } catch {
      return null;
    }
  };

  // Fetch adjacent dates' status
  useEffect(() => {
    if (!open) return;

    const fetchAdjacentStatuses = async () => {
      const newStatus: Record<string, DateStatus> = {};
      await Promise.all(
        dateList.map(async (date) => {
          // Skip future dates or already fetched
          if (isAfterApiDate(date, today)) return;
          if (fetchedDatesRef.current.has(date)) return;
          fetchedDatesRef.current.add(date);
          const status = await fetchDateStatus(date);
          if (status !== null) {
            newStatus[date] = status;
          }
        }),
      );

      if (Object.keys(newStatus).length > 0) {
        setAdjacentStatus((prev) => ({ ...prev, ...newStatus }));
      }
    };

    fetchAdjacentStatuses();
  }, [open, dateList, today]);

  // Reset fetched dates when modal closes
  useEffect(() => {
    if (!open) {
      fetchedDatesRef.current.clear();
      setAdjacentStatus({});
    }
  }, [open]);

  const hasCompleted = puzzleData?.savedState?.isComplete === true;
  const wonGame = puzzleData?.savedState?.wonGame === true;
  const showTodayPlaceholder = isToday && !hasCompleted;
  const gameStatus = hasCompleted ? (wonGame ? "won" : "lost") : "playing";

  // Calculate score for display
  const score = useMemo(() => {
    if (!puzzleData?.puzzle || !puzzleData?.savedState?.guessedLetters) return null;
    return calculateScore(puzzleData.puzzle, puzzleData.savedState.guessedLetters);
  }, [puzzleData]);

  useEffect(() => {
    const x = () => {
      const currentIndex = dateList.indexOf(selectedDate);
      if (currentIndex <= 2) {
        setDateList((prev) => [
          getAdjacentDate(prev[0], -6),
          getAdjacentDate(prev[0], -5),
          getAdjacentDate(prev[0], -4),
          getAdjacentDate(prev[0], -3),
          getAdjacentDate(prev[0], -2),
          getAdjacentDate(prev[0], -1),
          ...prev,
        ]);
      }
    };
    if (emblaApi) {
      emblaApi.on("settle", x);
      return () => {
        emblaApi.off("settle", x);
      };
    }
  }, [emblaApi, selectedDate, dateList]);

  // Select a new date - update state and scroll to center
  const selectDate = useCallback(
    (newDate: string) => {
      if (isAfterApiDate(newDate, today)) return;
      setSelectedDate(newDate);
      requestAnimationFrame(() => {
        emblaApi?.goTo(dateList.indexOf(newDate), false);
      });
    },
    [emblaApi, today, dateList],
  );

  const goNext = () => {
    const currentIndex = dateList.indexOf(selectedDate);
    if (currentIndex >= dateList.length - 1) {
      return;
    }
    const nextDate = dateList[currentIndex + 1];
    selectDate(nextDate);
  };

  const goPrev = () => {
    const currentIndex = dateList.indexOf(selectedDate);
    // TODO: add more dates to the beginning, do it in an effect rather than on demand here
    if (currentIndex === 0) {
      return;
    } else {
      const prevDate = dateList[currentIndex - 1];
      selectDate(prevDate);
    }
  };

  // fixing effect
  useEffect(() => {
    const currentIndex = dateList.indexOf(selectedDate);
    if (emblaApi) {
      emblaApi.goTo(currentIndex, false);
    }
  }, [dateList, selectedDate, emblaApi]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-xl bg-white p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">History</DialogTitle>
        </DialogHeader>

        {/* Date selector - embla carousel */}
        <div className="flex items-center justify-center gap-2 h-[50px]">
          <button
            onClick={() => goPrev()}
            className="p-1 rounded transition-colors hover:bg-gray-100"
            aria-label="Previous date"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>

          <div ref={emblaRef} className="overflow-hidden w-[210px] sm:w-[240px]">
            <div className="flex touch-pan-y select-none">
              {dateList.map((date) => {
                const isCurrent = selectedDate === date; // Center is always current
                const isFuture = isAfterApiDate(date, today);
                const status = adjacentStatus[date];
                return (
                  <div key={date} className="flex-[0_0_60px] sm:flex-[0_0_70px] px-1 mx-2">
                    <button
                      onClick={() => !isFuture && !isCurrent && selectDate(date)}
                      disabled={isFuture || isCurrent}
                      className={cn(
                        "text-center w-full transition-opacity",
                        isCurrent ? "opacity-100" : "opacity-50",
                        !isFuture && !isCurrent && "hover:opacity-75",
                        (isFuture || isCurrent) && "cursor-default",
                      )}
                    >
                      {isFuture ? (
                        <div className="h-6" />
                      ) : (
                        <>
                          <div
                            className={cn(
                              "text-sm",
                              isCurrent ? "font-semibold text-gray-900" : "text-gray-500",
                            )}
                          >
                            {date === today ? "Today" : formatShortDate(date)}
                          </div>
                          <div className="text-[8px] text-gray-400 h-3 flex items-center justify-center gap-0.5">
                            {isCurrent ? (
                              loading ? null : hasCompleted ? (
                                <>
                                  <span>
                                    {score?.revealed}/{score?.total}
                                  </span>
                                  {wonGame && <Check className="w-2 h-2 text-green-500" />}
                                </>
                              ) : puzzleData ? (
                                <span className="text-gray-400">Not Played</span>
                              ) : null
                            ) : status ? (
                              status.isComplete ? (
                                <>
                                  <span>
                                    {status.score?.revealed}/{status.score?.total}
                                  </span>
                                  {status.wonGame && <Check className="w-2 h-2 text-green-500" />}
                                </>
                              ) : (
                                <span>Not Played</span>
                              )
                            ) : null}
                          </div>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => canGoNext && goNext()}
            disabled={!canGoNext}
            className={cn(
              "p-1 rounded transition-colors",
              canGoNext ? "hover:bg-gray-100" : "opacity-30 cursor-not-allowed",
            )}
            aria-label="Next date"
          >
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content - fixed height to prevent modal jumping */}
        <div ref={contentRef} className="mt-1 sm:mt-2 h-[280px] sm:h-[420px]">
          {loading && (
            <div className="space-y-3">
              <div className="min-h-[220px] sm:min-h-[360px] flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
              </div>
              <div className="text-center">
                <div className="h-5" />
              </div>
            </div>
          )}

          {error && (
            <div className="space-y-3">
              <div className="min-h-[220px] sm:min-h-[360px] flex items-center justify-center">
                <div className="text-gray-500">{error}</div>
              </div>
              <div className="text-center">
                <div className="h-5" />
              </div>
            </div>
          )}

          {showTodayPlaceholder && !loading && !error && (
            <div className="space-y-3">
              <div className="min-h-[220px] sm:min-h-[360px] flex flex-col items-center justify-center text-center">
                <div className="text-gray-400 text-lg mb-2">🎯</div>
                <div className="text-gray-500">You haven't completed today's puzzle yet</div>
              </div>
              <div className="text-center">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Play Today's Puzzle
                </Button>
              </div>
            </div>
          )}

          {puzzleData && !loading && !error && !showTodayPlaceholder && (
            <div className="space-y-3">
              {/* Grid - fixed height container to prevent modal shifting */}
              <div className="min-h-[220px] sm:min-h-[360px] flex items-center justify-center">
                <CrosswordGrid
                  grid={grid}
                  isLetterRevealed={isLetterRevealed}
                  currentPuzzle={puzzleData.puzzle}
                  gameStatus={gameStatus}
                />
              </div>

              {/* Result or Play button */}
              <div className="text-center">
                {hasCompleted ? (
                  <div
                    className={cn(
                      "text-sm font-medium",
                      wonGame ? "text-green-600" : "text-gray-600",
                    )}
                  >
                    {wonGame ? "Completed ✓" : "Attempted"}
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      // TODO: Implement navigation to play this puzzle
                      console.log("Play puzzle for date:", selectedDate);
                    }}
                  >
                    Play Crosses {formatDisplayDate(selectedDate)}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
