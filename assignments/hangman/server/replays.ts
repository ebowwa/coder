/**
 * Replay system - stores completed game rounds in memory
 */

import type { MultiplayerRound, PlayerInfo } from '../src/multiplayer/types';

import { generatePlayerId } from '../src/multiplayer/types';

export interface ReplayRound {
  roundId: string;
  roomCode: string;
  round: MultiplayerRound;
  players: PlayerInfo[];
  completedAt: number;
  winner: string | null; // Player ID who made the winning guess, if won
}

import { LeaderboardEntry } from './leaderboard';

class ReplayManager {
  private replays: Map<string, ReplayRound[]> = new Map(); // roomCode -> replays
  private maxReplaysPerRoom: number = 50;

  storeReplay(roomCode: string, round: MultiplayerRound, players: PlayerInfo[]): ReplayRound {
    const roomReplays = this.replays.get(roomCode) || [];
    
    const replay: ReplayRound = {
      roundId: generatePlayerId(), // Reuse ID generator for replay IDs
      roomCode,
      round: {
        ...round,
        // Make a copy of the round data
        word: round.word,
        category: round.category,
        difficulty: round.difficulty,
        revealedLetters: [...round.revealedLetters],
        wrongGuesses: round.wrongGuesses,
        guessedLetters: [...round.guessedLetters],
        isComplete: round.isComplete,
        isWon: round.isWon,
        currentGuesserId: round.currentGuesserId,
      },
      players: players.map(p => ({ ...p })),
      completedAt: Date.now(),
      winner: round.isWon ? round.currentGuesserId : null,
    };

    roomReplays.unshift(replay);
    
    // Keep only the last N replays
    if (roomReplays.length > this.maxReplaysPerRoom) {
      roomReplays.pop();
    }

    this.replays.set(roomCode, roomReplays);
    
    return replay;
  }

  getReplays(roomCode: string): ReplayRound[] {
    return this.replays.get(roomCode) || [];
  }

  getReplay(roomCode: string, roundId: string): ReplayRound | null {
    const roomReplays = this.replays.get(roomCode) || [];
    return roomReplays.find(r => r.roundId === roundId) || null;
  }

  clearReplays(roomCode: string): void {
    this.replays.delete(roomCode);
  }
}

export const replayManager = new ReplayManager();
