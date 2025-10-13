import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface HowToPlayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPractice?: boolean;
}

export function HowToPlayModal({ open, onOpenChange, isPractice }: HowToPlayModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold mb-2">How to Play</DialogTitle>
          Reveal all the words before running out of guesses. Words overlap and share letters.
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <div className="flex gap-1 justify-center">
              <div
                className="relative w-10 h-10 border-2 border-gray-400 flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: "hsl(210, 40%, 85%)" }}
              >
                <span
                  className="absolute text-sm font-bold text-gray-600 select-none transform -translate-x-1/2 -translate-y-1/2"
                  style={{ top: "50%", left: "50%" }}
                >
                  →
                </span>
              </div>
              <div
                className="w-10 h-10 border-2 border-gray-400"
                style={{ backgroundColor: "hsl(210, 40%, 85%)" }}
              ></div>
              <div
                className="w-10 h-10 border-2 border-gray-400"
                style={{ backgroundColor: "hsl(210, 40%, 85%)" }}
              ></div>
              <div
                className="w-10 h-10 border-2 border-gray-400"
                style={{ backgroundColor: "hsl(210, 40%, 85%)" }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Arrows show word direction and starting position
            </p>
          </div>

          <div>
            <div className="flex gap-1 justify-center">
              <div
                className="relative w-10 h-10 border-2 border-gray-400 flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: "hsl(210, 40%, 85%)" }}
              >
                W
                <span
                  className="absolute text-xs font-bold text-gray-400 opacity-30 select-none transform -translate-x-1/2 -translate-y-1/2"
                  style={{ top: "50%", left: "25%" }}
                >
                  →
                </span>
              </div>
              <div
                className="w-10 h-10 border-2 border-gray-400"
                style={{ backgroundColor: "hsl(210, 40%, 85%)" }}
              ></div>
              <div
                className="w-10 h-10 border-2 border-gray-400"
                style={{ backgroundColor: "hsl(210, 40%, 85%)" }}
              ></div>
              <div
                className="w-10 h-10 border-2 border-gray-400"
                style={{ backgroundColor: "hsl(210, 40%, 85%)" }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">Guess letters to reveal them.</p>
          </div>

          <div>
            <div className="flex gap-1 justify-center">
              <div
                className="relative w-10 h-10 border-2 border-gray-400 flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: "hsl(210, 40%, 85%)" }}
              >
                W
                <span
                  className="absolute text-xs font-bold text-gray-400 opacity-30 select-none transform -translate-x-1/2 -translate-y-1/2"
                  style={{ top: "50%", left: "25%" }}
                >
                  →
                </span>
              </div>
              <div
                className="w-10 h-10 border-2 border-gray-400 flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: "hsl(210, 40%, 85%)" }}
              >
                O
              </div>
              <div
                className="w-10 h-10 border-2 border-gray-400 flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: "hsl(210, 40%, 85%)" }}
              >
                R
              </div>
              <div
                className="w-10 h-10 border-2 border-gray-400 flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: "hsl(210, 40%, 85%)" }}
              >
                D
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Guess a word correctly to reveal all its letters at once.
            </p>
            <p className="text-xs text-gray-500 text-center">
              Guessing a word incorrectly will not give you any letters!
            </p>
          </div>

          <Link href={isPractice ? "/" : "/practice"}>
            <Button
              className="w-full bg-gray-600 mt-4 hover:bg-gray-700 text-white"
              onClick={() => onOpenChange(false)}
              data-testid="practice-button"
            >
              {isPractice ? "Exit Practice" : "Practice"}
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
