/**
 * Tests for the types module
 * 
 * This test file validates all TypeScript interfaces, type aliases, and type definitions
 * used throughout the Hangman game application. It ensures type safety and proper
 * type behavior across the game.
 */

import {
  LetterStatus,
  Prediction,
  LetterTile,
  Round,
  ScoreEntry,
  GameState,
  WordResponse,
  PredictionResult,
  GameEvent,
  SceneConfig,
  BodyPart,
} from './types';

describe('types', () => {
  describe('LetterStatus', () => {
    test('should have all valid letter statuses', () => {
      expect<LetterStatus>('unused').toBeDefined();
      expect<LetterStatus>('correct').toBeDefined();
      expect<LetterStatus>('wrong').toBeDefined();
    });
  });

  describe('Prediction', () => {
    test('should have all valid prediction values', () => {
      expect<Prediction>('in').toBeDefined();
      expect<Prediction>('not-in').toBeDefined();
    });
  });

  describe('LetterTile', () => {
    test('should create a valid letter tile', () => {
      const mockMesh = {} as any;
      
      const letterTile: LetterTile = {
        letter: 'A',
        status: 'unused',
        mesh: mockMesh,
      };

      expect(letterTile.letter).toBe('A');
      expect(letterTile.status).toBe('unused');
      expect(letterTile.mesh).toBe(mockMesh);
    });

    test('should enforce string type for letter', () => {
      // TypeScript will catch this at compile time, but we can test runtime behavior
      const letterTile = {
        letter: 'B' as string,
        status: 'unused' as LetterStatus,
        mesh: {} as any,
      };

      expect(typeof letterTile.letter).toBe('string');
    });
  });

  describe('Round', () => {
    test('should create a valid round', () => {
      const round: Round = {
        word: 'HELLO',
        category: 'greetings',
        difficulty: 2,
        revealedLetters: new Set(['H']),
        wrongGuesses: 1,
        guessedLetters: new Set(['H', 'E', 'X']),
        isComplete: false,
        isWon: false,
      };

      expect(round.word).toBe('HELLO');
      expect(round.category).toBe('greetings');
      expect(round.difficulty).toBe(2);
      expect(round.revealedLetters.has('H')).toBe(true);
      expect(round.wrongGuesses).toBe(1);
      expect(round.guessedLetters.has('X')).toBe(true);
      expect(round.isComplete).toBe(false);
      expect(round.isWon).toBe(false);
    });

    test('should track game state correctly', () => {
      const round: Round = {
        word: 'WORLD',
        category: 'general',
        difficulty: 3,
        revealedLetters: new Set(['W', 'O', 'R', 'L', 'D']),
        wrongGuesses: 2,
        guessedLetters: new Set(['W', 'O', 'R', 'L', 'D', 'A']),
        isComplete: true,
        isWon: true,
      };

      // Test properties for a completed round
      expect(round.isComplete).toBe(true);
      expect(round.isWon).toBe(true);
      expect(round.wrongGuesses).toBeLessThanOrEqual(6); // Standard hangman limit
      
      // All letters revealed
      round.word.split('').forEach(letter => {
        expect(round.revealedLetters.has(letter)).toBe(true);
      });
    });
  });

  describe('ScoreEntry', () => {
    test('should create a valid score entry', () => {
      const scoreEntry: ScoreEntry = {
        totalScore: 150,
        roundScores: [50, 100],
        currentStreak: 2,
        bestStreak: 5,
        roundsWon: 2,
        roundsPlayed: 3,
      };

      expect(scoreEntry.totalScore).toBe(150);
      expect(scoreEntry.roundScores).toEqual([50, 100]);
      expect(scoreEntry.currentStreak).toBe(2);
      expect(scoreEntry.bestStreak).toBe(5);
      expect(scoreEntry.roundsWon).toBe(2);
      expect(scoreEntry.roundsPlayed).toBe(3);
      
      // Calculate win rate
      const winRate = scoreEntry.roundsWon / scoreEntry.roundsPlayed;
      expect(winRate).toBeGreaterThan(0);
      expect(winRate).toBeLessThanOrEqual(1);
    });

    test('should handle zero scores correctly', () => {
      const scoreEntry: ScoreEntry = {
        totalScore: 0,
        roundScores: [],
        currentStreak: 0,
        bestStreak: 0,
        roundsWon: 0,
        roundsPlayed: 0,
      };

      expect(scoreEntry.totalScore).toBe(0);
      expect(scoreEntry.roundScores).toHaveLength(0);
      expect(scoreEntry.currentStreak).toBe(0);
      expect(scoreEntry.bestStreak).toBe(0);
      expect(scoreEntry.roundsWon).toBe(0);
      expect(scoreEntry.roundsPlayed).toBe(0);
    });
  });

  describe('GameState', () => {
    test('should create a valid game state', () => {
      const round: Round = {
        word: 'TEST',
        category: 'test',
        difficulty: 1,
        revealedLetters: new Set(['T']),
        wrongGuesses: 1,
        guessedLetters: new Set(['T', 'E', 'X']),
        isComplete: false,
        isWon: false,
      };

      const scoreEntry: ScoreEntry = {
        totalScore: 75,
        roundScores: [75],
        currentStreak: 1,
        bestStreak: 3,
        roundsWon: 1,
        roundsPlayed: 2,
      };

      const gameState: GameState = {
        currentRound: round,
        score: scoreEntry,
        livesRemaining: 5,
        maxLives: 6,
        isGameOver: false,
        difficulty: 2,
        hintsRemaining: 2,
        maxHints: 3,
        selectedCategory: null,
      };

      expect(gameState.currentRound).toBe(round);
      expect(gameState.score).toBe(scoreEntry);
      expect(gameState.livesRemaining).toBeGreaterThan(0);
      expect(gameState.livesRemaining).toBeLessThanOrEqual(gameState.maxLives);
      expect(gameState.hintsRemaining).toBeGreaterThanOrEqual(0);
      expect(gameState.hintsRemaining).toBeLessThanOrEqual(gameState.maxHints);
      expect(gameState.difficulty).toBeGreaterThanOrEqual(1);
      expect(gameState.difficulty).toBeLessThanOrEqual(5);
      expect(gameState.isGameOver).toBe(false);
    });

    test('should handle game over state', () => {
      const gameOverState: GameState = {
        currentRound: null,
        score: {
          totalScore: 0,
          roundScores: [],
          currentStreak: 0,
          bestStreak: 0,
          roundsWon: 0,
          roundsPlayed: 0,
        },
        livesRemaining: 0,
        maxLives: 6,
        isGameOver: true,
        difficulty: 1,
        hintsRemaining: 0,
        maxHints: 3,
        selectedCategory: null,
      };

      expect(gameOverState.isGameOver).toBe(true);
      expect(gameOverState.livesRemaining).toBe(0);
      expect(gameOverState.currentRound).toBeNull();
    });
  });

  describe('WordResponse', () => {
    test('should create a valid word response', () => {
      const wordResponse: WordResponse = {
        word: 'GAME',
        category: 'entertainment',
        difficulty: 2,
      };

      expect(wordResponse.word).toBe('GAME');
      expect(wordResponse.category).toBe('entertainment');
      expect(wordResponse.difficulty).toBe(2);
    });

    test('should enforce uppercase for word', () => {
      const wordResponse: WordResponse = {
        word: 'TEST', // This should be uppercase
        category: 'test',
        difficulty: 1,
      };

      expect(wordResponse.word).toBe('TEST');
      expect(wordResponse.word).toBe(wordResponse.word.toUpperCase());
    });
  });

  describe('PredictionResult', () => {
    test('should create a valid prediction result', () => {
      const predictionResult: PredictionResult = {
        prediction: 'in',
        letter: 'A',
        isCorrect: true,
        pointsEarned: 10,
      };

      expect(predictionResult.prediction).toBe('in');
      expect(predictionResult.letter).toBe('A');
      expect(predictionResult.isCorrect).toBe(true);
      expect(predictionResult.pointsEarned).toBe(10);
    });

    test('should handle incorrect predictions', () => {
      const predictionResult: PredictionResult = {
        prediction: 'not-in',
        letter: 'Z',
        isCorrect: false,
        pointsEarned: 0,
      };

      expect(predictionResult.isCorrect).toBe(false);
      expect(predictionResult.pointsEarned).toBe(0);
    });
  });

  describe('GameEvent', () => {
    test('should create a letter-guessed event', () => {
      const event: GameEvent = {
        type: 'letter-guessed',
        payload: 'correct',
      };

      expect(event.type).toBe('letter-guessed');
      expect(event.payload).toBe('correct');
    });

    test('should create a round-complete event', () => {
      const mockRound: Round = {
        word: 'WIN',
        category: 'game',
        difficulty: 1,
        revealedLetters: new Set(['W', 'I', 'N']),
        wrongGuesses: 0,
        guessedLetters: new Set(['W', 'I', 'N']),
        isComplete: true,
        isWon: true,
      };

      const event: GameEvent = {
        type: 'round-complete',
        payload: mockRound,
      };

      expect(event.type).toBe('round-complete');
      expect(event.payload).toBe(mockRound);
    });

    test('should create a game-over event', () => {
      const event: GameEvent = {
        type: 'game-over',
        payload: null,
      };

      expect(event.type).toBe('game-over');
      expect(event.payload).toBeNull();
    });
  });

  describe('SceneConfig', () => {
    test('should create a valid scene configuration', () => {
      // Mock document for testing (since we're in Node environment)
      const mockContainer = { tagName: 'div' } as any;
      
      const sceneConfig: SceneConfig = {
        container: mockContainer,
        width: 800,
        height: 600,
        backgroundColor: 0x1a1a2e,
      };

      expect(sceneConfig.container).toBe(mockContainer);
      expect(sceneConfig.width).toBeGreaterThan(0);
      expect(sceneConfig.height).toBeGreaterThan(0);
      expect(sceneConfig.backgroundColor).toBeGreaterThan(0);
    });
  });

  describe('BodyPart', () => {
    test('should create a valid body part', () => {
      const mockMesh = {} as any;
      
      const bodyPart: BodyPart = {
        name: 'head',
        mesh: mockMesh,
        visible: false,
      };

      expect(bodyPart.name).toBe('head');
      expect(bodyPart.mesh).toBe(mockMesh);
      expect(bodyPart.visible).toBe(false);
    });

    test('should support body part visibility toggling', () => {
      const mockMesh = {} as any;
      
      const bodyPart: BodyPart = {
        name: 'body',
        mesh: mockMesh,
        visible: true,
      };

      expect(bodyPart.visible).toBe(true);
      
      // Test toggling visibility
      bodyPart.visible = false;
      expect(bodyPart.visible).toBe(false);
    });
  });

  describe('Type constraints', () => {
    test('LetterStatus should only accept valid values', () => {
      const validStatuses: LetterStatus[] = ['unused', 'correct', 'wrong'];
      expect(validStatuses).toHaveLength(3);
    });

    test('Prediction should only accept valid values', () => {
      const validPredictions: Prediction[] = ['in', 'not-in'];
      expect(validPredictions).toHaveLength(2);
    });

    test('difficulty should be between 1 and 5', () => {
      const validDifficulties = [1, 2, 3, 4, 5];
      validDifficulties.forEach(diff => {
        expect(diff).toBeGreaterThanOrEqual(1);
        expect(diff).toBeLessThanOrEqual(5);
      });
    });
  });
});