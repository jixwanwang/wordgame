import PUZZLES_NORMAL from "../lib/puzzles_normal";
import { parseDate } from "../lib/game-utils";
import { calculatePuzzleScore } from "../gen_puzzle";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const today = new Date();
today.setHours(0, 0, 0, 0);
const cutoff = today.getTime() - 30 * MS_PER_DAY;

const last30 = PUZZLES_NORMAL.filter((p) => {
  const t = parseDate(p.date).getTime();
  return t > cutoff && t <= today.getTime();
}).sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

console.log("date\t\tunique\tscore");
for (const puzzle of last30) {
  const uniqueLetters = Array.from(new Set(puzzle.words.join("").split("")));
  const score = calculatePuzzleScore(uniqueLetters);
  console.log(`${puzzle.date}\t${uniqueLetters.length}\t${score}`);
}
