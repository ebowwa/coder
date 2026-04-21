/**
 * Power-ups system for Hangman 3D game
 *
 * Provides three power-up types that players can use during gameplay:
 * - Hint: Reveals a random unrevealed letter in the word
 * - Skip: Skips the current word (counts as a loss but preserves lives)
 * - Extra Life: Restores one wrong guess (removes a body part)
 *
 * Power-ups are earned through gameplay and can be tracked per session.
 *
 * @module powerups
 */

import type { Round } from './types';

/**
 * The three available power-up types
 */
export type PowerUpType = 'hint' | 'skip' | 'extra-life';

/**
 * Represents the result of using a power-up
 */
export interface PowerUpResult {
  /** The updated round state (immutable) */
  round: Round;
  /** Whether the power-up was successfully used */
  success: boolean;
  /** Human-readable message describing what happened */
  message: string;
  /** The type of power-up that was used */
  type: PowerUpType;
}

/**
 * Tracks available power-ups for a player
 */
export interface PowerUpInventory {
  /** Number of hint power-ups available */
  hint: number;
  /** Number of skip power-ups available */
  skip: number;
  /** Number of extra-life power-ups available */
  'extra-life': number;
}

/**
 * Configuration for power-up rewards
 */
export interface PowerUpRewardConfig {
  /** Hints earned per N consecutive wins */
  hintRewardThreshold: number;
  /** Skips earned per N consecutive wins */
  skipRewardThreshold: number;
  /** Extra lives earned per N consecutive wins */
  extraLifeRewardThreshold: number;
}

/**
 * Default reward configuration
 */
export const DEFAULT_REWARD_CONFIG: PowerUpRewardConfig = {
  hintRewardThreshold: 2,
  skipRewardThreshold: 3,
  extraLifeRewardThreshold: 5,
};

/**
 * Maximum allowed inventory for each power-up type
 */
export const MAX_INVENTORY: PowerUpInventory = {
  hint: 3,
  skip: 2,
  'extra-life': 2,
};

/**
 * Point penalty for using each power-up type
 */
export const POWERUP_PENALTY: Record<PowerUpType, number> = {
  hint: 5,
  skip: 15,
  'extra-life': 10,
};

/**
 * Create an empty power-up inventory
 */
export function createEmptyInventory(): PowerUpInventory {
  return { hint: 0, skip: 0, 'extra-life': 0 };
}

/**
 * Create a starter inventory with one of each power-up
 */
export function createStarterInventory(): PowerUpInventory {
  return { hint: 1, skip: 1, 'extra-life': 1 };
}

/**
 * Check if a power-up can be used given the current round state and inventory
 */
export function canUsePowerUp(
  type: PowerUpType,
  round: Round,
  inventory: PowerUpInventory
): { allowed: boolean; reason?: string } {
  // Check inventory
  if (inventory[type] <= 0) {
    return { allowed: false, reason: `No ${type} power-ups remaining` };
  }

  // Extra-life can be used on a completed (lost) round to recover
  if (type === 'extra-life') {
    if (round.wrongGuesses <= 0) {
      return { allowed: false, reason: 'No wrong guesses to recover' };
    }
    // Can use extra-life if round is active OR if round is complete due to loss
    if (round.isComplete && round.isWon) {
      return { allowed: false, reason: 'No active round' };
    }
    return { allowed: true };
  }

  // For hint and skip: round must be active
  if (!round || round.isComplete) {
    return { allowed: false, reason: 'No active round' };
  }

  // Type-specific checks
  switch (type) {
    case 'hint': {
      // Must have unrevealed letters to hint
      const unrevealed = getUnrevealedLetters(round);
      if (unrevealed.length === 0) {
        return { allowed: false, reason: 'All letters already revealed' };
      }
      break;
    }
    case 'skip': {
      // Skip is always available if round is active
      break;
    }
  }

  return { allowed: true };
}

/**
 * Get unrevealed letters in the word (not yet guessed)
 */
export function getUnrevealedLetters(round: Round): string[] {
  const unique = new Set<string>();
  for (const letter of round.word) {
    if (!round.revealedLetters.has(letter) && !round.guessedLetters.has(letter)) {
      unique.add(letter);
    }
  }
  return Array.from(unique);
}

/**
 * Use a hint power-up: reveals a random unrevealed letter
 *
 * Returns a new Round with the letter revealed, without counting as a guess.
 */
