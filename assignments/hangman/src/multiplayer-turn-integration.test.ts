/**
 * Integration tests for multiplayer turn rotation flow
 * 
 * Tests the end-to-end flow when wrong guesses trigger turn rotation,
 * correct guesses keep the same player's turn, and round completion
 * properly resets turn order.
 * 
 * Mocks the UI layer (LetterTiles, WordDisplay, PredictionUI) to focus
 * on the integration between RoomManager, game state, and turn rotation logic.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { RoomManager } from './multiplayer/room';

// Mock UI layer interfaces
interface MockLetterTiles {
  setTileStatus: Mock<(letter: string, status: 'correct' | 'wrong') => void>;
  reset: Mock<() => void>;
}

interface MockWordDisplay {
  setWord: Mock<(word: string) => void>;
  updateDisplay: Mock<(round: { word: string; revealedLetters: Set<string>; wrongGuesses: number }) => void>;
  showFullWord: Mock<() => void>;
}

interface MockPredictionUI {
  showMessage: Mock<(message: string, color: string) => void>;
}

interface MockPlayerAvatars {
  updatePlayers: Mock<(players: { id: string; name: string; score: number }[], currentTurnId: string | null) => void>;
  setCurrentTurn: Mock<(playerId: string) => void>;
  showGuessAnimation: Mock<(playerId: string, isCorrect: boolean) => void>;
}

/**
 * Simulated multiplayer game client that integrates
 * room management with mocked UI components
 */
class MultiplayerGameClient {
  private roomManager: RoomManager;
  private roomCode: string | null = null;
  private letterTiles: MockLetterTiles;
  private wordDisplay: MockWordDisplay;
  private predictionUI: MockPredictionUI;
  private playerAvatars: MockPlayerAvatars;
  
  // Event history for testing assertions
  public turnChanges: Array<{ fromPlayer: string; toPlayer: string; reason: 'wrong' | 'round_complete' }> = [];
  public guessHistory: Array<{ playerId: string; letter: string; isCorrect: boolean }> = [];
  public roundHistory: Array<{ word: string; winner: string | null; isWon: boolean }> = [];

  constructor() {
    this.roomManager = new RoomManager();
    
    // Initialize mocked UI components
    this.letterTiles = {
      setTileStatus: vi.fn(),
      reset: vi.fn(),
    };
    
    this.wordDisplay = {
      setWord: vi.fn(),
      updateDisplay: vi.fn(),
      showFullWord: vi.fn(),
    };
    
    this.predictionUI = {
      showMessage: vi.fn(),
    };
    
    this.playerAvatars = {
      updatePlayers: vi.fn(),
      setCurrentTurn: vi.fn(),
      showGuessAnimation: vi.fn(),
    };
  }

  // UI component accessors for assertions
  getLetterTiles() { return this.letterTiles; }
  getWordDisplay() { return this.wordDisplay; }
  getPredictionUI() { return this.predictionUI; }
  getPlayerAvatars() { return this.playerAvatars; }
  getRoomCode() { return this.roomCode; }

  // Game actions
  createRoom(playerId: string, playerName: string, playerColor: number): string | null {
    const room = this.roomManager.createRoom(playerId, playerName, playerColor);
    if (room) {
      this.roomCode = room.code;
      return room.code;
    }
    return null;
  }

  joinRoom(playerId: string, playerName: string, playerColor: number): boolean {
    if (!this.roomCode) return false;
    const room = this.roomManager.joinRoom(this.roomCode, playerId, playerName, playerColor);
    return room !== null;
  }

  startGame(difficulty: number = 1, forcedWord?: string): void {
    if (!this.roomCode) return;
    
    const round = this.roomManager.startGame(this.roomCode, difficulty, forcedWord);
    if (round) {
      // Update UI for new round
      this.wordDisplay.setWord(round.word);
      this.letterTiles.reset();
      
      // Update player avatars with current turn
      const room = this.roomManager.getRoom(this.roomCode);
      if (room) {
        const players = Array.from(room.players.values());
        this.playerAvatars.updatePlayers(players, round.currentGuesserId);
      }
      
      this.predictionUI.showMessage(`Game started! ${round.currentGuesserId}'s turn.`, '#4ecdc4');
    }
  }

