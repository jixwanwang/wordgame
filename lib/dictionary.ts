import { DICTIONARY_3 } from "./dictionary_3";
import { DICTIONARY_4 } from "./dictionary_4";
import { DICTIONARY_5 } from "./dictionary_5";
import { DICTIONARY_6 } from "./dictionary_6";
import { DICTIONARY_7 } from "./dictionary_7";

export const DICTIONARY: Record<number, string[]> = {
  3: DICTIONARY_3,
  4: DICTIONARY_4,
  5: DICTIONARY_5,
  6: DICTIONARY_6,
  7: DICTIONARY_7,
};

export function getRandomWord(length?: number): string {
  if (length && DICTIONARY[length]) {
    const words = DICTIONARY[length];
    return words[Math.floor(Math.random() * words.length)];
  }

  // If no length specified, pick from all words
  const allLengths = Object.keys(DICTIONARY).map(Number);
  const randomLength = allLengths[Math.floor(Math.random() * allLengths.length)];
  const words = DICTIONARY[randomLength];
  return words[Math.floor(Math.random() * words.length)];
}

export function getRandomWords(count: number, length?: number): string[] {
  const words = new Set<string>();

  while (words.size < count) {
    words.add(getRandomWord(length));
  }

  return Array.from(words);
}

export function getAllWords(): string[] {
  return Object.values(DICTIONARY).flat();
}

export function getWordsByLength(length: number): string[] {
  return DICTIONARY[length] || [];
}

export function isValidWord(word: string): boolean {
  if (DICTIONARY[word.length] == null) {
    return false;
  }

  const words = DICTIONARY[word.length];
  return words.includes(word.toUpperCase());
}
