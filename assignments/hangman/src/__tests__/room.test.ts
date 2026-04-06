/**
 * Tests for Room management - specifically player rotation on wrong guesses
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../multiplayer/room';

describe('RoomManager - Player Rotation', () => {
  let manager: RoomManager;

  beforeEach(() => {
    manager = new RoomManager();
  });

  describe('processGuess - wrong guess player rotation', () => {
    it('should rotate to next player on wrong guess', () => {
      // Create room with 3 players
      const room = manager.createRoom('p1', 'Player 1', 0xff0000);
      const code = room.code;
      
      manager.joinRoom(code, 'p2', 'Player 2', 0x00ff00);
      manager.joinRoom(code, 'p3', 'Player 3', 0x0000ff);
      
      // Start game
      manager.startGame(code, 1);
      
      // Get initial current guesser
      const initialRoom = manager.getRoom(code);
      const initialGuesserId = initialRoom!.currentRound!.currentGuesserId;
      expect(initialGuesserId).toBe('p1'); // First player starts
      
      // Player 1 makes a wrong guess
      const result = manager.processGuess(code, 'p1', 'Z');
      
      expect(result).not.toBeNull();
      expect(result!.isCorrect).toBe(false);
      expect(result!.nextPlayerId).toBe('p2'); // Should rotate to player 2
      expect(result!.round.currentGuesserId).toBe('p2');
    });

    it('should NOT rotate to next player on correct guess', () => {
      const room = manager.createRoom('p1', 'Player 1', 0xff0000);
      const code = room.code;
      
      manager.joinRoom(code, 'p2', 'Player 2', 0x00ff00);
      manager.joinRoom(code, 'p3', 'Player 3', 0x0000ff);
      
      manager.startGame(code, 1);
      
      const initialRoom = manager.getRoom(code);
      const word = initialRoom!.currentRound!.word;
      const correctLetter = word[0]; // Get a letter that's in the word
      
      // Player 1 makes a correct guess
      const result = manager.processGuess(code, 'p1', correctLetter);
      
      expect(result).not.toBeNull();
      expect(result!.isCorrect).toBe(true);
      expect(result!.nextPlayerId).toBe('p1'); // Should stay on player 1
      expect(result!.round.currentGuesserId).toBe('p1');
    });

    it('should wrap around to first player after last player', () => {
      const room = manager.createRoom('p1', 'Player 1', 0xff0000);
      const code = room.code;
      
      manager.joinRoom(code, 'p2', 'Player 2', 0x00ff00);
      manager.joinRoom(code, 'p3', 'Player 3', 0x0000ff);
      
      manager.startGame(code, 1);
      
      // Player 1 wrong guess -> Player 2
      let result = manager.processGuess(code, 'p1', 'Z');
      expect(result!.nextPlayerId).toBe('p2');
      expect(result!.round.currentGuesserId).toBe('p2');
      
      // Player 2 wrong guess -> Player 3
      result = manager.processGuess(code, 'p2', 'Y');
      expect(result!.nextPlayerId).toBe('p3');
      expect(result!.round.currentGuesserId).toBe('p3');
      
      // Player 3 wrong guess -> Player 1 (wrap around)
      result = manager.processGuess(code, 'p3', 'X');
      expect(result!.nextPlayerId).toBe('p1');
      expect(result!.round.currentGuesserId).toBe('p1');
    });

    it('should track wrong guess count correctly', () => {
      const room = manager.createRoom('p1', 'Player 1', 0xff0000);
      const code = room.code;
      
      manager.joinRoom(code, 'p2', 'Player 2', 0x00ff00);
      
      manager.startGame(code, 1);
      
      // Make multiple wrong guesses
      manager.processGuess(code, 'p1', 'Z');
      let result = manager.processGuess(code, 'p2', 'Y');
      
      expect(result!.round.wrongGuesses).toBe(2);
      
      result = manager.processGuess(code, 'p1', 'X');
      expect(result!.round.wrongGuesses).toBe(3);
    });

    it('should handle 2-player rotation correctly', () => {
      const room = manager.createRoom('p1', 'Player 1', 0xff0000);
      const code = room.code;
      
      manager.joinRoom(code, 'p2', 'Player 2', 0x00ff00);
      
      manager.startGame(code, 1);
      
      // Player 1 wrong -> Player 2
      let result = manager.processGuess(code, 'p1', 'Z');
      expect(result!.nextPlayerId).toBe('p2');
      
      // Player 2 wrong -> Player 1
      result = manager.processGuess(code, 'p2', 'Y');
      expect(result!.nextPlayerId).toBe('p1');
      
      // Player 1 wrong -> Player 2
      result = manager.processGuess(code, 'p1', 'X');
      expect(result!.nextPlayerId).toBe('p2');
    });

    it('should handle 4-player rotation correctly', () => {
      const room = manager.createRoom('p1', 'Player 1', 0xff0000);
      const code = room.code;
      
      manager.joinRoom(code, 'p2', 'Player 2', 0x00ff00);
      manager.joinRoom(code, 'p3', 'Player 3', 0x0000ff);
      manager.joinRoom(code, 'p4', 'Player 4', 0xffff00);
      
      manager.startGame(code, 1);
      
      // Debug: check player order
      const startedRoom = manager.getRoom(code);
      console.log('Player order:', Array.from(startedRoom!.players.keys()));
      console.log('Current turn index:', startedRoom!.currentTurnIndex);
      console.log('Current guesser:', startedRoom!.currentRound!.currentGuesserId);
      
      // Track rotation: p1 -> p2 -> p3 -> p4 -> p1
      let result = manager.processGuess(code, 'p1', 'Z');
      console.log('After p1 wrong guess:', {
        nextPlayerId: result!.nextPlayerId,
        currentTurnIndex: manager.getRoom(code)!.currentTurnIndex
      });
      expect(result!.nextPlayerId).toBe('p2');
      
      result = manager.processGuess(code, 'p2', 'Y');
      console.log('After p2 wrong guess:', {
        nextPlayerId: result!.nextPlayerId,
        currentTurnIndex: manager.getRoom(code)!.currentTurnIndex
      });
      expect(result!.nextPlayerId).toBe('p3');
      
      result = manager.processGuess(code, 'p3', 'X');
      expect(result!.nextPlayerId).toBe('p4');
      
      result = manager.processGuess(code, 'p4', 'W');
      expect(result!.nextPlayerId).toBe('p1');
    });

    it('should NOT rotate if round is complete (loss)', () => {
      const room = manager.createRoom('p1', 'Player 1', 0xff0000);
      const code = room.code;
      
      manager.joinRoom(code, 'p2', 'Player 2', 0x00ff00);
      
      manager.startGame(code, 1);
      
      // Get the word and find letters NOT in it
      const currentRoom = manager.getRoom(code);
      const word = currentRoom!.currentRound!.word;
      
      // Find 6 letters that are guaranteed NOT in the word (use uncommon letters)
      const uncommonLetters = ['Z', 'Q', 'X', 'J', 'K', 'V'];
      const wrongLetters = uncommonLetters.filter(l => !word.includes(l));
      
      // Ensure we have enough wrong letters
      expect(wrongLetters.length).toBeGreaterThanOrEqual(6);
      
      // Make 5 wrong guesses first
      manager.processGuess(code, 'p1', wrongLetters[0]); // 1
      manager.processGuess(code, 'p2', wrongLetters[1]); // 2
      manager.processGuess(code, 'p1', wrongLetters[2]); // 3
      manager.processGuess(code, 'p2', wrongLetters[3]); // 4
      manager.processGuess(code, 'p1', wrongLetters[4]); // 5
      
      // Verify it's player 2's turn after 5 wrong guesses
      const midRoom = manager.getRoom(code);
      expect(midRoom!.currentRound!.currentGuesserId).toBe('p2');
      expect(midRoom!.currentRound!.wrongGuesses).toBe(5);
      expect(midRoom!.currentRound!.isComplete).toBe(false);
      
      // 6th wrong guess should end the game
      const result = manager.processGuess(code, 'p2', wrongLetters[5]);
      
      expect(result).not.toBeNull();
      expect(result!.isCorrect).toBe(false);
      expect(result!.round.wrongGuesses).toBe(6);
      expect(result!.round.isComplete).toBe(true);
      expect(result!.round.isWon).toBe(false);
      // Don't rotate after game ends
      expect(result!.round.currentGuesserId).toBe('p2');
    });

    it('should reject guess from wrong player', () => {
      const room = manager.createRoom('p1', 'Player 1', 0xff0000);
      const code = room.code;
      
      manager.joinRoom(code, 'p2', 'Player 2', 0x00ff00);
      
      manager.startGame(code, 1);
      
      // Player 2 tries to guess when it's player 1's turn
      const result = manager.processGuess(code, 'p2', 'A');
      
      expect(result).toBeNull();
    });

    it('should reject duplicate letter guess', () => {
      const room = manager.createRoom('p1', 'Player 1', 0xff0000);
      const code = room.code;
      
      manager.joinRoom(code, 'p2', 'Player 2', 0x00ff00);
      
      manager.startGame(code, 1);
      
      // First guess
      manager.processGuess(code, 'p1', 'Z');
      
      // Try same letter again (now player 2's turn)
      const result = manager.processGuess(code, 'p2', 'Z');
      
      expect(result).toBeNull();
    });
  });

  describe('currentTurnIndex tracking', () => {
    it('should correctly track turn index through rotations', () => {
      const room = manager.createRoom('p1', 'Player 1', 0xff0000);
      const code = room.code;
      
      manager.joinRoom(code, 'p2', 'Player 2', 0x00ff00);
      manager.joinRoom(code, 'p3', 'Player 3', 0x0000ff);
      
      manager.startGame(code, 1);
      
      let currentRoom = manager.getRoom(code);
      expect(currentRoom!.currentTurnIndex).toBe(0);
      
      // p1 wrong -> p2
      manager.processGuess(code, 'p1', 'Z');
      currentRoom = manager.getRoom(code);
      expect(currentRoom!.currentTurnIndex).toBe(1);
      
      // p2 wrong -> p3
      manager.processGuess(code, 'p2', 'Y');
      currentRoom = manager.getRoom(code);
      expect(currentRoom!.currentTurnIndex).toBe(2);
      
      // p3 wrong -> p1 (wraps to 0)
      manager.processGuess(code, 'p3', 'X');
      currentRoom = manager.getRoom(code);
      expect(currentRoom!.currentTurnIndex).toBe(0);
    });
  });
});
