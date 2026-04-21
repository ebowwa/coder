/**
 * Pure hangman game logic - state machine for single-player game
 * 
 * This module contains all core game mechanics without UI dependencies.
 * All functions are pure and work with immutable state patterns.
 * 
 * @module hangman-logic
 * @example
 * ```typescript
 * import { createRound, guessLetter, getWordMask } from './hangman-logic';
 * 
 * // Create a new round
 * let round = createRound('HELLO', 'greetings', 2);
 * 
 * // Make a guess
 * const result = guessLetter(round, 'L');
 * console.log(result.isCorrect); // true
 * console.log(getWordMask(result.round)); // "_ _ L L _"
 * ```
 */

import type { Round } from './types';

/**
 * Maximum number of wrong guesses allowed before the game is lost.
 * This corresponds to the 6 body parts of the hangman figure:
 * head, body, left arm, right arm, left leg, right leg.
 * 
 * @constant
 * @type {number}
 * @default 6
 */
export const MAX_WRONG_GUESSES = 6;

/**
 * Result object returned from processing a letter guess.
 * Contains the updated round state and metadata about the guess outcome.
 * 
 * @interface GuessResult
 * @example
 * ```typescript
 * const result: GuessResult = guessLetter(round, 'A');
 * if (result.wasSkipped) {
 *   console.log('Letter already guessed!');
 * } else if (result.isCorrect) {
 *   console.log('Correct!');
 * } else {
 *   console.log('Wrong guess!');
 * }
 * // Use result.round for subsequent operations
 * ```
 */
export interface GuessResult {
  /**
   * The updated round state after processing the guess.
   * This is a new object (immutable update).
   */
  round: Round;
  
  /**
   * Whether the guessed letter was found in the word.
   * True if the letter exists in the word, false otherwise.
   * Note: Will be true even if the letter was already guessed (wasSkipped=true).
   */
  isCorrect: boolean;
  
  /**
   * Whether this guess was ignored because the letter was already guessed.
   * When true, the round state is unchanged except for Set copies.
   */
  wasSkipped: boolean;
}

/**
 * Create a new round with the given word and metadata.
 * 
 * Initializes a fresh game round with no guesses made and all letters hidden.
 * The word is automatically converted to uppercase for consistency.
 * 
 * @param {string} word - The word to be guessed (will be uppercased)
 * @param {string} [category='general'] - Category name for display purposes
 * @param {number} [difficulty=1] - Difficulty level (1-5, affects scoring)
 * @returns {Round} A new round object ready for gameplay
 * 
 * @example
 * ```typescript
 * // Create a simple round
 * const round = createRound('APPLE');
 * 
 * // Create a round with category and difficulty
 * const round = createRound('ELEPHANT', 'animals', 3);
 * console.log(round.word); // 'ELEPHANT'
 * console.log(round.category); // 'animals'
 * console.log(round.guessedLetters.size); // 0
 * ```
 */
export function createRound(word: string, category: string = 'general', difficulty: number = 1): Round {
  return {
    word: word.toUpperCase(),
    category,
    difficulty,
    revealedLetters: new Set<string>(),
    wrongGuesses: 0,
    guessedLetters: new Set<string>(),
    isComplete: false,
    isWon: false,
  };
}

/**
 * Process a letter guess and return the updated round state.
 * 
 * This is the core game logic function. It handles:
 * - Normalizing the letter to uppercase
 * - Checking for duplicate guesses (idempotent)
 * - Updating revealed letters for correct guesses
 * - Incrementing wrong guesses for incorrect guesses
 * - Detecting win/loss conditions
 * 
 * @param {Round} round - Current round state (not mutated)
 * @param {string} letter - The letter being guessed (will be uppercased, single character expected)
 * @returns {GuessResult} Object containing the updated round and outcome flags
 * 
 * @example
 * ```typescript
 * let round = createRound('HELLO');
 * 
 * // Correct guess
 * let result = guessLetter(round, 'l');
 * console.log(result.isCorrect); // true
 * console.log(result.wasSkipped); // false
 * 
 * // Wrong guess
 * result = guessLetter(result.round, 'x');
 * console.log(result.isCorrect); // false
 * console.log(result.round.wrongGuesses); // 1
 * 
 * // Duplicate guess (idempotent)
 * result = guessLetter(result.round, 'l');
 * console.log(result.wasSkipped); // true
 * ```
 */
