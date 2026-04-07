/**
 * Custom word lists for Hangman game
 * Each category contains an array of words as strings
 * Loads from categories.json with fallback to built-in lists
 */

import categoriesData from '../data/categories.json';

export interface CategoryInfo {
  icon: string;
  color: string;
  words: string[];
}

export interface CategoriesJson {
  categories: Record<string, CategoryInfo>;
}

// Type for the wordLists object
export type WordListRecord = Record<string, readonly string[]>;

// Build wordLists from JSON data
function buildWordLists(): WordListRecord {
  const lists: Record<string, string[]> = {};
  
  // Add categories from JSON
  for (const [name, info] of Object.entries(categoriesData.categories)) {
    lists[name.toLowerCase().replace(/\s+/g, '')] = info.words;
  }
  
  // Add a default/fallback category with mixed words
  lists.default = [
    'cat', 'dog', 'tree', 'book', 'house', 'water', 'fire', 'earth',
    'music', 'dance', 'happy', 'smile', 'dream', 'hope', 'love',
    'star', 'moon', 'sun', 'cloud', 'rain', 'snow', 'wind',
    'apple', 'bread', 'cheese', 'milk', 'coffee', 'tea',
    'chair', 'table', 'door', 'window', 'floor', 'ceiling',
    'phone', 'computer', 'screen', 'keyboard', 'mouse', 'cable',
    'car', 'bus', 'train', 'plane', 'boat', 'bicycle',
    'shirt', 'pants', 'shoes', 'hat', 'jacket', 'dress',
  ];
  
  return lists;
}

export const wordLists: WordListRecord = buildWordLists();

// Get category display names from JSON
function buildCategoryDisplayNames(): Record<string, string> {
  const names: Record<string, string> = { default: 'Misc' };
  
  for (const name of Object.keys(categoriesData.categories)) {
    names[name.toLowerCase().replace(/\s+/g, '')] = name;
  }
  
  return names;
}

const categoryDisplayNames = buildCategoryDisplayNames();

// Get category metadata (icon, color) from JSON
export function getCategoryMetadata(categoryName: string): { icon: string; color: string } | null {
  // Cast to allow dynamic string access
  const categories = categoriesData.categories as Record<string, CategoryInfo>;
  // Try direct lookup first
  const directMatch = categories[categoryName];
  if (directMatch) {
    return { icon: directMatch.icon, color: directMatch.color };
  }
  
  // Try normalized lookup
  const normalizedKey = categoryName.toLowerCase().replace(/\s+/g, '');
  for (const [key, info] of Object.entries(categoriesData.categories)) {
    if (key.toLowerCase().replace(/\s+/g, '') === normalizedKey) {
      return { icon: info.icon, color: info.color };
    }
  }
  
  return null;
}

export type WordCategory = keyof typeof wordLists;

/**
 * Get all available categories (display names)
 */
export function getAllCategories(): string[] {
  return Object.keys(categoriesData.categories).sort();
}

/**
 * Get words for a specific category
 * Falls back to default category if category not found
 */
export function getWordsForCategory(category: string | null): readonly string[] {
  if (!category || category === 'Random') {
    // Return all words combined for random mode
    const allWords: string[] = [];
    for (const info of Object.values(categoriesData.categories)) {
      allWords.push(...info.words);
    }
    return allWords.length > 0 ? allWords : wordLists.default;
  }
  
  // Normalize category name for lookup
  const normalizedCategory = category.toLowerCase().replace(/\s+/g, '') as WordCategory;
  
  // Try to find in wordLists
  if (normalizedCategory in wordLists) {
    return wordLists[normalizedCategory];
  }
  
  // Try direct JSON lookup
  const categories = categoriesData.categories as Record<string, CategoryInfo>;
  const jsonCategory = categories[category];
  if (jsonCategory) {
    return jsonCategory.words;
  }
  
  return wordLists.default;
}

/**
 * Get a random word from a specific category
 * Falls back to default category if category not found or empty
 */
export function getRandomWordFromCategory(category: string | null): string {
  const words = getWordsForCategory(category);
  
  if (words.length === 0) {
    return wordLists.default[Math.floor(Math.random() * wordLists.default.length)];
  }
  
  return words[Math.floor(Math.random() * words.length)];
}

/**
 * Check if a category exists
 */
export function isValidCategory(category: string): boolean {
  // Check normalized
  const normalized = category.toLowerCase().replace(/\s+/g, '');
  if (normalized in wordLists) return true;
  
  // Check direct in JSON
  return category in categoriesData.categories;
}

/**
 * Get the default word list
 */
export function getDefaultWordList(): readonly string[] {
  return wordLists.default;
}

/**
 * Get categories data for UI
 */
export function getCategoriesData(): CategoriesJson {
  return categoriesData;
}

// Re-export the display names mapping for the words.ts module
export { categoryDisplayNames };
