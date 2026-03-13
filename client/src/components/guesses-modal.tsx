import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface GuessesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guesses: string[];
  revealedLetters: string[];
  puzzleWords: string[];
}

function LetterSquare({ letter, green }: { letter: string; green: boolean }) {
  return (
    <div
      className={cn(
        "w-8 h-8 border-2 flex items-center justify-center text-sm font-bold",
        green
          ? "border-green-500 text-green-700 bg-green-50"
          : "border-gray-300 text-gray-500",
      )}
    >
      {letter.toUpperCase()}
    </div>
  );
}

interface GuessDisplay {
  guess: string;
  letterStates: { letter: string; green: boolean }[];
}

function computeGuessDisplays(
  guesses: string[],
  revealedLetters: string[],
  puzzleWords: string[],
): GuessDisplay[] {
  const finalRevealedSet = new Set(revealedLetters.map((l) => l.toUpperCase()));
  const puzzleWordsSet = new Set(puzzleWords.map((w) => w.toUpperCase()));
  const revealedSoFar = new Set<string>();

  return guesses.map((guess) => {
    const upper = guess.toUpperCase();

    if (upper.length === 1) {
      // Letter guess
      const letter = upper;
      const inPuzzle = finalRevealedSet.has(letter);
      if (inPuzzle) revealedSoFar.add(letter);
      return { guess, letterStates: [{ letter, green: inPuzzle }] };
    }

    // Word guess
    const isCorrect = puzzleWordsSet.has(upper);
    const letterStates = upper.split("").map((letter) => {
      if (!isCorrect) return { letter, green: false };
      const isNew = !revealedSoFar.has(letter);
      return { letter, green: isNew };
    });

    if (isCorrect) {
      upper.split("").forEach((l) => revealedSoFar.add(l));
    }

    return { guess, letterStates };
  });
}

export function GuessesModal({ open, onOpenChange, guesses, revealedLetters, puzzleWords }: GuessesModalProps) {
  const guessDisplays = computeGuessDisplays(guesses, revealedLetters, puzzleWords);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-white">
        <DialogHeader>
          <DialogTitle>Guesses</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-5">
          {guessDisplays.map(({ letterStates }, i) => (
            <div key={i} className="flex flex-col items-center gap-1 shrink-0">
              <span className="text-xs text-gray-400">{i + 1}</span>
              <div className="flex gap-0.5">
                {letterStates.map(({ letter, green }, j) => (
                  <LetterSquare key={j} letter={letter} green={green} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
