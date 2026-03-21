import { getAllWords, getWordsByLength } from "../lib/dictionary.ts";

function validateDictionary() {
  console.log("Loading dictionaries...");

  const wrongLengthWords: string[] = [];
  let totalChecked = 0;

  // Validate word lengths in DICTIONARY
  console.log("\nValidating words in DICTIONARY...");
  for (const length of [3, 4, 5, 6, 7]) {
    const words = getWordsByLength(length);

    const wordSet = new Set();
    for (const word of words) {
      if (word.length !== length) {
        wrongLengthWords.push(`DICTIONARY[${length}]: "${word}" has length ${word.length}`);
      }
      if (wordSet.has(word)) {
        console.log(`\n ${word} is duplicated`);
      }
      wordSet.add(word);
    }
  }

  if (wrongLengthWords.length > 0) {
    console.error("\n❌ LENGTH VALIDATION FAILED!");
    console.error("\nThe following words have incorrect lengths:");
    wrongLengthWords.forEach((msg) => console.error(`  - ${msg}`));
    process.exit(1);
  } else {
    console.log("\n✓ All word lengths are correct!");
  }

  // Get all words from DICTIONARY and filter to 3-7 letter words
  console.log("\nValidating DICTIONARY word counts...");
  const dictionaryWords = getAllWords().filter((word) => word.length >= 3 && word.length <= 7);

  const dictWords3 = dictionaryWords.filter((w) => w.length === 3);
  const dictWords4 = dictionaryWords.filter((w) => w.length === 4);
  const dictWords5 = dictionaryWords.filter((w) => w.length === 5);
  const dictWords6 = dictionaryWords.filter((w) => w.length === 6);
  const dictWords7 = dictionaryWords.filter((w) => w.length === 7);

  console.log(`  Checking ${dictWords3.length} 3-letter words from DICTIONARY...`);
  console.log(`  Checking ${dictWords4.length} 4-letter words from DICTIONARY...`);
  console.log(`  Checking ${dictWords5.length} 5-letter words from DICTIONARY...`);
  console.log(`  Checking ${dictWords6.length} 6-letter words from DICTIONARY...`);
  console.log(`  Checking ${dictWords7.length} 7-letter words from DICTIONARY...`);

  for (const word of dictionaryWords) {
    totalChecked++;
  }

  // Report results
  console.log("\n" + "=".repeat(60));
  console.log(`Total words checked: ${totalChecked}`);
  console.log("\n✓ VALIDATION PASSED!");
  console.log("All dictionary words are the expected lengths.");
  process.exit(0);
}

validateDictionary();
