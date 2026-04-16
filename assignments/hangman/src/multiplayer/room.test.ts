/**
 * Comprehensive unit tests for multiplayer/room.ts - RoomManager
 * Covers: createRoom, joinRoom, leaveRoom, getRoom, getPlayerRoom,
 * startGame, processGuess, nextRound, setPlayerDisconnected,
 * getPlayers, spectator methods (joinAsSpectator, leaveAsSpectator, getSpectators)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from './room';

describe('RoomManager', () => {
  let manager: RoomManager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  // ---------------------------------------------------------------------------
  // createRoom
  // ---------------------------------------------------------------------------
  describe('createRoom', () => {
    it('should create a room with a 4-digit code', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      expect(room).not.toBeNull();
      expect(room!.code).toMatch(/^\d{4}$/);
    });

    it('should set the creator as host', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      expect(room!.hostId).toBe('p1');
    });

    it('should add the creator to the players map', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      expect(room!.players.has('p1')).toBe(true);
      expect(room!.players.get('p1')!.name).toBe('Alice');
      expect(room!.players.get('p1')!.color).toBe(0xff0000);
      expect(room!.players.get('p1')!.isHost).toBe(true);
      expect(room!.players.get('p1')!.isConnected).toBe(true);
    });

    it('should initialize room in waiting status', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      expect(room!.status).toBe('waiting');
    });

    it('should initialize with no spectators', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      expect(room!.spectators.size).toBe(0);
    });

    it('should initialize with no current round', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      expect(room!.currentRound).toBeNull();
    });

    it('should set maxPlayers to 8', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      expect(room!.maxPlayers).toBe(8);
    });

    it('should set createdAt to a recent timestamp', () => {
      const before = Date.now();
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      const after = Date.now();
      expect(room!.createdAt).toBeGreaterThanOrEqual(before);
      expect(room!.createdAt).toBeLessThanOrEqual(after);
    });

    it('should initialize player score to 0', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      expect(room!.players.get('p1')!.score).toBe(0);
    });

    it('should track the player-room mapping', () => {
      manager.createRoom('p1', 'Alice', 0xff0000);
      const playerRoom = manager.getPlayerRoom('p1');
      expect(playerRoom).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // joinRoom
  // ---------------------------------------------------------------------------
  describe('joinRoom', () => {
    it('should add a player to an existing room', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      const result = manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      expect(result).not.toBeNull();
      expect(result!.players.has('p2')).toBe(true);
      expect(result!.players.get('p2')!.name).toBe('Bob');
    });

    it('should return null for non-existent room code', () => {
      const result = manager.joinRoom('9999', 'p2', 'Bob', 0x00ff00);
      expect(result).toBeNull();
    });

    it('should not allow more than maxPlayers (8) in a room', () => {
      const room = manager.createRoom('p1', 'P1', 0xff0000);
      const code = room!.code;
      for (let i = 2; i <= 8; i++) {
        manager.joinRoom(code, `p${i}`, `P${i}`, 0x000000 + i);
      }
      // 9th player should fail
      const result = manager.joinRoom(code, 'p9', 'P9', 0xffffff);
      expect(result).toBeNull();
    });

    it('should set joined player isHost to false', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      const result = manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      expect(result!.players.get('p2')!.isHost).toBe(false);
    });

    it('should set joined player isConnected to true', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      const result = manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      expect(result!.players.get('p2')!.isConnected).toBe(true);
    });

    it('should set joined player score to 0', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      const result = manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      expect(result!.players.get('p2')!.score).toBe(0);
    });

    it('should track player-room mapping for joined players', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      const playerRoom = manager.getPlayerRoom('p2');
      expect(playerRoom).not.toBeNull();
      expect(playerRoom!.code).toBe(room!.code);
    });
  });

  // ---------------------------------------------------------------------------
  // leaveRoom
  // ---------------------------------------------------------------------------
  describe('leaveRoom', () => {
    it('should remove a player from the room', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      const result = manager.leaveRoom('p2');
      expect(result).not.toBeNull();
      expect(result!.room.players.has('p2')).toBe(false);
    });

    it('should return null for player not in any room', () => {
      const result = manager.leaveRoom('unknown');
      expect(result).toBeNull();
    });

    it('should delete room when last player leaves', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      const code = room!.code;
      manager.leaveRoom('p1');
      expect(manager.getRoom(code)).toBeNull();
    });

    it('should transfer host to next player when host leaves', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      const result = manager.leaveRoom('p1');
      expect(result).not.toBeNull();
      expect(result!.newHost).toBeDefined();
      expect(result!.newHost!.id).toBe('p2');
      expect(result!.newHost!.isHost).toBe(true);
      expect(result!.room.hostId).toBe('p2');
    });

    it('should not transfer host when non-host leaves', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      const result = manager.leaveRoom('p2');
      expect(result).not.toBeNull();
      expect(result!.newHost).toBeUndefined();
      expect(result!.room.hostId).toBe('p1');
    });

    it('should remove player-room mapping on leave', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.leaveRoom('p1');
      expect(manager.getPlayerRoom('p1')).toBeNull();
    });

    it('should adjust currentTurnIndex if it exceeds player count', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      manager.joinRoom(room!.code, 'p3', 'Charlie', 0x0000ff);

      // Manually set a high turn index
      const r = manager.getRoom(room!.code);
      r!.currentTurnIndex = 2; // Index of p3

      // Remove p3 so only 2 players remain
      manager.leaveRoom('p3');

      const updated = manager.getRoom(room!.code);
      expect(updated!.currentTurnIndex).toBe(0);
    });

    it('should return null and delete room when last player leaves (empty room)', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      const code = room!.code;
      const result = manager.leaveRoom('p1');
      expect(result).toBeNull();
      expect(manager.getRoom(code)).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getRoom
  // ---------------------------------------------------------------------------
  describe('getRoom', () => {
    it('should return room by code', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      const found = manager.getRoom(room!.code);
      expect(found).not.toBeNull();
      expect(found!.code).toBe(room!.code);
    });

    it('should return null for non-existent code', () => {
      expect(manager.getRoom('0000')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getPlayerRoom
  // ---------------------------------------------------------------------------
  describe('getPlayerRoom', () => {
    it('should return the room a player is in', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      const found = manager.getPlayerRoom('p1');
      expect(found).not.toBeNull();
      expect(found!.code).toBe(room!.code);
    });

    it('should return null for player not in any room', () => {
      expect(manager.getPlayerRoom('unknown')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // startGame
  // ---------------------------------------------------------------------------
  describe('startGame', () => {
    it('should start a game and set status to playing', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      const round = manager.startGame(room!.code, 1);
      expect(round).not.toBeNull();
      expect(manager.getRoom(room!.code)!.status).toBe('playing');
    });

    it('should return null if room not found', () => {
      expect(manager.startGame('0000', 1)).toBeNull();
    });

    it('should return null if room is not in waiting status', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      manager.startGame(room!.code, 1);
      // Try to start again
      expect(manager.startGame(room!.code, 1)).toBeNull();
    });

    it('should create a round with an uppercase word', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      const round = manager.startGame(room!.code, 1);
      expect(round).not.toBeNull();
      expect(round!.word).toBe(round!.word.toUpperCase());
    });

    it('should initialize round with no revealed letters', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      const round = manager.startGame(room!.code, 1);
      expect(round!.revealedLetters).toEqual([]);
    });

    it('should initialize round with 0 wrong guesses', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      const round = manager.startGame(room!.code, 1);
      expect(round!.wrongGuesses).toBe(0);
    });

    it('should set round as incomplete and not won', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      const round = manager.startGame(room!.code, 1);
      expect(round!.isComplete).toBe(false);
      expect(round!.isWon).toBe(false);
    });

    it('should use forced word when provided', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      const round = manager.startGame(room!.code, 1, 'testing');
      expect(round!.word).toBe('TESTING');
    });

    it('should set currentGuesserId to the first player', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      const round = manager.startGame(room!.code, 1);
      expect(round!.currentGuesserId).toBe('p1');
    });

    it('should set roundStartTurnIndex to currentTurnIndex', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      manager.startGame(room!.code, 1);
      const r = manager.getRoom(room!.code);
      expect(r!.roundStartTurnIndex).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // processGuess - basic
  // ---------------------------------------------------------------------------
  describe('processGuess', () => {
    it('should return null if room not found', () => {
      expect(manager.processGuess('0000', 'p1', 'A')).toBeNull();
    });

    it('should return null if no current round', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      expect(manager.processGuess(room!.code, 'p1', 'A')).toBeNull();
    });

    it('should return null if round is complete', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      manager.startGame(room!.code, 1, 'AB');

      // Guess both letters to win
      manager.processGuess(room!.code, 'p1', 'A');
      manager.processGuess(room!.code, 'p1', 'B');

      // Now try another guess
      expect(manager.processGuess(room!.code, 'p1', 'C')).toBeNull();
    });

    it('should correctly identify a correct guess', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      manager.startGame(room!.code, 1, 'APPLE');

      const result = manager.processGuess(room!.code, 'p1', 'A');
      expect(result).not.toBeNull();
      expect(result!.isCorrect).toBe(true);
      expect(result!.round.revealedLetters).toContain('A');
    });

    it('should correctly identify a wrong guess', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      manager.startGame(room!.code, 1, 'APPLE');

      const result = manager.processGuess(room!.code, 'p1', 'Z');
      expect(result).not.toBeNull();
      expect(result!.isCorrect).toBe(false);
      expect(result!.round.wrongGuesses).toBe(1);
    });

    it('should add letter to guessedLetters', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      manager.startGame(room!.code, 1, 'APPLE');

      manager.processGuess(room!.code, 'p1', 'A');
      const r = manager.getRoom(room!.code);
      expect(r!.currentRound!.guessedLetters).toContain('A');
    });

    it('should detect win when all letters are revealed', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      manager.startGame(room!.code, 1, 'AT');

      manager.processGuess(room!.code, 'p1', 'A');
      const result = manager.processGuess(room!.code, 'p1', 'T');

      expect(result!.round.isComplete).toBe(true);
      expect(result!.round.isWon).toBe(true);
    });

    it('should award points to all players on win', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      manager.startGame(room!.code, 1, 'AT');

      manager.processGuess(room!.code, 'p1', 'A');
      manager.processGuess(room!.code, 'p1', 'T');

      const r = manager.getRoom(room!.code);
      r!.players.forEach(p => {
        expect(p.score).toBe(20); // 2-letter word * 10
      });
    });

    it('should detect loss at 6 wrong guesses', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      manager.startGame(room!.code, 1, 'APPLE');

      // Make 6 wrong guesses - use letters not in APPLE
      const wrongLetters = ['Z', 'Q', 'X', 'J', 'K', 'V'].filter(
        l => !'APPLE'.includes(l)
      );

      for (let i = 0; i < wrongLetters.length && i < 5; i++) {
        const currentRoom = manager.getRoom(room!.code);
        const guesser = currentRoom!.currentRound!.currentGuesserId;
        manager.processGuess(room!.code, guesser, wrongLetters[i]);
      }

      // 6th wrong guess
      const currentRoom = manager.getRoom(room!.code);
      const guesser = currentRoom!.currentRound!.currentGuesserId;
      const result = manager.processGuess(room!.code, guesser, wrongLetters[5]);

      expect(result!.round.isComplete).toBe(true);
      expect(result!.round.isWon).toBe(false);
      expect(result!.round.wrongGuesses).toBe(6);
    });
  });

  // ---------------------------------------------------------------------------
  // nextRound
  // ---------------------------------------------------------------------------
  describe('nextRound', () => {
    it('should return null if room not found', () => {
      expect(manager.nextRound('0000')).toBeNull();
    });

    it('should create a new round after previous round', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      manager.startGame(room!.code, 1, 'AT');

      // Complete first round
      manager.processGuess(room!.code, 'p1', 'A');
      manager.processGuess(room!.code, 'p1', 'T');

      const nextRound = manager.nextRound(room!.code, 'DOG');
      expect(nextRound).not.toBeNull();
      expect(nextRound!.word).toBe('DOG');
      expect(nextRound!.isComplete).toBe(false);
      expect(nextRound!.isWon).toBe(false);
      expect(nextRound!.revealedLetters).toEqual([]);
      expect(nextRound!.wrongGuesses).toBe(0);
    });

    it('should advance roundStartTurnIndex', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      manager.startGame(room!.code, 1, 'AT');

      manager.processGuess(room!.code, 'p1', 'A');
      manager.processGuess(room!.code, 'p1', 'T');

      manager.nextRound(room!.code, 'CAT');

      const r = manager.getRoom(room!.code);
      expect(r!.roundStartTurnIndex).toBe(1);
      expect(r!.currentTurnIndex).toBe(1);
    });

    it('should set the next round starter to the next player', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      manager.startGame(room!.code, 1, 'AT');

      manager.processGuess(room!.code, 'p1', 'A');
      manager.processGuess(room!.code, 'p1', 'T');

      const nextRound = manager.nextRound(room!.code, 'CAT');
      expect(nextRound!.currentGuesserId).toBe('p2');
    });

    it('should use forced word when provided', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      manager.startGame(room!.code, 1, 'AT');

      manager.processGuess(room!.code, 'p1', 'A');
      manager.processGuess(room!.code, 'p1', 'T');

      const nextRound = manager.nextRound(room!.code, 'ELEPHANT');
      expect(nextRound!.word).toBe('ELEPHANT');
    });

    it('should wrap roundStartTurnIndex', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      manager.startGame(room!.code, 1, 'AT');

      manager.processGuess(room!.code, 'p1', 'A');
      manager.processGuess(room!.code, 'p1', 'T');

      manager.nextRound(room!.code, 'DOG');

      // Complete second round
      const r2 = manager.getRoom(room!.code);
      const guesser2 = r2!.currentRound!.currentGuesserId;
      // Need to guess all letters of DOG
      manager.processGuess(room!.code, guesser2, 'D');
      manager.processGuess(room!.code, guesser2, 'O');
      manager.processGuess(room!.code, guesser2, 'G');

      // Third round should wrap back
      manager.nextRound(room!.code, 'CAT');
      const r3 = manager.getRoom(room!.code);
      expect(r3!.roundStartTurnIndex).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // setPlayerDisconnected
  // ---------------------------------------------------------------------------
  describe('setPlayerDisconnected', () => {
    it('should mark player as disconnected', () => {
      manager.createRoom('p1', 'Alice', 0xff0000);
      manager.setPlayerDisconnected('p1');
      const room = manager.getPlayerRoom('p1');
      expect(room!.players.get('p1')!.isConnected).toBe(false);
    });

    it('should do nothing for player not in any room', () => {
      expect(() => manager.setPlayerDisconnected('unknown')).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // getPlayers
  // ---------------------------------------------------------------------------
  describe('getPlayers', () => {
    it('should return all players in a room', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      const players = manager.getPlayers(room!.code);
      expect(players).toHaveLength(2);
      expect(players.map(p => p.name)).toContain('Alice');
      expect(players.map(p => p.name)).toContain('Bob');
    });

    it('should return empty array for non-existent room', () => {
      expect(manager.getPlayers('0000')).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Spectator methods
  // ---------------------------------------------------------------------------
  describe('joinAsSpectator', () => {
    it('should add a spectator to the room', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      const result = manager.joinAsSpectator(room!.code, 's1', 'Spectator1', 0xaa96da);
      expect(result).not.toBeNull();
      expect(result!.spectators.has('s1')).toBe(true);
      expect(result!.spectators.get('s1')!.name).toBe('Spectator1');
    });

    it('should return null for non-existent room', () => {
      expect(manager.joinAsSpectator('0000', 's1', 'Spec', 0xaa96da)).toBeNull();
    });

    it('should track spectator-room mapping', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinAsSpectator(room!.code, 's1', 'Spectator1', 0xaa96da);
      // Verify via getSpectators
      const spectators = manager.getSpectators(room!.code);
      expect(spectators).toHaveLength(1);
      expect(spectators[0].id).toBe('s1');
    });

    it('should set spectator isConnected to true', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinAsSpectator(room!.code, 's1', 'Spectator1', 0xaa96da);
      const spectators = manager.getSpectators(room!.code);
      expect(spectators[0].isConnected).toBe(true);
    });

    it('should allow multiple spectators', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinAsSpectator(room!.code, 's1', 'Spec1', 0xaa96da);
      manager.joinAsSpectator(room!.code, 's2', 'Spec2', 0xfcbad3);
      const spectators = manager.getSpectators(room!.code);
      expect(spectators).toHaveLength(2);
    });
  });

  describe('leaveAsSpectator', () => {
    it('should remove a spectator from the room', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinAsSpectator(room!.code, 's1', 'Spectator1', 0xaa96da);
      const result = manager.leaveAsSpectator('s1');
      expect(result).not.toBeNull();
      expect(result!.spectators.has('s1')).toBe(false);
    });

    it('should return null for spectator not in any room', () => {
      expect(manager.leaveAsSpectator('unknown')).toBeNull();
    });

    it('should remove spectator-room mapping', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinAsSpectator(room!.code, 's1', 'Spectator1', 0xaa96da);
      manager.leaveAsSpectator('s1');
      const spectators = manager.getSpectators(room!.code);
      expect(spectators).toHaveLength(0);
    });
  });

  describe('getSpectators', () => {
    it('should return all spectators in a room', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinAsSpectator(room!.code, 's1', 'Spec1', 0xaa96da);
      manager.joinAsSpectator(room!.code, 's2', 'Spec2', 0xfcbad3);
      const spectators = manager.getSpectators(room!.code);
      expect(spectators).toHaveLength(2);
    });

    it('should return empty array for non-existent room', () => {
      expect(manager.getSpectators('0000')).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // roomManager singleton
  // ---------------------------------------------------------------------------
  describe('roomManager singleton', () => {
    it('should be exported as an instance of RoomManager', async () => {
      const mod = await import('./room');
      expect(mod.roomManager).toBeInstanceOf(RoomManager);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('should handle host leaving with 3+ players and transfer correctly', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      const code = room!.code;
      manager.joinRoom(code, 'p2', 'Bob', 0x00ff00);
      manager.joinRoom(code, 'p3', 'Charlie', 0x0000ff);

      const result = manager.leaveRoom('p1');
      expect(result!.room.hostId).toBe('p2');
      expect(result!.room.players.size).toBe(2);
    });

    it('should handle multiple rooms independently', () => {
      const room1 = manager.createRoom('p1', 'Alice', 0xff0000);
      const room2 = manager.createRoom('p2', 'Bob', 0x00ff00);

      expect(room1!.code).not.toBe(room2!.code);
      expect(manager.getPlayerRoom('p1')!.code).toBe(room1!.code);
      expect(manager.getPlayerRoom('p2')!.code).toBe(room2!.code);
    });

    it('should handle spectator and player coexisting in same room', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      manager.joinAsSpectator(room!.code, 's1', 'Watcher', 0xaa96da);

      expect(manager.getPlayers(room!.code)).toHaveLength(2);
      expect(manager.getSpectators(room!.code)).toHaveLength(1);
    });

    it('should allow forced word to be lowercase and convert to uppercase', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      manager.joinRoom(room!.code, 'p2', 'Bob', 0x00ff00);
      const round = manager.startGame(room!.code, 1, 'hello');
      expect(round!.word).toBe('HELLO');
    });

    it('should handle game with single player', () => {
      const room = manager.createRoom('p1', 'Alice', 0xff0000);
      const round = manager.startGame(room!.code, 1, 'HI');

      expect(round).not.toBeNull();
      expect(round!.currentGuesserId).toBe('p1');

      manager.processGuess(room!.code, 'p1', 'H');
      const result = manager.processGuess(room!.code, 'p1', 'I');

      expect(result!.round.isComplete).toBe(true);
      expect(result!.round.isWon).toBe(true);
    });
  });
});
