/**
 * Leaderboard system - persistent score storage
 */

import { existsSync, readFileSync } from "fs";
import { mkdirSync } from "fs";

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
      lastUpdated: Date.now(),
    };
    this.save();
  }
}

export const leaderboardManager = new LeaderboardManager();
