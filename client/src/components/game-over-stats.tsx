import { Button } from "@/components/ui/button";
import { useState } from "react";
import { NUM_GUESSES } from "@shared/lib/game-utils";
import { getCurrentStreak } from "@/lib/game-storage";

interface GameOverStatsProps {
  won: boolean;
  numGuesses: number;
  totalLettersRevealed: number;
  puzzleNumber: number;
}

export function GameOverStats({
  won,
  numGuesses,
  totalLettersRevealed,
  puzzleNumber,
}: GameOverStatsProps) {
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
    <div className="space-y-4 flex flex-col items-center">
      {won ? (
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800 mb-1">
            Current Streak: 🔥{getCurrentStreak()}
          </p>
          <p className="text-md text-gray-800 text-center">
            Come back tomorrow to continue your streak!
          </p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-md text-gray-800 text-center">Try again on a new puzzle tomorrow.</p>
        </div>
      )}

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
  );
}