export function guessLetter(round: Round, letter: string): GuessResult {
  // Normalize letter
  const normalizedLetter = letter.toUpperCase();
  
  // Create a copy of the round to mutate
  const newRound: Round = {
    ...round,
    revealedLetters: new Set(round.revealedLetters),
    guessedLetters: new Set(round.guessedLetters),
  };
  
  // Idempotency check: letter already guessed
  if (round.guessedLetters.has(normalizedLetter)) {
    return {
      round: newRound,
      isCorrect: round.revealedLetters.has(normalizedLetter),
      wasSkipped: true,
    };
  }
  
  // Add letter to guessed set
  newRound.guessedLetters.add(normalizedLetter);
  
  // Check if letter is in the word
  const isCorrect = round.word.includes(normalizedLetter);
  
  if (isCorrect) {
    // Correct guess: reveal letter, don't decrement remaining guesses
    newRound.revealedLetters.add(normalizedLetter);
    
    // Check for win: all letters in word are revealed
    const allRevealed = round.word.split('').every(l => newRound.revealedLetters.has(l));
    if (allRevealed) {
      newRound.isComplete = true;
      newRound.isWon = true;
    }
  } else {
    // Wrong guess: increment wrong guesses count
    newRound.wrongGuesses++;
    
    // Check for loss: wrong guesses exhausted
    if (newRound.wrongGuesses >= MAX_WRONG_GUESSES) {
      newRound.isComplete = true;
      newRound.isWon = false;
    }
  }
  
  return {
    round: newRound,
    isCorrect,
    wasSkipped: false,
  };
}

/**
 * Check if the game is in a winning state.
 * 
 * A winning state occurs when all unique letters in the word
 * have been revealed (guessed correctly).
 * 
 * @param {Round} round - The round state to check
 * @returns {boolean} True if all letters are revealed, false otherwise
 * 
 * @example
 * ```typescript
 * const round = createRound('HI');
 * console.log(isWinningState(round)); // false
 * 
 * let result = guessLetter(round, 'H');
 * result = guessLetter(result.round, 'I');
 * console.log(isWinningState(result.round)); // true
 * ```
 */
export function isWinningState(round: Round): boolean {
  return round.word.split('').every(l => round.revealedLetters.has(l));
}

/**
 * Check if the game is in a losing state.
 * 
 * A losing state occurs when the number of wrong guesses
 * reaches or exceeds MAX_WRONG_GUESSES (6 by default).
 * 
 * @param {Round} round - The round state to check
 * @returns {boolean} True if wrong guesses are exhausted, false otherwise
 * 
 * @example
 * ```typescript
 * const round = createRound('A');
 * let result = guessLetter(round, 'B');
 * result = guessLetter(result.round, 'C');
 * // ... continue with wrong guesses
 * console.log(result.round.wrongGuesses); // 6
 * console.log(isLosingState(result.round)); // true
 * ```
 */
export function isLosingState(round: Round): boolean {
  return round.wrongGuesses >= MAX_WRONG_GUESSES;
}

/**
 * Get the number of remaining wrong guesses allowed.
 * 
 * Calculates how many more incorrect guesses the player can make
 * before losing the game. Returns 0 if already at or below zero.
 * 
 * @param {Round} round - The current round state
 * @returns {number} Number of remaining wrong guesses (0 to MAX_WRONG_GUESSES)
 * 
 * @example
 * ```typescript
 * const round = createRound('WORD');
 * console.log(getRemainingGuesses(round)); // 6
 * 
 * let result = guessLetter(round, 'X');
 * console.log(getRemainingGuesses(result.round)); // 5
 * ```
 */
export function getRemainingGuesses(round: Round): number {
  return Math.max(0, MAX_WRONG_GUESSES - round.wrongGuesses);
}

/**
 * Get an array of wrong guesses (letters guessed but not in the word).
 * 
 * Useful for displaying the incorrect letters to the player.
 * The letters are returned in the order they were added to the Set.
 * 
 * @param {Round} round - The current round state
 * @returns {string[]} Array of incorrectly guessed letters (uppercase)
 * 
 * @example
 * ```typescript
 * let round = createRound('CAT');
 * round = guessLetter(round, 'X').round;
 * round = guessLetter(round, 'Z').round;
 * console.log(getWrongGuesses(round)); // ['X', 'Z']
 * ```
 */
export function getWrongGuesses(round: Round): string[] {
  const wrong: string[] = [];
  round.guessedLetters.forEach(letter => {
    if (!round.word.includes(letter)) {
      wrong.push(letter);
    }
  });
  return wrong;
}

/**
 * Get the current display mask of the word.
 * 
 * Returns a string representation of the word where revealed letters
 * are shown and unrevealed letters are shown as underscores.
 * Letters are space-separated for readability.
 * 
 * @param {Round} round - The current round state
 * @returns {string} The word mask (e.g., "H _ L L _" for "HELLO" with 'H' and 'L' revealed)
 * 
 * @example
 * ```typescript
 * const round = createRound('HELLO');
 * console.log(getWordMask(round)); // "_ _ _ _ _"
 * 
 * let result = guessLetter(round, 'L');
 * console.log(getWordMask(result.round)); // "_ _ L L _"
 * 
 * result = guessLetter(result.round, 'H');
 * console.log(getWordMask(result.round)); // "H _ L L _"
 * ```
 */
export function getWordMask(round: Round): string {
  return round.word
    .split('')
    .map(l => (round.revealedLetters.has(l) ? l : '_'))
    .join(' ');
}
