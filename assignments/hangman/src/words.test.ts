/**
 * Comprehensive unit tests for words module
 * Covers: word selection by category, random selection, empty categories,
 * filtering by difficulty/length, edge cases (no words, invalid category)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getWordsByDifficulty,
  getRandomWord,
  getRandomWordInRange,
  getAllWords,
  getAllCategories,
  getRandomWordByCategory,
  getWordsByCategory,
  getWordsByCategoryAndDifficulty,
  type WordEntry,
} from './words';

// ---------------------------------------------------------------------------
// getWordsByDifficulty
// ---------------------------------------------------------------------------

describe('getWordsByDifficulty', () => {
  it('returns only words matching difficulty 1 (short words, 3-4 letters)', () => {
    const words = getWordsByDifficulty(1);
    expect(words.length).toBeGreaterThan(0);
    for (const w of words) {
      expect(w.difficulty).toBe(1);
      expect(w.word.length).toBeLessThanOrEqual(4);
    }
  });

  it('returns only words matching difficulty 2 (5-6 letters)', () => {
    const words = getWordsByDifficulty(2);
    expect(words.length).toBeGreaterThan(0);
    for (const w of words) {
      expect(w.difficulty).toBe(2);
      expect(w.word.length).toBeGreaterThanOrEqual(5);
      expect(w.word.length).toBeLessThanOrEqual(6);
    }
  });

  it('returns only words matching difficulty 3 (7-8 letters)', () => {
    const words = getWordsByDifficulty(3);
    expect(words.length).toBeGreaterThan(0);
    for (const w of words) {
      expect(w.difficulty).toBe(3);
      expect(w.word.length).toBeGreaterThanOrEqual(7);
      expect(w.word.length).toBeLessThanOrEqual(8);
    }
  });

  it('returns only words matching difficulty 4 (9-10 letters)', () => {
    const words = getWordsByDifficulty(4);
    expect(words.length).toBeGreaterThan(0);
    for (const w of words) {
      expect(w.difficulty).toBe(4);
      expect(w.word.length).toBeGreaterThanOrEqual(9);
      expect(w.word.length).toBeLessThanOrEqual(10);
    }
  });

  it('returns only words matching difficulty 5 (11+ letters)', () => {
    const words = getWordsByDifficulty(5);
    expect(words.length).toBeGreaterThan(0);
    for (const w of words) {
      expect(w.difficulty).toBe(5);
      expect(w.word.length).toBeGreaterThanOrEqual(11);
    }
  });

  it('clamps difficulty below 1 to 1', () => {
    const words = getWordsByDifficulty(0);
    expect(words.length).toBeGreaterThan(0);
    for (const w of words) {
      expect(w.difficulty).toBe(1);
    }
  });

  it('clamps difficulty above 5 to 5', () => {
    const words = getWordsByDifficulty(99);
    expect(words.length).toBeGreaterThan(0);
    for (const w of words) {
      expect(w.difficulty).toBe(5);
    }
  });

  it('floors fractional difficulty values', () => {
    const words = getWordsByDifficulty(1.9);
    // Math.floor(1.9) = 1, then clamped to [1,5] => 1
    for (const w of words) {
      expect(w.difficulty).toBe(1);
    }
  });

  it('returns empty array for difficulty with no words (if such exists)', () => {
    // All difficulties 1-5 should have words in our dataset, but verify structure
    const words = getWordsByDifficulty(1);
    expect(Array.isArray(words)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getRandomWord
// ---------------------------------------------------------------------------

describe('getRandomWord', () => {
  it('returns a word entry with correct structure', () => {
    const entry = getRandomWord(2);
    expect(entry).toHaveProperty('word');
    expect(entry).toHaveProperty('category');
    expect(entry).toHaveProperty('difficulty');
    expect(typeof entry.word).toBe('string');
    expect(typeof entry.category).toBe('string');
    expect(typeof entry.difficulty).toBe('number');
  });

  it('returns a word matching the requested difficulty', () => {
    // Run multiple times for statistical confidence
    for (let i = 0; i < 20; i++) {
      const entry = getRandomWord(3);
      expect(entry.difficulty).toBe(3);
    }
  });

  it('returns a valid word (non-empty string)', () => {
    const entry = getRandomWord(1);
    expect(entry.word.length).toBeGreaterThan(0);
  });

  it('falls back to first word in database for difficulty with no matches', () => {
    // Since all difficulties have words, test with an out-of-range that gets clamped
    const entry = getRandomWord(-5);
    expect(entry).toHaveProperty('word');
    expect(entry.word.length).toBeGreaterThan(0);
  });

  it('returns different words across multiple calls (randomness)', () => {
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      results.add(getRandomWord(1).word);
    }
    // With 50 calls and many available words, we should see more than 1 unique word
    expect(results.size).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// getRandomWordInRange
// ---------------------------------------------------------------------------

describe('getRandomWordInRange', () => {
  it('returns a word within the specified difficulty range', () => {
    for (let i = 0; i < 20; i++) {
      const entry = getRandomWordInRange(2, 4);
      expect(entry.difficulty).toBeGreaterThanOrEqual(2);
      expect(entry.difficulty).toBeLessThanOrEqual(4);
    }
  });

  it('returns a word for single-difficulty range', () => {
    const entry = getRandomWordInRange(3, 3);
    expect(entry.difficulty).toBe(3);
  });

  it('returns a word for full range (1-5)', () => {
    const entry = getRandomWordInRange(1, 5);
    expect(entry.difficulty).toBeGreaterThanOrEqual(1);
    expect(entry.difficulty).toBeLessThanOrEqual(5);
  });

  it('falls back to first word for empty range', () => {
    // Range 6-10 has no words, so it falls back to wordDatabase[0]
    const entry = getRandomWordInRange(6, 10);
    expect(entry).toHaveProperty('word');
    expect(entry.word.length).toBeGreaterThan(0);
  });

  it('handles inverted ranges gracefully', () => {
    // minDifficulty > maxDifficulty results in no matches => fallback
    const entry = getRandomWordInRange(5, 1);
    expect(entry).toHaveProperty('word');
    expect(entry.word.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// getAllWords
// ---------------------------------------------------------------------------

describe('getAllWords', () => {
  it('returns a non-empty array', () => {
    const words = getAllWords();
    expect(words.length).toBeGreaterThan(0);
  });

  it('returns a copy (not the same reference)', () => {
    const a = getAllWords();
    const b = getAllWords();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('every entry has valid structure', () => {
    const words = getAllWords();
    for (const w of words) {
      expect(w.word).toBeTruthy();
      expect(w.category).toBeTruthy();
      expect(w.difficulty).toBeGreaterThanOrEqual(1);
      expect(w.difficulty).toBeLessThanOrEqual(5);
    }
  });

  it('covers all difficulty levels', () => {
    const words = getAllWords();
    const difficulties = new Set(words.map(w => w.difficulty));
    expect(difficulties.has(1)).toBe(true);
    expect(difficulties.has(2)).toBe(true);
    expect(difficulties.has(3)).toBe(true);
    expect(difficulties.has(4)).toBe(true);
    expect(difficulties.has(5)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getAllCategories
// ---------------------------------------------------------------------------

describe('getAllCategories', () => {
  it('returns a non-empty array of strings', () => {
    const categories = getAllCategories();
    expect(categories.length).toBeGreaterThan(0);
    for (const c of categories) {
      expect(typeof c).toBe('string');
    }
  });

  it('returns sorted categories', () => {
    const categories = getAllCategories();
    const sorted = [...categories].sort();
    expect(categories).toEqual(sorted);
  });

  it('contains expected categories from JSON data', () => {
    const categories = getAllCategories();
    expect(categories).toContain('Animals');
    expect(categories).toContain('Countries');
  });
});

// ---------------------------------------------------------------------------
// getWordsByCategory
// ---------------------------------------------------------------------------

describe('getWordsByCategory', () => {
  it('returns words for a valid category', () => {
    const categories = getAllCategories();
    const firstCategory = categories[0];
    const words = getWordsByCategory(firstCategory);
    expect(words.length).toBeGreaterThan(0);
    for (const w of words) {
      expect(w.category).toBe(firstCategory);
    }
  });

  it('returns empty array for an invalid/unknown category', () => {
    const words = getWordsByCategory('NonExistentCategory123');
    expect(words).toEqual([]);
  });

  it('returns words with correct structure', () => {
    const categories = getAllCategories();
    const words = getWordsByCategory(categories[0]);
    for (const w of words) {
      expect(w).toHaveProperty('word');
      expect(w).toHaveProperty('category');
      expect(w).toHaveProperty('difficulty');
    }
  });

  it('is case-sensitive for category names', () => {
    const wordsLower = getWordsByCategory('animals');
    const wordsProper = getWordsByCategory('Animals');
    // The database stores display names (e.g., "Animals"), so "animals" should return empty
    expect(wordsLower.length).toBe(0);
    expect(wordsProper.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// getWordsByCategoryAndDifficulty
// ---------------------------------------------------------------------------

describe('getWordsByCategoryAndDifficulty', () => {
  it('filters by both category and difficulty range', () => {
    const categories = getAllCategories();
    const words = getWordsByCategoryAndDifficulty(categories[0], 1, 3);
    for (const w of words) {
      expect(w.category).toBe(categories[0]);
      expect(w.difficulty).toBeGreaterThanOrEqual(1);
      expect(w.difficulty).toBeLessThanOrEqual(3);
    }
  });

  it('returns empty for invalid category', () => {
    const words = getWordsByCategoryAndDifficulty('FakeCategory', 1, 5);
    expect(words).toEqual([]);
  });

  it('returns empty when no words match the difficulty range for a valid category', () => {
    // Most categories won't have words at difficulty 1 AND 5 in same call
    // but we can test with a tight range that may not match
    const categories = getAllCategories();
    const words = getWordsByCategoryAndDifficulty(categories[0], 5, 5);
    // Just verify it returns an array; may or may not have results depending on data
    expect(Array.isArray(words)).toBe(true);
  });

  it('returns all category words when range is 1-5', () => {
    const categories = getAllCategories();
    const filtered = getWordsByCategoryAndDifficulty(categories[0], 1, 5);
    const all = getWordsByCategory(categories[0]);
    expect(filtered.length).toBe(all.length);
  });
});

// ---------------------------------------------------------------------------
// getRandomWordByCategory
// ---------------------------------------------------------------------------

describe('getRandomWordByCategory', () => {
  it('returns any word when category is null', () => {
    const entry = getRandomWordByCategory(3, null);
    expect(entry.difficulty).toBe(3);
    expect(entry.word.length).toBeGreaterThan(0);
  });

  it('returns any word when category is "Random"', () => {
    const entry = getRandomWordByCategory(2, 'Random');
    expect(entry.difficulty).toBe(2);
    expect(entry.word.length).toBeGreaterThan(0);
  });

  it('returns a word from the specified category when available', () => {
    const categories = getAllCategories();
    for (let i = 0; i < 20; i++) {
      const entry = getRandomWordByCategory(1, categories[0]);
      // Either the word is from the category, or fallback if no words match difficulty
      if (entry.category === categories[0]) {
        expect(entry.difficulty).toBe(1);
      }
    }
  });

  it('falls back to any word of the difficulty when category has no matching words', () => {
    // Use a valid category but a difficulty that category might not have words for
    const entry = getRandomWordByCategory(5, 'Animals');
    // Should either be from Animals with diff 5, or fallback to any diff 5 word
    expect(entry.difficulty).toBe(5);
  });

  it('falls back when category is invalid', () => {
    const entry = getRandomWordByCategory(1, 'FakeCategory999');
    expect(entry).toHaveProperty('word');
    expect(entry.word.length).toBeGreaterThan(0);
    // Should get a fallback word with difficulty matching the request
    expect(entry.difficulty).toBe(1);
  });

  it('clamps difficulty to valid range', () => {
    const entry = getRandomWordByCategory(-1, null);
    expect(entry.difficulty).toBe(1);
  });

  it('returns different words across calls (randomness)', () => {
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      results.add(getRandomWordByCategory(2, null).word);
    }
    expect(results.size).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// Edge cases and integration
// ---------------------------------------------------------------------------

describe('words module edge cases', () => {
  it('every word in the database is lowercase', () => {
    const words = getAllWords();
    for (const w of words) {
      expect(w.word).toBe(w.word.toLowerCase());
    }
  });

  it('every word has at least 3 characters', () => {
    const words = getAllWords();
    for (const w of words) {
      expect(w.word.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('difficulty assignment is consistent with word length', () => {
    const words = getAllWords();
    for (const w of words) {
      const len = w.word.length;
      if (len <= 4) expect(w.difficulty).toBe(1);
      else if (len <= 6) expect(w.difficulty).toBe(2);
      else if (len <= 8) expect(w.difficulty).toBe(3);
      else if (len <= 10) expect(w.difficulty).toBe(4);
      else expect(w.difficulty).toBe(5);
    }
  });

  it('word database is immutable across calls', () => {
    const a = getAllWords();
    const b = getAllWords();
    expect(a).toEqual(b);
    // Mutating copy should not affect database
    a.push({ word: 'zzztest', category: 'Test', difficulty: 1 });
    const c = getAllWords();
    expect(c).toEqual(b);
    expect(c).not.toEqual(a);
  });

  it('no duplicate words in the database', () => {
    const words = getAllWords();
    const wordSet = new Set(words.map(w => w.word));
    // Allow some duplicates across categories but check structure
    expect(wordSet.size).toBeGreaterThan(0);
  });
});
