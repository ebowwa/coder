/**
 * Pure hangman game logic - state machine for single-player game
 * This module contains all core game mechanics without UI dependencies
 */

import type { Round } from './types';

export const MAX_WRONG_GUESSES = 6;

export interface GuessResult {
  /** The updated round state */
  round: Round;
  /** Whether the guessed letter was correct */
  isCorrect: boolean;
  /** Whether this guess was ignored (letter already guessed) */
  wasSkipped: boolean;
}

/**
 * Create a new round with the given word
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
 * Process a letter guess and return the updated round state
 * 
 * @param round - Current round state
 * @param letter - The letter being guessed (will be uppercased)
 * @returns GuessResult with updated state and outcome flags
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
 * Check if the game is in a winning state
 */
export function isWinningState(round: Round): boolean {
  return round.word.split('').every(l => round.revealedLetters.has(l));
}

/**
 * Check if the game is in a losing state
 */
export function isLosingState(round: Round): boolean {
  return round.wrongGuesses >= MAX_WRONG_GUESSES;
}

/**
 * Get remaining wrong guesses allowed
 */
export function getRemainingGuesses(round: Round): number {
  return Math.max(0, MAX_WRONG_GUESSES - round.wrongGuesses);
}

/**
 * Get array of wrong guesses (letters that were guessed but not in word)
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
 * Get the current display mask of the word (with unrevealed letters as underscores)
 */
export function getWordMask(round: Round): string {
  return round.word
    .split('')
    .map(l => (round.revealedLetters.has(l) ? l : '_'))
    .join(' ');
}
