/**
 * Tests for Power-ups module
 * Tests pure game logic for hint, skip, and extra-life power-ups
 */

import { describe, it, expect } from 'vitest';
import {
  createEmptyInventory,
  createStarterInventory,
  canUsePowerUp,
  getUnrevealedLetters,
  useHint,
  useSkip,
  useExtraLife,
  deductPowerUp,
  awardPowerUps,
  getPowerUpName,
  getPowerUpIcon,
  getPowerUpPenalty,
  MAX_INVENTORY,
  POWERUP_PENALTY,
  DEFAULT_REWARD_CONFIG,
  type PowerUpInventory,
  type PowerUpType,
} from '../powerups';
import { createRound, guessLetter, MAX_WRONG_GUESSES } from '../hangman-logic';
import type { Round } from '../types';

function makeRound(word = 'HELLO'): Round {
  return createRound(word, 'general', 1);
}

function makeInventory(hint = 0, skip = 0, extraLife = 0): PowerUpInventory {
  return { hint, skip, 'extra-life': extraLife };
}

// ---------------------------------------------------------------------------
// createEmptyInventory
// ---------------------------------------------------------------------------
describe('createEmptyInventory', () => {
  it('should return zero for all power-up types', () => {
    const inv = createEmptyInventory();
    expect(inv.hint).toBe(0);
    expect(inv.skip).toBe(0);
    expect(inv['extra-life']).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// createStarterInventory
// ---------------------------------------------------------------------------
describe('createStarterInventory', () => {
  it('should return one for each power-up type', () => {
    const inv = createStarterInventory();
    expect(inv.hint).toBe(1);
    expect(inv.skip).toBe(1);
    expect(inv['extra-life']).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// canUsePowerUp
// ---------------------------------------------------------------------------
describe('canUsePowerUp', () => {
  it('should allow hint when inventory > 0 and unrevealed letters exist', () => {
    const round = makeRound();
    const inv = makeInventory(1, 0, 0);
    const result = canUsePowerUp('hint', round, inv);
    expect(result.allowed).toBe(true);
  });

  it('should deny hint when inventory is 0', () => {
    const round = makeRound();
    const inv = makeInventory(0, 0, 0);
    const result = canUsePowerUp('hint', round, inv);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('No hint');
  });

  it('should deny hint when round is complete', () => {
    let round = makeRound('A');
    round = guessLetter(round, 'A').round;
    const inv = makeInventory(1, 0, 0);
    const result = canUsePowerUp('hint', round, inv);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('No active round');
  });

  it('should deny hint when all letters are revealed', () => {
    let round = makeRound('AB');
    round = guessLetter(round, 'A').round;
    round = guessLetter(round, 'B').round;
    const inv = makeInventory(1, 0, 0);
    const result = canUsePowerUp('hint', round, inv);
    expect(result.allowed).toBe(false);
  });

  it('should allow skip when inventory > 0 and round is active', () => {
    const round = makeRound();
    const inv = makeInventory(0, 1, 0);
    const result = canUsePowerUp('skip', round, inv);
    expect(result.allowed).toBe(true);
  });

  it('should deny skip when inventory is 0', () => {
    const round = makeRound();
    const inv = makeInventory(0, 0, 0);
    const result = canUsePowerUp('skip', round, inv);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('No skip');
  });

  it('should allow extra-life when inventory > 0 and wrong guesses > 0', () => {
    let round = makeRound();
    round = guessLetter(round, 'Z').round; // wrong guess
    const inv = makeInventory(0, 0, 1);
    const result = canUsePowerUp('extra-life', round, inv);
    expect(result.allowed).toBe(true);
  });

  it('should deny extra-life when no wrong guesses', () => {
    const round = makeRound();
    const inv = makeInventory(0, 0, 1);
    const result = canUsePowerUp('extra-life', round, inv);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('No wrong guesses');
  });

  it('should deny extra-life when inventory is 0', () => {
    let round = makeRound();
    round = guessLetter(round, 'Z').round;
    const inv = makeInventory(0, 0, 0);
    const result = canUsePowerUp('extra-life', round, inv);
    expect(result.allowed).toBe(false);
  });

  it('should deny all power-ups for a complete round', () => {
    let round = makeRound('A');
    round = guessLetter(round, 'A').round;
    const inv = createStarterInventory();
    for (const type of ['hint', 'skip', 'extra-life'] as PowerUpType[]) {
      const result = canUsePowerUp(type, round, inv);
      expect(result.allowed).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// getUnrevealedLetters
// ---------------------------------------------------------------------------
describe('getUnrevealedLetters', () => {
  it('should return all unique letters for a fresh round', () => {
    const round = makeRound('HELLO');
    const unrevealed = getUnrevealedLetters(round);
    // H, E, L, O are unique letters
    expect(unrevealed.sort()).toEqual(['E', 'H', 'L', 'O'].sort());
  });

  it('should exclude already guessed/revealed letters', () => {
    let round = makeRound('HELLO');
    round = guessLetter(round, 'H').round;
    round = guessLetter(round, 'E').round;
    const unrevealed = getUnrevealedLetters(round);
    expect(unrevealed.sort()).toEqual(['L', 'O'].sort());
  });

  it('should exclude wrong guesses', () => {
    let round = makeRound('HELLO');
    round = guessLetter(round, 'Z').round;
    const unrevealed = getUnrevealedLetters(round);
    // Z is not in the word so it's not in unrevealed
    expect(unrevealed).not.toContain('Z');
  });

  it('should return empty for a fully revealed word', () => {
    let round = makeRound('AB');
    round = guessLetter(round, 'A').round;
    round = guessLetter(round, 'B').round;
    const unrevealed = getUnrevealedLetters(round);
    expect(unrevealed).toEqual([]);
  });

  it('should not contain duplicates', () => {
    const round = makeRound('AAABBB');
    const unrevealed = getUnrevealedLetters(round);
    expect(unrevealed).toEqual(['A', 'B']);
  });
});

// ---------------------------------------------------------------------------
// useHint
// ---------------------------------------------------------------------------
describe('useHint', () => {
  it('should reveal a random unrevealed letter', () => {
    const round = makeRound('HELLO');
    const inv = makeInventory(1, 0, 0);
    const result = useHint(round, inv);
    expect(result.success).toBe(true);
    expect(result.type).toBe('hint');
    // One letter should be revealed
    const revealed = result.round.revealedLetters;
    expect(revealed.size).toBeGreaterThan(round.revealedLetters.size);
  });

  it('should add the revealed letter to guessedLetters too', () => {
    const round = makeRound('HELLO');
    const inv = makeInventory(1, 0, 0);
    const result = useHint(round, inv);
    expect(result.success).toBe(true);
    // The new letter should be in both sets
    for (const letter of result.round.revealedLetters) {
      expect(result.round.guessedLetters.has(letter)).toBe(true);
    }
  });

  it('should detect win when hint reveals the last letter', () => {
    let round = makeRound('HI');
    round = guessLetter(round, 'H').round;
    // Only 'I' is left unrevealed
    const inv = makeInventory(1, 0, 0);
    const result = useHint(round, inv);
    expect(result.success).toBe(true);
    expect(result.round.isComplete).toBe(true);
    expect(result.round.isWon).toBe(true);
  });

  it('should fail when inventory is empty', () => {
    const round = makeRound();
    const inv = makeInventory(0, 0, 0);
    const result = useHint(round, inv);
    expect(result.success).toBe(false);
    expect(result.round).toBe(round); // unchanged
  });

  it('should fail when no unrevealed letters', () => {
    let round = makeRound('AB');
    round = guessLetter(round, 'A').round;
    round = guessLetter(round, 'B').round;
    const inv = makeInventory(1, 0, 0);
    const result = useHint(round, inv);
    expect(result.success).toBe(false);
  });

  it('should not mutate the original round', () => {
    const round = makeRound('HELLO');
    const originalRevealed = new Set(round.revealedLetters);
    const inv = makeInventory(1, 0, 0);
    useHint(round, inv);
    expect(round.revealedLetters).toEqual(originalRevealed);
  });

  it('should include the revealed letter in the message', () => {
    const round = makeRound('HELLO');
    const inv = makeInventory(1, 0, 0);
    const result = useHint(round, inv);
    expect(result.success).toBe(true);
    // Message should mention a letter
    expect(result.message).toContain('"');
  });
});

// ---------------------------------------------------------------------------
// useSkip
// ---------------------------------------------------------------------------
describe('useSkip', () => {
  it('should mark the round as complete and lost', () => {
    const round = makeRound('HELLO');
    const inv = makeInventory(0, 1, 0);
    const result = useSkip(round, inv);
    expect(result.success).toBe(true);
    expect(result.round.isComplete).toBe(true);
    expect(result.round.isWon).toBe(false);
  });

  it('should include the skipped word in the message', () => {
    const round = makeRound('HELLO');
    const inv = makeInventory(0, 1, 0);
    const result = useSkip(round, inv);
    expect(result.message).toContain('HELLO');
  });

  it('should include "no life lost" in the message', () => {
    const round = makeRound();
    const inv = makeInventory(0, 1, 0);
    const result = useSkip(round, inv);
    expect(result.message).toContain('no life lost');
  });

  it('should fail when inventory is empty', () => {
    const round = makeRound();
    const inv = makeInventory(0, 0, 0);
    const result = useSkip(round, inv);
    expect(result.success).toBe(false);
  });

  it('should fail when round is already complete', () => {
    let round = makeRound('A');
    round = guessLetter(round, 'A').round;
    const inv = makeInventory(0, 1, 0);
    const result = useSkip(round, inv);
    expect(result.success).toBe(false);
  });

  it('should not mutate the original round', () => {
    const round = makeRound('HELLO');
    const originalComplete = round.isComplete;
    const inv = makeInventory(0, 1, 0);
    useSkip(round, inv);
    expect(round.isComplete).toBe(originalComplete);
  });
});

// ---------------------------------------------------------------------------
// useExtraLife
// ---------------------------------------------------------------------------
describe('useExtraLife', () => {
  it('should reduce wrong guesses by 1', () => {
    let round = makeRound();
    round = guessLetter(round, 'Z').round; // 1 wrong guess
    expect(round.wrongGuesses).toBe(1);
    const inv = makeInventory(0, 0, 1);
    const result = useExtraLife(round, inv);
    expect(result.success).toBe(true);
    expect(result.round.wrongGuesses).toBe(0);
  });

  it('should recover from 6 wrong guesses (loss)', () => {
    let round = makeRound('A');
    round = guessLetter(round, 'B').round;
    round = guessLetter(round, 'C').round;
    round = guessLetter(round, 'D').round;
    round = guessLetter(round, 'E').round;
    round = guessLetter(round, 'F').round;
    round = guessLetter(round, 'G').round;
    expect(round.wrongGuesses).toBe(6);
    expect(round.isComplete).toBe(true);

    const inv = makeInventory(0, 0, 1);
    const result = useExtraLife(round, inv);
    expect(result.success).toBe(true);
    expect(result.round.wrongGuesses).toBe(5);
    expect(result.round.isComplete).toBe(false);
    expect(result.round.isWon).toBe(false);
  });

  it('should fail when no wrong guesses exist', () => {
    const round = makeRound();
    const inv = makeInventory(0, 0, 1);
    const result = useExtraLife(round, inv);
    expect(result.success).toBe(false);
  });

  it('should fail when inventory is empty', () => {
    let round = makeRound();
    round = guessLetter(round, 'Z').round;
    const inv = makeInventory(0, 0, 0);
    const result = useExtraLife(round, inv);
    expect(result.success).toBe(false);
  });

  it('should not reduce wrong guesses below 0', () => {
    let round = makeRound();
    round = guessLetter(round, 'Z').round;
    const inv = makeInventory(0, 0, 1);
    const result = useExtraLife(round, inv);
    expect(result.round.wrongGuesses).toBe(0);
  });

  it('should not mutate the original round', () => {
    let round = makeRound();
    round = guessLetter(round, 'Z').round;
    const originalWrong = round.wrongGuesses;
    const inv = makeInventory(0, 0, 1);
    useExtraLife(round, inv);
    expect(round.wrongGuesses).toBe(originalWrong);
  });
});

// ---------------------------------------------------------------------------
// deductPowerUp
// ---------------------------------------------------------------------------
describe('deductPowerUp', () => {
  it('should deduct 1 from the specified power-up type', () => {
    const inv = makeInventory(2, 1, 1);
    const result = deductPowerUp(inv, 'hint');
    expect(result.hint).toBe(1);
    expect(result.skip).toBe(1);
    expect(result['extra-life']).toBe(1);
  });

  it('should not go below 0', () => {
    const inv = makeInventory(0, 0, 0);
    const result = deductPowerUp(inv, 'hint');
    expect(result.hint).toBe(0);
  });

  it('should not mutate the original inventory', () => {
    const inv = makeInventory(2, 0, 0);
    deductPowerUp(inv, 'hint');
    expect(inv.hint).toBe(2);
  });

  it('should work for skip type', () => {
    const inv = makeInventory(0, 3, 0);
    const result = deductPowerUp(inv, 'skip');
    expect(result.skip).toBe(2);
  });

  it('should work for extra-life type', () => {
    const inv = makeInventory(0, 0, 2);
    const result = deductPowerUp(inv, 'extra-life');
    expect(result['extra-life']).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// awardPowerUps
// ---------------------------------------------------------------------------
describe('awardPowerUps', () => {
  it('should award a hint every 2 wins', () => {
    const inv = createEmptyInventory();
    const result = awardPowerUps(inv, 2);
    expect(result.hint).toBe(1);
  });

  it('should award a skip every 3 wins', () => {
    const inv = createEmptyInventory();
    const result = awardPowerUps(inv, 3);
    expect(result.skip).toBe(1);
  });

  it('should award an extra-life every 5 wins', () => {
    const inv = createEmptyInventory();
    const result = awardPowerUps(inv, 5);
    expect(result['extra-life']).toBe(1);
  });

  it('should not award anything at streak 1', () => {
    const inv = createEmptyInventory();
    const result = awardPowerUps(inv, 1);
    expect(result.hint).toBe(0);
    expect(result.skip).toBe(0);
    expect(result['extra-life']).toBe(0);
  });

  it('should not award anything at streak 0', () => {
    const inv = createEmptyInventory();
    const result = awardPowerUps(inv, 0);
    expect(result.hint).toBe(0);
    expect(result.skip).toBe(0);
    expect(result['extra-life']).toBe(0);
  });

  it('should award multiple power-ups at streak 6 (hint + skip)', () => {
    const inv = createEmptyInventory();
    const result = awardPowerUps(inv, 6);
    expect(result.hint).toBe(1); // 6 % 2 === 0
    expect(result.skip).toBe(1); // 6 % 3 === 0
    expect(result['extra-life']).toBe(0);
  });

  it('should award all three at streak 30', () => {
    const inv = createEmptyInventory();
    const result = awardPowerUps(inv, 30);
    expect(result.hint).toBe(1); // 30 % 2 === 0
    expect(result.skip).toBe(1); // 30 % 3 === 0
    expect(result['extra-life']).toBe(1); // 30 % 5 === 0
  });

  it('should not exceed max inventory', () => {
    const inv = { hint: MAX_INVENTORY.hint, skip: MAX_INVENTORY.skip, 'extra-life': MAX_INVENTORY['extra-life'] };
    const result = awardPowerUps(inv, 30);
    expect(result.hint).toBe(MAX_INVENTORY.hint);
    expect(result.skip).toBe(MAX_INVENTORY.skip);
    expect(result['extra-life']).toBe(MAX_INVENTORY['extra-life']);
  });

  it('should not mutate the original inventory', () => {
    const inv = createEmptyInventory();
    awardPowerUps(inv, 2);
    expect(inv.hint).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// display helpers
// ---------------------------------------------------------------------------
describe('getPowerUpName', () => {
  it('should return display name for hint', () => {
    expect(getPowerUpName('hint')).toBe('Hint');
  });
  it('should return display name for skip', () => {
    expect(getPowerUpName('skip')).toBe('Skip Word');
  });
  it('should return display name for extra-life', () => {
    expect(getPowerUpName('extra-life')).toBe('Extra Life');
  });
});

describe('getPowerUpIcon', () => {
  it('should return emoji for hint', () => {
    expect(getPowerUpIcon('hint')).toBe('💡');
  });
  it('should return emoji for skip', () => {
    expect(getPowerUpIcon('skip')).toBe('⏭️');
  });
  it('should return emoji for extra-life', () => {
    expect(getPowerUpIcon('extra-life')).toBe('❤️');
  });
});

describe('getPowerUpPenalty', () => {
  it('should return the correct penalty for each type', () => {
    expect(getPowerUpPenalty('hint')).toBe(POWERUP_PENALTY.hint);
    expect(getPowerUpPenalty('skip')).toBe(POWERUP_PENALTY.skip);
    expect(getPowerUpPenalty('extra-life')).toBe(POWERUP_PENALTY['extra-life']);
  });
});

// ---------------------------------------------------------------------------
// MAX_INVENTORY
// ---------------------------------------------------------------------------
describe('MAX_INVENTORY', () => {
  it('should have positive limits for all types', () => {
    expect(MAX_INVENTORY.hint).toBeGreaterThan(0);
    expect(MAX_INVENTORY.skip).toBeGreaterThan(0);
    expect(MAX_INVENTORY['extra-life']).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Integration: full power-up workflow
// ---------------------------------------------------------------------------
describe('integration: full power-up workflow', () => {
  it('should use hint then deduct from inventory', () => {
    let round = makeRound('WORLD');
    let inv = makeInventory(1, 0, 0);
    const result = useHint(round, inv);
    expect(result.success).toBe(true);
    inv = deductPowerUp(inv, 'hint');
    expect(inv.hint).toBe(0);
  });

  it('should recover from near-loss with extra-life', () => {
    let round = makeRound('A');
    // Make 5 wrong guesses
    for (const letter of ['B', 'C', 'D', 'E', 'F']) {
      round = guessLetter(round, letter).round;
    }
    expect(round.wrongGuesses).toBe(5);
    expect(round.isComplete).toBe(false);

    // One more wrong guess = loss
    round = guessLetter(round, 'G').round;
    expect(round.isComplete).toBe(true);
    expect(round.isWon).toBe(false);

    // Use extra-life to recover
    let inv = makeInventory(0, 0, 1);
    const result = useExtraLife(round, inv);
    expect(result.success).toBe(true);
    expect(result.round.isComplete).toBe(false);
    expect(result.round.wrongGuesses).toBe(5);

    // Now guess correctly to win
    inv = deductPowerUp(inv, 'extra-life');
    const finalResult = guessLetter(result.round, 'A');
    expect(finalResult.round.isComplete).toBe(true);
    expect(finalResult.round.isWon).toBe(true);
  });

  it('should skip a hard word, then win the next round', () => {
    // Round 1: skip
    const round1 = makeRound('XYLOPHONE');
    let inv = makeInventory(0, 1, 0);
    const skipResult = useSkip(round1, inv);
    expect(skipResult.success).toBe(true);
    expect(skipResult.round.isComplete).toBe(true);
    inv = deductPowerUp(inv, 'skip');
    expect(inv.skip).toBe(0);

    // Round 2: win normally
    const round2 = makeRound('HI');
    let r = guessLetter(round2, 'H').round;
    r = guessLetter(r, 'I').round;
    expect(r.isComplete).toBe(true);
    expect(r.isWon).toBe(true);
  });

  it('should earn power-ups from win streaks', () => {
    let inv = createEmptyInventory();
    // Simulate 2 wins
    inv = awardPowerUps(inv, 2);
    expect(inv.hint).toBe(1);
    // 3 more wins (streak = 5)
    inv = awardPowerUps(inv, 5);
    expect(inv['extra-life']).toBe(1);
  });
});
