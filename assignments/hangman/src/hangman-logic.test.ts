/**
 * Comprehensive unit tests for hangman-logic module
 * Covers: createRound, guessLetter, isWinningState, isLosingState,
 * getRemainingGuesses, getWrongGuesses, getWordMask, MAX_WRONG_GUESSES
 */

import { describe, it, expect } from 'vitest';
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
import type { Round } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('MAX_WRONG_GUESSES', () => {
  it('should be 6', () => {
    expect(MAX_WRONG_GUESSES).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// createRound
// ---------------------------------------------------------------------------

describe('createRound', () => {
  it('should create a round with default category and difficulty', () => {
    const round = createRound('HELLO');

    expect(round.word).toBe('HELLO');
    expect(round.category).toBe('general');
    expect(round.difficulty).toBe(1);
  });

  it('should uppercase the word', () => {
    const round = createRound('hello');

    expect(round.word).toBe('HELLO');
  });

  it('should accept custom category and difficulty', () => {
    const round = createRound('ELEPHANT', 'animals', 3);

    expect(round.word).toBe('ELEPHANT');
    expect(round.category).toBe('animals');
    expect(round.difficulty).toBe(3);
  });

  it('should start with empty guessedLetters', () => {
    const round = createRound('HELLO');

    expect(round.guessedLetters.size).toBe(0);
  });

  it('should start with empty revealedLetters', () => {
    const round = createRound('HELLO');

    expect(round.revealedLetters.size).toBe(0);
  });

  it('should start with zero wrong guesses', () => {
    const round = createRound('HELLO');

    expect(round.wrongGuesses).toBe(0);
  });

  it('should not be complete initially', () => {
    const round = createRound('HELLO');

    expect(round.isComplete).toBe(false);
  });

  it('should not be won initially', () => {
    const round = createRound('HELLO');

    expect(round.isWon).toBe(false);
  });

  it('should handle a single-letter word', () => {
    const round = createRound('A');

    expect(round.word).toBe('A');
  });

  it('should handle an already-uppercase word', () => {
    const round = createRound('WORLD');

    expect(round.word).toBe('WORLD');
  });

  it('should handle a mixed-case word', () => {
    const round = createRound('HeLLo');

    expect(round.word).toBe('HELLO');
  });
});

// ---------------------------------------------------------------------------
// guessLetter – correct guesses
// ---------------------------------------------------------------------------

describe('guessLetter – correct guesses', () => {
  it('should reveal a correct letter', () => {
    const round = createRound('HELLO');
    const result = guessLetter(round, 'H');

    expect(result.isCorrect).toBe(true);
    expect(result.wasSkipped).toBe(false);
    expect(result.round.revealedLetters.has('H')).toBe(true);
  });

  it('should normalize lowercase input to uppercase', () => {
    const round = createRound('HELLO');
    const result = guessLetter(round, 'h');

    expect(result.isCorrect).toBe(true);
    expect(result.round.revealedLetters.has('H')).toBe(true);
    expect(result.round.guessedLetters.has('H')).toBe(true);
  });

  it('should not increment wrongGuesses on correct guess', () => {
    const round = createRound('HELLO');
    const result = guessLetter(round, 'E');

    expect(result.round.wrongGuesses).toBe(0);
  });

  it('should reveal all occurrences of a letter', () => {
    const round = createRound('HELLO');
    const result = guessLetter(round, 'L');

    expect(result.isCorrect).toBe(true);
    // Both L's should be revealed — verified via getWordMask
    expect(getWordMask(result.round)).toBe('_ _ L L _');
  });

  it('should add guessed letter to guessedLetters', () => {
    const round = createRound('HELLO');
    const result = guessLetter(round, 'H');

    expect(result.round.guessedLetters.has('H')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// guessLetter – wrong guesses
// ---------------------------------------------------------------------------

describe('guessLetter – wrong guesses', () => {
  it('should increment wrongGuesses for wrong letter', () => {
    const round = createRound('HELLO');
    const result = guessLetter(round, 'Z');

    expect(result.isCorrect).toBe(false);
    expect(result.wasSkipped).toBe(false);
    expect(result.round.wrongGuesses).toBe(1);
  });

  it('should NOT reveal a wrong letter', () => {
    const round = createRound('HELLO');
    const result = guessLetter(round, 'Z');

    expect(result.round.revealedLetters.has('Z')).toBe(false);
  });

  it('should add wrong letter to guessedLetters', () => {
    const round = createRound('HELLO');
    const result = guessLetter(round, 'X');

    expect(result.round.guessedLetters.has('X')).toBe(true);
  });

  it('should accumulate multiple wrong guesses', () => {
    let round = createRound('HELLO');
    round = guessLetter(round, 'Z').round;
    round = guessLetter(round, 'X').round;
    round = guessLetter(round, 'Q').round;

    expect(round.wrongGuesses).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// guessLetter – duplicate / skipped guesses
// ---------------------------------------------------------------------------

describe('guessLetter – duplicate guesses (idempotency)', () => {
  it('should skip a previously guessed correct letter', () => {
    const round = createRound('HELLO');
    const first = guessLetter(round, 'H');
    const second = guessLetter(first.round, 'H');

    expect(second.wasSkipped).toBe(true);
    expect(second.isCorrect).toBe(true);
    expect(second.round.wrongGuesses).toBe(0);
  });

  it('should skip a previously guessed wrong letter', () => {
    const round = createRound('HELLO');
    const first = guessLetter(round, 'Z');
    const second = guessLetter(first.round, 'Z');

    expect(second.wasSkipped).toBe(true);
    expect(second.isCorrect).toBe(false);
    expect(second.round.wrongGuesses).toBe(1); // not incremented again
  });

  it('should not change round state on skipped guess', () => {
    const round = createRound('HELLO');
    const first = guessLetter(round, 'E');
    const second = guessLetter(first.round, 'E');

    expect(second.round.revealedLetters.size).toBe(first.round.revealedLetters.size);
    expect(second.round.guessedLetters.size).toBe(first.round.guessedLetters.size);
    expect(second.round.wrongGuesses).toBe(first.round.wrongGuesses);
    expect(second.round.isComplete).toBe(first.round.isComplete);
  });
});

// ---------------------------------------------------------------------------
// guessLetter – win condition
// ---------------------------------------------------------------------------

describe('guessLetter – win detection', () => {
  it('should detect a win when all letters are revealed', () => {
    let round = createRound('HI');
    round = guessLetter(round, 'H').round;
    const result = guessLetter(round, 'I');

    expect(result.round.isComplete).toBe(true);
    expect(result.round.isWon).toBe(true);
  });

  it('should set isComplete and isWon on win', () => {
    let round = createRound('CAT');
    round = guessLetter(round, 'C').round;
    round = guessLetter(round, 'A').round;
    const result = guessLetter(round, 'T');

    expect(result.round.isComplete).toBe(true);
    expect(result.round.isWon).toBe(true);
  });

  it('should handle win with a single-letter word', () => {
    const round = createRound('A');
    const result = guessLetter(round, 'A');

    expect(result.round.isComplete).toBe(true);
    expect(result.round.isWon).toBe(true);
  });

  it('should not mark win when only some letters are revealed', () => {
    const round = createRound('HELLO');
    const result = guessLetter(round, 'H');

    expect(result.round.isComplete).toBe(false);
    expect(result.round.isWon).toBe(false);
  });

  it('should handle duplicate letters correctly for win (HELLO)', () => {
    let round = createRound('HELLO');
    round = guessLetter(round, 'H').round;
    round = guessLetter(round, 'E').round;
    round = guessLetter(round, 'O').round;
    // L covers both L's
    const result = guessLetter(round, 'L');

    expect(result.round.isComplete).toBe(true);
    expect(result.round.isWon).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// guessLetter – loss condition
// ---------------------------------------------------------------------------

describe('guessLetter – loss detection', () => {
  it('should detect loss when wrong guesses reach MAX_WRONG_GUESSES', () => {
    let round = createRound('HELLO');
    const wrongLetters = ['Z', 'X', 'Q', 'V', 'B', 'K'];
    let result: GuessResult | undefined;

    for (const letter of wrongLetters) {
      result = guessLetter(round, letter);
      round = result.round;
    }

    expect(result!.round.isComplete).toBe(true);
    expect(result!.round.isWon).toBe(false);
    expect(result!.round.wrongGuesses).toBe(MAX_WRONG_GUESSES);
  });

  it('should not mark loss before reaching MAX_WRONG_GUESSES', () => {
    let round = createRound('HELLO');
    round = guessLetter(round, 'Z').round;
    round = guessLetter(round, 'X').round;
    round = guessLetter(round, 'Q').round;
    round = guessLetter(round, 'V').round;
    round = guessLetter(round, 'B').round;

    expect(round.wrongGuesses).toBe(5);
    expect(round.isComplete).toBe(false);
    expect(round.isWon).toBe(false);
  });

  it('should allow no more guesses after loss', () => {
    let round = createRound('HELLO');
    const wrongLetters = ['Z', 'X', 'Q', 'V', 'B', 'K'];
    for (const l of wrongLetters) {
      round = guessLetter(round, l).round;
    }

    // Trying to guess after loss still returns a result but round stays complete
    const post = guessLetter(round, 'H');
    expect(post.round.isComplete).toBe(true);
    expect(post.round.isWon).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// guessLetter – immutability
// ---------------------------------------------------------------------------

describe('guessLetter – immutability', () => {
  it('should not mutate the original round', () => {
    const round = createRound('HELLO');
    const originalGuesses = round.guessedLetters.size;
    const originalRevealed = round.revealedLetters.size;

    guessLetter(round, 'H');

    expect(round.guessedLetters.size).toBe(originalGuesses);
    expect(round.revealedLetters.size).toBe(originalRevealed);
    expect(round.wrongGuesses).toBe(0);
    expect(round.isComplete).toBe(false);
    expect(round.isWon).toBe(false);
  });

  it('should return a new round object', () => {
    const round = createRound('HELLO');
    const result = guessLetter(round, 'H');

    expect(result.round).not.toBe(round);
  });

  it('should return new Set instances', () => {
    const round = createRound('HELLO');
    const result = guessLetter(round, 'H');

    expect(result.round.guessedLetters).not.toBe(round.guessedLetters);
    expect(result.round.revealedLetters).not.toBe(round.revealedLetters);
  });
});

// ---------------------------------------------------------------------------
// isWinningState
// ---------------------------------------------------------------------------

describe('isWinningState', () => {
  it('should return false for a new round', () => {
    const round = createRound('HELLO');

    expect(isWinningState(round)).toBe(false);
  });

  it('should return false when only some letters are revealed', () => {
    let round = createRound('HELLO');
    round = guessLetter(round, 'H').round;

    expect(isWinningState(round)).toBe(false);
  });

  it('should return true when all letters are revealed', () => {
    let round = createRound('HI');
    round = guessLetter(round, 'H').round;
    round = guessLetter(round, 'I').round;

    expect(isWinningState(round)).toBe(true);
  });

  it('should return true for single-letter word with correct guess', () => {
    let round = createRound('A');
    round = guessLetter(round, 'A').round;

    expect(isWinningState(round)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isLosingState
// ---------------------------------------------------------------------------

describe('isLosingState', () => {
  it('should return false for a new round', () => {
    const round = createRound('HELLO');

    expect(isLosingState(round)).toBe(false);
  });

  it('should return false with fewer than MAX wrong guesses', () => {
    let round = createRound('HELLO');
    round = guessLetter(round, 'Z').round;

    expect(isLosingState(round)).toBe(false);
  });

  it('should return true when wrong guesses reach MAX_WRONG_GUESSES', () => {
    let round = createRound('HELLO');
    for (const l of ['Z', 'X', 'Q', 'V', 'B', 'K']) {
      round = guessLetter(round, l).round;
    }

    expect(isLosingState(round)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getRemainingGuesses
// ---------------------------------------------------------------------------

describe('getRemainingGuesses', () => {
  it('should return MAX_WRONG_GUESSES for a new round', () => {
    const round = createRound('HELLO');

    expect(getRemainingGuesses(round)).toBe(MAX_WRONG_GUESSES);
  });

  it('should decrease after each wrong guess', () => {
    let round = createRound('HELLO');
    round = guessLetter(round, 'Z').round;

    expect(getRemainingGuesses(round)).toBe(MAX_WRONG_GUESSES - 1);
  });

  it('should not change after a correct guess', () => {
    let round = createRound('HELLO');
    round = guessLetter(round, 'H').round;

    expect(getRemainingGuesses(round)).toBe(MAX_WRONG_GUESSES);
  });

  it('should return 0 when all guesses are used', () => {
    let round = createRound('HELLO');
    for (const l of ['Z', 'X', 'Q', 'V', 'B', 'K']) {
      round = guessLetter(round, l).round;
    }

    expect(getRemainingGuesses(round)).toBe(0);
  });

  it('should not return negative values', () => {
    let round = createRound('HELLO');
    for (const l of ['Z', 'X', 'Q', 'V', 'B', 'K']) {
      round = guessLetter(round, l).round;
    }
    // Already at 0 — try another wrong guess (round is complete, but test defensively)
    const result = getRemainingGuesses(round);

    expect(result).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// getWrongGuesses
// ---------------------------------------------------------------------------

describe('getWrongGuesses', () => {
  it('should return empty array for a new round', () => {
    const round = createRound('HELLO');

    expect(getWrongGuesses(round)).toEqual([]);
  });

  it('should return wrong letters after wrong guesses', () => {
    let round = createRound('HELLO');
    round = guessLetter(round, 'Z').round;
    round = guessLetter(round, 'X').round;

    const wrong = getWrongGuesses(round);
    expect(wrong).toContain('Z');
    expect(wrong).toContain('X');
    expect(wrong.length).toBe(2);
  });

  it('should not include correct letters', () => {
    let round = createRound('HELLO');
    round = guessLetter(round, 'H').round;
    round = guessLetter(round, 'Z').round;

    const wrong = getWrongGuesses(round);
    expect(wrong).not.toContain('H');
    expect(wrong).toContain('Z');
    expect(wrong.length).toBe(1);
  });

  it('should return all wrong letters on a lost game', () => {
    let round = createRound('HELLO');
    const wrongLetters = ['Z', 'X', 'Q', 'V', 'B', 'K'];
    for (const l of wrongLetters) {
      round = guessLetter(round, l).round;
    }

    expect(getWrongGuesses(round).length).toBe(MAX_WRONG_GUESSES);
  });
});

// ---------------------------------------------------------------------------
// getWordMask
// ---------------------------------------------------------------------------

describe('getWordMask', () => {
  it('should return all underscores for a new round', () => {
    const round = createRound('HELLO');

    expect(getWordMask(round)).toBe('_ _ _ _ _');
  });

  it('should reveal guessed letters', () => {
    let round = createRound('HELLO');
    round = guessLetter(round, 'H').round;

    expect(getWordMask(round)).toBe('H _ _ _ _');
  });

  it('should reveal all occurrences of a letter', () => {
    let round = createRound('HELLO');
    round = guessLetter(round, 'L').round;

    expect(getWordMask(round)).toBe('_ _ L L _');
  });

  it('should handle single-letter word', () => {
    let round = createRound('A');
    round = guessLetter(round, 'A').round;

    expect(getWordMask(round)).toBe('A');
  });

  it('should show fully revealed word on win', () => {
    let round = createRound('CAT');
    round = guessLetter(round, 'C').round;
    round = guessLetter(round, 'A').round;
    round = guessLetter(round, 'T').round;

    expect(getWordMask(round)).toBe('C A T');
  });

  it('should show underscores for unguessed letters on loss', () => {
    let round = createRound('CAT');
    round = guessLetter(round, 'Z').round;

    expect(getWordMask(round)).toBe('_ _ _');
  });
});

// ---------------------------------------------------------------------------
// Integration: full game flow
// ---------------------------------------------------------------------------

describe('Full game flow', () => {
  it('should play a complete winning game', () => {
    let round = createRound('DOG', 'animals', 2);
    expect(round.isComplete).toBe(false);

    round = guessLetter(round, 'D').round;
    expect(round.revealedLetters.has('D')).toBe(true);
    expect(round.isComplete).toBe(false);

    round = guessLetter(round, 'O').round;
    expect(round.isComplete).toBe(false);

    round = guessLetter(round, 'G').round;
    expect(round.isComplete).toBe(true);
    expect(round.isWon).toBe(true);
    expect(getWordMask(round)).toBe('D O G');
  });

  it('should play a complete losing game', () => {
    let round = createRound('DOG');
    const wrongLetters = ['A', 'B', 'C', 'E', 'F', 'H'];
    for (const l of wrongLetters) {
      round = guessLetter(round, l).round;
    }

    expect(round.isComplete).toBe(true);
    expect(round.isWon).toBe(false);
    expect(round.wrongGuesses).toBe(MAX_WRONG_GUESSES);
    // All guessed letters are wrong — word stays fully hidden
    expect(getWordMask(round)).toBe('_ _ _');
  });

  it('should handle mixed correct and wrong guesses', () => {
    let round = createRound('WORLD');
    round = guessLetter(round, 'W').round;  // correct
    round = guessLetter(round, 'X').round;  // wrong
    round = guessLetter(round, 'O').round;  // correct
    round = guessLetter(round, 'Z').round;  // wrong

    expect(round.wrongGuesses).toBe(2);
    expect(round.guessedLetters.size).toBe(4);
    expect(getWordMask(round)).toBe('W O _ _ _');
    expect(getRemainingGuesses(round)).toBe(MAX_WRONG_GUESSES - 2);
    expect(round.isComplete).toBe(false);
  });
});
