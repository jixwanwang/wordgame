import { GameState } from "@shared/schema";
import { Grid8x8 } from "@shared/lib/grid";
import { cn } from "@/lib/utils";

interface GameStatsProps {
  gameState: GameState;
  grid?: Grid8x8;
}

export function GameStats({ gameState }: GameStatsProps) {
  const guessesLeft = gameState.totalGuessesRemaining;

  const getGuessesColor = () => {
    if (guessesLeft <= 0) return "text-orange-700";
    if (guessesLeft <= 3) return "text-orange-500";
    if (guessesLeft <= 6) return "text-yellow-500";
    return "text-dark";
  };

  const getGameStatusColor = () => {
    switch (gameState.gameStatus) {
      case "won":
        return "text-green-600";
      case "lost":
        return "text-black";
      default:
        return "";
    }
  };

  const getGameStatusMessage = () => {
    switch (gameState.gameStatus) {
      case "won":
        return "You've found all the words!";
      case "lost":
        return "Nice try!";
      default:
        return "";
    }
  };

  return (
    <div className="flex gap-6">
      {gameState.gameStatus !== "playing" ? (
        <div
          className={`text-lg font-bold ${getGameStatusColor()}`}
          data-testid="game-status-message"
        >
          {getGameStatusMessage()}
        </div>
      ) : (
        <div className="flex gap-2 items-center">
          <div className={cn("text-lg font-bold", getGuessesColor())} data-testid="total-guesses">
            {guessesLeft}
          </div>
          <div className={cn("text-sm text-gray-600 tracking-wide")}>guesses remaining</div>
        </div>
      )}
    </div>
  );
}
