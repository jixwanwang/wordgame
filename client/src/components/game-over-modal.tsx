import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { NUM_GUESSES } from "@shared/lib/game-utils";

interface GameOverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  won: boolean;
  numGuesses: number;
  totalLettersRevealed: number;
  puzzleNumber: number;
  currentStreak: number;
}

export function GameOverModal({
  open,
  onOpenChange,
  won,
  numGuesses,
  totalLettersRevealed,
  puzzleNumber,
  currentStreak,
}: GameOverModalProps) {
  const [copied, setCopied] = useState(false);

  const shareText =
    currentStreak > 0
      ? `Crosses#${puzzleNumber} - ${numGuesses}|${totalLettersRevealed} 🔥${currentStreak}`
      : `Crosses#${puzzleNumber} - ${numGuesses}|${totalLettersRevealed}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
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

        <div className="space-y-4 flex flex-col items-center">
          {won && currentStreak > 0 ? (
            <div>
              <p className="text-lg font-semibold text-gray-800">
                Current Streak: 🔥{currentStreak}
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
              <div>
                {numGuesses} / {NUM_GUESSES} guesses used
              </div>
              <div>{totalLettersRevealed} / 20 letters revealed</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
