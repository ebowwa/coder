/**
 * Tournament System - Single-elimination bracket tournament management
 *
 * Provides bracket generation seeded by player order, match tracking,
 * winner advancement, and standings queries.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export enum TournamentState {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export interface TournamentPlayer {
  id: string;
  name: string;
  seed: number;
  eliminated: boolean;
  wins: number;
  losses: number;
}

export interface TournamentMatch {
  id: string;
  round: number;
  position: number;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  state: 'pending' | 'ready' | 'completed';
}

export interface TournamentBracket {
  rounds: TournamentMatch[][];
  champion: string | null;
}

// ---------------------------------------------------------------------------
// TournamentManager
// ---------------------------------------------------------------------------

export class TournamentManager {
  private players: Map<string, TournamentPlayer> = new Map();
  private matches: Map<string, TournamentMatch> = new Map();
  private state: TournamentState = TournamentState.WAITING;
  private bracketSize: number = 0;
  private totalRounds: number = 0;
  private nextMatchId: number = 1;

  // ---- Tournament lifecycle ------------------------------------------------

  /**
   * Create a new single-elimination tournament bracket seeded by player order.
   * Players array order determines seeding (index 0 = seed 1, etc.).
   * Bracket size is rounded up to the nearest power of two.
   */
  createTournament(players: TournamentPlayer[], bracketSize?: number): void {
    this.reset();

    if (players.length < 2) {
      throw new Error('Tournament requires at least 2 players');
    }

    // Determine bracket size (power of two >= player count)
    const minSize = bracketSize && bracketSize >= players.length
      ? bracketSize
      : players.length;
    this.bracketSize = nextPowerOfTwo(minSize);
    this.totalRounds = Math.log2(this.bracketSize);

    // Register players with seeds based on their array position
    for (let i = 0; i < players.length; i++) {
      const player: TournamentPlayer = {
        id: players[i].id,
        name: players[i].name,
        seed: i + 1,
        eliminated: false,
        wins: 0,
        losses: 0,
      };
      this.players.set(player.id, player);
    }

    // Generate all rounds of matches
    this.generateBracket();
  }

  /**
   * Transition the tournament from WAITING to IN_PROGRESS.
   */
  startTournament(): void {
    if (this.state !== TournamentState.WAITING) {
      throw new Error('Tournament can only be started from WAITING state');
    }
    if (this.players.size < 2) {
      throw new Error('Not enough players to start');
    }
    this.state = TournamentState.IN_PROGRESS;
  }

  /**
   * Record the winner of a match and advance them to the next round.
   * If the match was a final, the tournament is marked COMPLETED.
   */
  advanceWinner(matchId: string, winnerId: string): void {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }
    if (match.state === 'completed') {
      throw new Error('Match already completed');
    }
    if (match.player1Id !== winnerId && match.player2Id !== winnerId) {
      throw new Error(`Winner ${winnerId} is not a participant in match ${matchId}`);
    }

    // Determine loser
    const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;

    // Update match
    match.winnerId = winnerId;
    match.state = 'completed';

    // Update player stats
    const winner = this.players.get(winnerId);
    if (winner) winner.wins++;

    if (loserId) {
      const loser = this.players.get(loserId);
      if (loser) {
        loser.losses++;
        loser.eliminated = true;
      }
    }

    // If this was the final match, complete the tournament
    if (match.round === this.totalRounds - 1) {
      this.state = TournamentState.COMPLETED;
      return;
    }

    // Advance winner to next round
    const nextRound = match.round + 1;
    const nextPosition = Math.floor(match.position / 2);
    const nextMatchId = this.findOrCreateMatch(nextRound, nextPosition);

    const nextMatch = this.matches.get(nextMatchId)!;
    if (nextMatch.player1Id === null) {
      nextMatch.player1Id = winnerId;
    } else {
      nextMatch.player2Id = winnerId;
    }

    // Mark ready when both slots filled
    if (nextMatch.player1Id !== null && nextMatch.player2Id !== null) {
      nextMatch.state = 'ready';
    }
  }

  // ---- Query methods -------------------------------------------------------

  /**
   * Return the full bracket structure.
   */
  getBracket(): TournamentBracket {
    const rounds: TournamentMatch[][] = [];

    for (let r = 0; r < this.totalRounds; r++) {
      const roundMatches: TournamentMatch[] = [];
      for (const match of this.matches.values()) {
        if (match.round === r) {
          roundMatches.push({ ...match });
        }
      }
      roundMatches.sort((a, b) => a.position - b.position);
      rounds.push(roundMatches);
    }

    const champion = this.state === TournamentState.COMPLETED
      ? this.getChampionId()
      : null;

    return { rounds, champion };
  }

  /**
   * Return the first match that is 'ready' (both players present, not yet completed).
   */
  getCurrentMatch(): TournamentMatch | null {
    if (this.state !== TournamentState.IN_PROGRESS) return null;

    for (const match of this.matches.values()) {
      if (match.state === 'ready') {
        return { ...match };
      }
    }
    return null;
  }

  /**
   * Return player standings sorted by wins (desc), then seed (asc).
   */
  getStandings(): TournamentPlayer[] {
    return [...this.players.values()]
      .sort((a, b) => b.wins - a.wins || a.seed - b.seed)
      .map(p => ({ ...p }));
  }

  /**
   * Return the current tournament state.
   */
  getState(): TournamentState {
    return this.state;
  }

  /**
   * Return the total number of registered players.
   */
  getPlayerCount(): number {
    return this.players.size;
  }

  /**
   * Return a specific player by id.
   */
  getPlayer(id: string): TournamentPlayer | undefined {
    const p = this.players.get(id);
    return p ? { ...p } : undefined;
  }

  /**
   * Return a specific match by id.
   */
  getMatch(id: string): TournamentMatch | undefined {
    const m = this.matches.get(id);
    return m ? { ...m } : undefined;
  }

  // ---- Private helpers -----------------------------------------------------

  private reset(): void {
    this.players.clear();
    this.matches.clear();
    this.state = TournamentState.WAITING;
    this.bracketSize = 0;
    this.totalRounds = 0;
    this.nextMatchId = 1;
  }

  private generateBracket(): void {
    const playerList = [...this.players.values()].sort((a, b) => a.seed - b.seed);
    const seeds = seededPositions(this.bracketSize);

    // First round: assign players to positions using seeded bracket order
    const firstRoundMatchCount = this.bracketSize / 2;

    for (let pos = 0; pos < firstRoundMatchCount; pos++) {
      const matchId = this.makeMatchId();
      const seedA = seeds[pos * 2];
      const seedB = seeds[pos * 2 + 1];

      const player1Id = seedA <= playerList.length ? playerList[seedA - 1].id : null;
      const player2Id = seedB <= playerList.length ? playerList[seedB - 1].id : null;

      const hasBoth = player1Id !== null && player2Id !== null;
      // If only one player and no opponent, auto-advance (bye)
      if (player1Id !== null && player2Id === null) {
        // Record the bye match as completed
        this.matches.set(matchId, {
          id: matchId,
          round: 0,
          position: pos,
          player1Id,
          player2Id: null,
          winnerId: player1Id,
          state: 'completed',
        });

        const winner = this.players.get(player1Id);
        if (winner) winner.wins++;

        // Advance to next round
        this.advanceBye(1, Math.floor(pos / 2), player1Id);
        continue;
      }

      if (player1Id === null && player2Id === null) {
        // Empty match — neither slot has a player
        this.matches.set(matchId, {
          id: matchId,
          round: 0,
          position: pos,
          player1Id: null,
          player2Id: null,
          winnerId: null,
          state: 'pending',
        });
        continue;
      }

      this.matches.set(matchId, {
        id: matchId,
        round: 0,
        position: pos,
        player1Id,
        player2Id,
        winnerId: null,
        state: hasBoth ? 'ready' : 'pending',
      });
    }

    // Create placeholder matches for subsequent rounds
    for (let r = 1; r < this.totalRounds; r++) {
      const matchCount = this.bracketSize / Math.pow(2, r + 1);
      for (let pos = 0; pos < matchCount; pos++) {
        const matchId = this.makeMatchId();
        this.matches.set(matchId, {
          id: matchId,
          round: r,
          position: pos,
          player1Id: null,
          player2Id: null,
          winnerId: null,
          state: 'pending',
        });
      }
    }
  }

  private advanceBye(round: number, position: number, playerId: string): void {
    if (round >= this.totalRounds) {
      // Tournament winner by being the only player
      this.state = TournamentState.COMPLETED;
      return;
    }

    const matchId = this.findOrCreateMatch(round, position);
    const match = this.matches.get(matchId)!;

    if (match.player1Id === null) {
      match.player1Id = playerId;
    } else {
      match.player2Id = playerId;
    }

    if (match.player1Id !== null && match.player2Id !== null) {
      match.state = 'ready';
    }
  }

  private findOrCreateMatch(round: number, position: number): string {
    for (const [id, match] of this.matches) {
      if (match.round === round && match.position === position) {
        return id;
      }
    }
    // Create if not found
    const id = this.makeMatchId();
    this.matches.set(id, {
      id,
      round,
      position,
      player1Id: null,
      player2Id: null,
      winnerId: null,
      state: 'pending',
    });
    return id;
  }

  private makeMatchId(): string {
    return `match-${this.nextMatchId++}`;
  }

  private getChampionId(): string | null {
    for (const match of this.matches.values()) {
      if (match.round === this.totalRounds - 1 && match.winnerId) {
        return match.winnerId;
      }
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

function nextPowerOfTwo(n: number): number {
  if (n <= 0) return 1;
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * Generate seeded bracket positions for standard single-elimination seeding.
 * Returns an array of seed numbers in bracket order so that:
 *   seed 1 vs last seed, seed 2 vs second-to-last, etc.
 * This ensures the top two seeds can only meet in the final.
 */
function seededPositions(size: number): number[] {
  if (size === 1) return [1];
  if (size === 2) return [1, 2];

  const half = size / 2;
  const top = seededPositions(half);
  const bottom = seededPositions(half);

  const result: number[] = [];
  for (let i = 0; i < top.length; i++) {
    result.push(top[i]);
    result.push(size + 1 - top[i]);
  }
  return result;
}
