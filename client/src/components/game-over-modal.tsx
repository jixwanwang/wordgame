import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { NUM_GUESSES } from "@shared/lib/game-utils";
import { getCurrentStreak } from "@/lib/game-storage";

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
  const [copied, setCopied] = useState(false);

  const shareText = () => {
    const currentStreakText = getCurrentStreak();
    return won
      ? `Crosses#${puzzleNumber} - ${totalLettersRevealed}/${numGuesses} 🔥${currentStreakText}`
      : `Crosses#${puzzleNumber} - ${totalLettersRevealed}/${numGuesses}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col items-center max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {won ? "You solved the puzzle!" : "Nice try!"}
          </DialogTitle>
        </DialogHeader>

        {/* this mb-1 is for visual centering. the title is all smaller letters so it feels further from the top. */}
        <div className="space-y-4 flex flex-col items-center mb-1">
          {won ? (
            <div>
              <p className="text-lg font-semibold text-gray-800">
                Current Streak: 🔥{getCurrentStreak()}
              </p>
            </div>
          ) : null}
          <div className="flex gap-6 items-center">
            <Button
              onClick={handleCopy}
              className="center bg-green-600 hover:bg-green-700 text-white w-[140px]"
            >
              {copied ? "Copied!" : "Share Results"}
            </Button>
            <div>
              <div className="text-sm">
                <span className="font-bold">{totalLettersRevealed}</span> / 20 letters revealed
              </div>
              <div className="text-sm">
                <span className="font-bold">{numGuesses}</span> / {NUM_GUESSES} guesses used
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
