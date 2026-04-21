/**
 * Unit tests for core single-player game logic module
 * Tests: word selection, letter guessing (correct/incorrect), win/loss detection,
 * remaining attempts tracking, game state reset, and edge cases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRound,
  guessLetter,
  isWinningState,
  isLosingState,
  getRemainingGuesses,
  getWrongGuesses,
  getWordMask,
  MAX_WRONG_GUESSES,
  type GuessResult,
} from './hangman-logic';
import {
  getRandomWord,
  getRandomWordInRange,
  getWordsByDifficulty,
  getAllWords,
  getAllCategories,
  getWordsByCategory,
  getWordsByCategoryAndDifficulty,
  getRandomWordByCategory,
} from './words';
import type { Round, WordResponse } from './types';

describe('Core Single-Player Game Logic', () => {
  let round: Round;

  describe('Word Selection', () => {
    it('should return a word entry with word, category, and difficulty', () => {
      const wordEntry = getRandomWord(1);
      
      expect(wordEntry).toBeDefined();
      expect(wordEntry.word).toBeDefined();
      expect(wordEntry.category).toBeDefined();
      expect(wordEntry.difficulty).toBeGreaterThanOrEqual(1);
      expect(wordEntry.difficulty).toBeLessThanOrEqual(5);
    });

    it('should return words filtered by difficulty', () => {
      const difficulty1Words = getWordsByDifficulty(1);
      
      expect(difficulty1Words.length).toBeGreaterThan(0);
      difficulty1Words.forEach(entry => {
        expect(entry.difficulty).toBe(1);
      });
    });

    it('should return words within difficulty range', () => {
      const words = getRandomWordInRange(1, 3);
      
      expect(words).toBeDefined();
      expect(words.difficulty).toBeGreaterThanOrEqual(1);
      expect(words.difficulty).toBeLessThanOrEqual(3);
    });

    it('should return all words from database', () => {
      const allWords = getAllWords();
      
      expect(allWords.length).toBeGreaterThan(0);
      allWords.forEach(entry => {
        expect(entry.word).toBeDefined();
        expect(entry.category).toBeDefined();
        expect(entry.difficulty).toBeDefined();
      });
    });

    it('should return all available categories', () => {
      const categories = getAllCategories();
      
      expect(categories.length).toBeGreaterThan(0);
      expect(categories.includes('Animals')).toBe(true);
    });

    it('should filter words by category', () => {
      const animalWords = getWordsByCategory('Animals');
      
      expect(animalWords.length).toBeGreaterThan(0);
      animalWords.forEach(entry => {
        expect(entry.category).toBe('Animals');
      });
    });

    it('should filter words by category and difficulty range', () => {
      const words = getWordsByCategoryAndDifficulty('Animals', 1, 2);
      
      words.forEach(entry => {
        expect(entry.category).toBe('Animals');
        expect(entry.difficulty).toBeGreaterThanOrEqual(1);
        expect(entry.difficulty).toBeLessThanOrEqual(2);
      });
    });

    it('should return word by category or fallback to random', () => {
      const wordWithCategory = getRandomWordByCategory(1, 'Animals');
      expect(wordWithCategory).toBeDefined();
      
      const wordWithNullCategory = getRandomWordByCategory(1, null);
      expect(wordWithNullCategory).toBeDefined();
      
      const wordWithRandomCategory = getRandomWordByCategory(1, 'Random');
      expect(wordWithRandomCategory).toBeDefined();
    });

    it('should create round with selected word', () => {
      const wordEntry = getRandomWord(2);
      round = createRound(wordEntry.word, wordEntry.category, wordEntry.difficulty);
      
      expect(round.word).toBe(wordEntry.word.toUpperCase());
      expect(round.category).toBe(wordEntry.category);
      expect(round.difficulty).toBe(wordEntry.difficulty);
    });
  });

  describe('Letter Guessing - Correct', () => {
    beforeEach(() => {
      round = createRound('APPLE');
    });

    it('should reveal letter on correct guess', () => {
      const result = guessLetter(round, 'A');
      
      expect(result.isCorrect).toBe(true);
      expect(result.wasSkipped).toBe(false);
      expect(result.round.revealedLetters.has('A')).toBe(true);
    });

    it('should not decrement remaining guesses on correct guess', () => {
      const result = guessLetter(round, 'P');
      
      expect(result.isCorrect).toBe(true);
      expect(result.round.wrongGuesses).toBe(0);
      expect(getRemainingGuesses(result.round)).toBe(MAX_WRONG_GUESSES);
    });

    it('should reveal all occurrences of a letter', () => {
      const result = guessLetter(round, 'P');
      
      expect(getWordMask(result.round)).toBe('_ P P _ _');
      expect(result.round.revealedLetters.has('P')).toBe(true);
    });

    it('should add letter to guessedLetters set', () => {
      const result = guessLetter(round, 'L');
      
      expect(result.round.guessedLetters.has('L')).toBe(true);
    });

    it('should accept lowercase letters and normalize to uppercase', () => {
      const result = guessLetter(round, 'a');
      
      expect(result.isCorrect).toBe(true);
      expect(result.round.revealedLetters.has('A')).toBe(true);
    });
  });

  describe('Letter Guessing - Incorrect', () => {
    beforeEach(() => {
      round = createRound('CAT');
    });

    it('should increment wrong guesses on incorrect letter', () => {
      const result = guessLetter(round, 'Z');
      
      expect(result.isCorrect).toBe(false);
      expect(result.wasSkipped).toBe(false);
      expect(result.round.wrongGuesses).toBe(1);
    });

    it('should decrement remaining guesses', () => {
      const result = guessLetter(round, 'X');
      
      expect(getRemainingGuesses(result.round)).toBe(MAX_WRONG_GUESSES - 1);
    });

    it('should not reveal letter on wrong guess', () => {
      const result = guessLetter(round, 'B');
      
      expect(result.round.revealedLetters.has('B')).toBe(false);
    });

    it('should add wrong letter to guessedLetters set', () => {
      const result = guessLetter(round, 'Q');
      
      expect(result.round.guessedLetters.has('Q')).toBe(true);
    });

    it('should track multiple wrong guesses', () => {
      let result = guessLetter(round, 'Z');
      result = guessLetter(result.round, 'Q');
      result = guessLetter(result.round, 'X');
      
      const wrongGuesses = getWrongGuesses(result.round);
      expect(wrongGuesses).toContain('Z');
      expect(wrongGuesses).toContain('Q');
      expect(wrongGuesses).toContain('X');
      expect(wrongGuesses.length).toBe(3);
    });
  });

  describe('Win Detection', () => {
    it('should detect win when all letters are guessed', () => {
      round = createRound('DOG');
      let result = guessLetter(round, 'D');
      result = guessLetter(result.round, 'O');
      result = guessLetter(result.round, 'G');
      
      expect(result.round.isComplete).toBe(true);
      expect(result.round.isWon).toBe(true);
      expect(isWinningState(result.round)).toBe(true);
    });

    it('should not win if some letters remain unguessed', () => {
      round = createRound('BIRD');
      const result = guessLetter(round, 'B');
      
      expect(result.round.isComplete).toBe(false);
      expect(result.round.isWon).toBe(false);
      expect(isWinningState(result.round)).toBe(false);
    });

    it('should win with repeated letters guessed only once', () => {
      round = createRound('BANANA');
      let result = guessLetter(round, 'B');
      result = guessLetter(result.round, 'A');
      result = guessLetter(result.round, 'N');
      
      expect(result.round.isComplete).toBe(true);
      expect(result.round.isWon).toBe(true);
      expect(result.round.revealedLetters.size).toBe(3);
    });

    it('should correctly display fully revealed word', () => {
      round = createRound('HI');
      let result = guessLetter(round, 'H');
      result = guessLetter(result.round, 'I');
      
      expect(getWordMask(result.round)).toBe('H I');
    });

    it('should detect win on single-letter word', () => {
      round = createRound('A');
      const result = guessLetter(round, 'A');
      
      expect(result.round.isComplete).toBe(true);
      expect(result.round.isWon).toBe(true);
    });
  });

  describe('Loss Detection', () => {
    it('should detect loss when wrong guesses reach maximum', () => {
      round = createRound('CAT');
      const wrongLetters = ['Z', 'Q', 'X', 'W', 'V', 'B'];
      
      let result: GuessResult;
      for (const letter of wrongLetters) {
        result = guessLetter(round, letter);
        round = result!.round;
      }
      
      expect(round.wrongGuesses).toBe(MAX_WRONG_GUESSES);
      expect(round.isComplete).toBe(true);
      expect(round.isWon).toBe(false);
      expect(isLosingState(round)).toBe(true);
    });

    it('should not end game before max wrong guesses', () => {
      round = createRound('TEST');
      const result = guessLetter(round, 'Z');
      
      expect(result.round.isComplete).toBe(false);
      expect(result.round.isWon).toBe(false);
      expect(isLosingState(result.round)).toBe(false);
    });

    it('should track remaining guesses correctly throughout game', () => {
      round = createRound('GAME');
      
      expect(getRemainingGuesses(round)).toBe(MAX_WRONG_GUESSES);
      
      let result = guessLetter(round, 'Z');
      expect(getRemainingGuesses(result.round)).toBe(MAX_WRONG_GUESSES - 1);
      
      result = guessLetter(result.round, 'Q');
      expect(getRemainingGuesses(result.round)).toBe(MAX_WRONG_GUESSES - 2);
      
      result = guessLetter(result.round, 'X');
      expect(getRemainingGuesses(result.round)).toBe(MAX_WRONG_GUESSES - 3);
    });
  });

  describe('Remaining Attempts Tracking', () => {
    beforeEach(() => {
      round = createRound('WORD');
    });

    it('should start with maximum remaining guesses', () => {
      expect(getRemainingGuesses(round)).toBe(MAX_WRONG_GUESSES);
    });

    it('should decrease by one for each wrong guess', () => {
      let result = guessLetter(round, 'Z');
      expect(getRemainingGuesses(result.round)).toBe(5);
      
      result = guessLetter(result.round, 'Q');
      expect(getRemainingGuesses(result.round)).toBe(4);
      
      result = guessLetter(result.round, 'X');
      expect(getRemainingGuesses(result.round)).toBe(3);
    });

    it('should not change on correct guess', () => {
      let result = guessLetter(round, 'W');
      expect(getRemainingGuesses(result.round)).toBe(MAX_WRONG_GUESSES);
      
      result = guessLetter(result.round, 'O');
      expect(getRemainingGuesses(result.round)).toBe(MAX_WRONG_GUESSES);
    });

    it('should not change when guessing duplicate letter', () => {
      let result = guessLetter(round, 'Z');
      result = guessLetter(result.round, 'Z');
      
      expect(result.wasSkipped).toBe(true);
      expect(getRemainingGuesses(result.round)).toBe(5);
    });

    it('should return zero when game is lost', () => {
      const wrongLetters = ['Z', 'Q', 'X', 'B', 'C', 'F'];
      let result: GuessResult;
      
      for (const letter of wrongLetters) {
        result = guessLetter(round, letter);
        round = result.round;
      }
      
      expect(getRemainingGuesses(round)).toBe(0);
    });
  });

  describe('Game State Reset', () => {
    it('should create fresh round with createRound', () => {
      round = createRound('TEST');
      let result = guessLetter(round, 'T');
      result = guessLetter(result.round, 'E');
      result = guessLetter(result.round, 'S');
      
      // Round is complete
      expect(result.round.isComplete).toBe(true);
      
      // Create new round - should be fresh
      const newRound = createRound('NEW');
      expect(newRound.isComplete).toBe(false);
      expect(newRound.isWon).toBe(false);
      expect(newRound.wrongGuesses).toBe(0);
      expect(newRound.guessedLetters.size).toBe(0);
      expect(newRound.revealedLetters.size).toBe(0);
    });

    it('should reset all state properties on new round', () => {
      // Play a game to completion
      round = createRound('CAT');
      let result = guessLetter(round, 'Z');
      result = guessLetter(result.round, 'Q');
      result = guessLetter(result.round, 'C');
      result = guessLetter(result.round, 'A');
      result = guessLetter(result.round, 'T');
      
      // Create new round
      const newRound = createRound('DOG', 'Animals', 2);
      
      expect(newRound.word).toBe('DOG');
      expect(newRound.category).toBe('Animals');
      expect(newRound.difficulty).toBe(2);
      expect(newRound.revealedLetters).toEqual(new Set());
      expect(newRound.wrongGuesses).toBe(0);
      expect(newRound.guessedLetters).toEqual(new Set());
      expect(newRound.isComplete).toBe(false);
      expect(newRound.isWon).toBe(false);
    });

    it('should allow independent game sessions', () => {
      const round1 = createRound('CAT');
      const round2 = createRound('DOG');
      
      const result1 = guessLetter(round1, 'C');
      const result2 = guessLetter(round2, 'Z');
      
      // round1 should have correct guess
      expect(result1.isCorrect).toBe(true);
      expect(result1.round.wrongGuesses).toBe(0);
      
      // round2 should have wrong guess
      expect(result2.isCorrect).toBe(false);
      expect(result2.round.wrongGuesses).toBe(1);
      
      // Original rounds unchanged (immutability)
      expect(round1.guessedLetters.size).toBe(0);
      expect(round2.guessedLetters.size).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    describe('Guessing the same letter twice', () => {
      beforeEach(() => {
        round = createRound('APPLE');
      });

      it('should skip duplicate correct guess and mark wasSkipped', () => {
        const result1 = guessLetter(round, 'A');
        const result2 = guessLetter(result1.round, 'A');
        
        expect(result2.wasSkipped).toBe(true);
        expect(result2.round.revealedLetters.size).toBe(1);
        expect(result2.round.wrongGuesses).toBe(0);
      });

      it('should skip duplicate wrong guess and mark wasSkipped', () => {
        const result1 = guessLetter(round, 'Z');
        const result2 = guessLetter(result1.round, 'Z');
        
        expect(result2.wasSkipped).toBe(true);
        expect(result2.round.wrongGuesses).toBe(1);
      });

      it('should return correct isCorrect when skipping', () => {
        const result1 = guessLetter(round, 'P');
        const result2 = guessLetter(result1.round, 'P');
        
        expect(result2.isCorrect).toBe(true);
        expect(result2.wasSkipped).toBe(true);
      });

      it('should handle case-insensitive duplicate guess', () => {
        const result1 = guessLetter(round, 'a');
        const result2 = guessLetter(result1.round, 'A');
        
        expect(result1.isCorrect).toBe(true);
        expect(result2.wasSkipped).toBe(true);
      });

      it('should not change game state on duplicate guess', () => {
        let result = guessLetter(round, 'A');
        result = guessLetter(result.round, 'P');
        
        const stateBefore = {
          revealed: new Set(result.round.revealedLetters),
          wrong: result.round.wrongGuesses,
          complete: result.round.isComplete,
          won: result.round.isWon,
        };
        
        const afterDuplicate = guessLetter(result.round, 'A');
        
        expect(afterDuplicate.round.revealedLetters.size).toBe(stateBefore.revealed.size);
        expect(afterDuplicate.round.wrongGuesses).toBe(stateBefore.wrong);
        expect(afterDuplicate.round.isComplete).toBe(stateBefore.complete);
        expect(afterDuplicate.round.isWon).toBe(stateBefore.won);
      });
    });

    describe('Guessing non-alphabetic characters', () => {
      beforeEach(() => {
        round = createRound('CAT');
      });

      it('should handle number input (treated as wrong guess)', () => {
        const result = guessLetter(round, '1');
        
        expect(result.isCorrect).toBe(false);
        expect(result.round.wrongGuesses).toBe(1);
      });

      it('should handle special character input (treated as wrong guess)', () => {
        const result = guessLetter(round, '@');
        
        expect(result.isCorrect).toBe(false);
        expect(result.round.wrongGuesses).toBe(1);
      });

      it('should handle space character (treated as wrong guess)', () => {
        const result = guessLetter(round, ' ');
        
        expect(result.isCorrect).toBe(false);
        expect(result.round.wrongGuesses).toBe(1);
      });

      it('should handle empty string (treated as correct due to JS string behavior)', () => {
        // Note: In JavaScript, 'CAT'.includes('') returns true
        // Empty string is technically "in" every string
        const result = guessLetter(round, '');
        
        expect(result.isCorrect).toBe(true);
        expect(result.round.wrongGuesses).toBe(0);
        expect(result.wasSkipped).toBe(false);
      });

      it('should handle punctuation (treated as wrong guess)', () => {
        const result = guessLetter(round, '!');
        
        expect(result.isCorrect).toBe(false);
        expect(result.round.wrongGuesses).toBe(1);
      });

      it('should handle unicode characters (treated as wrong guess)', () => {
        const result = guessLetter(round, 'é');
        
        expect(result.isCorrect).toBe(false);
        expect(result.round.wrongGuesses).toBe(1);
      });
    });

    describe('Completing word on final attempt', () => {
      it('should win when completing word with 5 wrong guesses already made', () => {
        round = createRound('AB');
        
        // Make 5 wrong guesses (1 remaining)
        const wrongLetters = ['Z', 'Q', 'X', 'W', 'V'];
        let result: GuessResult;
        for (const letter of wrongLetters) {
          result = guessLetter(round, letter);
          round = result.round;
        }
        
        expect(round.wrongGuesses).toBe(5);
        expect(getRemainingGuesses(round)).toBe(1);
        expect(round.isComplete).toBe(false);
        
        // Guess 'A' - still alive
        result = guessLetter(round, 'A');
        round = result.round;
        expect(round.isComplete).toBe(false);
        expect(round.wrongGuesses).toBe(5);
        
        // Final correct guess wins
        result = guessLetter(round, 'B');
        expect(result.round.isComplete).toBe(true);
        expect(result.round.isWon).toBe(true);
        expect(result.round.wrongGuesses).toBe(5);
      });

      it('should win on the very last allowed wrong guess count', () => {
        round = createRound('HI');
        
        // Make 5 wrong guesses
        let result: GuessResult;
        const wrongLetters = ['A', 'B', 'C', 'D', 'E'];
        for (const letter of wrongLetters) {
          result = guessLetter(round, letter);
          round = result.round;
        }
        
        expect(getRemainingGuesses(round)).toBe(1);
        
        // Guess H correctly
        result = guessLetter(round, 'H');
        round = result.round;
        expect(round.isComplete).toBe(false);
        
        // Guess I correctly - wins on final attempt
        result = guessLetter(round, 'I');
        expect(result.round.isComplete).toBe(true);
        expect(result.round.isWon).toBe(true);
        expect(result.round.wrongGuesses).toBe(5);
      });

      it('should lose if wrong guess on final attempt', () => {
        round = createRound('CAT');
        
        // Make 5 wrong guesses
        let result: GuessResult;
        const wrongLetters = ['Z', 'Q', 'X', 'W', 'V'];
        for (const letter of wrongLetters) {
          result = guessLetter(round, letter);
          round = result.round;
        }
        
        expect(getRemainingGuesses(round)).toBe(1);
        expect(round.isComplete).toBe(false);
        
        // Wrong guess on final attempt loses
        result = guessLetter(round, 'B');
        expect(result.round.isComplete).toBe(true);
        expect(result.round.isWon).toBe(false);
        expect(result.round.wrongGuesses).toBe(MAX_WRONG_GUESSES);
      });

      it('should allow correct guess after 5 wrong guesses', () => {
        round = createRound('DOG');
        
        // Make 5 wrong guesses
        let result: GuessResult;
        const wrongLetters = ['A', 'B', 'C', 'E', 'F'];
        for (const letter of wrongLetters) {
          result = guessLetter(round, letter);
          round = result.round;
        }
        
        // Correct guess should still work
        result = guessLetter(round, 'D');
        expect(result.isCorrect).toBe(true);
        expect(result.round.wrongGuesses).toBe(5);
        expect(result.round.isComplete).toBe(false);
      });
    });

    describe('Single-letter words', () => {
      it('should win immediately on correct guess', () => {
        round = createRound('A');
        const result = guessLetter(round, 'A');
        
        expect(result.round.isComplete).toBe(true);
        expect(result.round.isWon).toBe(true);
      });

      it('should lose after 6 wrong guesses', () => {
        round = createRound('A');
        
        let result: GuessResult;
        const wrongLetters = ['Z', 'Q', 'X', 'W', 'V', 'B'];
        for (const letter of wrongLetters) {
          result = guessLetter(round, letter);
          round = result.round;
        }
        
        expect(round.isComplete).toBe(true);
        expect(round.isWon).toBe(false);
      });
    });

    describe('Words with all same letters', () => {
      it('should win with single correct guess', () => {
        round = createRound('AAA');
        const result = guessLetter(round, 'A');
        
        expect(result.round.isComplete).toBe(true);
        expect(result.round.isWon).toBe(true);
        expect(result.round.revealedLetters.size).toBe(1);
        expect(getWordMask(result.round)).toBe('A A A');
      });
    });

    describe('Case handling', () => {
      it('should convert lowercase word to uppercase', () => {
        round = createRound('hello');
        expect(round.word).toBe('HELLO');
      });

      it('should accept lowercase guesses', () => {
        round = createRound('CAT');
        const result = guessLetter(round, 'c');
        
        expect(result.isCorrect).toBe(true);
        expect(result.round.revealedLetters.has('C')).toBe(true);
      });

      it('should handle mixed case input', () => {
        round = createRound('Test');
        expect(round.word).toBe('TEST');
        
        let result = guessLetter(round, 't');
        expect(result.isCorrect).toBe(true);
        
        result = guessLetter(result.round, 'E');
        expect(result.isCorrect).toBe(true);
      });
    });

    describe('Metadata preservation', () => {
      it('should preserve category through guesses', () => {
        round = createRound('PYTHON', 'Programming', 3);
        
        const result = guessLetter(round, 'P');
        expect(result.round.category).toBe('Programming');
        expect(result.round.difficulty).toBe(3);
      });

      it('should use default values when not specified', () => {
        round = createRound('TEST');
        
        expect(round.category).toBe('general');
        expect(round.difficulty).toBe(1);
      });
    });
  });
});
