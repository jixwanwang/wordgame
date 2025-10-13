import { cn } from "@/lib/utils";

interface GameKeyboardProps {
  onLetterClick: (letter: string) => void;
  onBackspaceClick: () => void;
  getLetterState: (letter: string) => "default" | "absent" | "revealed";
}

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

export function GameKeyboard({
  onLetterClick,
  onBackspaceClick,
  getLetterState,
}: GameKeyboardProps) {
  const getKeyClass = (letter: string) => {
    const state = getLetterState(letter);
    return cn(
      "w-8 sm:w-9 h-12 border border-gray-300 rounded text-sm font-bold transition-colors",
      {
        "bg-gray-200 hover:bg-gray-300 text-dark": state === "default",
        "bg-absent text-white": state === "absent",
        "bg-green-600 text-white": state === "revealed",
      },
    );
  };

  return (
    <div className="mb-2" data-testid="game-keyboard">
      {/* First row */}
      <div className="flex justify-center gap-1 mb-1">
        {KEYBOARD_ROWS[0].map((letter) => (
          <button
            key={letter}
            className={getKeyClass(letter)}
            onClick={() => onLetterClick(letter)}
            data-testid={`key-${letter}`}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Second row */}
      <div className="flex justify-center gap-1 mb-1">
        {KEYBOARD_ROWS[1].map((letter) => (
          <button
            key={letter}
            className={getKeyClass(letter)}
            onClick={() => onLetterClick(letter)}
            data-testid={`key-${letter}`}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Third row */}
      <div className="flex justify-center gap-1">
        {KEYBOARD_ROWS[2].map((letter) => (
          <button
            key={letter}
            className={getKeyClass(letter)}
            onClick={() => onLetterClick(letter)}
            data-testid={`key-${letter}`}
          >
            {letter}
          </button>
        ))}
        <button
          className="w-12 h-12 bg-gray-200 hover:bg-gray-300 border border-gray-300 rounded text-lg font-bold text-dark transition-colors"
          onClick={onBackspaceClick}
          data-testid="key-backspace"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
