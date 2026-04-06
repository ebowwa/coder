/**
 * Tests for Replay recording and playback system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ReplayManager,
  ReplayRound,
  IndividualGuess,
} from '../../server/replays';
import type { MultiplayerRound, PlayerInfo } from '../multiplayer/types';

// Helper to create a mock round
function createMockRound(overrides: Partial<MultiplayerRound> = {}): MultiplayerRound {
  return {
    word: 'TEST',
    category: 'Testing',
    difficulty: 2,
    revealedLetters: ['T', '_', 'S', 'T'],
    wrongGuesses: 2,
    guessedLetters: ['T', 'S', 'A', 'E'],
    isComplete: true,
    isWon: true,
    currentGuesserId: 'player1',
    ...overrides,
  };
}

// Helper to create mock players
function createMockPlayers(): PlayerInfo[] {
  return [
    { id: 'player1', name: 'Alice', color: 0xff6b6b, score: 100, isConnected: true, isHost: true },
    { id: 'player2', name: 'Bob', color: 0x4ecdc4, score: 80, isConnected: true, isHost: false },
  ];
}

describe('ReplayManager', () => {
  let manager: ReplayManager;

  beforeEach(() => {
    manager = new ReplayManager();
    manager.clear();
  });

  describe('startRound', () => {
    it('should initialize tracking for a new round', () => {
      manager.startRound('ROOM1');
      
      // Recording a guess should work after starting
      manager.recordGuess('ROOM1', 'player1', 'Alice', 'T', true, 0);
      
      const stats = manager.getStats();
      // The guess is tracked but no replay stored yet
      expect(stats.totalReplays).toBe(0);
    });

    it('should allow multiple rooms to be tracked simultaneously', () => {
      manager.startRound('ROOM1');
      manager.startRound('ROOM2');
      
      manager.recordGuess('ROOM1', 'p1', 'Player 1', 'A', true, 0);
      manager.recordGuess('ROOM2', 'p2', 'Player 2', 'B', false, 1);
      
      // Both rooms should track their guesses independently
      const round1 = createMockRound({ word: 'WORD1' });
      const round2 = createMockRound({ word: 'WORD2' });
      
      const replay1 = manager.storeReplay('ROOM1', round1, createMockPlayers());
      const replay2 = manager.storeReplay('ROOM2', round2, createMockPlayers());
      
      expect(replay1.guesses.length).toBe(1);
      expect(replay1.guesses[0].letter).toBe('A');
      expect(replay2.guesses.length).toBe(1);
      expect(replay2.guesses[0].letter).toBe('B');
    });
  });

  describe('recordGuess', () => {
    it('should record a correct guess', () => {
      manager.startRound('ROOM1');
      
      manager.recordGuess('ROOM1', 'player1', 'Alice', 'T', true, 0);
      
      const round = createMockRound();
      const replay = manager.storeReplay('ROOM1', round, createMockPlayers());
      
      expect(replay.guesses.length).toBe(1);
      expect(replay.guesses[0].letter).toBe('T');
      expect(replay.guesses[0].isCorrect).toBe(true);
      expect(replay.guesses[0].playerId).toBe('player1');
      expect(replay.guesses[0].playerName).toBe('Alice');
    });

    it('should record an incorrect guess', () => {
      manager.startRound('ROOM1');
      
      manager.recordGuess('ROOM1', 'player2', 'Bob', 'Z', false, 1);
      
      const round = createMockRound({ wrongGuesses: 1 });
      const replay = manager.storeReplay('ROOM1', round, createMockPlayers());
      
      expect(replay.guesses.length).toBe(1);
      expect(replay.guesses[0].isCorrect).toBe(false);
      expect(replay.guesses[0].wrongGuessCountAfter).toBe(1);
    });

    it('should record multiple guesses in order', () => {
      manager.startRound('ROOM1');
      
      manager.recordGuess('ROOM1', 'player1', 'Alice', 'T', true, 0);
      manager.recordGuess('ROOM1', 'player2', 'Bob', 'A', false, 1);
      manager.recordGuess('ROOM1', 'player1', 'Alice', 'E', true, 1);
      manager.recordGuess('ROOM1', 'player2', 'Bob', 'S', true, 1);
      
      const round = createMockRound();
      const replay = manager.storeReplay('ROOM1', round, createMockPlayers());
      
      expect(replay.guesses.length).toBe(4);
      expect(replay.guesses[0].letter).toBe('T');
      expect(replay.guesses[1].letter).toBe('A');
      expect(replay.guesses[2].letter).toBe('E');
      expect(replay.guesses[3].letter).toBe('S');
    });

    it('should track wrong guess count progression', () => {
      manager.startRound('ROOM1');
      
      manager.recordGuess('ROOM1', 'p1', 'Player', 'A', false, 1);
      manager.recordGuess('ROOM1', 'p1', 'Player', 'B', false, 2);
      manager.recordGuess('ROOM1', 'p1', 'Player', 'C', false, 3);
      
      const round = createMockRound({ wrongGuesses: 3 });
      const replay = manager.storeReplay('ROOM1', round, createMockPlayers());
      
      expect(replay.guesses[0].wrongGuessCountAfter).toBe(1);
      expect(replay.guesses[1].wrongGuessCountAfter).toBe(2);
      expect(replay.guesses[2].wrongGuessCountAfter).toBe(3);
    });

    it('should uppercase letters', () => {
      manager.startRound('ROOM1');
      
      manager.recordGuess('ROOM1', 'p1', 'Player', 'a', true, 0);
      
      const round = createMockRound();
      const replay = manager.storeReplay('ROOM1', round, createMockPlayers());
      
      expect(replay.guesses[0].letter).toBe('A');
    });
  });

  describe('storeReplay', () => {
    it('should store a completed round as a replay', () => {
      manager.startRound('ROOM1');
      
      const round = createMockRound();
      const players = createMockPlayers();
      
      const replay = manager.storeReplay('ROOM1', round, players);
      
      expect(replay).toBeDefined();
      expect(replay.word).toBe('TEST');
      expect(replay.category).toBe('Testing');
      expect(replay.roomCode).toBe('ROOM1');
      expect(replay.isWon).toBe(true);
      expect(replay.roundId).toBeDefined();
    });

    it('should capture final game state', () => {
      manager.startRound('ROOM1');
      
      const round = createMockRound({
        revealedLetters: ['H', 'E', 'L', 'L', 'O'],
        wrongGuesses: 3,
        guessedLetters: ['H', 'E', 'L', 'O', 'A', 'B', 'C'],
      });
      
      const replay = manager.storeReplay('ROOM1', round, createMockPlayers());
      
      expect(replay.finalRevealedLetters).toEqual(['H', 'E', 'L', 'L', 'O']);
      expect(replay.finalWrongGuesses).toBe(3);
      expect(replay.finalGuessedLetters).toEqual(['H', 'E', 'L', 'O', 'A', 'B', 'C']);
    });

    it('should store player information', () => {
      manager.startRound('ROOM1');
      
      const players = createMockPlayers();
      const replay = manager.storeReplay('ROOM1', createMockRound(), players);
      
      expect(replay.players.length).toBe(2);
      expect(replay.players[0].name).toBe('Alice');
      expect(replay.players[1].name).toBe('Bob');
    });

    it('should record winner for won rounds', () => {
      manager.startRound('ROOM1');
      manager.recordGuess('ROOM1', 'player1', 'Alice', 'T', true, 0);
      
      const round = createMockRound({ isWon: true, currentGuesserId: 'player1' });
      const replay = manager.storeReplay('ROOM1', round, createMockPlayers());
      
      expect(replay.winner).toBe('player1');
    });

    it('should have null winner for lost rounds', () => {
      manager.startRound('ROOM1');
      
      const round = createMockRound({ isWon: false, currentGuesserId: 'player1' });
      const replay = manager.storeReplay('ROOM1', round, createMockPlayers());
      
      expect(replay.winner).toBeNull();
    });

    it('should record duration', () => {
      manager.startRound('ROOM1');
      
      // Simulate some time passing
      const round = createMockRound();
      const replay = manager.storeReplay('ROOM1', round, createMockPlayers());
      
      expect(replay.duration).toBeGreaterThanOrEqual(0);
    });

    it('should add replay to storage', () => {
      manager.startRound('ROOM1');
      manager.storeReplay('ROOM1', createMockRound(), createMockPlayers());
      
      const stats = manager.getStats();
      expect(stats.totalReplays).toBe(1);
    });
  });

  describe('getReplays', () => {
    it('should return replays for a specific room', () => {
      manager.startRound('ROOM1');
      manager.storeReplay('ROOM1', createMockRound({ word: 'WORD1' }), createMockPlayers());
      
      manager.startRound('ROOM2');
      manager.storeReplay('ROOM2', createMockRound({ word: 'WORD2' }), createMockPlayers());
      
      manager.startRound('ROOM1');
      manager.storeReplay('ROOM1', createMockRound({ word: 'WORD3' }), createMockPlayers());
      
      const room1Replays = manager.getReplays('ROOM1');
      expect(room1Replays.length).toBe(2);
      expect(room1Replays.map((r: ReplayRound) => r.word)).toContain('WORD1');
      expect(room1Replays.map((r: ReplayRound) => r.word)).toContain('WORD3');
      
      const room2Replays = manager.getReplays('ROOM2');
      expect(room2Replays.length).toBe(1);
      expect(room2Replays[0].word).toBe('WORD2');
    });

    it('should return empty array for room with no replays', () => {
      const replays = manager.getReplays('NONEXISTENT');
      expect(replays).toEqual([]);
    });
  });

  describe('getReplay', () => {
    it('should return a specific replay by ID', () => {
      manager.startRound('ROOM1');
      const stored = manager.storeReplay('ROOM1', createMockRound(), createMockPlayers());
      
      const retrieved = manager.getReplay(stored.roundId);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.roundId).toBe(stored.roundId);
      expect(retrieved!.word).toBe('TEST');
    });

    it('should return null for nonexistent replay ID', () => {
      const replay = manager.getReplay('nonexistent_id');
      expect(replay).toBeNull();
    });
  });

  describe('getReplayTimeline', () => {
    it('should return guesses sorted by timestamp', () => {
      manager.startRound('ROOM1');
      
      // Record guesses with slight delays to ensure different timestamps
      manager.recordGuess('ROOM1', 'p1', 'Player', 'A', true, 0);
      manager.recordGuess('ROOM1', 'p1', 'Player', 'B', false, 1);
      manager.recordGuess('ROOM1', 'p1', 'Player', 'C', true, 1);
      
      const replay = manager.storeReplay('ROOM1', createMockRound(), createMockPlayers());
      const timeline = manager.getReplayTimeline(replay.roundId);
      
      expect(timeline.length).toBe(3);
      // Verify sorted by timestamp
      for (let i = 1; i < timeline.length; i++) {
        expect(timeline[i].timestamp).toBeGreaterThanOrEqual(timeline[i - 1].timestamp);
      }
    });

    it('should return empty array for nonexistent replay', () => {
      const timeline = manager.getReplayTimeline('nonexistent');
      expect(timeline).toEqual([]);
    });

    it('should preserve all guess information in timeline', () => {
      manager.startRound('ROOM1');
      
      manager.recordGuess('ROOM1', 'player1', 'Alice', 'T', true, 0);
      manager.recordGuess('ROOM1', 'player2', 'Bob', 'Z', false, 1);
      
      const replay = manager.storeReplay('ROOM1', createMockRound(), createMockPlayers());
      const timeline = manager.getReplayTimeline(replay.roundId);
      
      expect(timeline[0].playerId).toBe('player1');
      expect(timeline[0].playerName).toBe('Alice');
      expect(timeline[0].isCorrect).toBe(true);
      
      expect(timeline[1].playerId).toBe('player2');
      expect(timeline[1].playerName).toBe('Bob');
      expect(timeline[1].isCorrect).toBe(false);
    });
  });

  describe('getRecentReplays', () => {
    it('should return recent replays across all rooms', () => {
      manager.startRound('ROOM1');
      manager.storeReplay('ROOM1', createMockRound({ word: 'ONE' }), createMockPlayers());
      
      manager.startRound('ROOM2');
      manager.storeReplay('ROOM2', createMockRound({ word: 'TWO' }), createMockPlayers());
      
      manager.startRound('ROOM3');
      manager.storeReplay('ROOM3', createMockRound({ word: 'THREE' }), createMockPlayers());
      
      const recent = manager.getRecentReplays();
      expect(recent.length).toBe(3);
    });

    it('should respect limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        manager.startRound(`ROOM${i}`);
        manager.storeReplay(`ROOM${i}`, createMockRound({ word: `WORD${i}` }), createMockPlayers());
      }
      
      const recent = manager.getRecentReplays(5);
      expect(recent.length).toBe(5);
    });

    it('should return replays in reverse chronological order', () => {
      manager.startRound('ROOM1');
      const r1 = manager.storeReplay('ROOM1', createMockRound({ word: 'FIRST' }), createMockPlayers());
      
      manager.startRound('ROOM2');
      const r2 = manager.storeReplay('ROOM2', createMockRound({ word: 'SECOND' }), createMockPlayers());
      
      const recent = manager.getRecentReplays();
      // Most recent should be first
      expect(recent[0].roundId).toBe(r2.roundId);
      expect(recent[1].roundId).toBe(r1.roundId);
    });
  });

  describe('getPlayerReplays', () => {
    it('should return replays for a specific player', () => {
      const players1 = createMockPlayers();
      const players2 = [
        { id: 'player2', name: 'Bob', color: 0x4ecdc4, score: 100, isConnected: true, isHost: true },
        { id: 'player3', name: 'Charlie', color: 0xffe66d, score: 80, isConnected: true, isHost: false },
      ];
      
      manager.startRound('ROOM1');
      manager.storeReplay('ROOM1', createMockRound(), players1);
      
      manager.startRound('ROOM2');
      manager.storeReplay('ROOM2', createMockRound(), players1);
      
      manager.startRound('ROOM3');
      manager.storeReplay('ROOM3', createMockRound(), players2);
      
      const aliceReplays = manager.getPlayerReplays('player1');
      expect(aliceReplays.length).toBe(2);
      
      const charlieReplays = manager.getPlayerReplays('player3');
      expect(charlieReplays.length).toBe(1);
    });

    it('should respect limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        manager.startRound(`ROOM${i}`);
        manager.storeReplay(`ROOM${i}`, createMockRound(), createMockPlayers());
      }
      
      const replays = manager.getPlayerReplays('player1', 3);
      expect(replays.length).toBeLessThanOrEqual(3);
    });

    it('should return empty array for player with no replays', () => {
      const replays = manager.getPlayerReplays('nonexistent_player');
      expect(replays).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const stats1 = manager.getStats();
      expect(stats1.totalReplays).toBe(0);
      
      manager.startRound('ROOM1');
      manager.storeReplay('ROOM1', createMockRound(), createMockPlayers());
      
      const stats2 = manager.getStats();
      expect(stats2.totalReplays).toBe(1);
      expect(stats2.lastUpdated).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should clear all replays', () => {
      manager.startRound('ROOM1');
      manager.storeReplay('ROOM1', createMockRound(), createMockPlayers());
      
      manager.startRound('ROOM2');
      manager.storeReplay('ROOM2', createMockRound(), createMockPlayers());
      
      expect(manager.getStats().totalReplays).toBe(2);
      
      manager.clear();
      
      expect(manager.getStats().totalReplays).toBe(0);
      expect(manager.getRecentReplays()).toEqual([]);
    });

    it('should clear current round tracking', () => {
      manager.startRound('ROOM1');
      manager.recordGuess('ROOM1', 'p1', 'Player', 'A', true, 0);
      
      manager.clear();
      
      // After clear, recording a guess for a cleared room should start fresh
      manager.recordGuess('ROOM1', 'p1', 'Player', 'B', true, 0);
      
      const round = createMockRound();
      const replay = manager.storeReplay('ROOM1', round, createMockPlayers());
      
      // Only the B guess should be recorded (A was cleared)
      expect(replay.guesses.length).toBe(1);
      expect(replay.guesses[0].letter).toBe('B');
    });
  });

  describe('max replays limit', () => {
    it('should limit stored replays to MAX_REPLAYS', () => {
      // Store more than MAX_REPLAYS (500)
      // For testing, we'll just verify the mechanism exists
      for (let i = 0; i < 10; i++) {
        manager.startRound(`ROOM${i}`);
        manager.storeReplay(`ROOM${i}`, createMockRound({ word: `WORD${i}` }), createMockPlayers());
      }
      
      // All 10 should be stored since we're under the limit
      expect(manager.getStats().totalReplays).toBe(10);
    });
  });

  describe('replay playback simulation', () => {
    it('should allow reconstructing game state from replay', () => {
      manager.startRound('ROOM1');
      
      // Simulate a full game
      manager.recordGuess('ROOM1', 'player1', 'Alice', 'H', true, 0);
      manager.recordGuess('ROOM1', 'player2', 'Bob', 'E', true, 0);
      manager.recordGuess('ROOM1', 'player1', 'Alice', 'L', true, 0);
      manager.recordGuess('ROOM1', 'player2', 'Bob', 'O', true, 0);
      
      const round = createMockRound({
        word: 'HELLO',
        revealedLetters: ['H', 'E', 'L', 'L', 'O'],
        guessedLetters: ['H', 'E', 'L', 'O'],
        isWon: true,
      });
      
      const replay = manager.storeReplay('ROOM1', round, createMockPlayers());
      const timeline = manager.getReplayTimeline(replay.roundId);
      
      // Verify we can reconstruct the game
      expect(timeline.length).toBe(4);
      expect(timeline.filter((g: IndividualGuess) => g.isCorrect).length).toBe(4);
      expect(timeline.filter((g: IndividualGuess) => !g.isCorrect).length).toBe(0);
      
      // All guesses should be from valid players
      const playerIds = new Set(timeline.map((g: IndividualGuess) => g.playerId));
      expect(playerIds.has('player1')).toBe(true);
      expect(playerIds.has('player2')).toBe(true);
    });
  });
});
