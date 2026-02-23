import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CrosswordGrid } from "@/components/crossword-grid";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { calculateRevealedLetterCount, NUM_GUESSES } from "@shared/lib/game-utils";
import { Grid8x8 } from "@shared/lib/grid";
import { getTodayInPacificTime } from "../../../server/time-utils";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchHistoryEntryThunk } from "@/store/thunks/historyThunks";

interface HistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function HistoryModal({ open, onOpenChange }: HistoryModalProps) {
  if (!open) {
    return null;
  }
  return <HistoryModalInner open={open} onOpenChange={onOpenChange} />;
}

export function HistoryModalInner({ open, onOpenChange }: HistoryModalProps) {
  const today = getTodayInPacificTime();
  const dispatch = useAppDispatch();
  const historyEntries = useAppSelector((state) => state.history.entries);
  const loadingByDate = useAppSelector((state) => state.history.loadingByDate);
  const errorByDate = useAppSelector((state) => state.history.errorByDate);
  const [selectedDate, setSelectedDate] = useState(today);
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
  const currentEntry = historyEntries[selectedDate];
  const puzzleData = currentEntry?.puzzle
    ? { puzzle: currentEntry.puzzle, savedState: currentEntry.savedState }
    : null;
  const loading = loadingByDate[selectedDate] ?? false;
  const error = errorByDate[selectedDate] ?? null;

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
      dispatch(fetchHistoryEntryThunk({ date: selectedDate, includePuzzle: true }));
    }
  }, [open, selectedDate, dispatch]);

  // Fetch adjacent dates' status (without puzzle data)
  useEffect(() => {
    if (!open) return;
    dateList.forEach((date) => {
      if (isAfterApiDate(date, today)) return;
      dispatch(fetchHistoryEntryThunk({ date, includePuzzle: false }));
    });
  }, [open, dateList, today, dispatch]);

  const hasCompleted = currentEntry?.status?.isComplete === true;
  const wonGame = currentEntry?.status?.wonGame === true;
  const hasPlayed = (puzzleData?.savedState?.guessedLetters?.length ?? 0) > 0;
  const gameStatus = hasCompleted ? (wonGame ? "won" : "lost") : "playing";

  const lettersRevealed = useMemo(() => {
    if (!puzzleData?.puzzle || !puzzleData?.savedState?.guessedLetters) return 0;
    return calculateRevealedLetterCount(
      puzzleData.puzzle.words,
      puzzleData.savedState.guessedLetters,
    );
  }, [puzzleData]);

  const totalWordLetters = useMemo(() => {
    if (!puzzleData?.puzzle) return 0;
    return puzzleData.puzzle.words.reduce((sum, w) => sum + w.length, 0);
  }, [puzzleData?.puzzle]);

  const guessesUsed = useMemo(() => {
    if (!puzzleData?.savedState) return 0;
    return NUM_GUESSES - (puzzleData.savedState.guessesRemaining ?? NUM_GUESSES);
  }, [puzzleData]);

  // load more days
  useEffect(() => {
    const maybeFetchDays = () => {
      const currentIndex = dateList.indexOf(selectedDate);
      if (currentIndex <= 3) {
        setDateList((prev) => [
          getAdjacentDate(prev[0], -7),
          getAdjacentDate(prev[0], -6),
          getAdjacentDate(prev[0], -5),
          getAdjacentDate(prev[0], -4),
          getAdjacentDate(prev[0], -3),
          getAdjacentDate(prev[0], -2),
          getAdjacentDate(prev[0], -1),
          ...prev,
        ]);
        requestAnimationFrame(() => {
          emblaApi?.goTo(emblaApi.internalEngine().indexCurrent.get() + 7, true);
        });
      }
    };
    if (emblaApi) {
      emblaApi.on("settle", maybeFetchDays);
      return () => {
        emblaApi.off("settle", maybeFetchDays);
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
    if (currentIndex === 0) {
      return;
    } else {
      const prevDate = dateList[currentIndex - 1];
      selectDate(prevDate);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-xl bg-white p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Your Game History</DialogTitle>
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

          <div ref={emblaRef} className="overflow-hidden w-[220px] sm:w-[300px]">
            <div className="flex touch-pan-y select-none">
              {dateList.map((date) => {
                const isCurrent = selectedDate === date; // Center is always current
                const isFuture = isAfterApiDate(date, today);
                const status = historyEntries[date]?.status;
                return (
                  <div key={date} className="flex-[0_0_80px]">
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
                        <div className="h-5" />
                      ) : (
                        (() => {
                          const icon = isCurrent ? (
                            !loading && hasCompleted ? (
                              wonGame ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <X className="w-3 h-3 text-red-500" />
                              )
                            ) : null
                          ) : status?.isComplete ? (
                            status.wonGame ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <X className="w-3 h-3 text-red-500" />
                            )
                          ) : null;
                          return (
                            <div className="h-5 flex items-center justify-center gap-1">
                              <span
                                className={cn(
                                  "text-sm whitespace-nowrap",
                                  isCurrent ? "font-semibold text-gray-900" : "text-gray-500",
                                )}
                              >
                                {date === today ? "Today" : formatShortDate(date)}
                              </span>
                              <span className="w-3 h-3 flex-shrink-0 flex items-center justify-center">
                                {icon}
                              </span>
                            </div>
                          );
                        })()
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
        <div ref={contentRef} className="mt-1 sm:mt-2 h-[320px] sm:h-[420px]">
          {loading && (
            <div className="space-y-3">
              <div className="min-h-[260px] sm:min-h-[360px] flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
              </div>
              <div className="text-center">
                <div className="h-5" />
              </div>
            </div>
          )}

          {error && (
            <div className="space-y-3">
              <div className="min-h-[260px] sm:min-h-[360px] flex items-center justify-center">
                <div className="text-gray-500">{error}</div>
              </div>
              <div className="text-center">
                <div className="h-5" />
              </div>
            </div>
          )}

          {puzzleData && !loading && !error && (
            <div className="space-y-3">
              {/* Grid - fixed height container to prevent modal shifting */}
              <div className="min-h-[260px] sm:min-h-[360px] flex items-center justify-center">
                <CrosswordGrid
                  grid={grid}
                  isLetterRevealed={isLetterRevealed}
                  currentPuzzle={puzzleData.puzzle}
                  gameStatus={gameStatus}
                />
              </div>

              {/* Score or Play button */}
              <div className="text-center">
                {hasPlayed ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="text-sm">
                      <span className="font-bold">{lettersRevealed}</span>
                      {" / "}
                      {totalWordLetters} letters revealed
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">{guessesUsed}</span>
                      {" / "}
                      {NUM_GUESSES} guesses used
                    </div>
                  </div>
                ) : isToday ? (
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Play Today's Puzzle
                  </Button>
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
