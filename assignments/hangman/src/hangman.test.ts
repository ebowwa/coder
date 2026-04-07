/**
 * Unit tests for core hangman game logic
 * Tests: correct guess tracking, wrong guess tracking, win detection, loss detection, idempotency
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
} from './hangman-logic';
import type { Round } from './types';

describe('Core Hangman Game Logic', () => {
  let round: Round;

  describe('Correct guess tracking', () => {
    it('should reveal letter in word on correct guess', () => {
      round = createRound('APPLE');
      const result = guessLetter(round, 'A');
      
      expect(result.isCorrect).toBe(true);
      expect(result.wasSkipped).toBe(false);
      expect(result.round.revealedLetters.has('A')).toBe(true);
    });

    it('should not decrement remaining guesses on correct guess', () => {
      round = createRound('BANANA');
      const result = guessLetter(round, 'B');
      
      expect(result.isCorrect).toBe(true);
      expect(result.round.wrongGuesses).toBe(0);
      expect(getRemainingGuesses(result.round)).toBe(MAX_WRONG_GUESSES);
    });

    it('should reveal all occurrences of a letter', () => {
      round = createRound('BANANA');
      const result = guessLetter(round, 'A');
      
      expect(result.isCorrect).toBe(true);
      expect(result.round.revealedLetters.has('A')).toBe(true);
      // Word has 3 A's, all should be revealed
      expect(getWordMask(result.round)).toBe('_ A _ A _ A');
    });

    it('should add letter to guessedLetters set on correct guess', () => {
      round = createRound('DOG');
      const result = guessLetter(round, 'D');
      
      expect(result.round.guessedLetters.has('D')).toBe(true);
    });
  });

  describe('Wrong guess tracking', () => {
    it('should increment wrong guesses on incorrect letter', () => {
      round = createRound('CAT');
      const result = guessLetter(round, 'Z');
      
      expect(result.isCorrect).toBe(false);
      expect(result.wasSkipped).toBe(false);
      expect(result.round.wrongGuesses).toBe(1);
    });

    it('should decrement remaining guesses', () => {
      round = createRound('DOG');
      const result = guessLetter(round, 'X');
      
      expect(getRemainingGuesses(result.round)).toBe(MAX_WRONG_GUESSES - 1);
    });

    it('should track wrong guessed letters', () => {
      round = createRound('HELLO');
      let result = guessLetter(round, 'Z');
      result = guessLetter(result.round, 'Q');
      
      const wrongGuesses = getWrongGuesses(result.round);
      expect(wrongGuesses).toContain('Z');
      expect(wrongGuesses).toContain('Q');
    });

    it('should not reveal letter on wrong guess', () => {
      round = createRound('MOUSE');
      const result = guessLetter(round, 'X');
      
      expect(result.round.revealedLetters.has('X')).toBe(false);
    });

    it('should add wrong letter to guessedLetters set', () => {
      round = createRound('FISH');
      const result = guessLetter(round, 'Z');
      
      expect(result.round.guessedLetters.has('Z')).toBe(true);
    });
  });

  describe('Win detection', () => {
    it('should detect win when all letters are guessed', () => {
      round = createRound('CAT');
      let result = guessLetter(round, 'C');
      result = guessLetter(result.round, 'A');
      result = guessLetter(result.round, 'T');
      
      expect(result.round.isComplete).toBe(true);
      expect(result.round.isWon).toBe(true);
      expect(isWinningState(result.round)).toBe(true);
    });

    it('should not win if some letters remain unguessed', () => {
      round = createRound('APPLE');
      const result = guessLetter(round, 'A');
      
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
    });

    it('should correctly display fully revealed word', () => {
      round = createRound('HI');
      let result = guessLetter(round, 'H');
      result = guessLetter(result.round, 'I');
      
      expect(getWordMask(result.round)).toBe('H I');
    });
  });

  describe('Loss detection', () => {
    it('should detect loss when wrong guesses reach maximum', () => {
      round = createRound('WORD');
      // Letters not in 'WORD': A, B, C, E, F, G
      const wrongLetters = ['A', 'B', 'C', 'E', 'F', 'G'];
      
      let result = guessLetter(round, wrongLetters[0]);
      expect(result.round.isComplete).toBe(false);
      
      for (let i = 1; i < wrongLetters.length; i++) {
        result = guessLetter(result.round, wrongLetters[i]);
      }
      
      expect(result.round.wrongGuesses).toBe(MAX_WRONG_GUESSES);
      expect(result.round.isComplete).toBe(true);
      expect(result.round.isWon).toBe(false);
      expect(isLosingState(result.round)).toBe(true);
    });

    it('should not end game before max wrong guesses', () => {
      round = createRound('TEST');
      const result = guessLetter(round, 'Z');
      
      expect(result.round.isComplete).toBe(false);
      expect(result.round.isWon).toBe(false);
      expect(isLosingState(result.round)).toBe(false);
    });

    it('should track remaining guesses correctly', () => {
      round = createRound('GAME');
      
      expect(getRemainingGuesses(round)).toBe(MAX_WRONG_GUESSES);
      
      let result = guessLetter(round, 'Z');
      expect(getRemainingGuesses(result.round)).toBe(MAX_WRONG_GUESSES - 1);
      
      result = guessLetter(result.round, 'Q');
      expect(getRemainingGuesses(result.round)).toBe(MAX_WRONG_GUESSES - 2);
    });

    it('should not go below zero remaining guesses', () => {
      round = createRound('END');
      const wrongLetters = ['A', 'B', 'C', 'D', 'F', 'G', 'H', 'I'];
      
      let result = guessLetter(round, 'E'); // Correct
      result = guessLetter(result.round, 'N'); // Correct
      result = guessLetter(result.round, 'D'); // Correct - wins
      
      // Game already won, more wrong guesses shouldn't matter
      expect(result.round.isWon).toBe(true);
    });
  });

  describe('Idempotency', () => {
    it('should skip already guessed correct letter', () => {
      round = createRound('CAT');
      const result1 = guessLetter(round, 'C');
      const result2 = guessLetter(result1.round, 'C');
      
      expect(result2.wasSkipped).toBe(true);
      expect(result2.round.revealedLetters.size).toBe(1);
      expect(result2.round.wrongGuesses).toBe(0);
    });

    it('should skip already guessed wrong letter', () => {
      round = createRound('CAT');
      const result1 = guessLetter(round, 'Z');
      const result2 = guessLetter(result1.round, 'Z');
      
      expect(result2.wasSkipped).toBe(true);
      expect(result2.round.wrongGuesses).toBe(1); // Not incremented again
    });

    it('should return same isCorrect status when skipping', () => {
      round = createRound('DOG');
      const result1 = guessLetter(round, 'D');
      const result2 = guessLetter(result1.round, 'D');
      
      expect(result2.isCorrect).toBe(true);
      expect(result2.wasSkipped).toBe(true);
    });

    it('should not change game state on duplicate guess', () => {
      round = createRound('TEST');
      let result = guessLetter(round, 'T');
      result = guessLetter(result.round, 'E');
      result = guessLetter(result.round, 'S');
      
      const stateBefore = {
        revealed: new Set(result.round.revealedLetters),
        wrong: result.round.wrongGuesses,
        complete: result.round.isComplete,
        won: result.round.isWon,
      };
      
      // Try to guess 'T' again
      const result2 = guessLetter(result.round, 'T');
      
      expect(result2.round.revealedLetters.size).toBe(stateBefore.revealed.size);
      expect(result2.round.wrongGuesses).toBe(stateBefore.wrong);
      expect(result2.round.isComplete).toBe(stateBefore.complete);
      expect(result2.round.isWon).toBe(stateBefore.won);
    });

    it('should be case-insensitive', () => {
      round = createRound('CAT');
      const result1 = guessLetter(round, 'c');
      const result2 = guessLetter(result1.round, 'C');
      
      expect(result1.isCorrect).toBe(true);
      expect(result2.wasSkipped).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle single-letter word', () => {
      round = createRound('A');
      const result = guessLetter(round, 'A');
      
      expect(result.round.isComplete).toBe(true);
      expect(result.round.isWon).toBe(true);
    });

    it('should handle word with all same letters', () => {
      round = createRound('AAA');
      const result = guessLetter(round, 'A');
      
      expect(result.round.isComplete).toBe(true);
      expect(result.round.isWon).toBe(true);
      expect(result.round.revealedLetters.size).toBe(1);
    });

    it('should handle lowercase word input', () => {
      round = createRound('hello');
      
      expect(round.word).toBe('HELLO');
      
      const result = guessLetter(round, 'h');
      expect(result.isCorrect).toBe(true);
    });

    it('should correctly mask unrevealed letters', () => {
      round = createRound('HELLO');
      let result = guessLetter(round, 'L');
      
      expect(getWordMask(result.round)).toBe('_ _ L L _');
      
      result = guessLetter(result.round, 'H');
      expect(getWordMask(result.round)).toBe('H _ L L _');
    });

    it('should preserve category and difficulty', () => {
      round = createRound('PYTHON', 'Programming', 3);
      
      expect(round.category).toBe('Programming');
      expect(round.difficulty).toBe(3);
      
      const result = guessLetter(round, 'P');
      
      expect(result.round.category).toBe('Programming');
      expect(result.round.difficulty).toBe(3);
    });
  });
});
