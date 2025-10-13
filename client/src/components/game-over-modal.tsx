import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GameOverStats } from "@/components/game-over-stats";

interface GameOverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  won: boolean;
  numGuesses: number;
  totalLettersRevealed: number;
  puzzleNumber: number;
}

export function GameOverModal({
  open,
  onOpenChange,
  won,
  numGuesses,
  totalLettersRevealed,
  puzzleNumber,
}: GameOverModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col items-center max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {won ? "You solved the puzzle!" : "Nice try!"}
          </DialogTitle>
        </DialogHeader>
        {/* this mb-1 is for visual centering. the title is all smaller letters so it feels further from the top. */}
        <div className="mb-1">
          <GameOverStats
            won={won}
            numGuesses={numGuesses}
            totalLettersRevealed={totalLettersRevealed}
            puzzleNumber={puzzleNumber}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
