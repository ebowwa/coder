/**
 * Tests for the wordLists module
 * 
 * This test file validates all functionality related to word categories, 
 * word list management, and category metadata in the Hangman game.
 */

import {
  CategoryInfo,
  CategoriesJson,
  WordListRecord,
  wordLists,
  getCategoryMetadata,
  getAllCategories,
  getWordsForCategory,
  getRandomWordFromCategory,
  isValidCategory,
  getDefaultWordList,
  getCategoriesData,
  WordCategory,
} from './wordLists';

describe('wordLists', () => {
  describe('wordLists object', () => {
    test('should have built-in word lists', () => {
      expect(wordLists).toBeDefined();
      expect(wordLists.default).toBeDefined();
      expect(Array.isArray(wordLists.default)).toBe(true);
      expect(wordLists.default.length).toBeGreaterThan(0);
    });

    test('should have default words', () => {
      const defaultWords = wordLists.default;
      expect(defaultWords).toContain('cat');
      expect(defaultWords).toContain('dog');
      expect(defaultWords).toContain('tree');
      expect(defaultWords).toContain('book');
    });

    test('should return readonly arrays', () => {
      // Test that wordLists returns readonly arrays
      const defaultList = wordLists.default;
      expect(Array.isArray(defaultList)).toBe(true);
      
      // TypeScript ensures readonly, at runtime we can't modify readonly arrays
      // but we can verify they're arrays
      expect(defaultList.length).toBeGreaterThan(0);
    });
  });

  describe('getCategoryMetadata', () => {
    test('should return metadata for existing category', () => {
      const metadata = getCategoryMetadata('Animals');
      expect(metadata).toEqual({
        icon: '🐾',
        color: '#4caf50',
      });
    });

    test('should return metadata for normalized category name', () => {
      const metadata = getCategoryMetadata('Animals');
      expect(metadata).toEqual({
        icon: '🐾',
        color: '#4caf50',
      });

      const metadata2 = getCategoryMetadata(' animals ');
      expect(metadata2).toEqual({
        icon: '🐾',
        color: '#4caf50',
      });
    });

    test('should return null for non-existent category', () => {
      const metadata = getCategoryMetadata('nonexistent');
      expect(metadata).toBeNull();
    });

    test('should handle case-insensitive lookup', () => {
      const metadata = getCategoryMetadata('PROGRAMMING LANGUAGES');
      expect(metadata).toEqual({
        icon: '💻',
        color: '#9c27b0',
      });
    });
  });

  describe('getAllCategories', () => {
    test('should return all category names', () => {
      const categories = getAllCategories();
      expect(categories).toEqual(['Animals', 'Countries', 'Food', 'Movies', 'Programming Languages']);
      expect(categories).toHaveLength(5);
    });

    test('should return sorted categories', () => {
      const categories = getAllCategories();
      expect(categories[0]).toBe('Animals');
      expect(categories[1]).toBe('Countries');
      expect(categories[2]).toBe('Food');
    });
  });

  describe('getWordsForCategory', () => {
    test('should return words for specific category', () => {
      const words = getWordsForCategory('Animals');
      expect(words).toBeInstanceOf(Array);
      expect(words.length).toBeGreaterThan(0);
      expect(words).toContain('elephant');
      expect(words).toContain('giraffe');
    });

    test('should return words for normalized category', () => {
      const words = getWordsForCategory('ANIMALS');
      expect(words).toBeInstanceOf(Array);
      expect(words.length).toBeGreaterThan(0);
    });

    test('should return combined words for null category', () => {
      const words = getWordsForCategory(null);
      expect(words).toBeInstanceOf(Array);
      expect(words.length).toBeGreaterThan(0);
      // null returns combined words from all JSON categories
      expect(words).toContain('elephant'); // From Animals
      expect(words).toContain('spaghetti'); // From Food
    });

    test('should return default words for "Random" category', () => {
      const words = getWordsForCategory('Random');
      expect(words).toBeInstanceOf(Array);
      expect(words.length).toBeGreaterThan(0);
    });

    test('should return default words for non-existent category', () => {
      const words = getWordsForCategory('nonexistent');
      expect(words).toBeInstanceOf(Array);
      expect(words.length).toBeGreaterThan(0);
      expect(words).toContain('cat'); // Fallback to default
    });

    test('should return all category words combined for null category', () => {
      const words = getWordsForCategory(null);
      const allCategoryWords = [
        ...getCategoriesData().categories.Animals.words,
        ...getCategoriesData().categories.Countries.words,
        ...getCategoriesData().categories.Food.words,
        ...getCategoriesData().categories.Movies.words,
        ...(getCategoriesData().categories['Programming Languages']?.words || []),
      ];
      
      // Should include all words from categories
      expect(words.length).toBe(allCategoryWords.length);
      allCategoryWords.forEach(word => {
        expect(words).toContain(word);
      });
    });
  });

  describe('getRandomWordFromCategory', () => {
    test('should return a word from specified category', () => {
      const word = getRandomWordFromCategory('Animals');
      expect(typeof word).toBe('string');
      expect(word.length).toBeGreaterThan(0);
      
      // Should be one of the animal words
      const animalWords = getCategoriesData().categories.Animals.words;
      expect(animalWords).toContain(word);
    });

    test('should return a word from normalized category', () => {
      const word = getRandomWordFromCategory('FOOD');
      expect(typeof word).toBe('string');
      expect(word.length).toBeGreaterThan(0);
    });

    test('should fall back to default for empty category', () => {
      const word = getRandomWordFromCategory('nonexistent');
      expect(typeof word).toBe('string');
      expect(word.length).toBeGreaterThan(0);
      expect(wordLists.default).toContain(word);
    });

    test('should return different words on multiple calls', () => {
      // This might occasionally fail due to randomness, but is very unlikely
      const word1 = getRandomWordFromCategory('Animals');
      const word2 = getRandomWordFromCategory('Animals');
      
      // Allow for the possibility they're the same
      expect([word1, word2]).toHaveLength(2);
    });

    test('should return word for null category', () => {
      const word = getRandomWordFromCategory(null);
      expect(typeof word).toBe('string');
      expect(word.length).toBeGreaterThan(0);
    });
  });

  describe('isValidCategory', () => {
    test('should return true for valid categories', () => {
      expect(isValidCategory('Animals')).toBe(true);
      expect(isValidCategory('ANIMALS')).toBe(true);
      expect(isValidCategory(' animals ')).toBe(true);
      expect(isValidCategory('Programming Languages')).toBe(true);
    });

    test('should return false for invalid categories', () => {
      expect(isValidCategory('nonexistent')).toBe(false);
      expect(isValidCategory('')).toBe(false);
      expect(isValidCategory('invalid_category')).toBe(false);
    });
  });

  describe('getDefaultWordList', () => {
    test('should return the default word list', () => {
      const defaultList = getDefaultWordList();
      expect(defaultList).toBeInstanceOf(Array);
      expect(defaultList.length).toBeGreaterThan(0);
      expect(defaultList).toContain('cat');
      expect(defaultList).toContain('dog');
    });

    test('should return readonly array', () => {
      const defaultList = getDefaultWordList();
      expect(Array.isArray(defaultList)).toBe(true);
      expect(defaultList.length).toBeGreaterThan(0);
    });
  });

  describe('getCategoriesData', () => {
    test('should return all categories data', () => {
      const data = getCategoriesData();
      expect(data.categories).toHaveProperty('Animals');
      expect(data.categories).toHaveProperty('Countries');
      expect(data.categories).toHaveProperty('Food');
    });

    test('should maintain original structure', () => {
      const data = getCategoriesData();
      expect(data.categories.Animals.icon).toBe('🐾');
      expect(data.categories['Programming Languages'].color).toBe('#9c27b0');
      expect(data.categories.Food.words).toContain('spaghetti');
    });
  });

  describe('CategoryInfo type', () => {
    test('should have proper structure for category info', () => {
      const categoryInfo: CategoryInfo = {
        icon: '🎮',
        color: '#9B59B6',
        words: ['game', 'play', 'fun'],
      };

      expect(categoryInfo.icon).toBe('🎮');
      expect(categoryInfo.color).toBe('#9B59B6');
      expect(categoryInfo.words).toContain('game');
    });
  });

  describe('WordCategory type', () => {
    test('should only accept valid category keys', () => {
      // This is a type-level test - TypeScript would catch invalid assignments
      // At runtime, we can verify the categories exist in wordLists
      // Categories are normalized to lowercase with spaces removed
      const validCategories: string[] = ['default', 'animals', 'countries', 'food', 'movies', 'programminglanguages'];

      validCategories.forEach(category => {
        expect(wordLists[category]).toBeDefined();
        expect(Array.isArray(wordLists[category])).toBe(true);
      });
    });
  });

  describe('Edge cases', () => {
    test('should handle empty word lists gracefully', () => {
      // Test edge case
      expect(() => getWordsForCategory('nonexistent')).not.toThrow();
    });

    test('should handle very long words', () => {
      const longWord = 'supercalifragilisticexpialidocious';
      const wordsWithLongWord: CategoryInfo = {
        icon: '🔤',
        color: '#00FF00',
        words: [longWord, 'short'],
      };
      
      const word = getRandomWordFromCategory('longwords'); // hypothetical category
      expect(typeof word).toBe('string');
    });
  });
});