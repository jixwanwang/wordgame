// Blackout configuration: array of [row, col] coordinates that don't need letters
export type BlackoutPattern = [number, number][];

// Predefined blackout patterns for 5x5 grid
export const BLACKOUT_PATTERNS: Record<string, BlackoutPattern> = {
  // No blackouts - full 5x5 grid
  none: [],

  // Four corners blacked out
  fourCorners: [
    [0, 0], // top-left
    [0, 4], // top-right
    [4, 0], // bottom-left
    [4, 4], // bottom-right
  ],

  // one corner gone plus opposite corner
  cornersGone: [
    [0, 0], // top-left
    [0, 1], // top-right
    [1, 0], // top-right
    [4, 4], // bottom-right
  ],

  // Top-left and bottom-right corners
  diagonalTLBR: [
    [0, 0],
    [4, 4],
  ],

  // Top-right and bottom-left corners
  diagonalTRBL: [
    [0, 4],
    [4, 0],
  ],

  // Top two corners
  topCorners: [
    [0, 0],
    [0, 4],
  ],

  // Bottom two corners
  bottomCorners: [
    [4, 0],
    [4, 4],
  ],

  // Left two corners
  leftCorners: [
    [0, 0],
    [4, 0],
  ],

  // Right two corners
  rightCorners: [
    [0, 4],
    [4, 4],
  ],

  // ===== THREE SQUARES IN ONE CORNER =====

  // Top-left corner: 3 squares gone
  topLeft3: [
    [0, 0],
    [0, 1],
    [1, 0],
  ],

  // Top-right corner: 3 squares gone
  topRight3: [
    [0, 4],
    [0, 3],
    [1, 4],
  ],

  // Bottom-left corner: 3 squares gone
  bottomLeft3: [
    [4, 0],
    [4, 1],
    [3, 0],
  ],

  // Bottom-right corner: 3 squares gone
  bottomRight3: [
    [4, 4],
    [4, 3],
    [3, 4],
  ],

  // ===== TWO SQUARES IN ONE CORNER + VARIATIONS OF ANOTHER CORNER =====

  // Top-left (2 horizontal) + Top-right (2 horizontal)
  topLeft2h_topRight2h: [
    [0, 0],
    [0, 1],
    [0, 4],
    [0, 3],
  ],

  // Top-left (2 horizontal) + Bottom-left (1)
  topLeft2h_bottomLeft1: [
    [0, 0],
    [0, 1],
    [4, 0],
  ],

  // Top-left (2 horizontal) + Bottom-left (2 horizontal)
  topLeft2h_bottomLeft2h: [
    [0, 0],
    [0, 1],
    [4, 0],
    [4, 1],
  ],

  // Top-left (2 horizontal) + Bottom-right (1)
  topLeft2h_bottomRight1: [
    [0, 0],
    [0, 1],
    [4, 4],
  ],

  // Top-left (2 horizontal) + Bottom-right (2 horizontal)
  topLeft2h_bottomRight2h: [
    [0, 0],
    [0, 1],
    [4, 4],
    [4, 3],
  ],

  // Top-left (2 horizontal) + Bottom-right (2 vertical)
  topLeft2h_bottomRight2v: [
    [0, 0],
    [0, 1],
    [4, 4],
    [3, 4],
  ],

  // Top-left (2 vertical) + Top-right (1)
  topLeft2v_topRight1: [
    [0, 0],
    [1, 0],
    [0, 4],
  ],

  // Top-left (2 vertical) + Top-right (2 vertical)
  topLeft2v_topRight2v: [
    [0, 0],
    [1, 0],
    [0, 4],
    [1, 4],
  ],

  // Top-left (2 vertical) + Bottom-left (2 vertical)
  topLeft2v_bottomLeft2v: [
    [0, 0],
    [1, 0],
    [4, 0],
    [3, 0],
  ],

  // Top-left (2 vertical) + Bottom-right (1)
  topLeft2v_bottomRight1: [
    [0, 0],
    [1, 0],
    [4, 4],
  ],

  // Top-left (2 vertical) + Bottom-right (2 horizontal)
  topLeft2v_bottomRight2h: [
    [0, 0],
    [1, 0],
    [4, 4],
    [4, 3],
  ],

  // Top-left (2 vertical) + Bottom-right (2 vertical)
  topLeft2v_bottomRight2v: [
    [0, 0],
    [1, 0],
    [4, 4],
    [3, 4],
  ],

  // Top-right (2 horizontal) + Bottom-left (1)
  topRight2h_bottomLeft1: [
    [0, 4],
    [0, 3],
    [4, 0],
  ],

  // Top-right (2 horizontal) + Bottom-left (2 horizontal)
  topRight2h_bottomLeft2h: [
    [0, 4],
    [0, 3],
    [4, 0],
    [4, 1],
  ],

  // Top-right (2 horizontal) + Bottom-left (2 vertical)
  topRight2h_bottomLeft2v: [
    [0, 4],
    [0, 3],
    [4, 0],
    [3, 0],
  ],

  // Top-right (2 horizontal) + Bottom-right (1)
  topRight2h_bottomRight1: [
    [0, 4],
    [0, 3],
    [4, 4],
  ],

  // Top-right (2 horizontal) + Bottom-right (2 horizontal)
  topRight2h_bottomRight2h: [
    [0, 4],
    [0, 3],
    [4, 4],
    [4, 3],
  ],

  // Top-right (2 vertical) + Bottom-left (1)
  topRight2v_bottomLeft1: [
    [0, 4],
    [1, 4],
    [4, 0],
  ],

  // Top-right (2 vertical) + Bottom-left (2 horizontal)
  topRight2v_bottomLeft2h: [
    [0, 4],
    [1, 4],
    [4, 0],
    [4, 1],
  ],

  // Top-right (2 vertical) + Bottom-left (2 vertical)
  topRight2v_bottomLeft2v: [
    [0, 4],
    [1, 4],
    [4, 0],
    [3, 0],
  ],

  // Top-right (2 vertical) + Bottom-right (2 vertical)
  topRight2v_bottomRight2v: [
    [0, 4],
    [1, 4],
    [4, 4],
    [3, 4],
  ],

  // Bottom-left (2 horizontal) + Bottom-right (2 horizontal)
  bottomLeft2h_bottomRight2h: [
    [4, 0],
    [4, 1],
    [4, 4],
    [4, 3],
  ],

  // Bottom-left (2 vertical) + Bottom-right (1)
  bottomLeft2v_bottomRight1: [
    [4, 0],
    [3, 0],
    [4, 4],
  ],

  // Bottom-left (2 vertical) + Bottom-right (2 vertical)
  bottomLeft2v_bottomRight2v: [
    [4, 0],
    [3, 0],
    [4, 4],
    [3, 4],
  ],
};
