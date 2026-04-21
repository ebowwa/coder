/**
 * Leaderboard system - persistent score storage
 * Tracks comprehensive player statistics including wins, losses, streaks, and average guesses
 */

import { existsSync, readFileSync } from "fs";
import { mkdirSync } from "fs";

export interface PlayerStats {
  playerId: string;
  playerName: string;
  totalWins: number;
  totalLosses: number;
  totalGamesPlayed: number;
  currentStreak: number;
  bestStreak: number;
  totalGuesses: number;
  correctGuesses: number;
  wordsSolved: number;
  lastPlayed: number;
  createdAt: number;
}

export interface LeaderboardEntry {
  playerName: string;
  score: number;
  roundsWon: number;
  roundsPlayed: number;
  winStreak: number;
  bestStreak: number;
  timestamp: number;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  playerStats: Record<string, PlayerStats>; // playerId -> stats
  lastUpdated: number;
}

const DATA_DIR = "data";
const LEADERBOARD_FILE = `${DATA_DIR}/leaderboard.json`;
const MAX_ENTRIES = 100;

class LeaderboardManager {
  private data: LeaderboardData;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.data = this.load();
  }

  private load(): LeaderboardData {
    try {
      if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
      }

      if (existsSync(LEADERBOARD_FILE)) {
        const content = readFileSync(LEADERBOARD_FILE, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }

    return {
      entries: [],
      playerStats: {},
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
        Bun.write(LEADERBOARD_FILE, JSON.stringify(this.data, null, 2));
      } catch (error) {
        console.error('Failed to save leaderboard:', error);
      }
    }, 100);
  }

  submitEntry(entry: Omit<LeaderboardEntry, 'timestamp'>): LeaderboardEntry {
    const newEntry: LeaderboardEntry = {
      ...entry,
      timestamp: Date.now(),
    };

    // Check if player already has an entry
    const existingIndex = this.data.entries.findIndex(
      e => e.playerName.toLowerCase() === entry.playerName.toLowerCase()
    );

    if (existingIndex >= 0) {
      const existing = this.data.entries[existingIndex];
      // Update existing entry if new score is higher
      if (entry.score > existing.score) {
        this.data.entries[existingIndex] = newEntry;
      } else {
        // Still update stats
        existing.roundsPlayed += entry.roundsPlayed;
        existing.roundsWon += entry.roundsWon;
        existing.winStreak = entry.winStreak;
        if (entry.bestStreak > existing.bestStreak) {
          existing.bestStreak = entry.bestStreak;
        }
        existing.timestamp = Date.now();
        this.save();
        return existing;
      }
    } else {
      this.data.entries.push(newEntry);
    }

    // Sort by score descending
    this.data.entries.sort((a, b) => b.score - a.score);

    // Keep only top entries
    if (this.data.entries.length > MAX_ENTRIES) {
      this.data.entries = this.data.entries.slice(0, MAX_ENTRIES);
    }

    this.save();
    return newEntry;
  }

  getLeaderboard(limit: number = 50, offset: number = 0): LeaderboardEntry[] {
    return this.data.entries.slice(offset, offset + limit);
  }

  getPlayerRank(playerName: string): number | null {
    const index = this.data.entries.findIndex(
      e => e.playerName.toLowerCase() === playerName.toLowerCase()
    );
    return index >= 0 ? index + 1 : null;
  }

  getPlayerEntry(playerName: string): LeaderboardEntry | null {
    return this.data.entries.find(
      e => e.playerName.toLowerCase() === playerName.toLowerCase()
    ) || null;
  }

  getStats(): { totalEntries: number; lastUpdated: number } {
    return {
      totalEntries: this.data.entries.length,
      lastUpdated: this.data.lastUpdated,
    };
  }

  // Clear all entries (for testing)
  clear(): void {
    this.data = {
      entries: [],
      playerStats: {},
      lastUpdated: Date.now(),
    };
    this.save();
  }

  // Player Stats Methods
  
  getPlayerStats(playerId: string): PlayerStats | null {
    return this.data.playerStats[playerId] || null;
  }

  getAllPlayerStats(): PlayerStats[] {
    return Object.values(this.data.playerStats);
  }

  recordGameResult(
    playerId: string,
    playerName: string,
    won: boolean,
    guessCount: number,
    correctGuessCount: number,
    solvedWord: boolean
  ): PlayerStats {
    const now = Date.now();
    let stats = this.data.playerStats[playerId];

    if (!stats) {
      stats = {
        playerId,
        playerName,
        totalWins: 0,
        totalLosses: 0,
        totalGamesPlayed: 0,
        currentStreak: 0,
        bestStreak: 0,
        totalGuesses: 0,
        correctGuesses: 0,
        wordsSolved: 0,
        lastPlayed: now,
        createdAt: now,
      };
      this.data.playerStats[playerId] = stats;
    }

    // Update stats
    stats.playerName = playerName; // Update name in case it changed
    stats.totalGamesPlayed++;
    stats.totalGuesses += guessCount;
    stats.correctGuesses += correctGuessCount;
    stats.lastPlayed = now;

    if (won) {
      stats.totalWins++;
      stats.currentStreak++;
      if (solvedWord) {
        stats.wordsSolved++;
      }
      if (stats.currentStreak > stats.bestStreak) {
        stats.bestStreak = stats.currentStreak;
      }
    } else {
      stats.totalLosses++;
      stats.currentStreak = 0;
    }

    this.save();
    return stats;
  }

  getAverageGuesses(playerId: string): number {
    const stats = this.data.playerStats[playerId];
    if (!stats || stats.totalGamesPlayed === 0) return 0;
    return Math.round((stats.totalGuesses / stats.totalGamesPlayed) * 100) / 100;
  }

  getWinRate(playerId: string): number {
    const stats = this.data.playerStats[playerId];
    if (!stats || stats.totalGamesPlayed === 0) return 0;
    return Math.round((stats.totalWins / stats.totalGamesPlayed) * 100) / 100;
  }

  getAccuracy(playerId: string): number {
    const stats = this.data.playerStats[playerId];
    if (!stats || stats.totalGuesses === 0) return 0;
    return Math.round((stats.correctGuesses / stats.totalGuesses) * 100) / 100;
  }

  getTopPlayersByWins(limit: number = 10): PlayerStats[] {
    return Object.values(this.data.playerStats)
      .sort((a, b) => b.totalWins - a.totalWins)
      .slice(0, limit);
  }

  getTopPlayersByStreak(limit: number = 10): PlayerStats[] {
    return Object.values(this.data.playerStats)
      .sort((a, b) => b.bestStreak - a.bestStreak)
      .slice(0, limit);
  }

  getTopPlayersByAccuracy(limit: number = 10): PlayerStats[] {
    return Object.values(this.data.playerStats)
      .filter(s => s.totalGuesses >= 10) // Minimum guesses for ranking
      .sort((a, b) => {
        const accA = a.correctGuesses / a.totalGuesses;
        const accB = b.correctGuesses / b.totalGuesses;
        return accB - accA;
      })
      .slice(0, limit);
  }
}

export const leaderboardManager = new LeaderboardManager();
