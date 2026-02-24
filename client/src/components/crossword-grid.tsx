import { useMemo, useEffect, useRef, useState } from "react";
import { Grid8x8 } from "@shared/lib/grid";
import { Puzzle } from "@shared/lib/puzzles";
import { cn } from "@/lib/utils";

interface CrosswordGridProps {
  grid: Grid8x8;
  isLetterRevealed: (row: number, col: number) => boolean;
  currentPuzzle: Puzzle | undefined;
  gameStatus: "playing" | "won" | "lost";
}

interface FlipLetterProps {
  letter: string;
  shouldShowLetter: boolean;
  animateKey: string;
}

function FlipLetter({ letter, shouldShowLetter, animateKey }: FlipLetterProps) {
  const [flipped, setFlipped] = useState(false);
  const lastKeyRef = useRef(animateKey);

  useEffect(() => {
    if (lastKeyRef.current !== animateKey) {
      lastKeyRef.current = animateKey;
      setFlipped(false);
    }
  }, [animateKey]);

  useEffect(() => {
    if (!shouldShowLetter) {
      setFlipped(false);
      return;
    }
    const raf = requestAnimationFrame(() => setFlipped(true));
    return () => cancelAnimationFrame(raf);
  }, [shouldShowLetter, animateKey]);

  return (
    <div className="crossword-flip-container">
      <div className={cn("crossword-flip", flipped && "is-flipped")}>
        <div className="crossword-flip-face crossword-flip-front">
          {shouldShowLetter ? letter.toUpperCase() : ""}
        </div>
        <div className="crossword-flip-face crossword-flip-back" />
      </div>
    </div>
  );
}

