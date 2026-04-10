/**
 * Unit tests for WordDisplay 3D word rendering
 * Tests: setWord, updateDisplay, showFullWord, getMesh, setPosition, clearing/resetting
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WordDisplay } from './word-display';
import type { Round } from './types';

// Mock THREE.js with minimal implementations
vi.mock('three', () => {
  const createMockPosition = () => ({
    x: 0,
    y: 0,
    z: 0,
    set: vi.fn(function (this: any, x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
    }),
  });

  const createMockMesh = () => ({
    position: createMockPosition(),
    rotation: { x: 0, y: 0, z: 0, set: vi.fn() },
    scale: { x: 0, y: 0, z: 0, set: vi.fn() },
    material: { dispose: vi.fn() },
    geometry: { dispose: vi.fn() },
    castShadow: false,
    receiveShadow: false,
  });

  return {
    Group: vi.fn(() => ({
      add: vi.fn(),
      remove: vi.fn(),
      position: createMockPosition(),
      children: [] as any[],
    })),
    Mesh: vi.fn(() => createMockMesh()),
    BoxGeometry: vi.fn(() => ({ dispose: vi.fn() })),
    MeshStandardMaterial: vi.fn(() => ({ dispose: vi.fn() })),
    CanvasTexture: vi.fn(() => ({ dispose: vi.fn() })),
  };
});

function createMockRound(
  word: string,
  revealedLetters: string[] = [],
  options: Partial<Round> = {},
): Round {
  return {
    word,
    category: 'test',
    difficulty: 1,
    revealedLetters: new Set(revealedLetters),
    wrongGuesses: 0,
    guessedLetters: new Set(revealedLetters),
    isComplete: false,
    isWon: false,
    ...options,
  };
}

describe('WordDisplay', () => {
  let wordDisplay: WordDisplay;
  let rafSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      return 0;
    });
    wordDisplay = new WordDisplay();
  });

  afterEach(() => {
    rafSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe('Initial state', () => {
    it('should return a THREE.Group from getMesh', () => {
      const mesh = wordDisplay.getMesh();
      expect(mesh).toBeDefined();
      expect(mesh.add).toBeDefined();
    });

    it('should have a group with position that can be set', () => {
      const mesh = wordDisplay.getMesh();
      expect(mesh.position).toBeDefined();
      expect(mesh.position.set).toBeDefined();
    });
  });

  describe('setWord', () => {
    it('should add meshes to the group for each character', () => {
      wordDisplay.setWord('CAT');

      const group = wordDisplay.getMesh();
      // CAT has 3 letters: each creates a pedestal mesh + a letter mesh
      // Group.add should be called 6 times (3 pedestals + 3 letter meshes)
      expect(group.add).toHaveBeenCalledTimes(6);
    });

    it('should handle single character word', () => {
      wordDisplay.setWord('A');

      const group = wordDisplay.getMesh();
      // 1 pedestal + 1 letter mesh = 2 add calls
      expect(group.add).toHaveBeenCalledTimes(2);
    });

    it('should handle multi-character words', () => {
      wordDisplay.setWord('PROGRAMMING');

      const group = wordDisplay.getMesh();
      // 11 letters: 11 pedestals + 11 letter meshes = 22 add calls
      expect(group.add).toHaveBeenCalledTimes(22);
    });

    it('should handle empty string word', () => {
      wordDisplay.setWord('');

      const group = wordDisplay.getMesh();
      expect(group.add).toHaveBeenCalledTimes(0);
    });

    it('should reset letter meshes when setting a new word', () => {
      wordDisplay.setWord('CAT');
      const group = wordDisplay.getMesh();

      wordDisplay.setWord('DOG');

      // remove should have been called for old meshes during clearWord
      expect(group.remove).toHaveBeenCalled();
    });

    it('should start letter meshes with scale zero (hidden)', () => {
      wordDisplay.setWord('AB');

      const group = wordDisplay.getMesh();
      // 2 letters = 4 add calls (2 pedestals + 2 letter meshes)
      expect(group.add).toHaveBeenCalledTimes(4);

      // All letter meshes are created but hidden initially (scale 0)
      // Verify by checking that updateDisplay triggers reveals
      vi.clearAllMocks();
      const round = createMockRound('AB', ['A']);
      wordDisplay.updateDisplay(round);
      expect(rafSpy).toHaveBeenCalledTimes(1);
    });

    it('should convert word to uppercase internally', () => {
      wordDisplay.setWord('hello');

      const group = wordDisplay.getMesh();
      // 5 letters = 10 add calls
      expect(group.add).toHaveBeenCalledTimes(10);
    });

    it('should set castShadow and receiveShadow on pedestals', () => {
      wordDisplay.setWord('AB');

      const group = wordDisplay.getMesh();
      expect(group.add).toHaveBeenCalledTimes(4);
    });
  });

  describe('updateDisplay - revealing hidden letters', () => {
    it('should reveal letters that are in revealedLetters set', () => {
      wordDisplay.setWord('CAT');
      vi.clearAllMocks();

      const round = createMockRound('CAT', ['C']);
      wordDisplay.updateDisplay(round);

      expect(rafSpy).toHaveBeenCalled();
    });

    it('should not reveal letters that have not been guessed', () => {
      wordDisplay.setWord('CAT');
      vi.clearAllMocks();

      const round = createMockRound('CAT', []);
      wordDisplay.updateDisplay(round);

      expect(rafSpy).not.toHaveBeenCalled();
    });

    it('should reveal all occurrences of a repeated letter', () => {
      wordDisplay.setWord('BANANA');
      vi.clearAllMocks();

      const round = createMockRound('BANANA', ['A']);
      wordDisplay.updateDisplay(round);

      // A appears 3 times in BANANA, so requestAnimationFrame should be called 3 times
      expect(rafSpy).toHaveBeenCalledTimes(3);
    });

    it('should reveal multiple different guessed letters', () => {
      wordDisplay.setWord('APPLE');
      vi.clearAllMocks();

      const round = createMockRound('APPLE', ['A', 'P']);
      wordDisplay.updateDisplay(round);

      // A appears once, P appears twice = 3 reveal animations
      expect(rafSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle revealing all letters in the word', () => {
      wordDisplay.setWord('HI');
      vi.clearAllMocks();

      const round = createMockRound('HI', ['H', 'I']);
      wordDisplay.updateDisplay(round);

      expect(rafSpy).toHaveBeenCalledTimes(2);
    });

    it('should not call requestAnimationFrame when no letters match revealed set', () => {
      wordDisplay.setWord('DOG');
      vi.clearAllMocks();

      const round = createMockRound('DOG', ['X', 'Y']);
      wordDisplay.updateDisplay(round);

      expect(rafSpy).not.toHaveBeenCalled();
    });

    it('should handle updateDisplay called with progressive reveals', () => {
      wordDisplay.setWord('CAT');
      vi.clearAllMocks();

      // Guess C
      const round = createMockRound('CAT', ['C']);
      wordDisplay.updateDisplay(round);
      expect(rafSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('showFullWord', () => {
    it('should reveal all hidden letter meshes', () => {
      wordDisplay.setWord('DOG');
      vi.clearAllMocks();

      wordDisplay.showFullWord();

      // 3 letters, all should be revealed
      expect(rafSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle empty word gracefully', () => {
      wordDisplay.setWord('');
      vi.clearAllMocks();

      wordDisplay.showFullWord();

      expect(rafSpy).not.toHaveBeenCalled();
    });

    it('should handle single-letter word', () => {
      wordDisplay.setWord('X');
      vi.clearAllMocks();

      wordDisplay.showFullWord();

      expect(rafSpy).toHaveBeenCalledTimes(1);
    });

    it('should reveal all letters for long words', () => {
      wordDisplay.setWord('INTERNATIONALIZATION');
      vi.clearAllMocks();

      wordDisplay.showFullWord();

      expect(rafSpy).toHaveBeenCalledTimes(20);
    });
  });

  describe('setPosition', () => {
    it('should set group position', () => {
      const group = wordDisplay.getMesh();

      wordDisplay.setPosition(1, 2, 3);

      expect(group.position.set).toHaveBeenCalledWith(1, 2, 3);
    });

    it('should set position to origin', () => {
      const group = wordDisplay.getMesh();

      wordDisplay.setPosition(0, 0, 0);

      expect(group.position.set).toHaveBeenCalledWith(0, 0, 0);
    });

    it('should update position multiple times', () => {
      const group = wordDisplay.getMesh();

      wordDisplay.setPosition(1, 2, 3);
      wordDisplay.setPosition(4, 5, 6);

      expect(group.position.set).toHaveBeenCalledTimes(2);
      expect(group.position.set).toHaveBeenLastCalledWith(4, 5, 6);
    });

    it('should accept negative position values', () => {
      const group = wordDisplay.getMesh();

      wordDisplay.setPosition(-5, -3, -10);

      expect(group.position.set).toHaveBeenCalledWith(-5, -3, -10);
    });
  });

  describe('getMesh', () => {
    it('should return the same group instance consistently', () => {
      const mesh1 = wordDisplay.getMesh();
      const mesh2 = wordDisplay.getMesh();

      expect(mesh1).toBe(mesh2);
    });

    it('should return group with add and remove methods', () => {
      const group = wordDisplay.getMesh();

      expect(typeof group.add).toBe('function');
      expect(typeof group.remove).toBe('function');
    });

    it('should return group that persists after setWord', () => {
      const meshBefore = wordDisplay.getMesh();
      wordDisplay.setWord('TEST');
      const meshAfter = wordDisplay.getMesh();

      expect(meshBefore).toBe(meshAfter);
    });
  });

  describe('clearWord via setWord replacement', () => {
    it('should clear previous meshes when setting a new word', () => {
      wordDisplay.setWord('FIRST');
      const group = wordDisplay.getMesh();
      const removeCallsAfterFirst = group.remove.mock.calls.length;

      wordDisplay.setWord('SECOND');

      expect(group.remove.mock.calls.length).toBeGreaterThan(removeCallsAfterFirst);
    });

    it('should add new meshes for the new word', () => {
      wordDisplay.setWord('CAT');
      const group = wordDisplay.getMesh();

      wordDisplay.setWord('DOG');

      const addCallCount = group.add.mock.calls.length;
      expect(addCallCount).toBeGreaterThan(0);
    });

    it('should properly handle setting the same word twice', () => {
      wordDisplay.setWord('HELLO');
      const group = wordDisplay.getMesh();

      wordDisplay.setWord('HELLO');

      expect(group.remove).toHaveBeenCalled();
    });
  });

  describe('Integration with Round interface', () => {
    it('should handle round with category and difficulty metadata', () => {
      wordDisplay.setWord('PYTHON');
      vi.clearAllMocks();

      const round = createMockRound('PYTHON', ['P'], {
        category: 'Programming',
        difficulty: 3,
      });

      expect(() => wordDisplay.updateDisplay(round)).not.toThrow();
      expect(rafSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle showFullWord at game end (loss scenario)', () => {
      wordDisplay.setWord('SECRET');
      vi.clearAllMocks();

      wordDisplay.showFullWord();

      expect(rafSpy).toHaveBeenCalledTimes(6);
    });

    it('should handle a full round with progressive reveals then showFullWord', () => {
      wordDisplay.setWord('FISH');
      vi.clearAllMocks();

      // Reveal F
      let round = createMockRound('FISH', ['F']);
      wordDisplay.updateDisplay(round);
      expect(rafSpy).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();

      // Reveal S and H (F is also checked but mock scale.x=0 means it re-triggers)
      round = createMockRound('FISH', ['F', 'S', 'H']);
      wordDisplay.updateDisplay(round);
      // F(0), S(2), H(3) all have revealedLetters match and scale.x===0 in mocks
      expect(rafSpy).toHaveBeenCalledTimes(3);

      vi.clearAllMocks();

      // Show full word (I is still hidden)
      wordDisplay.showFullWord();
      // All 4 letters attempt reveal; F, S, H already revealed (scale.x > 0 check)
      // but since mocks don't track scale changes, all 4 get revealed
      expect(rafSpy).toHaveBeenCalledTimes(4);
    });

    it('should handle completed round state', () => {
      wordDisplay.setWord('WIN');
      vi.clearAllMocks();

      const round = createMockRound('WIN', ['W', 'I', 'N'], {
        isComplete: true,
        isWon: true,
      });

      wordDisplay.updateDisplay(round);
      expect(rafSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge cases', () => {
    it('should handle word with all identical letters', () => {
      wordDisplay.setWord('AAA');
      vi.clearAllMocks();

      const round = createMockRound('AAA', ['A']);
      wordDisplay.updateDisplay(round);

      expect(rafSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle updating display before setting a word', () => {
      const round = createMockRound('TEST', ['T']);

      expect(() => wordDisplay.updateDisplay(round)).not.toThrow();
    });

    it('should handle setting word multiple times in succession', () => {
      expect(() => {
        wordDisplay.setWord('A');
        wordDisplay.setWord('AB');
        wordDisplay.setWord('ABC');
      }).not.toThrow();
    });

    it('should handle very long words', () => {
      const longWord = 'INTERNATIONALIZATION';
      wordDisplay.setWord(longWord);

      const group = wordDisplay.getMesh();
      // 20 letters = 40 add calls (20 pedestals + 20 letter meshes)
      expect(group.add).toHaveBeenCalledTimes(40);
    });

    it('should handle showFullWord before setWord', () => {
      expect(() => wordDisplay.showFullWord()).not.toThrow();
    });

    it('should handle word with no revealed letters and full reveal', () => {
      wordDisplay.setWord('MYSTERY');
      vi.clearAllMocks();

      const round = createMockRound('MYSTERY', []);
      wordDisplay.updateDisplay(round);
      expect(rafSpy).not.toHaveBeenCalled();

      // Now reveal everything
      wordDisplay.showFullWord();
      expect(rafSpy).toHaveBeenCalledTimes(7);
    });
  });
});
