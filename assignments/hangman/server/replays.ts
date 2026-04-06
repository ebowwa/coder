/**
 * Replay system - stores completed game rounds with individual guess tracking
 * Persists replays to JSON for long-term storage
 */

import { existsSync, readFileSync } from "fs";
import { mkdirSync } from "fs";
import type { MultiplayerRound, PlayerInfo } from '../src/multiplayer/types';

import { generatePlayerId } from '../src/multiplayer/types';

/**
 * Records a single guess made during a replay
 */
export interface IndividualGuess {
  playerId: string;
  playerName: string;
  letter: string;
  isCorrect: boolean;
  timestamp: number;
  wrongGuessCountAfter: number; // Wrong guesses after this guess
}

export interface ReplayRound {
  roundId: string;
  roomCode: string;
  word: string;
  category: string;
  difficulty: number;
  players: PlayerInfo[];
  guesses: IndividualGuess[]; // Individual guess history
  finalRevealedLetters: string[];
  finalWrongGuesses: number;
  finalGuessedLetters: string[];
  isWon: boolean;
  completedAt: number;
  winner: string | null; // Player ID who made the winning guess, if won
  duration: number; // Time from first guess to completion (ms)
}

export interface ReplayData {
  replays: ReplayRound[];
  lastUpdated: number;
}

const DATA_DIR = "data";
const REPLAYS_FILE = `${DATA_DIR}/replays.json`;
const MAX_REPLAYS = 500;

class ReplayManager {
  private data: ReplayData;
  private currentRoundGuesses: Map<string, IndividualGuess[]> = new Map(); // roomCode -> guesses
  private roundStartTimes: Map<string, number> = new Map(); // roomCode -> start time
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.data = this.load();
  }

  private load(): ReplayData {
    try {
      if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
      }

      if (existsSync(REPLAYS_FILE)) {
        const content = readFileSync(REPLAYS_FILE, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('Failed to load replays:', error);
    }

    return {
      replays: [],
      lastUpdated: Date.now(),
    };
  }

  private save(): void {
    // Debounce saves
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      try {
        this.data.lastUpdated = Date.now();
        Bun.write(REPLAYS_FILE, JSON.stringify(this.data, null, 2));
      } catch (error) {
        console.error('Failed to save replays:', error);
      }
    }, 100);
  }

  /**
   * Start tracking guesses for a new round
   */
  startRound(roomCode: string): void {
    this.currentRoundGuesses.set(roomCode, []);
    this.roundStartTimes.set(roomCode, Date.now());
  }

  /**
   * Record an individual guess during a round
   */
  recordGuess(
    roomCode: string,
    playerId: string,
    playerName: string,
    letter: string,
    isCorrect: boolean,
    wrongGuessCountAfter: number
  ): void {
    const guesses = this.currentRoundGuesses.get(roomCode) || [];
    guesses.push({
      playerId,
      playerName,
      letter: letter.toUpperCase(),
      isCorrect,
      timestamp: Date.now(),
      wrongGuessCountAfter,
    });
    this.currentRoundGuesses.set(roomCode, guesses);
  }

  /**
   * Store a completed round as a replay
   */
  storeReplay(roomCode: string, round: MultiplayerRound, players: PlayerInfo[]): ReplayRound {
    const guesses = this.currentRoundGuesses.get(roomCode) || [];
    const startTime = this.roundStartTimes.get(roomCode) || Date.now();
    
    const replay: ReplayRound = {
      roundId: generatePlayerId(),
      roomCode,
      word: round.word,
      category: round.category,
      difficulty: round.difficulty,
      players: players.map(p => ({ ...p })),
      guesses: [...guesses],
      finalRevealedLetters: [...round.revealedLetters],
      finalWrongGuesses: round.wrongGuesses,
      finalGuessedLetters: [...round.guessedLetters],
      isWon: round.isWon,
      completedAt: Date.now(),
      winner: round.isWon ? round.currentGuesserId : null,
      duration: Date.now() - startTime,
    };

    // Add to persistent storage
    this.data.replays.unshift(replay);
    
    // Keep only the last N replays
    if (this.data.replays.length > MAX_REPLAYS) {
      this.data.replays = this.data.replays.slice(0, MAX_REPLAYS);
    }

    this.save();

    // Clear tracking data for this room
    this.currentRoundGuesses.delete(roomCode);
    this.roundStartTimes.delete(roomCode);
    
    return replay;
  }

  /**
   * Get all replays for a specific room
   */
  getReplays(roomCode: string): ReplayRound[] {
    return this.data.replays.filter(r => r.roomCode === roomCode);
  }

  /**
   * Get a specific replay by ID
   */
  getReplay(roundId: string): ReplayRound | null {
    return this.data.replays.find(r => r.roundId === roundId) || null;
  }

  /**
   * Get recent replays across all rooms
   */
  getRecentReplays(limit: number = 50): ReplayRound[] {
    return this.data.replays.slice(0, limit);
  }

  /**
   * Get replays for a specific player
   */
  getPlayerReplays(playerId: string, limit: number = 50): ReplayRound[] {
    return this.data.replays
      .filter(r => r.players.some(p => p.id === playerId))
      .slice(0, limit);
  }

  /**
   * Get stats about the replay system
   */
  getStats(): { totalReplays: number; lastUpdated: number } {
    return {
      totalReplays: this.data.replays.length,
      lastUpdated: this.data.lastUpdated,
    };
  }

  /**
   * Clear all replays (for testing)
   */
  clear(): void {
    this.data = {
      replays: [],
      lastUpdated: Date.now(),
    };
    this.currentRoundGuesses.clear();
    this.roundStartTimes.clear();
    this.save();
  }
}

export const replayManager = new ReplayManager();
