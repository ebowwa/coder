/**
 * Tests for Leaderboard API and Room Manager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../multiplayer/room';

describe('RoomManager', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  describe('createRoom', () => {
    it('should create a room with a host player', () => {
      const room = roomManager.createRoom('player1', 'TestPlayer', 0);
      
      expect(room).not.toBeNull();
      expect(room!.code).toMatch(/^\d{4}$/);
      expect(room!.hostId).toBe('player1');
      expect(room!.players.size).toBe(1);
      expect(room!.status).toBe('waiting');
    });

    it('should set the host player correctly', () => {
      roomManager.createRoom('player1', 'TestPlayer', 1);
      const room = roomManager.getPlayerRoom('player1');
      const players = roomManager.getPlayers(room?.code || '');
      
      expect(players[0].isHost).toBe(true);
      expect(players[0].name).toBe('TestPlayer');
    });
  });

  describe('joinRoom', () => {
    it('should allow a player to join an existing room', () => {
      const room = roomManager.createRoom('player1', 'Host', 1);
      const joinedRoom = roomManager.joinRoom(room!.code, 'player2', 'Guest', 2);
      
      expect(joinedRoom).not.toBeNull();
      expect(joinedRoom!.players.size).toBe(2);
    });

    it('should return null for non-existent room', () => {
      const result = roomManager.joinRoom('9999', 'player1', 'Guest', 2);
      expect(result).toBeNull();
    });
  });

  describe('leaveRoom', () => {
    it('should remove player from room', () => {
      const room = roomManager.createRoom('player1', 'Host', 1);
      roomManager.joinRoom(room!.code, 'player2', 'Guest', 2);
      
      const result = roomManager.leaveRoom('player2');
      expect(result).not.toBeNull();
      expect(result!.room.players.size).toBe(1);
    });

    it('should transfer host when host leaves', () => {
      const room = roomManager.createRoom('player1', 'Host', 1);
      roomManager.joinRoom(room!.code, 'player2', 'Guest', 2);
      
      const result = roomManager.leaveRoom('player1');
      expect(result).not.toBeNull();
      expect(result!.newHost).toBeDefined();
      expect(result!.newHost!.id).toBe('player2');
    });

    it('should delete room when last player leaves', () => {
      const room = roomManager.createRoom('player1', 'Host', 1);
      const code = room!.code;
      
      roomManager.leaveRoom('player1');
      expect(roomManager.getRoom(code)).toBeNull();
    });
  });

  describe('startGame', () => {
    it('should start game and create round', () => {
      const room = roomManager.createRoom('player1', 'Host', 1);
      const code = room!.code;
      
      const round = roomManager.startGame(code);
      expect(round).not.toBeNull();
      expect(round!.word).toBeDefined();
      expect(round!.category).toBeDefined();
      expect(round!.isComplete).toBe(false);
    });

    it('should change room status to playing', () => {
      const room = roomManager.createRoom('player1', 'Host', 1);
      const code = room!.code;
      
      roomManager.startGame(code);
      expect(roomManager.getRoom(code)!.status).toBe('playing');
    });
  });

  describe('spectator mode', () => {
    it('should allow joining as spectator', () => {
      const room = roomManager.createRoom('player1', 'Host', 1);
      const code = room!.code;
      
      const result = roomManager.joinAsSpectator(code, 'spectator1', 'Watcher', 3);
      expect(result).not.toBeNull();
      expect(result!.spectators.size).toBe(1);
    });

    it('should allow spectator to leave', () => {
      const room = roomManager.createRoom('player1', 'Host', 1);
      const code = room!.code;
      roomManager.joinAsSpectator(code, 'spectator1', 'Watcher', 3);
      
      const result = roomManager.leaveAsSpectator('spectator1');
      expect(result).not.toBeNull();
      expect(result!.spectators.size).toBe(0);
    });

    it('should get spectators list', () => {
      const room = roomManager.createRoom('player1', 'Host', 1);
      const code = room!.code;
      roomManager.joinAsSpectator(code, 'spectator1', 'Watcher1', 3);
      roomManager.joinAsSpectator(code, 'spectator2', 'Watcher2', 4);
      
      const spectators = roomManager.getSpectators(code);
      expect(spectators.length).toBe(2);
    });
  });

  describe('getPlayers', () => {
    it('should return array of players', () => {
      const room = roomManager.createRoom('player1', 'Host', 1);
      const code = room!.code;
      roomManager.joinRoom(code, 'player2', 'Guest', 2);
      
      const players = roomManager.getPlayers(code);
      expect(players.length).toBe(2);
      expect(players.map(p => p.name)).toContain('Host');
      expect(players.map(p => p.name)).toContain('Guest');
    });

    it('should return empty array for non-existent room', () => {
      const players = roomManager.getPlayers('9999');
      expect(players).toEqual([]);
    });
  });
});

describe('LeaderboardManager', () => {
  it('should be importable', async () => {
    const module = await import('../../server/leaderboard');
    expect(module.leaderboardManager).toBeDefined();
    expect(typeof module.leaderboardManager.getLeaderboard).toBe('function');
    expect(typeof module.leaderboardManager.submitEntry).toBe('function');
  });
});
