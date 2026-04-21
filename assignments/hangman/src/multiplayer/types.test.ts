/**
 * Tests for multiplayer type utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  generatePlayerId,
  generatePlayerColor,
  generateRoomCode,
  PLAYER_COLORS,
} from './types';

describe('multiplayer types utilities', () => {
  describe('PLAYER_COLORS', () => {
    it('has 8 predefined colors', () => {
      expect(PLAYER_COLORS).toHaveLength(8);
    });

    it('contains valid hex color numbers', () => {
      PLAYER_COLORS.forEach(color => {
        expect(typeof color).toBe('number');
        expect(color).toBeGreaterThan(0);
        expect(color).toBeLessThanOrEqual(0xffffff);
      });
    });
  });

  describe('generatePlayerColor', () => {
    it('returns a color from the predefined palette', () => {
      for (let i = 0; i < 50; i++) {
        const color = generatePlayerColor();
        expect(PLAYER_COLORS).toContain(color);
      }
    });

    it('can return any color from the palette (probabilistic)', () => {
      const returnedColors = new Set<number>();
      for (let i = 0; i < 200; i++) {
        returnedColors.add(generatePlayerColor());
      }
      // With 200 iterations and 8 options, we should get at least 6 distinct colors
      expect(returnedColors.size).toBeGreaterThanOrEqual(6);
    });
  });

  describe('generatePlayerId', () => {
    it('starts with "player_" prefix', () => {
      const id = generatePlayerId();
      expect(id).toMatch(/^player_/);
    });

    it('contains a timestamp', () => {
      const before = Date.now();
      const id = generatePlayerId();
      const after = Date.now();

      // Extract timestamp from id: player_{timestamp}_{random}
      const parts = id.split('_');
      expect(parts.length).toBe(3);
      const timestamp = parseInt(parts[1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('generates unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generatePlayerId());
      }
      // All IDs should be unique (with very high probability)
      expect(ids.size).toBe(100);
    });

    it('has a random suffix of at least 9 characters', () => {
      const id = generatePlayerId();
      const parts = id.split('_');
      const suffix = parts[2];
      expect(suffix.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe('generateRoomCode', () => {
    it('returns a 4-digit string', () => {
      const code = generateRoomCode();
      expect(code).toMatch(/^\d{4}$/);
    });

    it('returns a number between 1000 and 9999', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateRoomCode();
        const num = parseInt(code, 10);
        expect(num).toBeGreaterThanOrEqual(1000);
        expect(num).toBeLessThanOrEqual(9999);
      }
    });

    it('generates a string type result', () => {
      const code = generateRoomCode();
      expect(typeof code).toBe('string');
    });

    it('generates variety of codes (probabilistic)', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 200; i++) {
        codes.add(generateRoomCode());
      }
      // With 200 iterations and ~9000 options, we should get many unique codes
      expect(codes.size).toBeGreaterThanOrEqual(50);
    });
  });
});
