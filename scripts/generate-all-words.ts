import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRABBLE_DICT_PATH = path.join(__dirname, "..", "twl_scrabble.txt");
const OUTPUT_PATH = path.join(__dirname, "..", "lib", "all_words.ts");

async function generateAllWordsFile() {
  console.log("Reading scrabble dictionary...");
  const content = fs.readFileSync(SCRABBLE_DICT_PATH, "utf-8");
  const scrabbleWords = content
    .split("\n")
    .map((word) => word.trim().toUpperCase())
    .filter((word) => word.length > 0);

  console.log(`Total words in scrabble dictionary: ${scrabbleWords.length}`);

  // Filter to only 4, 5, and 6 letter words
  const filteredScrabbleWords = scrabbleWords.filter(
    (word) => word.length >= 4 && word.length <= 6,
  );

  console.log(`Filtered to 4-6 letter words: ${filteredScrabbleWords.length}`);

  // Load existing game dictionaries to ensure all puzzle words are included
  console.log("\nLoading game dictionaries...");
  const dictionaryModule = await import(path.join(__dirname, "..", "dictionary.ts"));
  const DICTIONARY = dictionaryModule.DICTIONARY;
  const UNCOMMON_DICTIONARY = dictionaryModule.UNCOMMON_DICTIONARY;

  // Collect all words from game dictionaries (4, 5, 6 letter words only)
  const gameWords = new Set<string>();
  for (const length of [4, 5, 6]) {
    if (DICTIONARY[length]) {
      DICTIONARY[length].forEach((word) => gameWords.add(word.toUpperCase()));
    }
    if (UNCOMMON_DICTIONARY[length]) {
      UNCOMMON_DICTIONARY[length].forEach((word) => gameWords.add(word.toUpperCase()));
    }
  }

  console.log(`Found ${gameWords.size} words from game dictionaries`);

  // Combine scrabble words with game words
  const allWordsSet = new Set([...filteredScrabbleWords, ...gameWords]);
  const allWords = Array.from(allWordsSet).sort();

  console.log(`\nTotal unique words after merging: ${allWords.length}`);
  console.log(`  4-letter words: ${allWords.filter((w) => w.length === 4).length}`);
  console.log(`  5-letter words: ${allWords.filter((w) => w.length === 5).length}`);
  console.log(`  6-letter words: ${allWords.filter((w) => w.length === 6).length}`);

  // Create the TypeScript file content
  const tsContent = `// Auto-generated file - do not edit manually
// Generated from TWL Scrabble Dictionary + game dictionaries
// Contains all valid 4, 5, and 6 letter words for spell checking

export const ALL_WORDS = new Set<string>([
${allWords.map((word) => `"${word}",`).join("\n")}
]);

export function isValidWord(word: string): boolean {
  return ALL_WORDS.has(word.toUpperCase());
}
`;

  console.log("\nWriting output file...");
  fs.writeFileSync(OUTPUT_PATH, tsContent, "utf-8");

  console.log(`✓ Successfully generated ${OUTPUT_PATH}`);
  console.log(`  Total words: ${allWords.length}`);
}

generateAllWordsFile().catch((err) => {
  console.error("Error generating dictionary:", err);
  process.exit(1);
});
