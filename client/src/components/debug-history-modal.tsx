import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { getGameHistory } from "@/lib/game-storage";

interface DebugHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DebugHistoryModal({ open, onOpenChange }: DebugHistoryModalProps) {
  const [historyData, setHistoryData] = useState<string>("");

  useEffect(() => {
    if (open) {
      // Fetch the raw history data from localStorage
      const history = getGameHistory();
      if (history) {
        try {
          // Sort games by date in reverse chronological order
          const sortedGames: Record<string, any> = {};
          const gameEntries = Object.entries(history.games);
          gameEntries.sort((a, b) => {
            // Parse dates in MM-DD-YYYY format
            const parseDate = (dateStr: string) => {
              const [month, day, year] = dateStr.split("-").map(Number);
              return new Date(year, month - 1, day);
            };
            const dateA = parseDate(a[0]);
            const dateB = parseDate(b[0]);
            return dateB.getTime() - dateA.getTime(); // Reverse chronological
          });

          for (const [date, game] of gameEntries) {
            // Convert guessedLetters array to string for space efficiency
            sortedGames[date] = {
              ...game,
              guessedLetters: game.guessedLetters.join(""),
            };
          }

          const sortedData = {
            currentStreak: history.currentStreak,
            lastCompletedDate: history.lastCompletedDate,
            games: sortedGames,
          };

          setHistoryData(JSON.stringify(sortedData, null, 2));
        } catch (e) {
          setHistoryData(`Error parsing history: ${e}\n\nRaw data:\n${history}`);
        }
      } else {
        setHistoryData("No game history found");
      }
    }
  }, [open, setHistoryData]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(historyData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold mb-2">Debug: Game History</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <pre className="text-xs bg-gray-100 p-4 rounded overflow-x-auto whitespace-pre-wrap break-words font-mono">
            {historyData}
          </pre>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
            onClick={copyToClipboard}
          >
            Copy to Clipboard
          </Button>
          <Button
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