  /**
   * Process a letter guess and update all UI components accordingly
   * This is the main integration point for turn rotation
   */
  processGuess(playerId: string, letter: string): { 
    isCorrect: boolean; 
    nextPlayerId: string;
    roundComplete: boolean;
  } | null {
    if (!this.roomCode) return null;
    
    const room = this.roomManager.getRoom(this.roomCode);
    const previousPlayerId = room?.currentRound?.currentGuesserId;
    
    const result = this.roomManager.processGuess(this.roomCode, playerId, letter);
    
    if (!result) return null;
    
    const { round, isCorrect, nextPlayerId } = result;
    
    // Record guess in history
    this.guessHistory.push({
      playerId,
      letter,
      isCorrect,
    });
    
    // Update UI - letter tiles
    this.letterTiles.setTileStatus(letter, isCorrect ? 'correct' : 'wrong');
    
    // Update UI - word display
    this.wordDisplay.updateDisplay({
      word: round.word,
      revealedLetters: new Set(round.revealedLetters),
      wrongGuesses: round.wrongGuesses,
    });
    
    // Update UI - player avatars
    this.playerAvatars.showGuessAnimation(playerId, isCorrect);
    
    if (isCorrect) {
      // Correct guess: same player continues
      this.predictionUI.showMessage(`Correct! ${playerId} guessed "${letter}"`, '#4ecdc4');
    } else {
      // Wrong guess: turn passes to next player (only if round is NOT complete)
      if (!round.isComplete) {
        this.turnChanges.push({
          fromPlayer: previousPlayerId || playerId,
          toPlayer: nextPlayerId,
          reason: 'wrong',
        });
        
        this.playerAvatars.setCurrentTurn(nextPlayerId);
        this.predictionUI.showMessage(`Wrong! Turn passes to ${nextPlayerId}`, '#ff6b6b');
      }
    }
    
    // Handle round completion
    if (round.isComplete) {
      this.roundHistory.push({
        word: round.word,
        winner: round.isWon ? playerId : null,
        isWon: round.isWon,
      });
      
      this.wordDisplay.showFullWord();
      
      if (round.isWon) {
        this.predictionUI.showMessage(`Round complete! The word was guessed!`, '#4ecdc4');
      } else {
        this.predictionUI.showMessage(`Game over! The word was: ${round.word}`, '#ff6b6b');
      }
    }
    
    return {
      isCorrect,
      nextPlayerId,
      roundComplete: round.isComplete,
    };
  }

  /**
   * Start the next round and reset turn order
   */
  nextRound(forcedWord?: string): void {
    if (!this.roomCode) return;
    
    const previousRoom = this.roomManager.getRoom(this.roomCode);
    const previousTurnIndex = previousRoom?.currentTurnIndex ?? 0;
    
    const round = this.roomManager.nextRound(this.roomCode, forcedWord);
    
    if (round) {
      // Record turn order change for new round
      const room = this.roomManager.getRoom(this.roomCode);
      const playerIds = room ? Array.from(room.players.keys()) : [];
      
      this.turnChanges.push({
        fromPlayer: playerIds[previousTurnIndex] || 'unknown',
        toPlayer: round.currentGuesserId,
        reason: 'round_complete',
      });
      
      // Reset UI for new round
      this.wordDisplay.setWord(round.word);
      this.letterTiles.reset();
      
      // Update player avatars
      if (room) {
        const players = Array.from(room.players.values());
        this.playerAvatars.updatePlayers(players, round.currentGuesserId);
      }
      
      this.predictionUI.showMessage(`New round! ${round.currentGuesserId}'s turn.`, '#ffe66d');
    }
  }

  // State accessors
  getCurrentTurnPlayerId(): string | null {
    if (!this.roomCode) return null;
    const room = this.roomManager.getRoom(this.roomCode);
    return room?.currentRound?.currentGuesserId ?? null;
  }

