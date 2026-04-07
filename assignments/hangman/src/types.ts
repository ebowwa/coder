/**
 * Shared type definitions for the Hangman game
 * 
 * This module contains all TypeScript interfaces, type aliases, and type definitions
 * used throughout the Hangman game application.
 * 
 * @module types
 */

import * as THREE from 'three';

/**
 * Represents the status of a letter tile in the game.
 * - 'unused': Letter has not been guessed yet
 * - 'correct': Letter was guessed and exists in the word
 * - 'wrong': Letter was guessed but does not exist in the word
 */
export type LetterStatus = 'unused' | 'correct' | 'wrong';

/**
 * Represents a player's prediction about whether a letter is in the word.
 * - 'in': Player predicts the letter is in the word
 * - 'not-in': Player predicts the letter is not in the word
 */
export type Prediction = 'in' | 'not-in';

/**
 * Represents a single letter tile in the 3D game UI.
 * 
 * @interface LetterTile
 */
export interface LetterTile {
  /** The letter character (A-Z) */
  letter: string;
  /** Current status of the letter tile */
  status: LetterStatus;
  /** Three.js mesh object for rendering */
  mesh: THREE.Mesh;
}

/**
 * Represents a single round of the Hangman game.
 * 
 * @interface Round
 * @example
 * ```typescript
 * const round: Round = {
 *   word: 'HELLO',
 *   category: 'greetings',
 *   difficulty: 2,
 *   revealedLetters: new Set(['H', 'L']),
 *   wrongGuesses: 1,
 *   guessedLetters: new Set(['H', 'L', 'X']),
 *   isComplete: false,
 *   isWon: false,
 * };
 * ```
 */
export interface Round {
  /** The word to be guessed (uppercase) */
  word: string;
  /** Category name for display purposes */
  category: string;
  /** Difficulty level (1-5) */
  difficulty: number;
  /** Set of letters that have been correctly guessed and revealed */
  revealedLetters: Set<string>;
  /** Number of incorrect guesses made */
  wrongGuesses: number;
  /** Set of all letters that have been guessed */
  guessedLetters: Set<string>;
  /** Whether the round has ended (win or loss) */
  isComplete: boolean;
  /** Whether the round was won (all letters revealed) */
  isWon: boolean;
}

/**
 * Represents the player's score across multiple rounds.
 * 
 * @interface ScoreEntry
 */
export interface ScoreEntry {
  /** Total accumulated score */
  totalScore: number;
  /** Array of scores from each completed round */
  roundScores: number[];
  /** Current consecutive win streak */
  currentStreak: number;
  /** Best consecutive win streak achieved */
  bestStreak: number;
  /** Number of rounds won */
  roundsWon: number;
  /** Total number of rounds played */
  roundsPlayed: number;
}

/**
 * Represents the complete game state for a single-player session.
 * 
 * @interface GameState
 */
export interface GameState {
  /** Current active round, or null if no round is active */
  currentRound: Round | null;
  /** Player's score information */
  score: ScoreEntry;
  /** Number of lives remaining (game over when reaches 0) */
  livesRemaining: number;
  /** Maximum number of lives at game start */
  maxLives: number;
  /** Whether the game has ended */
  isGameOver: boolean;
  /** Current difficulty level (1-5) */
  difficulty: number;
  /** Number of hints available for the current round */
  hintsRemaining: number;
  /** Maximum hints per round */
  maxHints: number;
  /** Selected word category, or null for random */
  selectedCategory: string | null;
}

/**
 * Response from the word API endpoint.
 * 
 * @interface WordResponse
 */
export interface WordResponse {
  /** The word to guess */
  word: string;
  /** Category of the word */
  category: string;
  /** Difficulty level of the word */
  difficulty: number;
}

/**
 * Result of a player's prediction about a letter.
 * 
 * @interface PredictionResult
 */
export interface PredictionResult {
  /** The prediction made ('in' or 'not-in') */
  prediction: Prediction;
  /** The letter the prediction was about */
  letter: string;
  /** Whether the prediction was correct */
  isCorrect: boolean;
  /** Points earned from this prediction */
  pointsEarned: number;
}

/**
 * Represents a game event for the event system.
 * 
 * @interface GameEvent
 */
export interface GameEvent {
  /** Type of game event */
  type: 'letter-guessed' | 'prediction-made' | 'round-complete' | 'game-over' | 'next-round';
  /** Event payload data (varies by event type) */
  payload?: LetterStatus | Prediction | Round | ScoreEntry | null;
}

/**
 * Configuration for creating a 3D scene.
 * 
 * @interface SceneConfig
 */
export interface SceneConfig {
  /** HTML container element for the renderer */
  container: HTMLElement;
  /** Width of the scene in pixels */
  width: number;
  /** Height of the scene in pixels */
  height: number;
  /** Background color as hex number */
  backgroundColor: number;
}

/**
 * Represents a body part of the hangman figure.
 * 
 * @interface BodyPart
 */
export interface BodyPart {
  /** Name identifier for the body part */
  name: string;
  /** Three.js mesh for rendering */
  mesh: THREE.Mesh;
  /** Whether the body part is currently visible */
  visible: boolean;
}
