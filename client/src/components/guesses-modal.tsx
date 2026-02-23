import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface GuessesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guesses: string[];
  revealedLetters: string[];
}

function LetterSquare({ letter, revealed }: { letter: string; revealed: boolean }) {
  return (
    <div
      className={cn(
        "w-8 h-8 border-2 flex items-center justify-center text-sm font-bold",
        revealed
          ? "border-green-500 text-green-700 bg-green-50"
          : "border-gray-300 text-gray-500",
      )}
    >
      {letter.toUpperCase()}
    </div>
  );
}

export function GuessesModal({ open, onOpenChange, guesses, revealedLetters }: GuessesModalProps) {
  const revealedSet = new Set(revealedLetters.map((l) => l.toUpperCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-white">
        <DialogHeader>
          <DialogTitle>Guesses</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-5">
          {guesses.map((guess, i) => (
            <div key={i} className="flex flex-col items-center gap-1 shrink-0">
              <span className="text-xs text-gray-400">{i + 1}</span>
              <div className="flex gap-0.5">
                {guess.split("").map((letter, j) => (
                  <LetterSquare key={j} letter={letter} revealed={revealedSet.has(letter.toUpperCase())} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
