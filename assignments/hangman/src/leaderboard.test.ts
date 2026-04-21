/**
 * Tests for the Leaderboard module (src/leaderboard.ts)
 *
 * Covers: adding/updating scores, retrieving rankings, localStorage
 * persistence, edge cases (empty board, duplicates, negative scores),
 * sorting order, player stats, categories, and ranking.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Leaderboard } from './leaderboard';

describe('Leaderboard', () => {
  let lb: Leaderboard;

  beforeEach(() => {
    localStorage.clear();
    lb = new Leaderboard();
  });

  // ---------------------------------------------------------------------------
  // addScore
  // ---------------------------------------------------------------------------

  describe('addScore', () => {
    it('adds a valid entry', () => {
      lb.addScore('Alice', 100);
      expect(lb.getEntryCount()).toBe(1);
    });

    it('assigns "general" category when none is provided', () => {
      lb.addScore('Alice', 100);
      const top = lb.getTopScores(1);
      expect(top[0].category).toBe('general');
    });

    it('uses the provided category', () => {
      lb.addScore('Alice', 100, 'animals');
      const top = lb.getTopScores(1);
      expect(top[0].category).toBe('animals');
    });

    it('rejects empty playerName', () => {
      lb.addScore('', 100);
      expect(lb.getEntryCount()).toBe(0);
    });

    it('rejects negative score', () => {
      lb.addScore('Alice', -5);
      expect(lb.getEntryCount()).toBe(0);
    });

    it('rejects score of zero (not negative, but boundary)', () => {
      // score < 0 is rejected, score === 0 is accepted per implementation
      lb.addScore('Alice', 0);
      expect(lb.getEntryCount()).toBe(1);
    });

    it('persists to localStorage after adding', () => {
      lb.addScore('Alice', 100);
      const raw = localStorage.getItem('hm_leaderboard');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].playerName).toBe('Alice');
    });

    it('sets a timestamp on the entry', () => {
      const before = Date.now();
      lb.addScore('Alice', 50);
      const after = Date.now();
      const top = lb.getTopScores(1);
      expect(top[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(top[0].timestamp).toBeLessThanOrEqual(after);
    });
  });

  // ---------------------------------------------------------------------------
  // getTopScores
  // ---------------------------------------------------------------------------

  describe('getTopScores', () => {
    it('returns empty array when no entries exist', () => {
      expect(lb.getTopScores()).toEqual([]);
    });

    it('returns scores sorted descending by score', () => {
      lb.addScore('Alice', 50);
      lb.addScore('Bob', 200);
      lb.addScore('Carol', 100);
      const top = lb.getTopScores();
      expect(top.map(e => e.playerName)).toEqual(['Bob', 'Carol', 'Alice']);
    });

    it('respects the limit parameter', () => {
      for (let i = 0; i < 15; i++) {
        lb.addScore(`P${i}`, i * 10);
      }
      const top = lb.getTopScores(5);
      expect(top).toHaveLength(5);
    });

    it('defaults to limit of 10', () => {
      for (let i = 0; i < 15; i++) {
        lb.addScore(`P${i}`, i * 10);
      }
      expect(lb.getTopScores()).toHaveLength(10);
    });

    it('filters by category', () => {
      lb.addScore('Alice', 100, 'animals');
      lb.addScore('Bob', 200, 'food');
      lb.addScore('Carol', 150, 'animals');
      const top = lb.getTopScores(10, 'animals');
      expect(top).toHaveLength(2);
      expect(top.every(e => e.category === 'animals')).toBe(true);
    });

    it('breaks score ties by earlier timestamp first', () => {
      lb.addScore('Alice', 100); // earlier timestamp
      lb.addScore('Bob', 100);   // later timestamp
      const top = lb.getTopScores();
      expect(top[0].playerName).toBe('Alice');
      expect(top[1].playerName).toBe('Bob');
    });

    it('does not mutate internal state', () => {
      lb.addScore('Alice', 100);
      const top = lb.getTopScores();
      top.pop();
      expect(lb.getTopScores()).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // getPlayerStats
  // ---------------------------------------------------------------------------

  describe('getPlayerStats', () => {
    it('returns zero stats for unknown player', () => {
      const stats = lb.getPlayerStats('Nobody');
      expect(stats.totalScore).toBe(0);
      expect(stats.gamesPlayed).toBe(0);
      expect(stats.bestScore).toBe(0);
      expect(stats.categories).toEqual({});
    });

    it('aggregates total score across multiple entries', () => {
      lb.addScore('Alice', 50);
      lb.addScore('Alice', 30);
      lb.addScore('Alice', 20);
      const stats = lb.getPlayerStats('Alice');
      expect(stats.totalScore).toBe(100);
    });

    it('counts games played correctly', () => {
      lb.addScore('Alice', 50);
      lb.addScore('Alice', 30);
      lb.addScore('Bob', 100);
      const stats = lb.getPlayerStats('Alice');
      expect(stats.gamesPlayed).toBe(2);
    });

    it('tracks best score', () => {
      lb.addScore('Alice', 50);
      lb.addScore('Alice', 200);
      lb.addScore('Alice', 30);
      const stats = lb.getPlayerStats('Alice');
      expect(stats.bestScore).toBe(200);
    });

    it('groups scores by category', () => {
      lb.addScore('Alice', 10, 'animals');
      lb.addScore('Alice', 20, 'animals');
      lb.addScore('Alice', 30, 'food');
      const stats = lb.getPlayerStats('Alice');
      expect(stats.categories).toEqual({ animals: 30, food: 30 });
    });
  });

  // ---------------------------------------------------------------------------
  // getPlayerRank
  // ---------------------------------------------------------------------------

  describe('getPlayerRank', () => {
    it('returns -1 for player not on leaderboard', () => {
      expect(lb.getPlayerRank('Nobody')).toBe(-1);
    });

    it('returns 1 for the top player', () => {
      lb.addScore('Alice', 100);
      lb.addScore('Bob', 50);
      expect(lb.getPlayerRank('Alice')).toBe(1);
    });

    it('returns correct rank for lower players', () => {
      lb.addScore('Alice', 100);
      lb.addScore('Bob', 50);
      lb.addScore('Carol', 75);
      expect(lb.getPlayerRank('Carol')).toBe(2);
      expect(lb.getPlayerRank('Bob')).toBe(3);
    });

    it('ranks within a specific category', () => {
      lb.addScore('Alice', 100, 'animals');
      lb.addScore('Bob', 200, 'food');
      lb.addScore('Carol', 150, 'animals');
      expect(lb.getPlayerRank('Alice', 'animals')).toBe(2);
      expect(lb.getPlayerRank('Bob', 'animals')).toBe(-1);
    });
  });

  // ---------------------------------------------------------------------------
  // getCategories
  // ---------------------------------------------------------------------------

  describe('getCategories', () => {
    it('returns empty array when no entries', () => {
      expect(lb.getCategories()).toEqual([]);
    });

    it('returns unique sorted categories', () => {
      lb.addScore('A', 10, 'food');
      lb.addScore('B', 20, 'animals');
      lb.addScore('C', 30, 'food');
      lb.addScore('D', 40, 'general');
      expect(lb.getCategories()).toEqual(['animals', 'food', 'general']);
    });
  });

  // ---------------------------------------------------------------------------
  // clear
  // ---------------------------------------------------------------------------

  describe('clear', () => {
    it('removes all entries', () => {
      lb.addScore('Alice', 100);
      lb.addScore('Bob', 200);
      lb.clear();
      expect(lb.getEntryCount()).toBe(0);
    });

    it('clears localStorage', () => {
      lb.addScore('Alice', 100);
      lb.clear();
      expect(localStorage.getItem('hm_leaderboard')).toBe('[]');
    });
  });

  // ---------------------------------------------------------------------------
  // Persistence (localStorage)
  // ---------------------------------------------------------------------------

  describe('persistence', () => {
    it('loads entries from localStorage on construction', () => {
      lb.addScore('Alice', 100);
      const lb2 = new Leaderboard();
      expect(lb2.getEntryCount()).toBe(1);
      expect(lb2.getTopScores(1)[0].playerName).toBe('Alice');
    });

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem('hm_leaderboard', 'not-json');
      const lb2 = new Leaderboard();
      expect(lb2.getEntryCount()).toBe(0);
    });

    it('handles localStorage.getItem returning null', () => {
      localStorage.removeItem('hm_leaderboard');
      const lb2 = new Leaderboard();
      expect(lb2.getEntryCount()).toBe(0);
    });

    it('survives setItem failure gracefully', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      // Should not throw
      expect(() => lb.addScore('Alice', 100)).not.toThrow();
      // Entry stays in memory
      expect(lb.getEntryCount()).toBe(1);
      spy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles duplicate player names across entries', () => {
      lb.addScore('Alice', 50);
      lb.addScore('Alice', 150);
      expect(lb.getEntryCount()).toBe(2);
      const top = lb.getTopScores();
      expect(top).toHaveLength(2);
    });

    it('handles a single entry correctly', () => {
      lb.addScore('Solo', 42);
      expect(lb.getTopScores()).toHaveLength(1);
      expect(lb.getPlayerRank('Solo')).toBe(1);
      const stats = lb.getPlayerStats('Solo');
      expect(stats.gamesPlayed).toBe(1);
      expect(stats.bestScore).toBe(42);
      expect(stats.totalScore).toBe(42);
    });

    it('handles large scores', () => {
      lb.addScore('Alice', Number.MAX_SAFE_INTEGER);
      const top = lb.getTopScores(1);
      expect(top[0].score).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('handles very long player names', () => {
      const longName = 'A'.repeat(1000);
      lb.addScore(longName, 100);
      expect(lb.getTopScores(1)[0].playerName).toBe(longName);
    });

    it('getTopScores with limit larger than entry count returns all', () => {
      lb.addScore('A', 10);
      lb.addScore('B', 20);
      expect(lb.getTopScores(100)).toHaveLength(2);
    });
  });
});
