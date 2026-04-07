/**
 * Unit tests for multiplayer turn rotation logic
 * Tests: wrong guess triggers next player, correct guess keeps current player,
 * active player tracking, and turn order cycling through all players
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from './multiplayer/room';

describe('Multiplayer Turn Rotation', () => {
  let manager: RoomManager;
  let roomCode: string;

  beforeEach(() => {
    manager = new RoomManager();
    const room = manager.createRoom('p1', 'Alice', 0xff6b6b);
    expect(room).not.toBeNull();
    roomCode = room!.code;
  });

  describe('Wrong guess triggers next player turn', () => {
    it('should advance to next player after wrong guess', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      manager.joinRoom(roomCode, 'p3', 'Charlie', 0xffe66d);
      
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const word = room!.currentRound!.word;
      
      // Find a letter not in the word
      const wrongLetter = ['Z', 'Q', 'X', 'J', 'K'].find(l => !word.includes(l))!;
      
      // Current player is p1
      expect(room!.currentRound!.currentGuesserId).toBe('p1');
      
      // Wrong guess should rotate to next player
      const result = manager.processGuess(roomCode, 'p1', wrongLetter);
      
      expect(result).not.toBeNull();
      expect(result!.isCorrect).toBe(false);
      expect(result!.nextPlayerId).toBe('p2');
      expect(result!.round.currentGuesserId).toBe('p2');
    });

    it('should increment wrong guesses on incorrect letter', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const word = room!.currentRound!.word;
      const wrongLetter = ['Z', 'Q', 'X', 'J', 'K'].find(l => !word.includes(l))!;
      
      const result = manager.processGuess(roomCode, 'p1', wrongLetter);
      
      expect(result!.round.wrongGuesses).toBe(1);
    });
  });

  describe('Correct guess keeps current player', () => {
    it('should keep same player after correct guess', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      manager.joinRoom(roomCode, 'p3', 'Charlie', 0xffe66d);
      
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const word = room!.currentRound!.word;
      const correctLetter = word[0]; // A letter that IS in the word
      
      // Current player is p1
      expect(room!.currentRound!.currentGuesserId).toBe('p1');
      
      // Correct guess should keep same player
      const result = manager.processGuess(roomCode, 'p1', correctLetter);
      
      expect(result).not.toBeNull();
      expect(result!.isCorrect).toBe(true);
      expect(result!.nextPlayerId).toBe('p1'); // Same player continues
      expect(result!.round.currentGuesserId).toBe('p1');
    });

    it('should reveal letter on correct guess', () => {
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const word = room!.currentRound!.word;
      const correctLetter = word[0];
      
      const result = manager.processGuess(roomCode, 'p1', correctLetter);
      
      expect(result!.round.revealedLetters).toContain(correctLetter);
    });

    it('should allow same player to make multiple correct guesses', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const word = room!.currentRound!.word;
      
      // Get unique letters from the word
      const uniqueLetters = [...new Set(word.split(''))];
      
      if (uniqueLetters.length >= 2) {
        // First correct guess
        let result = manager.processGuess(roomCode, 'p1', uniqueLetters[0]);
        expect(result!.round.currentGuesserId).toBe('p1');
        
        // Second correct guess - still player 1
        result = manager.processGuess(roomCode, 'p1', uniqueLetters[1]);
        expect(result!.round.currentGuesserId).toBe('p1');
      }
    });
  });

  describe('Active player tracking', () => {
    it('should track current active player via currentGuesserId', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      
      manager.startGame(roomCode, 1);
      
      let room = manager.getRoom(roomCode);
      expect(room!.currentRound!.currentGuesserId).toBe('p1');
      
      // Verify only active player can guess
      const wrongPlayerResult = manager.processGuess(roomCode, 'p2', 'A');
      expect(wrongPlayerResult).toBeNull(); // Rejected - not their turn
      
      const word = room!.currentRound!.word;
      const wrongLetter = ['Z', 'Q', 'X'].find(l => !word.includes(l))!;
      
      // Correct active player can guess
      const correctPlayerResult = manager.processGuess(roomCode, 'p1', wrongLetter);
      expect(correctPlayerResult).not.toBeNull();
      
      // Now p2 should be active
      room = manager.getRoom(roomCode);
      expect(room!.currentRound!.currentGuesserId).toBe('p2');
    });

    it('should update currentTurnIndex when turn changes', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      manager.joinRoom(roomCode, 'p3', 'Charlie', 0xffe66d);
      
      manager.startGame(roomCode, 1);
      
      let room = manager.getRoom(roomCode);
      expect(room!.currentTurnIndex).toBe(0); // p1 is at index 0
      
      const word = room!.currentRound!.word;
      const wrongLetter = ['Z', 'Q', 'X'].find(l => !word.includes(l))!;
      
      manager.processGuess(roomCode, 'p1', wrongLetter);
      
      room = manager.getRoom(roomCode);
      expect(room!.currentTurnIndex).toBe(1); // Now at p2's index
    });

    it('should correctly identify active player from player list', () => {
      const players = [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
        { id: 'p3', name: 'Charlie' },
      ];
      
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      manager.joinRoom(roomCode, 'p3', 'Charlie', 0xffe66d);
      
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const playerIds = Array.from(room!.players.keys());
      const activePlayerId = room!.currentRound!.currentGuesserId;
      
      // Active player should be in the player list
      expect(playerIds).toContain(activePlayerId);
      
      // Active player should be at currentTurnIndex
      const activePlayerIndex = playerIds.indexOf(activePlayerId);
      expect(activePlayerIndex).toBe(room!.currentTurnIndex);
    });
  });

  describe('Turn order cycles through all players', () => {
    it('should cycle through 2 players correctly', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const word = room!.currentRound!.word;
      const wrongLetters = ['Z', 'Q', 'X', 'J', 'K'].filter(l => !word.includes(l));
      
      // p1 -> p2
      let result = manager.processGuess(roomCode, 'p1', wrongLetters[0]);
      expect(result!.nextPlayerId).toBe('p2');
      
      // p2 -> p1
      result = manager.processGuess(roomCode, 'p2', wrongLetters[1]);
      expect(result!.nextPlayerId).toBe('p1');
      
      // p1 -> p2
      result = manager.processGuess(roomCode, 'p1', wrongLetters[2]);
      expect(result!.nextPlayerId).toBe('p2');
    });

    it('should cycle through 3 players in order', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      manager.joinRoom(roomCode, 'p3', 'Charlie', 0xffe66d);
      
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const word = room!.currentRound!.word;
      const wrongLetters = ['Z', 'Q', 'X', 'J', 'K'].filter(l => !word.includes(l));
      
      // p1 -> p2 -> p3 -> p1
      let result = manager.processGuess(roomCode, 'p1', wrongLetters[0]);
      expect(result!.nextPlayerId).toBe('p2');
      
      result = manager.processGuess(roomCode, 'p2', wrongLetters[1]);
      expect(result!.nextPlayerId).toBe('p3');
      
      result = manager.processGuess(roomCode, 'p3', wrongLetters[2]);
      expect(result!.nextPlayerId).toBe('p1'); // Wraps back
    });

    it('should cycle through 4 players in order', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      manager.joinRoom(roomCode, 'p3', 'Charlie', 0xffe66d);
      manager.joinRoom(roomCode, 'p4', 'Diana', 0x95e1d3);
      
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const word = room!.currentRound!.word;
      const wrongLetters = ['Z', 'Q', 'X', 'J', 'K'].filter(l => !word.includes(l));
      
      const expectedOrder = ['p2', 'p3', 'p4', 'p1'];
      
      for (let i = 0; i < expectedOrder.length; i++) {
        const currentPlayer = i === 0 ? 'p1' : expectedOrder[i - 1];
        const result = manager.processGuess(roomCode, currentPlayer, wrongLetters[i]);
        expect(result!.nextPlayerId).toBe(expectedOrder[i]);
      }
    });

    it('should handle correct guesses without breaking cycle order', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      manager.joinRoom(roomCode, 'p3', 'Charlie', 0xffe66d);
      
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const word = room!.currentRound!.word;
      const wrongLetters = ['Z', 'Q', 'X', 'J', 'K'].filter(l => !word.includes(l));
      const correctLetter = word[0];
      
      // p1 correct - stays p1
      let result = manager.processGuess(roomCode, 'p1', correctLetter);
      expect(result!.nextPlayerId).toBe('p1');
      
      // p1 wrong - goes to p2
      result = manager.processGuess(roomCode, 'p1', wrongLetters[0]);
      expect(result!.nextPlayerId).toBe('p2');
      
      // p2 wrong - goes to p3
      result = manager.processGuess(roomCode, 'p2', wrongLetters[1]);
      expect(result!.nextPlayerId).toBe('p3');
      
      // p3 wrong - goes back to p1 (cycle preserved)
      result = manager.processGuess(roomCode, 'p3', wrongLetters[2]);
      expect(result!.nextPlayerId).toBe('p1');
    });

    it('should maintain consistent turn order across multiple rounds', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const word = room!.currentRound!.word;
      const wrongLetters = ['Z', 'Q', 'X', 'J', 'K'].filter(l => !word.includes(l));
      
      // p1 wrong -> p2
      manager.processGuess(roomCode, 'p1', wrongLetters[0]);
      
      // Start next round
      const nextRound = manager.nextRound(roomCode);
      expect(nextRound).not.toBeNull();
      
      // Turn index should have advanced
      const updatedRoom = manager.getRoom(roomCode);
      expect(updatedRoom!.currentTurnIndex).toBe(2 % 2); // (previous + 1) % playerCount
    });
  });

  describe('Edge cases', () => {
    it('should handle single player game (no rotation)', () => {
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const word = room!.currentRound!.word;
      const wrongLetter = ['Z', 'Q', 'X'].find(l => !word.includes(l))!;
      
      // Wrong guess with single player - stays on same player
      const result = manager.processGuess(roomCode, 'p1', wrongLetter);
      
      // With 1 player, rotation wraps back to same player
      expect(result!.nextPlayerId).toBe('p1');
    });

    it('should not rotate when game ends on wrong guess', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const word = room!.currentRound!.word;
      const wrongLetters = ['Z', 'Q', 'X', 'J', 'K', 'V', 'W'].filter(l => !word.includes(l));
      
      // Make 5 wrong guesses
      for (let i = 0; i < 5; i++) {
        const currentPlayer = i % 2 === 0 ? 'p1' : 'p2';
        manager.processGuess(roomCode, currentPlayer, wrongLetters[i]);
      }
      
      // 6th wrong guess ends game
      const result = manager.processGuess(roomCode, 'p2', wrongLetters[5]);
      
      expect(result!.round.isComplete).toBe(true);
      expect(result!.round.wrongGuesses).toBe(6);
      // No rotation when game ends
      expect(result!.round.currentGuesserId).toBe('p2');
    });
  });
});
