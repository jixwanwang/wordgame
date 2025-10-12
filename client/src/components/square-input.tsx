interface SquareInputProps {
  value: string;
  maxLength?: number;
}

export function SquareInput({ value, maxLength = 6 }: SquareInputProps) {
  const letters = value.toUpperCase().split("");
  const showDashedSquare = letters.length < maxLength;

  // Calculate position for dashed square
  const squareSize = 40; // 40px (w-10 h-10)
  const gapSize = 4; // gap-1 = 4px
  // Total width of filled squares including gaps between them
  const filledWidth = letters.length * squareSize + (letters.length - 1) * gapSize;
  // Position left edge of dashed square
  const dashedSquareOffset = filledWidth / 2 + gapSize;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Up arrow */}
      <div className="text-gray-400 text-xl">↑</div>

      {/* Input squares container */}
      <div className="relative h-[40px] flex justify-center items-center">
        {/* Filled squares - always centered */}
        <div className="flex gap-1">
          {letters.length === 0 ? (
            // Show first empty square with solid border when no input
            <div
              className="w-10 h-10 flex items-center justify-center text-lg font-bold bg-white border-2 border-gray-400 transition-all duration-150"
              data-testid="square-input-0"
            />
          ) : (
            letters.map((letter, index) => (
              <div
                key={index}
                className="w-10 h-10 flex items-center justify-center text-lg font-bold bg-white border-2 border-gray-400 transition-all duration-150"
                data-testid={`square-input-${index}`}
              >
                <span className="text-dark">{letter}</span>
              </div>
            ))
          )}
        </div>

        {/* Dashed outline square - positioned absolutely to not affect centering */}
        {showDashedSquare && letters.length > 0 && (
          <div
            className="absolute w-10 h-10 flex items-center justify-center text-lg font-bold bg-white border-2 border-dashed border-gray-300 transition-all duration-150"
            style={{ left: `calc(50% + ${dashedSquareOffset}px)` }}
            data-testid={`square-input-${letters.length}`}
          />
        )}
      </div>
    </div>
  );
}