export function CrosswordGrid({
  grid,
  isLetterRevealed,
  currentPuzzle,
  gameStatus,
}: CrosswordGridProps) {
  // Get smart bounds to only render populated areas
  const bounds = grid.getPopulatedBounds();
  const visibleRows = bounds.maxRow - bounds.minRow + 1;
  const visibleCols = bounds.maxCol - bounds.minCol + 1;

  // HSL color palette for words (low saturation, light colors)
  const HSL_COLORS = [
    "hsl(210, 40%, 85%)", // Light blue
    "hsl(120, 40%, 85%)", // Light green
    "hsl(270, 40%, 85%)", // Light purple
    "hsl(60, 40%, 85%)", // Light yellow
    "hsl(330, 40%, 85%)", // Light pink
    "hsl(240, 40%, 85%)", // Light indigo
    "hsl(0, 40%, 85%)", // Light red
    "hsl(30, 40%, 85%)", // Light orange
    "hsl(180, 40%, 85%)", // Light teal
    "hsl(200, 40%, 85%)", // Light cyan
  ];

  // Precompute cell membership, styles, and arrows using useMemo for performance
  const { cellMembership, cellStyles, cellArrows } = useMemo(() => {
    if (!currentPuzzle) {
      return { cellMembership: [], cellStyles: [], cellArrows: [] };
    }

    // Initialize membership grid
    const membership: number[][][] = Array(8)
      .fill(null)
      .map(() =>
        Array(8)
          .fill(null)
          .map(() => []),
      );

    // Initialize arrows grid - stores array of {wordIndex, direction} for each cell
    const arrows: Array<Array<Array<{ wordIndex: number; direction: string }>>> = Array(8)
      .fill(null)
      .map(() =>
        Array(8)
          .fill(null)
          .map(() => []),
      );

    // Calculate word directions and populate membership + arrows
    currentPuzzle.words.forEach((word, wordIndex) => {
      const positions = currentPuzzle.wordPositions[word];
      if (positions && positions.length >= 2) {
        // Calculate direction from first two positions
        const [row1, col1] = positions[0];
        const [row2, col2] = positions[1];
        const deltaRow = row2 - row1;
        const deltaCol = col2 - col1;

        // Determine direction arrow
        // Use Unicode variation selector U+FE0E to force text rendering (prevent emoji on iOS)
        let direction = "";
        if (deltaRow === 0 && deltaCol === 1)
          direction = "→\uFE0E"; // horizontal right
        else if (deltaRow === 0 && deltaCol === -1)
          direction = "←\uFE0E"; // horizontal left
        else if (deltaRow === 1 && deltaCol === 0)
          direction = "↓\uFE0E"; // vertical down
        else if (deltaRow === -1 && deltaCol === 0)
          direction = "↑\uFE0E"; // vertical up
        else if (deltaRow === 1 && deltaCol === 1)
          direction = "↘\uFE0E"; // diagonal down-right
        else if (deltaRow === 1 && deltaCol === -1)
          direction = "↙\uFE0E"; // diagonal down-left
        else if (deltaRow === -1 && deltaCol === 1)
          direction = "↗\uFE0E"; // diagonal up-right
        else if (deltaRow === -1 && deltaCol === -1) direction = "↖\uFE0E"; // diagonal up-left

        // Add arrow to first letter position
        const [firstRow, firstCol] = positions[0];
        if (firstRow >= 0 && firstRow < 8 && firstCol >= 0 && firstCol < 8 && direction) {
          arrows[firstRow][firstCol].push({ wordIndex, direction });
        }

        // Add word membership to all positions
        positions.forEach(([row, col]) => {
          if (row >= 0 && row < 8 && col >= 0 && col < 8) {
            if (!membership[row][col].includes(wordIndex)) {
              membership[row][col].push(wordIndex);
            }
          }
        });
      }
    });

    // Generate cell styles based on membership
    const styles: Array<Array<{ [key: string]: string }>> = Array(8)
      .fill(null)
      .map(() =>
        Array(8)
          .fill(null)
          .map(() => ({})),
      );

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const wordIndices = membership[row][col];
        const numColors = Math.min(wordIndices.length, 4); // Cap at 4 colors

        if (numColors === 0) {
          styles[row][col] = {
            "--cell-bg": "#ffffff",
            "--cell-bg-image": "none",
          }; // White for empty
        } else if (numColors === 1) {
          styles[row][col] = {
            "--cell-bg": HSL_COLORS[wordIndices[0] % HSL_COLORS.length],
            "--cell-bg-image": "none",
          };
        } else if (numColors === 2) {
          // Generate diagonal linear gradient for two-color intersections
          const colors = wordIndices.slice(0, 2).map((idx) => HSL_COLORS[idx % HSL_COLORS.length]);
          styles[row][col] = {
            "--cell-bg": "transparent",
            "--cell-bg-image": `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`,
          };
        } else {
          // Generate conic gradient for 3+ color intersections starting from top
          const colors = wordIndices.slice(0, 4).map((idx) => HSL_COLORS[idx % HSL_COLORS.length]);
          const sliceSize = 100 / numColors;

          let gradientStops = "";
          for (let i = 0; i < numColors; i++) {
            const startPercent = i * sliceSize;
            const endPercent = (i + 1) * sliceSize;
            if (i > 0) gradientStops += ", ";
            gradientStops += `${colors[i]} ${startPercent}% ${endPercent}%`;
          }

          styles[row][col] = {
            "--cell-bg": "transparent",
            "--cell-bg-image": `conic-gradient(from -90deg, ${gradientStops})`,
          };
        }
      }
    }

    return {
      cellMembership: membership,
      cellStyles: styles,
      cellArrows: arrows,
    };
  }, [currentPuzzle?.date]); // Re-compute when puzzle changes

  const renderCell = (row: number, col: number) => {
    const key = `${currentPuzzle?.date ?? "puzzle"}-${row}-${col}`;
    const letter = grid.getCell(row, col);

    // If cell is empty or just spaces, make it invisible but maintain grid structure
    if (!letter || letter === " ") {
      return <div key={key} className="w-8 h-8 sm:w-10 sm:h-10 invisible" />;
    }

    const cellRevealed = isLetterRevealed(row, col);
    const isGameLost = gameStatus === "lost";
    const shouldShowLetter = cellRevealed || isGameLost;
    const isAutoRevealed = !cellRevealed && isGameLost;

    const cellStyle = cellStyles[row]?.[col] || {
      "--cell-bg": "#ffffff",
      "--cell-bg-image": "none",
    };
    const cellArrowsData = cellArrows[row]?.[col] || [];

    // Render arrows for this cell
    const renderArrows = () => {
      if (cellArrowsData.length === 0) return null;

      const membership = cellMembership[row]?.[col] || [];
      const numColors = Math.min(membership.length, 4);

      // Arrow styling based on whether cell is revealed
      const arrowClasses = cn(
        "text-sm font-bold select-none transition-opacity duration-200",
        shouldShowLetter
          ? "text-gray-400 opacity-30 group-hover:opacity-100 group-hover:text-gray-700"
          : "text-gray-600 opacity-100",
      );

      if (numColors === 1) {
        // Single color - center the arrow
        return (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={arrowClasses}>{cellArrowsData[0]?.direction}</span>
          </div>
        );
      } else if (numColors === 2) {
        // Two colors - diagonal split positioning (135deg gradient)
        // Position arrows precisely within their diagonal triangular sections
        return cellArrowsData.map((arrowData) => {
          const wordIndexInMembership = membership.indexOf(arrowData.wordIndex);
          const isFirstWord = wordIndexInMembership === 0;

          return (
            <div
              key={arrowData.wordIndex}
              className={cn("absolute transform -translate-x-1/2 -translate-y-1/2", arrowClasses)}
              style={
                // First word is in top-left triangle, second in bottom-right triangle
                isFirstWord ? { top: "25%", left: "25%" } : { top: "75%", left: "75%" }
              }
            >
              {arrowData.direction}
            </div>
          );
        });
      } else {
        // 3+ colors - position in corresponding pie slices (conic gradient from -90deg)
        return cellArrowsData.map((arrowData) => {
          const wordIndexInMembership = membership.indexOf(arrowData.wordIndex);
          const sliceIndex = wordIndexInMembership % 4;

          // Position arrows at 25% distance from center toward each compass direction
          let positionStyle = {};
          if (sliceIndex === 0) {
            // Top slice
            positionStyle = { top: "25%", left: "50%" };
          } else if (sliceIndex === 1) {
            // Right slice
            positionStyle = { top: "50%", left: "75%" };
          } else if (sliceIndex === 2) {
            // Bottom slice
            positionStyle = { top: "75%", left: "50%" };
          } else {
            // Left slice
            positionStyle = { top: "50%", left: "25%" };
          }

          return (
            <div
              key={arrowData.wordIndex}
              className={cn("absolute transform -translate-x-1/2 -translate-y-1/2", arrowClasses)}
              style={positionStyle}
            >
              {arrowData.direction}
            </div>
          );
        });
      }
    };

    return (
      <div
        key={key}
        className={cn(
          "w-8 h-8 sm:w-10 sm:h-10 border-2 flex items-center justify-center text-sm sm:text-lg font-bold crossword-cell relative group",
          shouldShowLetter
            ? isAutoRevealed
              ? "text-orange-700"
              : "text-dark"
            : "text-transparent",
        )}
        style={cellStyle}
        data-testid={`grid-cell-${row}-${col}`}
        data-letter={letter}
        data-revealed={cellRevealed}
        data-show={shouldShowLetter}
      >
        <FlipLetter
          letter={letter}
          shouldShowLetter={shouldShowLetter}
          animateKey={key}
        />
        {renderArrows()}
      </div>
    );
  };

  return (
    <div className="relative flex justify-center" data-testid="crossword-grid">
      <div
        className="grid gap-0.5 sm:gap-1 p-2 sm:p-4"
        style={{ gridTemplateColumns: `repeat(${visibleCols}, 1fr)` }}
      >
        {Array.from({ length: visibleRows }, (_, rowIndex) => {
          const actualRow = bounds.minRow + rowIndex;
          return Array.from({ length: visibleCols }, (_, colIndex) => {
            const actualCol = bounds.minCol + colIndex;
            return renderCell(actualRow, actualCol);
          });
        })}
      </div>
    </div>
  );
}
