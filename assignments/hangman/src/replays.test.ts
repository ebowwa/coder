/**
 * Tests for Replay System (src/replays.ts)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ReplaySystem,
  RecordedEvent,
  RecordedEventType,
  ReplayMetadata,
} from './replays';
import type { PlayerInfo } from './multiplayer/types';

// Helper to create PlayerInfo objects
function makePlayer(id: string, name: string): PlayerInfo {
  return {
    id,
    name,
    color: 0xff6b6b,
    score: 0,
    isConnected: true,
    isHost: false,
  };
}

function makePlayers(n: number): PlayerInfo[] {
  return Array.from({ length: n }, (_, i) =>
    makePlayer(`p${i + 1}`, `Player ${i + 1}`)
  );
}

describe('ReplaySystem', () => {
  let rs: ReplaySystem;

  beforeEach(() => {
    rs = new ReplaySystem();
  });

  // ---------------------------------------------------------------------------
  // startRecording
  // ---------------------------------------------------------------------------

  describe('startRecording', () => {
    it('should start recording for a given room', () => {
      const players = makePlayers(2);
      rs.startRecording('room1', players);

      // Recording should be active — verify by stopping and checking metadata
      const meta = rs.stopRecording();
      expect(meta).not.toBeNull();
      expect(meta!.roomId).toBe('room1');
    });

    it('should automatically record a round_start event', () => {
      rs.startRecording('room1', makePlayers(2));

      const replay = rs.stopRecording();
      expect(replay).not.toBeNull();

      // Retrieve the stored replay to inspect events
      const stored = rs.getReplay('room1')!;
      expect(stored.events.length).toBeGreaterThanOrEqual(1);
      expect(stored.events[0].type).toBe('round_start');
    });

    it('should finalize in-progress recording when starting a new one', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.record({ type: 'guess', payload: { letter: 'a' } });

      // Starting a new recording should finalize the first
      rs.startRecording('room2', makePlayers(3));

      // First recording should be saved
      const replay1 = rs.getReplay('room1');
      expect(replay1).not.toBeNull();
      expect(replay1!.metadata.roomId).toBe('room1');
    });

    it('should deep-copy players array', () => {
      const players = makePlayers(2);
      rs.startRecording('room1', players);

      // Mutate original
      players[0].name = 'Mutated';

      const replay = rs.getReplay('room1');
      expect(replay).toBeNull(); // Not yet saved — still recording

      rs.stopRecording();
      const stored = rs.getReplay('room1')!;
      expect(stored.players[0].name).toBe('Player 1');
    });
  });

  // ---------------------------------------------------------------------------
  // record
  // ---------------------------------------------------------------------------

  describe('record', () => {
    it('should record guess events', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.record({ type: 'guess', payload: { letter: 'a', correct: true } });
      rs.record({ type: 'guess', payload: { letter: 'b', correct: false } });

      const meta = rs.stopRecording();
      const stored = rs.getReplay('room1')!;
      // round_start + 2 guesses
      expect(stored.events.length).toBe(3);
      expect(stored.events[1].type).toBe('guess');
      expect(stored.events[2].type).toBe('guess');
    });

    it('should record category_select events', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.record({ type: 'category_select', payload: { category: 'animals' } });

      rs.stopRecording();
      const stored = rs.getReplay('room1')!;
      const catEvent = stored.events.find(e => e.type === 'category_select');
      expect(catEvent).toBeDefined();
    });

    it('should record player_join events', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.record({ type: 'player_join', payload: { playerId: 'p3', name: 'Player 3' } });

      rs.stopRecording();
      const stored = rs.getReplay('room1')!;
      const joinEvent = stored.events.find(e => e.type === 'player_join');
      expect(joinEvent).toBeDefined();
    });

    it('should record round_end events', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.record({ type: 'round_end', payload: { winner: 'p1' } });

      rs.stopRecording();
      const stored = rs.getReplay('room1')!;
      const endEvent = stored.events.find(e => e.type === 'round_end');
      expect(endEvent).toBeDefined();
    });

    it('should silently no-op when no recording is in progress', () => {
      // Should not throw
      expect(() => {
        rs.record({ type: 'guess', payload: { letter: 'a' } });
      }).not.toThrow();
    });

    it('should assign timestamps automatically', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.record({ type: 'guess', payload: { letter: 'a' } });

      rs.stopRecording();
      const stored = rs.getReplay('room1')!;
      for (const event of stored.events) {
        expect(typeof event.timestamp).toBe('number');
        expect(event.timestamp).toBeGreaterThan(0);
      }
    });

    it('should track winner from round_end event', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.record({ type: 'round_end', payload: { winner: 'p1' } });

      const meta = rs.stopRecording();
      expect(meta!.winner).toBe('p1');
    });

    it('should not overwrite winner with null if round_end has no winner', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.record({ type: 'round_end', payload: { winner: 'p2' } });
      rs.record({ type: 'round_end', payload: {} });

      const meta = rs.stopRecording();
      expect(meta!.winner).toBe('p2');
    });

    it('should record correct guesses', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.record({ type: 'guess', payload: { letter: 'h', correct: true, playerId: 'p1' } });

      rs.stopRecording();
      const stored = rs.getReplay('room1')!;
      const guess = stored.events.find(e => e.type === 'guess')!;
      expect((guess.payload as { correct: boolean }).correct).toBe(true);
    });

    it('should record wrong guesses', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.record({ type: 'guess', payload: { letter: 'z', correct: false, playerId: 'p2' } });

      rs.stopRecording();
      const stored = rs.getReplay('room1')!;
      const guess = stored.events.find(e => e.type === 'guess')!;
      expect((guess.payload as { correct: boolean }).correct).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // stopRecording
  // ---------------------------------------------------------------------------

  describe('stopRecording', () => {
    it('should return null when no recording is in progress', () => {
      const meta = rs.stopRecording();
      expect(meta).toBeNull();
    });

    it('should return metadata with correct roomId', () => {
      rs.startRecording('room42', makePlayers(3));
      const meta = rs.stopRecording();

      expect(meta).not.toBeNull();
      expect(meta!.roomId).toBe('room42');
    });

    it('should return metadata with playerCount', () => {
      rs.startRecording('room1', makePlayers(4));
      const meta = rs.stopRecording();

      expect(meta!.playerCount).toBe(4);
    });

    it('should return metadata with date and duration', () => {
      rs.startRecording('room1', makePlayers(2));
      const meta = rs.stopRecording();

      expect(typeof meta!.date).toBe('number');
      expect(typeof meta!.duration).toBe('number');
      expect(meta!.duration).toBeGreaterThanOrEqual(0);
    });

    it('should persist the replay so it can be retrieved', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.record({ type: 'guess', payload: { letter: 'a' } });
      rs.stopRecording();

      const stored = rs.getReplay('room1');
      expect(stored).not.toBeNull();
      expect(stored!.metadata.roomId).toBe('room1');
    });

    it('should reset active recording state', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.stopRecording();

      // Calling stopRecording again should return null
      expect(rs.stopRecording()).toBeNull();
    });

    it('should overwrite previous replay for same roomId', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.record({ type: 'guess', payload: { letter: 'a' } });
      rs.stopRecording();

      rs.startRecording('room1', makePlayers(3));
      rs.record({ type: 'guess', payload: { letter: 'b' } });
      rs.record({ type: 'guess', payload: { letter: 'c' } });
      rs.stopRecording();

      const stored = rs.getReplay('room1')!;
      expect(stored.metadata.playerCount).toBe(3);
      // round_start + 2 guesses = 3
      expect(stored.events.length).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // getReplay
  // ---------------------------------------------------------------------------

  describe('getReplay', () => {
    it('should return null for unknown room ID', () => {
      expect(rs.getReplay('nonexistent')).toBeNull();
    });

    it('should return stored replay with metadata, players, and events', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.record({ type: 'guess', payload: { letter: 'a' } });
      rs.stopRecording();

      const stored = rs.getReplay('room1')!;
      expect(stored.metadata).toBeDefined();
      expect(stored.players).toBeDefined();
      expect(stored.events).toBeDefined();
      expect(Array.isArray(stored.events)).toBe(true);
    });

    it('should return events in recorded order', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.record({ type: 'guess', payload: { letter: 'a' } });
      rs.record({ type: 'guess', payload: { letter: 'b' } });
      rs.record({ type: 'guess', payload: { letter: 'c' } });
      rs.stopRecording();

      const stored = rs.getReplay('room1')!;
      const guessEvents = stored.events.filter(e => e.type === 'guess');
      expect(guessEvents.length).toBe(3);
      expect((guessEvents[0].payload as { letter: string }).letter).toBe('a');
      expect((guessEvents[1].payload as { letter: string }).letter).toBe('b');
      expect((guessEvents[2].payload as { letter: string }).letter).toBe('c');
    });
  });

  // ---------------------------------------------------------------------------
  // listReplays
  // ---------------------------------------------------------------------------

  describe('listReplays', () => {
    it('should return empty array when no replays stored', () => {
      expect(rs.listReplays()).toEqual([]);
    });

    it('should return metadata for all stored replays', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.stopRecording();

      rs.startRecording('room2', makePlayers(3));
      rs.stopRecording();

      const list = rs.listReplays();
      expect(list.length).toBe(2);

      const roomIds = list.map(m => m.roomId).sort();
      expect(roomIds).toEqual(['room1', 'room2']);
    });

    it('should reflect playerCount accurately', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.stopRecording();

      rs.startRecording('room2', makePlayers(5));
      rs.stopRecording();

      const list = rs.listReplays();
      const r1 = list.find(m => m.roomId === 'room1')!;
      const r2 = list.find(m => m.roomId === 'room2')!;
      expect(r1.playerCount).toBe(2);
      expect(r2.playerCount).toBe(5);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteReplay
  // ---------------------------------------------------------------------------

  describe('deleteReplay', () => {
    it('should return false when deleting nonexistent replay', () => {
      expect(rs.deleteReplay('nonexistent')).toBe(false);
    });

    it('should return true and remove an existing replay', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.stopRecording();

      expect(rs.deleteReplay('room1')).toBe(true);
      expect(rs.getReplay('room1')).toBeNull();
    });

    it('should remove replay from listReplays', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.stopRecording();

      rs.startRecording('room2', makePlayers(3));
      rs.stopRecording();

      rs.deleteReplay('room1');

      const list = rs.listReplays();
      expect(list.length).toBe(1);
      expect(list[0].roomId).toBe('room2');
    });

    it('should only delete once — second delete returns false', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.stopRecording();

      expect(rs.deleteReplay('room1')).toBe(true);
      expect(rs.deleteReplay('room1')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Winner tracking
  // ---------------------------------------------------------------------------

  describe('winner tracking', () => {
    it('should set winner to null when no round_end recorded', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.record({ type: 'guess', payload: { letter: 'a' } });

      const meta = rs.stopRecording();
      expect(meta!.winner).toBeNull();
    });

    it('should capture winner from round_end payload', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.record({ type: 'round_end', payload: { winner: 'p1' } });

      const meta = rs.stopRecording();
      expect(meta!.winner).toBe('p1');
    });

    it('should expose winner in listReplays metadata', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.record({ type: 'round_end', payload: { winner: 'p2' } });
      rs.stopRecording();

      const list = rs.listReplays();
      expect(list[0].winner).toBe('p2');
    });
  });

  // ---------------------------------------------------------------------------
  // Full recording lifecycle
  // ---------------------------------------------------------------------------

  describe('full game recording lifecycle', () => {
    it('should record a complete game from start to finish', () => {
      const players = makePlayers(3);
      rs.startRecording('game1', players);

      // Category selection
      rs.record({ type: 'category_select', payload: { category: 'fruits' } });

      // Player 1 guesses correct
      rs.record({ type: 'guess', payload: { letter: 'a', correct: true, playerId: 'p1' } });

      // Player 2 guesses wrong
      rs.record({ type: 'guess', payload: { letter: 'z', correct: false, playerId: 'p2' } });

      // Player 3 joins mid-game
      rs.record({ type: 'player_join', payload: { playerId: 'p4', name: 'Late Joiner' } });

      // Player 1 wins
      rs.record({ type: 'round_end', payload: { winner: 'p1' } });

      const meta = rs.stopRecording();

      expect(meta!.roomId).toBe('game1');
      expect(meta!.playerCount).toBe(3);
      expect(meta!.winner).toBe('p1');

      const stored = rs.getReplay('game1')!;
      // round_start + category_select + 2 guesses + player_join + round_end = 6
      expect(stored.events.length).toBe(6);

      const types = stored.events.map(e => e.type);
      expect(types).toEqual([
        'round_start',
        'category_select',
        'guess',
        'guess',
        'player_join',
        'round_end',
      ]);
    });

    it('should record multiple games sequentially', () => {
      // Game 1
      rs.startRecording('game1', makePlayers(2));
      rs.record({ type: 'guess', payload: { letter: 'a' } });
      rs.stopRecording();

      // Game 2
      rs.startRecording('game2', makePlayers(3));
      rs.record({ type: 'guess', payload: { letter: 'b' } });
      rs.record({ type: 'guess', payload: { letter: 'c' } });
      rs.stopRecording();

      // Game 3
      rs.startRecording('game3', makePlayers(4));
      rs.record({ type: 'round_end', payload: { winner: 'p2' } });
      rs.stopRecording();

      const list = rs.listReplays();
      expect(list.length).toBe(3);

      expect(rs.getReplay('game1')!.events.length).toBe(2); // round_start + guess
      expect(rs.getReplay('game2')!.events.length).toBe(3); // round_start + 2 guesses
      expect(rs.getReplay('game3')!.events.length).toBe(2); // round_start + round_end
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle empty replay (only round_start, no other events)', () => {
      rs.startRecording('empty', makePlayers(2));
      const meta = rs.stopRecording();

      expect(meta).not.toBeNull();
      expect(meta!.roomId).toBe('empty');

      const stored = rs.getReplay('empty')!;
      expect(stored.events.length).toBe(1); // just round_start
      expect(stored.events[0].type).toBe('round_start');
    });

    it('should handle recording with empty players array', () => {
      rs.startRecording('noplayers', []);
      const meta = rs.stopRecording();

      expect(meta!.playerCount).toBe(0);
      const stored = rs.getReplay('noplayers')!;
      expect(stored.players).toEqual([]);
    });

    it('should handle getReplay for invalid/empty string ID', () => {
      expect(rs.getReplay('')).toBeNull();
      expect(rs.getReplay('   ')).toBeNull();
    });

    it('should handle deleteReplay for empty string ID', () => {
      expect(rs.deleteReplay('')).toBe(false);
    });

    it('should handle calling stopRecording twice in a row', () => {
      rs.startRecording('room1', makePlayers(2));
      expect(rs.stopRecording()).not.toBeNull();
      expect(rs.stopRecording()).toBeNull();
    });

    it('should handle recording events after stop (no-op)', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.stopRecording();

      // These should be no-ops
      rs.record({ type: 'guess', payload: { letter: 'a' } });
      rs.record({ type: 'round_end', payload: { winner: 'p1' } });

      const stored = rs.getReplay('room1')!;
      // Only round_start, no extra events
      expect(stored.events.length).toBe(1);
      expect(stored.metadata.winner).toBeNull();
    });

    it('should handle listing replays after all are deleted', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.stopRecording();
      rs.startRecording('room2', makePlayers(3));
      rs.stopRecording();

      rs.deleteReplay('room1');
      rs.deleteReplay('room2');

      expect(rs.listReplays()).toEqual([]);
    });

    it('should allow reuse of the same roomId after deletion', () => {
      rs.startRecording('room1', makePlayers(2));
      rs.record({ type: 'guess', payload: { letter: 'a' } });
      rs.stopRecording();

      rs.deleteReplay('room1');

      // Create a new recording with same room ID
      rs.startRecording('room1', makePlayers(4));
      rs.record({ type: 'guess', payload: { letter: 'x' } });
      rs.stopRecording();

      const stored = rs.getReplay('room1')!;
      expect(stored.metadata.playerCount).toBe(4);
      // round_start + guess = 2
      expect(stored.events.length).toBe(2);
    });

    it('should handle special characters in roomId', () => {
      const specialId = 'room- special_chars!@#$%';
      rs.startRecording(specialId, makePlayers(2));
      rs.stopRecording();

      expect(rs.getReplay(specialId)).not.toBeNull();
      expect(rs.deleteReplay(specialId)).toBe(true);
    });

    it('should handle very long roomId', () => {
      const longId = 'a'.repeat(1000);
      rs.startRecording(longId, makePlayers(2));
      rs.stopRecording();

      expect(rs.getReplay(longId)).not.toBeNull();
    });

    it('should return a live reference (mutation is visible)', () => {
      // getReplay returns the internal stored object directly,
      // so mutation of the returned object is reflected in the store.
      rs.startRecording('room1', makePlayers(2));
      rs.record({ type: 'guess', payload: { letter: 'a' } });
      rs.stopRecording();

      const stored = rs.getReplay('room1')!;
      expect(stored.events.length).toBe(2); // round_start + guess

      // Mutation is visible since getReplay returns the internal reference
      stored.events.push({ type: 'guess', timestamp: 0, payload: { letter: 'FAKE' } });
      const storedAgain = rs.getReplay('room1')!;
      expect(storedAgain.events.length).toBe(3);
    });

    it('should handle large number of events', () => {
      rs.startRecording('room1', makePlayers(2));

      for (let i = 0; i < 1000; i++) {
        rs.record({ type: 'guess', payload: { letter: String.fromCharCode(97 + (i % 26)) } });
      }

      rs.stopRecording();

      const stored = rs.getReplay('room1')!;
      // round_start + 1000 guesses
      expect(stored.events.length).toBe(1001);
    });

    it('should handle many replays stored simultaneously', () => {
      for (let i = 0; i < 100; i++) {
        rs.startRecording(`room_${i}`, makePlayers(2));
        rs.stopRecording();
      }

      expect(rs.listReplays().length).toBe(100);

      // Each should be individually retrievable
      for (let i = 0; i < 100; i++) {
        expect(rs.getReplay(`room_${i}`)).not.toBeNull();
      }
    });
  });
});
