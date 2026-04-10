/**
 * Leaderboard System - Persistent score tracking for the Hangman game
 *
 * Manages player scores with localStorage persistence, supporting
 * global and per-category leaderboards.
 */

const STORAGE_KEY = 'hm_leaderboard';

export interface LeaderboardEntry {
  playerName: string;
  score: number;
  category: string;
  timestamp: number;
}

export interface PlayerStats {
  playerName: string;
  totalScore: number;
  gamesPlayed: number;
  bestScore: number;
  categories: Record<string, number>;
}

export class Leaderboard {
  private entries: LeaderboardEntry[] = [];

  constructor() {
    this.load();
  }

  addScore(playerName: string, score: number, category?: string): void {
    if (!playerName || score < 0) return;

    this.entries.push({
      playerName,
      score,
      category: category || 'general',
      timestamp: Date.now(),
    });

    this.save();
  }

  getTopScores(limit: number = 10, category?: string): LeaderboardEntry[] {
    let filtered = this.entries;
    if (category) {
      filtered = filtered.filter(e => e.category === category);
    }
    return [...filtered]
      .sort((a, b) => b.score - a.score || a.timestamp - b.timestamp)
      .slice(0, limit);
  }

  getPlayerStats(playerName: string): PlayerStats {
    const playerEntries = this.entries.filter(e => e.playerName === playerName);
    const categories: Record<string, number> = {};

    for (const entry of playerEntries) {
      categories[entry.category] = (categories[entry.category] || 0) + entry.score;
    }

    return {
      playerName,
      totalScore: playerEntries.reduce((sum, e) => sum + e.score, 0),
      gamesPlayed: playerEntries.length,
      bestScore: playerEntries.length > 0
        ? Math.max(...playerEntries.map(e => e.score))
        : 0,
      categories,
    };
  }

  getPlayerRank(playerName: string, category?: string): number {
    const top = this.getTopScores(Infinity, category);
    const idx = top.findIndex(e => e.playerName === playerName);
    return idx === -1 ? -1 : idx + 1;
  }

  getCategories(): string[] {
    const cats = new Set(this.entries.map(e => e.category));
    return [...cats].sort();
  }

  clear(): void {
    this.entries = [];
    this.save();
  }

  getEntryCount(): number {
    return this.entries.length;
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.entries = JSON.parse(raw);
      }
    } catch {
      this.entries = [];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch {
      // Storage full or unavailable - entries stay in memory
    }
  }
}

export const leaderboard = new Leaderboard();