  getCurrentTurnIndex(): number {
    if (!this.roomCode) return -1;
    const room = this.roomManager.getRoom(this.roomCode);
    return room?.currentTurnIndex ?? -1;
  }

  getPlayerIds(): string[] {
    if (!this.roomCode) return [];
    const room = this.roomManager.getRoom(this.roomCode);
    return room ? Array.from(room.players.keys()) : [];
  }

  getWrongGuesses(): number {
    if (!this.roomCode) return 0;
    const room = this.roomManager.getRoom(this.roomCode);
    return room?.currentRound?.wrongGuesses ?? 0;
  }

  isRoundComplete(): boolean {
    if (!this.roomCode) return false;
    const room = this.roomManager.getRoom(this.roomCode);
    return room?.currentRound?.isComplete ?? false;
  }
}

describe('Multiplayer Turn Rotation Integration', () => {
  let client: MultiplayerGameClient;
  
  beforeEach(() => {
    client = new MultiplayerGameClient();
    vi.clearAllMocks();
  });

  describe('Scenario 1: Player 1 makes a wrong guess → turn passes to Player 2', () => {
    it('should rotate turn from P1 to P2 on wrong guess', () => {
      // Setup: Create room and add 3 players
      client.createRoom('p1', 'Alice', 0xff6b6b);
      client.joinRoom('p2', 'Bob', 0x4ecdc4);
      client.joinRoom('p3', 'Charlie', 0xffe66d);
      
      // Start game
      client.startGame(1);
      
      const roomCode = client.getRoomCode();
      expect(roomCode).not.toBeNull();
      expect(client.getCurrentTurnPlayerId()).toBe('p1');
      
      // Find a letter not in the word
      const room = new RoomManager().getRoom(roomCode!);
      // We need to get the word from our client's room manager
      // For now, use a letter unlikely to be in short words
      const wrongLetter = 'Z';
      
      // Player 1 makes a wrong guess
      const result = client.processGuess('p1', wrongLetter);
      
      // Verify turn rotation happened
      expect(result).not.toBeNull();
      expect(result!.isCorrect).toBe(false);
      expect(result!.nextPlayerId).toBe('p2');
      expect(client.getCurrentTurnPlayerId()).toBe('p2');
      
      // Verify UI was updated correctly
      const letterTiles = client.getLetterTiles();
      expect(letterTiles.setTileStatus).toHaveBeenCalledWith(wrongLetter, 'wrong');
      
      // Verify turn change was recorded
      expect(client.turnChanges).toHaveLength(1);
      expect(client.turnChanges[0]).toEqual({
        fromPlayer: 'p1',
        toPlayer: 'p2',
        reason: 'wrong',
      });
      
      // Verify player avatars were updated
      const avatars = client.getPlayerAvatars();
      expect(avatars.setCurrentTurn).toHaveBeenCalledWith('p2');
      expect(avatars.showGuessAnimation).toHaveBeenCalledWith('p1', false);
      
      // Verify message was shown
      const predictionUI = client.getPredictionUI();
      expect(predictionUI.showMessage).toHaveBeenCalledWith(
        expect.stringContaining('Wrong'),
        '#ff6b6b'
      );
    });

    it('should increment wrong guesses count on wrong guess', () => {
      client.createRoom('p1', 'Alice', 0xff6b6b);
      client.joinRoom('p2', 'Bob', 0x4ecdc4);
      client.startGame(1);
      
      const initialWrongGuesses = client.getWrongGuesses();
      client.processGuess('p1', 'Z');
      
      expect(client.getWrongGuesses()).toBe(initialWrongGuesses + 1);
    });
  });

  describe('Scenario 2: Player 2 makes a wrong guess → turn passes to Player 3 or back to Player 1', () => {
    it('should cycle turn from P2 to P3 on wrong guess (3 players)', () => {
      client.createRoom('p1', 'Alice', 0xff6b6b);
      client.joinRoom('p2', 'Bob', 0x4ecdc4);
      client.joinRoom('p3', 'Charlie', 0xffe66d);
      client.startGame(1);
      
      // P1 makes wrong guess → P2
      client.processGuess('p1', 'Z');
      expect(client.getCurrentTurnPlayerId()).toBe('p2');
      
      // P2 makes wrong guess → P3
      const result = client.processGuess('p2', 'Q');
      
      expect(result).not.toBeNull();
      expect(result!.isCorrect).toBe(false);
      expect(result!.nextPlayerId).toBe('p3');
      expect(client.getCurrentTurnPlayerId()).toBe('p3');
      
      // Verify turn change history
      expect(client.turnChanges).toHaveLength(2);
      expect(client.turnChanges[1]).toEqual({
        fromPlayer: 'p2',
        toPlayer: 'p3',
        reason: 'wrong',
      });
    });

    it('should wrap turn from P3 back to P1 in 3-player game', () => {
      client.createRoom('p1', 'Alice', 0xff6b6b);
      client.joinRoom('p2', 'Bob', 0x4ecdc4);
      client.joinRoom('p3', 'Charlie', 0xffe66d);
      client.startGame(1);
      
      // Cycle through all players with wrong guesses
      client.processGuess('p1', 'Z');
      client.processGuess('p2', 'Q');
      expect(client.getCurrentTurnPlayerId()).toBe('p3');
      
      // P3 makes wrong guess → wraps back to P1
      const result = client.processGuess('p3', 'X');
      
      expect(result).not.toBeNull();
      expect(result!.nextPlayerId).toBe('p1');
      expect(client.getCurrentTurnPlayerId()).toBe('p1');
      
      // Verify turn index was reset
      expect(client.getCurrentTurnIndex()).toBe(0);
    });

    it('should cycle through 2 players correctly (P1 → P2 → P1)', () => {
      client.createRoom('p1', 'Alice', 0xff6b6b);
      client.joinRoom('p2', 'Bob', 0x4ecdc4);
      client.startGame(1);
      
      // P1 → P2
      client.processGuess('p1', 'Z');
      expect(client.getCurrentTurnPlayerId()).toBe('p2');
      
      // P2 → P1
      const result = client.processGuess('p2', 'Q');
      expect(result!.nextPlayerId).toBe('p1');
      expect(client.getCurrentTurnPlayerId()).toBe('p1');
    });
  });

  describe('Scenario 3: Correct guess keeps the same player\'s turn', () => {
    it('should keep P1\'s turn after correct guess', () => {
      client.createRoom('p1', 'Alice', 0xff6b6b);
      client.joinRoom('p2', 'Bob', 0x4ecdc4);
      client.joinRoom('p3', 'Charlie', 0xffe66d);
      client.startGame(1);
      
      expect(client.getCurrentTurnPlayerId()).toBe('p1');
      
      // Get a letter that IS in the word
      const word = 'TEST'; // We can't control the word, so use first letter of word
      // For integration test, we'll guess 'E' which is common
      // Since we don't know the word, let's find a correct letter by checking the result
      
      const room = client.getRoomCode();
      // We'll make a guess and check if it was correct
      // For this test, we need to ensure we make a correct guess
      // Let's use the game's internal word access via room manager
      const roomManager = new RoomManager();
      
      // Alternative: Make multiple guesses until we find a correct one
      const vowels = ['E', 'A', 'I', 'O', 'U'];
      let foundCorrect = false;
      
      for (const letter of vowels) {
        const currentTurn = client.getCurrentTurnPlayerId();
        if (!currentTurn || client.isRoundComplete()) break;
        
        const result = client.processGuess(currentTurn, letter);
        if (result?.isCorrect) {
          foundCorrect = true;
          
          // Verify same player continues
          expect(result.nextPlayerId).toBe(currentTurn);
          expect(client.getCurrentTurnPlayerId()).toBe(currentTurn);
          
          // Verify NO turn change was recorded
          const wrongTurnChanges = client.turnChanges.filter(tc => tc.reason === 'wrong');
          expect(wrongTurnChanges.length).toBe(0);
          
          // Verify correct UI updates
          const letterTiles = client.getLetterTiles();
          expect(letterTiles.setTileStatus).toHaveBeenCalledWith(letter, 'correct');
          
          break;
        }
      }
      
      // If no vowels were in the word, test common consonants
      if (!foundCorrect) {
        const consonants = ['R', 'S', 'T', 'L', 'N'];
        for (const letter of consonants) {
          const currentTurn = client.getCurrentTurnPlayerId();
          if (!currentTurn || client.isRoundComplete()) break;
          
          const result = client.processGuess(currentTurn, letter);
          if (result?.isCorrect) {
            foundCorrect = true;
            expect(result.nextPlayerId).toBe(currentTurn);
            expect(client.getCurrentTurnPlayerId()).toBe(currentTurn);
            break;
          }
        }
      }
      
      // At least one common letter should be in the word
      expect(foundCorrect || client.isRoundComplete()).toBe(true);
    });

    it('should allow same player to make multiple correct guesses in a row', () => {
      client.createRoom('p1', 'Alice', 0xff6b6b);
      client.joinRoom('p2', 'Bob', 0x4ecdc4);
      client.startGame(1);
      
      const initialTurn = client.getCurrentTurnPlayerId();
      
      // Make guesses and track correct ones
      const correctGuesses: string[] = [];
      const letters = ['E', 'A', 'R', 'S', 'T', 'L', 'N', 'I', 'O'];
      
      for (const letter of letters) {
        if (client.isRoundComplete()) break;
        
        const currentTurn = client.getCurrentTurnPlayerId();
        if (currentTurn !== initialTurn) break; // Turn changed, stop test
        
        const result = client.processGuess(currentTurn!, letter);
        if (result?.isCorrect) {
          correctGuesses.push(letter);
          expect(result.nextPlayerId).toBe(initialTurn);
        }
      }
      
      // If we made multiple correct guesses, verify turn never changed
      if (correctGuesses.length >= 2) {
        expect(client.getCurrentTurnPlayerId()).toBe(initialTurn);
        expect(client.turnChanges.filter(tc => tc.reason === 'wrong')).toHaveLength(0);
      }
    });
  });

  describe('Scenario 4: Round completion properly resets turn order', () => {
    it('should advance turn index when starting next round', () => {
      client.createRoom('p1', 'Alice', 0xff6b6b);
      client.joinRoom('p2', 'Bob', 0x4ecdc4);
      client.joinRoom('p3', 'Charlie', 0xffe66d);
      client.startGame(1, 'BREAD');
      
      const initialTurnIndex = client.getCurrentTurnIndex();
      expect(initialTurnIndex).toBe(0);
      
      // Complete a round (by exhausting wrong guesses)
      // BREAD contains no letters from this list, so all will be wrong guesses
      const wrongLetters = ['Z', 'Q', 'X', 'J', 'K', 'V'];
      for (const letter of wrongLetters) {
        if (client.isRoundComplete()) break;
        const currentTurn = client.getCurrentTurnPlayerId();
        if (currentTurn) {
          client.processGuess(currentTurn, letter);
        }
      }
      
      expect(client.isRoundComplete()).toBe(true);
      
      // Start next round
      client.nextRound();
      
      // Turn index should have advanced
      const newTurnIndex = client.getCurrentTurnIndex();
      expect(newTurnIndex).toBe((initialTurnIndex + 1) % 3);
    });

    it('should reset all round state on next round', () => {
      client.createRoom('p1', 'Alice', 0xff6b6b);
      client.startGame(1);
      
      // Make some guesses to dirty the state
      client.processGuess('p1', 'Z');
      client.processGuess('p1', 'Q');
      
      expect(client.getWrongGuesses()).toBeGreaterThan(0);
      
      // Complete round and start next
      const wrongLetters = ['X', 'J', 'K', 'V'];
      for (const letter of wrongLetters) {
        if (client.isRoundComplete()) break;
        client.processGuess('p1', letter);
      }
      
      client.nextRound();
      
      // Verify state was reset
      expect(client.getWrongGuesses()).toBe(0);
      expect(client.isRoundComplete()).toBe(false);
      
      // Verify UI was reset
      const letterTiles = client.getLetterTiles();
      expect(letterTiles.reset).toHaveBeenCalled();
      
      const wordDisplay = client.getWordDisplay();
      expect(wordDisplay.setWord).toHaveBeenCalled();
    });

    it('should cycle starting player across multiple rounds', () => {
      client.createRoom('p1', 'Alice', 0xff6b6b);
      client.joinRoom('p2', 'Bob', 0x4ecdc4);
      client.startGame(1);
      
      const playerIds = client.getPlayerIds();
      
      // Round 1 starts with player at index 0
      expect(client.getCurrentTurnPlayerId()).toBe(playerIds[0]);
      
      // Complete round 1 quickly
      const wrongLetters = ['Z', 'Q', 'X', 'J', 'K', 'V'];
      for (const letter of wrongLetters) {
        if (client.isRoundComplete()) break;
        const currentTurn = client.getCurrentTurnPlayerId();
        if (currentTurn) client.processGuess(currentTurn, letter);
      }
      
      // Start round 2
      client.nextRound();
      expect(client.getCurrentTurnPlayerId()).toBe(playerIds[1]);
      
      // Complete round 2
      for (const letter of wrongLetters) {
        if (client.isRoundComplete()) break;
        const currentTurn = client.getCurrentTurnPlayerId();
        if (currentTurn) client.processGuess(currentTurn, letter);
      }
      
      // Start round 3
      client.nextRound();
      expect(client.getCurrentTurnPlayerId()).toBe(playerIds[0]); // Wraps back
    });

    it('should record round completion in history', () => {
      client.createRoom('p1', 'Alice', 0xff6b6b);
      client.startGame(1);
      
      // Complete the round
      const wrongLetters = ['Z', 'Q', 'X', 'J', 'K', 'V'];
      for (const letter of wrongLetters) {
        if (client.isRoundComplete()) break;
        client.processGuess('p1', letter);
      }
      
      expect(client.roundHistory).toHaveLength(1);
      expect(client.roundHistory[0].isWon).toBe(false);
      
      // Verify word display showed full word
      const wordDisplay = client.getWordDisplay();
      expect(wordDisplay.showFullWord).toHaveBeenCalled();
    });
  });

  describe('Full game flow integration', () => {
    it('should handle complete game flow: wrong guesses, turn rotation, and round completion', () => {
      client.createRoom('p1', 'Alice', 0xff6b6b);
      client.joinRoom('p2', 'Bob', 0x4ecdc4);
      client.joinRoom('p3', 'Charlie', 0xffe66d);
      client.startGame(1);
      
      // Track the sequence of turns
      const turnSequence: string[] = [];
      const wrongLetters = ['Z', 'Q', 'X', 'J', 'K', 'V'];
      let letterIndex = 0;
      
      // Make wrong guesses until game over
      while (!client.isRoundComplete() && letterIndex < wrongLetters.length) {
        const currentTurn = client.getCurrentTurnPlayerId();
        turnSequence.push(currentTurn!);
        client.processGuess(currentTurn!, wrongLetters[letterIndex]);
        letterIndex++;
      }
      
      // Verify turn rotation pattern: P1 → P2 → P3 → P1 → P2 → P3
      expect(turnSequence).toEqual(['p1', 'p2', 'p3', 'p1', 'p2', 'p3']);
      
      // Verify round completed
      expect(client.isRoundComplete()).toBe(true);
      expect(client.getWrongGuesses()).toBe(6);
      
      // Verify all turn changes were recorded
      expect(client.turnChanges.filter(tc => tc.reason === 'wrong')).toHaveLength(5);
    });

    it('should handle mixed correct/wrong guesses with proper turn rotation', () => {
      client.createRoom('p1', 'Alice', 0xff6b6b);
      client.joinRoom('p2', 'Bob', 0x4ecdc4);
      client.startGame(1);
      
      const guessSequence: Array<{ player: string; letter: string; wasCorrect: boolean }> = [];
      const letters = ['E', 'Z', 'A', 'Q', 'R', 'X', 'S', 'J'];
      
      for (const letter of letters) {
        if (client.isRoundComplete()) break;
        
        const currentTurn = client.getCurrentTurnPlayerId();
        const result = client.processGuess(currentTurn!, letter);
        
        if (result) {
          guessSequence.push({
            player: currentTurn!,
            letter,
            wasCorrect: result.isCorrect,
          });
        }
      }
      
      // Verify that correct guesses kept same player, wrong guesses rotated
      for (let i = 1; i < guessSequence.length; i++) {
        const prev = guessSequence[i - 1];
        const curr = guessSequence[i];
        
        if (prev.wasCorrect) {
          // Same player should continue after correct guess
          expect(curr.player).toBe(prev.player);
        } else {
          // Different player after wrong guess
          expect(curr.player).not.toBe(prev.player);
        }
      }
    });

    it('should maintain consistent player order across multiple rounds with varying guess outcomes', () => {
      client.createRoom('p1', 'Alice', 0xff6b6b);
      client.joinRoom('p2', 'Bob', 0x4ecdc4);
      client.joinRoom('p3', 'Charlie', 0xffe66d);
      // Use forced words that don't contain Z,Q,X,J,K,V to ensure rounds complete
      const forcedWords = ['BREAD', 'MONTH', 'FLAME'];
      client.startGame(1, forcedWords[0]);
      
      const playerIds = client.getPlayerIds();
      
      // Play through 3 rounds
      for (let round = 0; round < 3; round++) {
        const roundStartPlayer = client.getCurrentTurnPlayerId();
        expect(roundStartPlayer).toBe(playerIds[round % 3]);
        
        // Complete the round
        const wrongLetters = ['Z', 'Q', 'X', 'J', 'K', 'V'];
        for (const letter of wrongLetters) {
          if (client.isRoundComplete()) break;
          const currentTurn = client.getCurrentTurnPlayerId();
          if (currentTurn) client.processGuess(currentTurn, letter);
        }
        
        // Start next round (if not last round)
        if (round < 2) {
          client.nextRound(forcedWords[round + 1]);
        }
      }
      
      // Verify we completed 3 rounds
      expect(client.roundHistory).toHaveLength(3);
    });
  });

  describe('UI integration verification', () => {
    it('should update all UI components on each guess', () => {
      client.createRoom('p1', 'Alice', 0xff6b6b);
      client.joinRoom('p2', 'Bob', 0x4ecdc4);
      client.startGame(1);
      
      // Clear mocks from setup
      vi.clearAllMocks();
      
      // Make a guess
      client.processGuess('p1', 'Z');
      
      // Verify letter tiles updated
      const letterTiles = client.getLetterTiles();
      expect(letterTiles.setTileStatus).toHaveBeenCalledTimes(1);
      
      // Verify word display updated
      const wordDisplay = client.getWordDisplay();
      expect(wordDisplay.updateDisplay).toHaveBeenCalledTimes(1);
      
      // Verify prediction UI showed message
      const predictionUI = client.getPredictionUI();
      expect(predictionUI.showMessage).toHaveBeenCalledTimes(1);
      
      // Verify player avatars updated
      const avatars = client.getPlayerAvatars();
      expect(avatars.showGuessAnimation).toHaveBeenCalledTimes(1);
    });

    it('should pass correct data to UI components', () => {
      client.createRoom('p1', 'Alice', 0xff6b6b);
      client.startGame(1);
      
      vi.clearAllMocks();
      
      client.processGuess('p1', 'Z');
      
      // Verify word display received correct data structure
      const wordDisplay = client.getWordDisplay();
      const callArgs = wordDisplay.updateDisplay.mock.calls[0][0];
      
      expect(callArgs).toHaveProperty('word');
      expect(callArgs).toHaveProperty('revealedLetters');
      expect(callArgs).toHaveProperty('wrongGuesses');
      expect(callArgs.revealedLetters).toBeInstanceOf(Set);
    });
  });
});
