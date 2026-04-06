/**
 * Tournament bracket system for Hangman
 * Supports 4/8/16 player single-elimination tournaments
 */

import { existsSync, readFileSync, mkdirSync } from "fs";

// Tournament types
export type TournamentSize = 4 | 8 | 16;

// Match states
export type MatchState = 'pending' | 'playing' | 'completed';

// Tournament states
export type TournamentState = 'waiting' | 'in_progress' | 'completed';

// Game difficulty levels
export type GameDifficulty = 'easy' | 'medium' | 'hard';

// Difficulty configuration
export interface DifficultyConfig {
  wordDifficultyMin: number;
  wordDifficultyMax: number;
  maxWrongGuesses: number;
}

export const DIFFICULTY_SETTINGS: Record<GameDifficulty, DifficultyConfig> = {
  easy: {
    wordDifficultyMin: 1,
    wordDifficultyMax: 2,
    maxWrongGuesses: 8,
  },
  medium: {
    wordDifficultyMin: 2,
    wordDifficultyMax: 3,
    maxWrongGuesses: 6,
  },
  hard: {
    wordDifficultyMin: 4,
    wordDifficultyMax: 5,
    maxWrongGuesses: 4,
  },
};

export interface TournamentPlayer {
  id: string;
  name: string;
  color: number;
  seed: number; // 1-N based on signup order or skill
}

export interface TournamentMatch {
  matchId: string;
  round: number; // Round number (1 = quarterfinals, 2 = semifinals, etc.)
  position: number; // Position within the round
  player1: TournamentPlayer | null;
  player2: TournamentPlayer | null;
  winnerId: string | null;
  loserId: string | null;
  state: MatchState;
  roomCode: string | null; // Room code for the match game
  score1: number; // Player 1's score
  score2: number; // Player 2's score
}

export interface TournamentBracket {
  rounds: TournamentMatch[][];
  champion: string | null; // Player ID of winner
}

export interface Tournament {
  id: string;
  name: string;
  size: TournamentSize;
  difficulty: GameDifficulty;
  state: TournamentState;
  players: Map<string, TournamentPlayer>;
  bracket: TournamentBracket;
  currentRound: number;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
}

export interface TournamentCreatePayload {
  name: string;
  size: TournamentSize;
  difficulty?: GameDifficulty;
  hostId: string;
  hostName: string;
  hostColor: number;
}

const DATA_DIR = "data";
const TOURNAMENTS_FILE = `${DATA_DIR}/tournaments.json`;

