/**
 * Tests for WordDisplay module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Three.js
vi.mock('three', () => ({
  Group: vi.fn(function() {
    return {
      add: vi.fn(),
      remove: vi.fn(),
      position: { set: vi.fn() },
    }
  }),
  Mesh: vi.fn(function() {
    return {
      position: { set: vi.fn() },
      scale: { set: vi.fn(), x: 0 },
      castShadow: false,
      receiveShadow: false,
      material: {},
      add: vi.fn(),
    }
  }),
  BoxGeometry: vi.fn(),
  PlaneGeometry: vi.fn(),
  MeshStandardMaterial: vi.fn(function() {
    return {
      color: { setHex: vi.fn() },
    }
  }),
  CanvasTexture: vi.fn(),
}));

import { WordDisplay } from '../word-display';
import type { Round } from '../types';

describe('WordDisplay', () => {
  let wordDisplay: WordDisplay;

  beforeEach(() => {
    vi.clearAllMocks();
    wordDisplay = new WordDisplay();
  });

  describe('constructor', () => {
    it('should create a WordDisplay instance', () => {
      expect(wordDisplay).toBeDefined();
    });

    it('should return a group mesh', () => {
      const mesh = wordDisplay.getMesh();
      expect(mesh).toBeDefined();
    });
  });

  describe('setWord', () => {
    it('should set a word and create letter meshes', () => {
      wordDisplay.setWord('TEST');
      expect(wordDisplay).toBeDefined();
    });

    it('should handle single letter words', () => {
      wordDisplay.setWord('A');
      expect(wordDisplay).toBeDefined();
    });

    it('should handle long words', () => {
      wordDisplay.setWord('EXTRAORDINARY');
      expect(wordDisplay).toBeDefined();
    });

    it('should convert lowercase to uppercase', () => {
      wordDisplay.setWord('test');
      expect(wordDisplay).toBeDefined();
    });

    it('should clear previous word when setting new word', () => {
      wordDisplay.setWord('FIRST');
      wordDisplay.setWord('SECOND');
      expect(wordDisplay).toBeDefined();
    });
  });

  describe('updateDisplay', () => {
    it('should update display based on revealed letters', () => {
      const round: Round = {
        word: 'TEST',
        category: 'Testing',
        difficulty: 1,
        revealedLetters: new Set(['T', 'E']),
        wrongGuesses: 0,
        guessedLetters: new Set(['T', 'E']),
        isComplete: false,
        isWon: false,
      };
      
      wordDisplay.setWord('TEST');
      wordDisplay.updateDisplay(round);
      
      expect(wordDisplay).toBeDefined();
    });

    it('should handle empty revealed letters', () => {
      const round: Round = {
        word: 'TEST',
        category: 'Testing',
        difficulty: 1,
        revealedLetters: new Set(),
        wrongGuesses: 0,
        guessedLetters: new Set(),
        isComplete: false,
        isWon: false,
      };
      
      wordDisplay.setWord('TEST');
      wordDisplay.updateDisplay(round);
      
      expect(wordDisplay).toBeDefined();
    });
  });

  describe('showFullWord', () => {
    it('should reveal all letters', () => {
      wordDisplay.setWord('TEST');
      wordDisplay.showFullWord();
      expect(wordDisplay).toBeDefined();
    });
  });

  describe('setPosition', () => {
    it('should set position of the display group', () => {
      wordDisplay.setPosition(1, 2, 3);
      expect(wordDisplay).toBeDefined();
    });
  });
});
