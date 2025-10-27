import { BLACKOUT_PATTERNS, BlackoutPattern } from "./blackouts";

function isBlackedOut(row: number, col: number, blackout: BlackoutPattern): boolean {
  return blackout.some(([r, c]) => r === row && c === col);
}

function getSegmentsInRow(row: number, blackout: BlackoutPattern): number[] {
  const segments: number[] = [];
  let currentSegmentLength = 0;

  for (let col = 0; col < 5; col++) {
    if (isBlackedOut(row, col, blackout)) {
      if (currentSegmentLength > 0) {
        segments.push(currentSegmentLength);
        currentSegmentLength = 0;
      }
    } else {
      currentSegmentLength++;
    }
  }

  if (currentSegmentLength > 0) {
    segments.push(currentSegmentLength);
  }

  return segments;
}

function getSegmentsInCol(col: number, blackout: BlackoutPattern): number[] {
  const segments: number[] = [];
  let currentSegmentLength = 0;

  for (let row = 0; row < 5; row++) {
    if (isBlackedOut(row, col, blackout)) {
      if (currentSegmentLength > 0) {
        segments.push(currentSegmentLength);
        currentSegmentLength = 0;
      }
    } else {
      currentSegmentLength++;
    }
  }

  if (currentSegmentLength > 0) {
    segments.push(currentSegmentLength);
  }

  return segments;
}

function hasTwoLetterWords(blackout: BlackoutPattern): boolean {
  // Check all rows
  for (let row = 0; row < 5; row++) {
    const segments = getSegmentsInRow(row, blackout);
    if (segments.some((len) => len === 2)) {
      return true;
    }
  }

  // Check all columns
  for (let col = 0; col < 5; col++) {
    const segments = getSegmentsInCol(col, blackout);
    if (segments.some((len) => len === 2)) {
      return true;
    }
  }

  return false;
}

// Analyze all patterns
console.log("Analyzing blackout patterns for 2-letter words...\n");

const validPatterns: string[] = [];
const invalidPatterns: string[] = [];

for (const [name, pattern] of Object.entries(BLACKOUT_PATTERNS)) {
  const hasTwoLetters = hasTwoLetterWords(pattern);

  if (hasTwoLetters) {
    invalidPatterns.push(name);
    console.log(`❌ ${name}: Contains 2-letter words`);
  } else {
    validPatterns.push(name);
    console.log(`✓ ${name}: Valid (no 2-letter words)`);
  }
}

console.log(`\n\nSummary:`);
console.log(`Valid patterns: ${validPatterns.length}`);
console.log(`Invalid patterns (need removal): ${invalidPatterns.length}`);
console.log(`\nPatterns to remove:`);
console.log(invalidPatterns.join(", "));
