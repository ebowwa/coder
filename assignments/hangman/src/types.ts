/**
 * Shared type definitions for the Hangman game
 */

import * as THREE from 'three';

export type LetterStatus = 'unused' | 'correct' | 'wrong';

export type Prediction = 'in' | 'not-in';

export interface LetterTile {
  letter: string;
  status: LetterStatus;
  mesh: THREE.Mesh;
}

export interface Round {
  word: string;
  category: string;
  difficulty: number;
  revealedLetters: Set<string>;
  wrongGuesses: number;
  guessedLetters: Set<string>;
  isComplete: boolean;
  isWon: boolean;
}

export interface ScoreEntry {
  totalScore: number;
  roundScores: number[];
  currentStreak: number;
  bestStreak: number;
  roundsWon: number;
  roundsPlayed: number;
}

export interface GameState {
  currentRound: Round | null;
  score: ScoreEntry;
  livesRemaining: number;
  maxLives: number;
  isGameOver: boolean;
  difficulty: number;
  hintsRemaining: number;
  maxHints: number;
  selectedCategory: string | null;
}

export interface WordResponse {
  word: string;
  category: string;
  difficulty: number;
}

export interface PredictionResult {
  prediction: Prediction;
  letter: string;
  isCorrect: boolean;
  pointsEarned: number;
}

export interface GameEvent {
  type: 'letter-guessed' | 'prediction-made' | 'round-complete' | 'game-over' | 'next-round';
  payload?: LetterStatus | Prediction | Round | ScoreEntry | null;
}

export interface SceneConfig {
  container: HTMLElement;
  width: number;
  height: number;
  backgroundColor: number;
}

export interface BodyPart {
  name: string;
  mesh: THREE.Mesh;
  visible: boolean;
}
