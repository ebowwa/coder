/**
 * Word list for Hangman game
 * Words are categorized and difficulty is calculated based on word length
 */

import { wordLists, type WordCategory } from './wordLists';

export interface WordEntry {
  word: string;
  category: string;
  difficulty: number;
}

/**
 * Calculate difficulty (1-5) based on word length
 * 3-4 letters: 1, 5-6 letters: 2, 7-8 letters: 3, 9-10 letters: 4, 11+: 5
 */
function calculateDifficulty(word: string): number {
  const len = word.length;
  if (len <= 4) return 1;
  if (len <= 6) return 2;
  if (len <= 8) return 3;
  if (len <= 10) return 4;
  return 5;
}

/**
 * Map wordLists categories to display-friendly category names
 */
const categoryDisplayNames: Record<WordCategory, string> = {
  animals: 'Animals',
  countries: 'Countries',
  foods: 'Food',
  sports: 'Sports',
  technology: 'Technology',
  nature: 'Nature',
  music: 'Music',
  movies: 'Movies',
  science: 'Science',
  default: 'Misc',
};

/**
 * Generate word database from wordLists
 */
function generateWordDatabase(): WordEntry[] {
  const database: WordEntry[] = [];
  
  for (const [category, words] of Object.entries(wordLists)) {
    const displayName = categoryDisplayNames[category as WordCategory] || category;
    for (const word of words) {
      database.push({
        word,
        category: displayName,
        difficulty: calculateDifficulty(word),
      });
    }
  }
  
  return database;
}

const wordDatabase: WordEntry[] = generateWordDatabase();

/**
 * Get words filtered by difficulty level
 */
export function getWordsByDifficulty(difficulty: number): WordEntry[] {
  return wordDatabase.filter(w => w.difficulty === Math.min(5, Math.max(1, Math.floor(difficulty))));
}

/**
 * Get a random word for the given difficulty
 */
export function getRandomWord(difficulty: number): WordEntry {
  const words = getWordsByDifficulty(difficulty);
  if (words.length === 0) {
    // Fallback to difficulty 1 if no words found
    return wordDatabase[0];
  }
  return words[Math.floor(Math.random() * words.length)];
}

/**
 * Get a random word within a difficulty range (inclusive)
 */
export function getRandomWordInRange(minDifficulty: number, maxDifficulty: number): WordEntry {
  const words = wordDatabase.filter(
    w => w.difficulty >= minDifficulty && w.difficulty <= maxDifficulty
  );
  if (words.length === 0) {
    return wordDatabase[0];
  }
  return words[Math.floor(Math.random() * words.length)];
}

/**
 * Get all words (for server API)
 */
export function getAllWords(): WordEntry[] {
  return [...wordDatabase];
}

/**
 * Get all available categories
 */
export function getAllCategories(): string[] {
  const categories = new Set<string>();
  wordDatabase.forEach(entry => categories.add(entry.category));
  return Array.from(categories).sort();
}

/**
 * Get a random word filtered by category and difficulty
 */
export function getRandomWordByCategory(difficulty: number, category: string | null): WordEntry {
  // If no category specified (null or 'Random'), use any word
  if (!category || category === 'Random') {
    return getRandomWord(difficulty);
  }
  
  const filteredWords = wordDatabase.filter(
    w => w.difficulty === Math.min(5, Math.max(1, Math.floor(difficulty))) && w.category === category
  );
  
  if (filteredWords.length === 0) {
    // Fallback to any word of the difficulty if category has no words
    return getRandomWord(difficulty);
  }
  
  return filteredWords[Math.floor(Math.random() * filteredWords.length)];
}

/**
 * Get words filtered by category
 */
export function getWordsByCategory(category: string): WordEntry[] {
  return wordDatabase.filter(w => w.category === category);
}

/**
 * Get words filtered by category and difficulty range
 */
export function getWordsByCategoryAndDifficulty(category: string, minDifficulty: number, maxDifficulty: number): WordEntry[] {
  return wordDatabase.filter(
    w => w.category === category && w.difficulty >= minDifficulty && w.difficulty <= maxDifficulty
  );
}

// Re-export wordLists utilities for direct access
export { wordLists, getCategories, getWordsForCategory, getRandomWordFromCategory, isValidCategory, getDefaultWordList } from './wordLists';
export type { WordCategory } from './wordLists';