export class TournamentManager {
  private tournaments: Map<string, Tournament> = new Map();
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
      }

      if (existsSync(TOURNAMENTS_FILE)) {
        const content = readFileSync(TOURNAMENTS_FILE, 'utf-8');
        const data = JSON.parse(content);
        
        // Restore tournaments from JSON
        for (const t of data.tournaments || []) {
          const tournament: Tournament = {
            ...t,
            players: new Map(Object.entries(t.players || {})),
          };
          this.tournaments.set(tournament.id, tournament);
        }
      }
    } catch (error) {
      console.error('Failed to load tournaments:', error);
    }
  }

  private save(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      try {
        const data = {
          tournaments: Array.from(this.tournaments.values()).map(t => ({
            ...t,
            players: Object.fromEntries(t.players),
          })),
          lastUpdated: Date.now(),
        };
        Bun.write(TOURNAMENTS_FILE, JSON.stringify(data, null, 2));
      } catch (error) {
        console.error('Failed to save tournaments:', error);
      }
    }, 100);
  }

  private generateId(): string {
    return `tournament_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMatchId(round: number, position: number): string {
    return `match_r${round}_p${position}`;
  }

  private getNumRounds(size: TournamentSize): number {
    return Math.log2(size);
  }

  private createEmptyBracket(size: TournamentSize): TournamentBracket {
    const numRounds = this.getNumRounds(size);
    const rounds: TournamentMatch[][] = [];

    for (let round = 1; round <= numRounds; round++) {
      const matchesInRound = size / Math.pow(2, round);
      const roundMatches: TournamentMatch[] = [];

      for (let pos = 0; pos < matchesInRound; pos++) {
        roundMatches.push({
          matchId: this.generateMatchId(round, pos),
          round,
          position: pos,
          player1: null,
          player2: null,
          winnerId: null,
          loserId: null,
          state: 'pending',
          roomCode: null,
          score1: 0,
          score2: 0,
        });
      }

      rounds.push(roundMatches);
    }

    return {
      rounds,
      champion: null,
    };
  }

  private seedPlayers(players: TournamentPlayer[], size: TournamentSize): TournamentPlayer[] {
    // Standard tournament seeding:
    // For 4 players: 1v4, 2v3
    // For 8 players: 1v8, 4v5, 2v7, 3v6
    // For 16 players: 1v16, 8v9, 4v13, 5v12, 2v15, 7v10, 3v14, 6v11
    
    const seeded: (TournamentPlayer | null)[] = new Array(size).fill(null);
    
    // Place players according to standard seeding pattern
    const seedingPattern = this.getSeedingPattern(size);
    
    for (let i = 0; i < players.length && i < size; i++) {
      const position = seedingPattern[i];
      seeded[position] = players[i];
    }
    
    return seeded as TournamentPlayer[];
  }

  private getSeedingPattern(size: number): number[] {
    // Generate seeding pattern that ensures:
    // - Top seeds face bottom seeds
    // - Top half seeds can't meet until later rounds
    
    if (size === 4) {
      return [0, 3, 1, 2];
    } else if (size === 8) {
      return [0, 7, 3, 4, 1, 6, 2, 5];
    } else if (size === 16) {
      return [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10];
    }
    
    // Fallback: sequential
    return Array.from({ length: size }, (_, i) => i);
  }

  createTournament(payload: TournamentCreatePayload): Tournament {
    const id = this.generateId();
    
    const host: TournamentPlayer = {
      id: payload.hostId,
      name: payload.hostName,
      color: payload.hostColor,
      seed: 1,
    };

    const tournament: Tournament = {
      id,
      name: payload.name,
      size: payload.size,
      difficulty: payload.difficulty || 'medium',
      state: 'waiting',
      players: new Map([[host.id, host]]),
      bracket: this.createEmptyBracket(payload.size),
      currentRound: 0,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
    };

    this.tournaments.set(id, tournament);
    this.save();
    
    return tournament;
  }

  joinTournament(tournamentId: string, playerId: string, playerName: string, playerColor: number): Tournament | null {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return null;
    if (tournament.state !== 'waiting') return null;
    if (tournament.players.size >= tournament.size) return null;
    if (tournament.players.has(playerId)) return null;

    const player: TournamentPlayer = {
      id: playerId,
      name: playerName,
      color: playerColor,
      seed: tournament.players.size + 1,
    };

    tournament.players.set(playerId, player);
    this.save();
    
    return tournament;
  }

  leaveTournament(tournamentId: string, playerId: string): Tournament | null {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return null;
    if (tournament.state !== 'waiting') return null;

    tournament.players.delete(playerId);
    this.save();
    
    return tournament;
  }

  startTournament(tournamentId: string): Tournament | null {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return null;
    if (tournament.state !== 'waiting') return null;
    
    // Check if tournament is full
    if (tournament.players.size !== tournament.size) return null;

    // Seed players and populate first round matches
    const players = Array.from(tournament.players.values());
    const seeded = this.seedPlayers(players, tournament.size);
    
    const firstRound = tournament.bracket.rounds[0];
    const matchCount = firstRound.length;
    
    for (let i = 0; i < matchCount; i++) {
      const match = firstRound[i];
      const player1Index = i * 2;
      const player2Index = i * 2 + 1;
      
      match.player1 = seeded[player1Index] || null;
      match.player2 = seeded[player2Index] || null;
      
      // If only one player in match, they auto-advance
      if (match.player1 && !match.player2) {
        match.winnerId = match.player1.id;
        match.state = 'completed';
      }
    }

    tournament.state = 'in_progress';
    tournament.currentRound = 1;
    tournament.startedAt = Date.now();
    
    // Process any auto-advances
    this.processAdvancement(tournament);
    
    this.save();
    return tournament;
  }

  getTournament(tournamentId: string): Tournament | null {
    return this.tournaments.get(tournamentId) || null;
  }

  getActiveTournaments(): Tournament[] {
    return Array.from(this.tournaments.values())
      .filter(t => t.state === 'waiting' || t.state === 'in_progress');
  }

  getMatchForPlayer(tournamentId: string, playerId: string): TournamentMatch | null {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament || tournament.state !== 'in_progress') return null;

    // Find the current match for this player
    for (const round of tournament.bracket.rounds) {
      for (const match of round) {
        if (match.state !== 'completed') {
          if ((match.player1?.id === playerId) || (match.player2?.id === playerId)) {
            return match;
          }
        }
      }
    }
    
    return null;
  }

  startMatch(tournamentId: string, matchId: string, roomCode: string): TournamentMatch | null {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament || tournament.state !== 'in_progress') return null;

    for (const round of tournament.bracket.rounds) {
      for (const match of round) {
        if (match.matchId === matchId && match.state === 'pending') {
          // Check if both players are present
          if (!match.player1 || !match.player2) return null;
          
          match.state = 'playing';
          match.roomCode = roomCode;
          this.save();
          return match;
        }
      }
    }
    
    return null;
  }

  completeMatch(
    tournamentId: string, 
    matchId: string, 
    winnerId: string,
    score1: number,
    score2: number
  ): Tournament | null {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament || tournament.state !== 'in_progress') return null;

    for (const round of tournament.bracket.rounds) {
      for (const match of round) {
        if (match.matchId === matchId && match.state === 'playing') {
          // Validate winner is in this match
          if (match.player1?.id !== winnerId && match.player2?.id !== winnerId) {
            return null;
          }
          
          match.winnerId = winnerId;
          match.loserId = match.player1?.id === winnerId ? match.player2?.id || null : match.player1?.id || null;
          match.score1 = score1;
          match.score2 = score2;
          match.state = 'completed';
          
          this.processAdvancement(tournament);
          this.save();
          return tournament;
        }
      }
    }
    
    return null;
  }

  private processAdvancement(tournament: Tournament): void {
    const numRounds = tournament.bracket.rounds.length;
    
    for (let roundIndex = 0; roundIndex < numRounds; roundIndex++) {
      const round = tournament.bracket.rounds[roundIndex];
      const allCompleted = round.every(m => m.state === 'completed');
      
      if (!allCompleted) break;
      
      // If this was the final round, we have a champion
      if (roundIndex === numRounds - 1) {
        const finalMatch = round[0];
        if (finalMatch.winnerId && !tournament.bracket.champion) {
          tournament.bracket.champion = finalMatch.winnerId;
          tournament.state = 'completed';
          tournament.completedAt = Date.now();
        }
        break;
      }
      
      // Advance winners to next round
      const nextRound = tournament.bracket.rounds[roundIndex + 1];
      
      for (let matchIndex = 0; matchIndex < round.length; matchIndex++) {
        const match = round[matchIndex];
        if (!match.winnerId) continue;
        
        const winner = tournament.players.get(match.winnerId);
        if (!winner) continue;
        
        // Determine which next match this winner goes to
        const nextMatchIndex = Math.floor(matchIndex / 2);
        const nextMatch = nextRound[nextMatchIndex];
        
        // Determine if winner is player1 or player2 in next match
        const isFirstOfPair = matchIndex % 2 === 0;
        
        if (isFirstOfPair) {
          nextMatch.player1 = winner;
        } else {
          nextMatch.player2 = winner;
        }
        
        // Check for bye (auto-advance if only one player)
        if (nextMatch.player1 && !nextMatch.player2) {
          // Check if all matches in current position are done
          // For now, we wait for the other match
        } else if (!nextMatch.player1 && nextMatch.player2) {
          // Same - wait for other match
        } else if (nextMatch.player1 && nextMatch.player2) {
          // Both players ready, match can be scheduled
          nextMatch.state = 'pending';
        }
      }
    }
    
    // Update current round
    for (let i = 0; i < tournament.bracket.rounds.length; i++) {
      const round = tournament.bracket.rounds[i];
      const hasPendingOrPlaying = round.some(m => m.state !== 'completed');
      if (hasPendingOrPlaying) {
        tournament.currentRound = i + 1;
        break;
      }
    }
  }

  getTournamentStats(): { total: number; active: number; completed: number } {
    const tournaments = Array.from(this.tournaments.values());
    return {
      total: tournaments.length,
      active: tournaments.filter(t => t.state === 'in_progress').length,
      completed: tournaments.filter(t => t.state === 'completed').length,
    };
  }

  getDifficultyConfig(tournamentId: string): DifficultyConfig | null {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return null;
    return DIFFICULTY_SETTINGS[tournament.difficulty];
  }

  deleteTournament(tournamentId: string): boolean {
    const deleted = this.tournaments.delete(tournamentId);
    if (deleted) {
      this.save();
    }
    return deleted;
  }

  // For serialization
  toJSON(): object {
    return {
      tournaments: Array.from(this.tournaments.values()).map(t => ({
        ...t,
        players: Object.fromEntries(t.players),
      })),
    };
  }
}

export const tournamentManager = new TournamentManager();
