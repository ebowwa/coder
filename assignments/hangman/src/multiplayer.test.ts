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
      expect(updatedRoom!.currentTurnIndex).toBe(1 % 2); // (previous + 1) % playerCount
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

  describe('Next round flow after word is completed', () => {
    it('should transition to next round after word is guessed correctly', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const firstWord = room!.currentRound!.word;
      
      // Complete the word by guessing all letters
      const uniqueLetters = [...new Set(firstWord.split(''))];
      for (const letter of uniqueLetters) {
        const currentRoom = manager.getRoom(roomCode);
        manager.processGuess(roomCode, currentRoom!.currentRound!.currentGuesserId, letter);
      }
      
      // Verify round is complete
      let updatedRoom = manager.getRoom(roomCode);
      expect(updatedRoom!.currentRound!.isComplete).toBe(true);
      expect(updatedRoom!.currentRound!.isWon).toBe(true);
      
      // Start next round
      const nextRound = manager.nextRound(roomCode);
      expect(nextRound).not.toBeNull();
      expect(nextRound!.word).not.toBe(firstWord);
      expect(nextRound!.isComplete).toBe(false);
      expect(nextRound!.wrongGuesses).toBe(0);
      expect(nextRound!.guessedLetters).toEqual([]);
      expect(nextRound!.revealedLetters).toEqual([]);
    });

    it('should advance turn index on next round', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      manager.joinRoom(roomCode, 'p3', 'Charlie', 0xffe66d);
      
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const initialTurnIndex = room!.currentTurnIndex;
      
      // Complete first round
      const word = room!.currentRound!.word;
      const uniqueLetters = [...new Set(word.split(''))];
      for (const letter of uniqueLetters) {
        const currentRoom = manager.getRoom(roomCode);
        manager.processGuess(roomCode, currentRoom!.currentRound!.currentGuesserId, letter);
      }
      
      manager.nextRound(roomCode);
      
      const updatedRoom = manager.getRoom(roomCode);
      // Turn index should advance by 1 (modulo player count)
      expect(updatedRoom!.currentTurnIndex).toBe((initialTurnIndex + 1) % 3);
    });

    it('should set correct first guesser for next round', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      manager.joinRoom(roomCode, 'p3', 'Charlie', 0xffe66d);
      
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const playerIds = Array.from(room!.players.keys());
      
      // First round starts with player at index 0
      expect(room!.currentRound!.currentGuesserId).toBe(playerIds[0]);
      
      // Complete first round
      const word = room!.currentRound!.word;
      const uniqueLetters = [...new Set(word.split(''))];
      for (const letter of uniqueLetters) {
        const currentRoom = manager.getRoom(roomCode);
        manager.processGuess(roomCode, currentRoom!.currentRound!.currentGuesserId, letter);
      }
      
      manager.nextRound(roomCode);
      
      const updatedRoom = manager.getRoom(roomCode);
      // Next round should start with player at index 1
      expect(updatedRoom!.currentRound!.currentGuesserId).toBe(playerIds[1]);
    });

    it('should handle consecutive rounds correctly', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      
      manager.startGame(roomCode, 1);
      
      // Complete round 1
      let room = manager.getRoom(roomCode);
      let word = room!.currentRound!.word;
      let uniqueLetters = [...new Set(word.split(''))];
      for (const letter of uniqueLetters) {
        const currentRoom = manager.getRoom(roomCode);
        manager.processGuess(roomCode, currentRoom!.currentRound!.currentGuesserId, letter);
      }
      
      // Start round 2
      manager.nextRound(roomCode);
      room = manager.getRoom(roomCode);
      expect(room!.currentRound!.isComplete).toBe(false);
      
      // Complete round 2
      word = room!.currentRound!.word;
      uniqueLetters = [...new Set(word.split(''))];
      for (const letter of uniqueLetters) {
        const currentRoom = manager.getRoom(roomCode);
        manager.processGuess(roomCode, currentRoom!.currentRound!.currentGuesserId, letter);
      }
      
      // Start round 3
      const round3 = manager.nextRound(roomCode);
      expect(round3).not.toBeNull();
      expect(round3!.isComplete).toBe(false);
    });

    it('should handle round transition after loss', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const word = room!.currentRound!.word;
      const wrongLetters = ['Z', 'Q', 'X', 'J', 'K', 'V'].filter(l => !word.includes(l));
      
      // Make 6 wrong guesses to lose
      for (let i = 0; i < 6; i++) {
        const currentRoom = manager.getRoom(roomCode);
        manager.processGuess(roomCode, currentRoom!.currentRound!.currentGuesserId, wrongLetters[i]);
      }
      
      const updatedRoom = manager.getRoom(roomCode);
      expect(updatedRoom!.currentRound!.isComplete).toBe(true);
      expect(updatedRoom!.currentRound!.isWon).toBe(false);
      
      // Should still be able to start next round
      const nextRound = manager.nextRound(roomCode);
      expect(nextRound).not.toBeNull();
      expect(nextRound!.isComplete).toBe(false);
    });
  });

  describe('Player score tracking', () => {
    it('should award points when word is completed', () => {
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const word = room!.currentRound!.word;
      const initialScore = room!.players.get('p1')!.score;
      
      // Complete the word
      const uniqueLetters = [...new Set(word.split(''))];
      for (const letter of uniqueLetters) {
        manager.processGuess(roomCode, 'p1', letter);
      }
      
      const updatedRoom = manager.getRoom(roomCode);
      const finalScore = updatedRoom!.players.get('p1')!.score;
      
      // Score should increase (word.length * 10 points)
      expect(finalScore).toBe(initialScore + word.length * 10);
    });

    it('should award points to all players on successful round', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      manager.joinRoom(roomCode, 'p3', 'Charlie', 0xffe66d);
      
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const word = room!.currentRound!.word;
      
      const initialScores = {
        p1: room!.players.get('p1')!.score,
        p2: room!.players.get('p2')!.score,
        p3: room!.players.get('p3')!.score,
      };
      
      // Complete the word
      const uniqueLetters = [...new Set(word.split(''))];
      for (const letter of uniqueLetters) {
        const currentRoom = manager.getRoom(roomCode);
        manager.processGuess(roomCode, currentRoom!.currentRound!.currentGuesserId, letter);
      }
      
      const updatedRoom = manager.getRoom(roomCode);
      const pointsAwarded = word.length * 10;
      
      // All players should get points
      expect(updatedRoom!.players.get('p1')!.score).toBe(initialScores.p1 + pointsAwarded);
      expect(updatedRoom!.players.get('p2')!.score).toBe(initialScores.p2 + pointsAwarded);
      expect(updatedRoom!.players.get('p3')!.score).toBe(initialScores.p3 + pointsAwarded);
    });

    it('should accumulate scores across multiple rounds', () => {
      manager.startGame(roomCode, 1);
      
      // Complete round 1
      let room = manager.getRoom(roomCode);
      let word = room!.currentRound!.word;
      const round1Points = word.length * 10;
      
      const uniqueLetters = [...new Set(word.split(''))];
      for (const letter of uniqueLetters) {
        manager.processGuess(roomCode, 'p1', letter);
      }
      
      let updatedRoom = manager.getRoom(roomCode);
      expect(updatedRoom!.players.get('p1')!.score).toBe(round1Points);
      
      // Start and complete round 2
      manager.nextRound(roomCode);
      room = manager.getRoom(roomCode);
      word = room!.currentRound!.word;
      const round2Points = word.length * 10;
      
      const uniqueLetters2 = [...new Set(word.split(''))];
      for (const letter of uniqueLetters2) {
        manager.processGuess(roomCode, 'p1', letter);
      }
      
      updatedRoom = manager.getRoom(roomCode);
      expect(updatedRoom!.players.get('p1')!.score).toBe(round1Points + round2Points);
    });

    it('should not award points on round loss', () => {
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const initialScore = room!.players.get('p1')!.score;
      const word = room!.currentRound!.word;
      const wrongLetters = ['Z', 'Q', 'X', 'J', 'K', 'V'].filter(l => !word.includes(l));
      
      // Make 6 wrong guesses to lose
      for (let i = 0; i < 6; i++) {
        manager.processGuess(roomCode, 'p1', wrongLetters[i]);
      }
      
      const updatedRoom = manager.getRoom(roomCode);
      expect(updatedRoom!.players.get('p1')!.score).toBe(initialScore);
    });

    it('should track individual player scores in multiplayer', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      expect(room!.players.get('p1')!.score).toBe(0);
      expect(room!.players.get('p2')!.score).toBe(0);
      
      // Both should have independent score tracking
      const p1Score = room!.players.get('p1')!.score;
      const p2Score = room!.players.get('p2')!.score;
      
      expect(p1Score).toBeDefined();
      expect(p2Score).toBeDefined();
    });
  });

  describe('All players guessing wrong in sequence', () => {
    it('should handle 2 players both guessing wrong before game over', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const word = room!.currentRound!.word;
      const wrongLetters = ['Z', 'Q', 'X', 'J', 'K', 'V'].filter(l => !word.includes(l));
      
      // p1 wrong -> p2 wrong -> p1 wrong -> p2 wrong -> p1 wrong -> p2 wrong (game over)
      const sequence: string[] = [];
      for (let i = 0; i < 6; i++) {
        const currentRoom = manager.getRoom(roomCode);
        const currentPlayer = currentRoom!.currentRound!.currentGuesserId;
        sequence.push(currentPlayer);
        manager.processGuess(roomCode, currentPlayer, wrongLetters[i]);
      }
      
      // Verify alternating pattern
      expect(sequence).toEqual(['p1', 'p2', 'p1', 'p2', 'p1', 'p2']);
      
      const finalRoom = manager.getRoom(roomCode);
      expect(finalRoom!.currentRound!.isComplete).toBe(true);
      expect(finalRoom!.currentRound!.wrongGuesses).toBe(6);
    });

    it('should handle 3 players all guessing wrong in rotation', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      manager.joinRoom(roomCode, 'p3', 'Charlie', 0xffe66d);
      
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const word = room!.currentRound!.word;
      const wrongLetters = ['Z', 'Q', 'X', 'J', 'K', 'V'].filter(l => !word.includes(l));
      
      // p1 -> p2 -> p3 -> p1 -> p2 -> p3 (game over)
      const sequence: string[] = [];
      for (let i = 0; i < 6; i++) {
        const currentRoom = manager.getRoom(roomCode);
        const currentPlayer = currentRoom!.currentRound!.currentGuesserId;
        sequence.push(currentPlayer);
        manager.processGuess(roomCode, currentPlayer, wrongLetters[i]);
      }
      
      // Verify rotation through all 3 players twice
      expect(sequence).toEqual(['p1', 'p2', 'p3', 'p1', 'p2', 'p3']);
      
      const finalRoom = manager.getRoom(roomCode);
      expect(finalRoom!.currentRound!.isComplete).toBe(true);
    });

    it('should handle 4 players all guessing wrong before game over', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      manager.joinRoom(roomCode, 'p3', 'Charlie', 0xffe66d);
      manager.joinRoom(roomCode, 'p4', 'Diana', 0x95e1d3);
      
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const word = room!.currentRound!.word;
      const wrongLetters = ['Z', 'Q', 'X', 'J', 'K', 'V'].filter(l => !word.includes(l));
      
      // 4 players, 6 wrong guesses: p1 -> p2 -> p3 -> p4 -> p1 -> p2 (game over)
      const sequence: string[] = [];
      for (let i = 0; i < 6; i++) {
        const currentRoom = manager.getRoom(roomCode);
        const currentPlayer = currentRoom!.currentRound!.currentGuesserId;
        sequence.push(currentPlayer);
        manager.processGuess(roomCode, currentPlayer, wrongLetters[i]);
      }
      
      expect(sequence).toEqual(['p1', 'p2', 'p3', 'p4', 'p1', 'p2']);
      
      const finalRoom = manager.getRoom(roomCode);
      expect(finalRoom!.currentRound!.isComplete).toBe(true);
      expect(finalRoom!.currentRound!.wrongGuesses).toBe(6);
    });

    it('should handle mixed correct/wrong guesses with eventual all-wrong sequence', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const word = room!.currentRound!.word;
      const correctLetter = word[0];
      const wrongLetters = ['Z', 'Q', 'X', 'J', 'K', 'V', 'W'].filter(l => !word.includes(l));
      
      // p1 correct (stays p1) -> p1 wrong (goes p2) -> p2 wrong (goes p1) -> continue wrong
      manager.processGuess(roomCode, 'p1', correctLetter);
      
      const sequence: string[] = ['p1']; // First correct guess
      for (let i = 0; i < 6; i++) {
        const currentRoom = manager.getRoom(roomCode);
        if (currentRoom!.currentRound!.isComplete) break;
        const currentPlayer = currentRoom!.currentRound!.currentGuesserId;
        sequence.push(currentPlayer);
        manager.processGuess(roomCode, currentPlayer, wrongLetters[i]);
      }
      
      const finalRoom = manager.getRoom(roomCode);
      expect(finalRoom!.currentRound!.isComplete).toBe(true);
    });

    it('should preserve turn order when all players fail to guess', () => {
      manager.joinRoom(roomCode, 'p2', 'Bob', 0x4ecdc4);
      manager.joinRoom(roomCode, 'p3', 'Charlie', 0xffe66d);
      
      manager.startGame(roomCode, 1);
      
      const room = manager.getRoom(roomCode);
      const word = room!.currentRound!.word;
      const wrongLetters = ['Z', 'Q', 'X', 'J', 'K', 'V'].filter(l => !word.includes(l));
      
      const playerIds = Array.from(room!.players.keys());
      
      // Track turn order throughout
      const turnOrder: string[] = [];
      for (let i = 0; i < 6; i++) {
        const currentRoom = manager.getRoom(roomCode);
        const activeId = currentRoom!.currentRound!.currentGuesserId;
        turnOrder.push(activeId);
        manager.processGuess(roomCode, activeId, wrongLetters[i]);
      }
      
      // Verify turn order follows expected pattern (cycling through players)
      for (let i = 0; i < turnOrder.length; i++) {
        const expectedPlayerIndex = i % playerIds.length;
        expect(turnOrder[i]).toBe(playerIds[expectedPlayerIndex]);
      }
    });
  });
});