export function useHint(round: Round, inventory: PowerUpInventory): PowerUpResult {
  const check = canUsePowerUp('hint', round, inventory);
  if (!check.allowed) {
    return { round, success: false, message: check.reason || 'Cannot use hint', type: 'hint' };
  }

  const unrevealed = getUnrevealedLetters(round);
  if (unrevealed.length === 0) {
    return { round, success: false, message: 'No letters to reveal', type: 'hint' };
  }

  // Pick a random unrevealed letter
  const hintLetter = unrevealed[Math.floor(Math.random() * unrevealed.length)];

  // Create updated round (immutable)
  const newRound: Round = {
    ...round,
    revealedLetters: new Set(round.revealedLetters),
    guessedLetters: new Set(round.guessedLetters),
  };
  newRound.revealedLetters.add(hintLetter);
  newRound.guessedLetters.add(hintLetter);

  // Check for win
  const allRevealed = newRound.word.split('').every(l => newRound.revealedLetters.has(l));
  if (allRevealed) {
    newRound.isComplete = true;
    newRound.isWon = true;
  }

  return {
    round: newRound,
    success: true,
    message: `Hint: "${hintLetter}" is in the word! (-${POWERUP_PENALTY.hint} points)`,
    type: 'hint',
  };
}

/**
 * Use a skip power-up: skip the current word (counts as a loss but preserves the life)
 */
export function useSkip(round: Round, inventory: PowerUpInventory): PowerUpResult {
  const check = canUsePowerUp('skip', round, inventory);
  if (!check.allowed) {
    return { round, success: false, message: check.reason || 'Cannot use skip', type: 'skip' };
  }

  // Mark round as complete (lost) but do NOT trigger life loss
  const newRound: Round = {
    ...round,
    revealedLetters: new Set(round.revealedLetters),
    guessedLetters: new Set(round.guessedLetters),
    isComplete: true,
    isWon: false,
  };

  return {
    round: newRound,
    success: true,
    message: `Skipped "${round.word}"! (-${POWERUP_PENALTY.skip} points, no life lost)`,
    type: 'skip',
  };
}

/**
 * Use an extra-life power-up: recover one wrong guess (removes a body part)
 */
export function useExtraLife(round: Round, inventory: PowerUpInventory): PowerUpResult {
  const check = canUsePowerUp('extra-life', round, inventory);
  if (!check.allowed) {
    return { round, success: false, message: check.reason || 'Cannot use extra life', type: 'extra-life' };
  }

  const newRound: Round = {
    ...round,
    revealedLetters: new Set(round.revealedLetters),
    guessedLetters: new Set(round.guessedLetters),
    wrongGuesses: Math.max(0, round.wrongGuesses - 1),
  };

  // If previously at max wrong guesses and now under, un-complete the round
  if (round.wrongGuesses >= 6 && newRound.wrongGuesses < 6) {
    newRound.isComplete = false;
    newRound.isWon = false;
  }

  return {
    round: newRound,
    success: true,
    message: `Extra life used! Recovered a wrong guess. (-${POWERUP_PENALTY['extra-life']} points)`,
    type: 'extra-life',
  };
}

/**
 * Deduct a power-up from the inventory after successful use
 */
export function deductPowerUp(inventory: PowerUpInventory, type: PowerUpType): PowerUpInventory {
  return {
    ...inventory,
    [type]: Math.max(0, inventory[type] - 1),
  };
}

/**
 * Award power-ups based on win streak
 */
export function awardPowerUps(
  inventory: PowerUpInventory,
  currentStreak: number,
  config: PowerUpRewardConfig = DEFAULT_REWARD_CONFIG
): PowerUpInventory {
  const newInventory = { ...inventory };

  if (currentStreak > 0 && currentStreak % config.hintRewardThreshold === 0) {
    newInventory.hint = Math.min(MAX_INVENTORY.hint, newInventory.hint + 1);
  }
  if (currentStreak > 0 && currentStreak % config.skipRewardThreshold === 0) {
    newInventory.skip = Math.min(MAX_INVENTORY.skip, newInventory.skip + 1);
  }
  if (currentStreak > 0 && currentStreak % config.extraLifeRewardThreshold === 0) {
    newInventory['extra-life'] = Math.min(MAX_INVENTORY['extra-life'], newInventory['extra-life'] + 1);
  }

  return newInventory;
}

/**
 * Get a display name for a power-up type
 */
export function getPowerUpName(type: PowerUpType): string {
  switch (type) {
    case 'hint': return 'Hint';
    case 'skip': return 'Skip Word';
    case 'extra-life': return 'Extra Life';
  }
}

/**
 * Get an icon for a power-up type
 */
export function getPowerUpIcon(type: PowerUpType): string {
  switch (type) {
    case 'hint': return '💡';
    case 'skip': return '⏭️';
    case 'extra-life': return '❤️';
  }
}

/**
 * Get the point penalty for a power-up type
 */
export function getPowerUpPenalty(type: PowerUpType): number {
  return POWERUP_PENALTY[type];
}
