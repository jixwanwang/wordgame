interface SquareInputProps {
  value: string;
  maxLength?: number;
}

export function SquareInput({ value, maxLength = 6 }: SquareInputProps) {
  const letters = value.toUpperCase().split("");
  const showDashedSquare = letters.length < maxLength;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Up arrow */}
      <div className="text-gray-400 text-xl">↑</div>

      {/* Input squares container */}
      <div className="relative h-[32px] sm:h-[40px] flex justify-center items-center">
        {/* Filled squares - centered, acts as positioning reference */}
        <div className="relative flex gap-1">
          {letters.length === 0 ? (
            // Show first empty square with solid border when no input
            <div
              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-md sm:text-lg font-bold bg-white border-2 border-gray-400 transition-all duration-150"
              data-testid="square-input-0"
            />
          ) : (
            letters.map((letter, index) => (
              <div
                key={index}
                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-md sm:text-lg font-bold bg-white border-2 border-gray-400 transition-all duration-150"
                data-testid={`square-input-${index}`}
              >
                <span className="text-dark">{letter}</span>
              </div>
            ))
          )}

          {/* Dashed outline square - positioned absolutely relative to the flex container */}
          {showDashedSquare && letters.length > 0 && (
            <div
              className="absolute top-0 left-full ml-1 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-md sm:text-lg font-bold bg-white border-2 border-dashed border-gray-300 transition-all duration-150"
              data-testid={`square-input-${letters.length}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
