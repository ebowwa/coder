/**
 * Tests for Tournament bracket system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TournamentManager,
  TournamentSize,
  TournamentPlayer,
  DIFFICULTY_SETTINGS,
} from '../../server/tournament';

// Helper to create players
function createPlayer(id: string, name: string, seed: number): TournamentPlayer {
  return { id, name, color: seed, seed };
}

// Helper to add players to tournament
function addPlayers(
  manager: TournamentManager,
  tournamentId: string,
  count: number
): string[] {
  const ids: string[] = [];
  for (let i = 1; i <= count; i++) {
    const id = `player_${i}`;
    manager.joinTournament(tournamentId, id, `Player ${i}`, i);
    ids.push(id);
  }
  return ids;
}

describe('TournamentManager', () => {
  let manager: TournamentManager;

  beforeEach(() => {
    manager = new TournamentManager();
    manager.clear(); // Clear persisted data for test isolation
  });

  describe('createTournament', () => {
    it('should create a tournament with host as first player', () => {
      const tournament = manager.createTournament({
        name: 'Test Tournament',
        size: 4,
        hostId: 'host1',
        hostName: 'Host Player',
        hostColor: 1,
      });

      expect(tournament).toBeDefined();
      expect(tournament.name).toBe('Test Tournament');
      expect(tournament.size).toBe(4);
      expect(tournament.state).toBe('waiting');
      expect(tournament.players.size).toBe(1);
      expect(tournament.players.has('host1')).toBe(true);
    });

    it('should create an empty bracket with correct number of rounds', () => {
      const sizes: TournamentSize[] = [4, 8, 16];
      const expectedRounds = { 4: 2, 8: 3, 16: 4 };

      for (const size of sizes) {
        const tournament = manager.createTournament({
          name: `Tournament ${size}`,
          size,
          hostId: 'host1',
          hostName: 'Host',
          hostColor: 1,
        });

        expect(tournament.bracket.rounds.length).toBe(expectedRounds[size]);
        expect(tournament.bracket.champion).toBeNull();
      }
    });

    it('should create correct number of matches per round', () => {
      // 4 player tournament: round 1 has 2 matches, round 2 has 1 match
      const t4 = manager.createTournament({
        name: '4 Player',
        size: 4,
        hostId: 'h1',
        hostName: 'Host',
        hostColor: 1,
      });
      expect(t4.bracket.rounds[0].length).toBe(2); // Quarterfinals
      expect(t4.bracket.rounds[1].length).toBe(1); // Final

      // 8 player tournament: 4, 2, 1
      const t8 = manager.createTournament({
        name: '8 Player',
        size: 8,
        hostId: 'h2',
        hostName: 'Host',
        hostColor: 1,
      });
      expect(t8.bracket.rounds[0].length).toBe(4); // Quarterfinals
      expect(t8.bracket.rounds[1].length).toBe(2); // Semifinals
      expect(t8.bracket.rounds[2].length).toBe(1); // Final

      // 16 player tournament: 8, 4, 2, 1
      const t16 = manager.createTournament({
        name: '16 Player',
        size: 16,
        hostId: 'h3',
        hostName: 'Host',
        hostColor: 1,
      });
      expect(t16.bracket.rounds[0].length).toBe(8);
      expect(t16.bracket.rounds[1].length).toBe(4);
      expect(t16.bracket.rounds[2].length).toBe(2);
      expect(t16.bracket.rounds[3].length).toBe(1);
    });
  });

  describe('bracket creation for 4 players', () => {
    it('should create correct bracket structure for 4 players', () => {
      const tournament = manager.createTournament({
        name: '4 Player Tournament',
        size: 4,
        hostId: 'p1',
        hostName: 'Player 1',
        hostColor: 1,
      });

      // Add 3 more players
      manager.joinTournament(tournament.id, 'p2', 'Player 2', 2);
      manager.joinTournament(tournament.id, 'p3', 'Player 3', 3);
      manager.joinTournament(tournament.id, 'p4', 'Player 4', 4);

      expect(tournament.players.size).toBe(4);
      expect(tournament.state).toBe('waiting');
    });
  });

  describe('bracket creation for 8 players', () => {
    it('should create correct bracket structure for 8 players', () => {
      const tournament = manager.createTournament({
        name: '8 Player Tournament',
        size: 8,
        hostId: 'p1',
        hostName: 'Player 1',
        hostColor: 1,
      });

      // Add 7 more players
      for (let i = 2; i <= 8; i++) {
        manager.joinTournament(tournament.id, `p${i}`, `Player ${i}`, i);
      }

      expect(tournament.players.size).toBe(8);
      expect(tournament.bracket.rounds.length).toBe(3);
    });
  });

  describe('bracket creation for 16 players', () => {
    it('should create correct bracket structure for 16 players', () => {
      const tournament = manager.createTournament({
        name: '16 Player Tournament',
        size: 16,
        hostId: 'p1',
        hostName: 'Player 1',
        hostColor: 1,
      });

      // Add 15 more players
      for (let i = 2; i <= 16; i++) {
        manager.joinTournament(tournament.id, `p${i}`, `Player ${i}`, i);
      }

      expect(tournament.players.size).toBe(16);
      expect(tournament.bracket.rounds.length).toBe(4);
    });
  });

  describe('seeding', () => {
    it('should seed players correctly for 4 player tournament', () => {
      const tournament = manager.createTournament({
        name: 'Seeding Test 4',
        size: 4,
        hostId: 'p1',
        hostName: 'Seed 1',
        hostColor: 1,
      });

      manager.joinTournament(tournament.id, 'p2', 'Seed 2', 2);
      manager.joinTournament(tournament.id, 'p3', 'Seed 3', 3);
      manager.joinTournament(tournament.id, 'p4', 'Seed 4', 4);

      const started = manager.startTournament(tournament.id);
      expect(started).not.toBeNull();

      const firstRound = started!.bracket.rounds[0];
      
      // For 4 players: 1v4, 2v3
      // Match 0: Seed 1 vs Seed 4
      expect(firstRound[0].player1?.seed).toBe(1);
      expect(firstRound[0].player2?.seed).toBe(4);
      
      // Match 1: Seed 2 vs Seed 3
      expect(firstRound[1].player1?.seed).toBe(2);
      expect(firstRound[1].player2?.seed).toBe(3);
    });

    it('should seed players correctly for 8 player tournament', () => {
      const tournament = manager.createTournament({
        name: 'Seeding Test 8',
        size: 8,
        hostId: 'p1',
        hostName: 'Seed 1',
        hostColor: 1,
      });

      for (let i = 2; i <= 8; i++) {
        manager.joinTournament(tournament.id, `p${i}`, `Seed ${i}`, i);
      }

      const started = manager.startTournament(tournament.id);
      expect(started).not.toBeNull();

      const firstRound = started!.bracket.rounds[0];
      
      // For 8 players: 1v8, 4v5, 2v7, 3v6
      // Match 0: Seed 1 vs Seed 8
      expect(firstRound[0].player1?.seed).toBe(1);
      expect(firstRound[0].player2?.seed).toBe(8);
      
      // Match 1: Seed 4 vs Seed 5
      expect(firstRound[1].player1?.seed).toBe(4);
      expect(firstRound[1].player2?.seed).toBe(5);
      
      // Match 2: Seed 2 vs Seed 7
      expect(firstRound[2].player1?.seed).toBe(2);
      expect(firstRound[2].player2?.seed).toBe(7);
      
      // Match 3: Seed 3 vs Seed 6
      expect(firstRound[3].player1?.seed).toBe(3);
      expect(firstRound[3].player2?.seed).toBe(6);
    });

    it('should seed players correctly for 16 player tournament', () => {
      const tournament = manager.createTournament({
        name: 'Seeding Test 16',
        size: 16,
        hostId: 'p1',
        hostName: 'Seed 1',
        hostColor: 1,
      });

      for (let i = 2; i <= 16; i++) {
        manager.joinTournament(tournament.id, `p${i}`, `Seed ${i}`, i);
      }

      const started = manager.startTournament(tournament.id);
      expect(started).not.toBeNull();

      const firstRound = started!.bracket.rounds[0];
      
      // For 16 players: 1v16, 8v9, 4v13, 5v12, 2v15, 7v10, 3v14, 6v11
      // Match 0: Seed 1 vs Seed 16
      expect(firstRound[0].player1?.seed).toBe(1);
      expect(firstRound[0].player2?.seed).toBe(16);
      
      // Match 1: Seed 8 vs Seed 9
      expect(firstRound[1].player1?.seed).toBe(8);
      expect(firstRound[1].player2?.seed).toBe(9);
      
      // Match 7: Seed 6 vs Seed 11
      expect(firstRound[7].player1?.seed).toBe(6);
      expect(firstRound[7].player2?.seed).toBe(11);
    });

    it('should ensure top seeds face bottom seeds in first round', () => {
      const tournament = manager.createTournament({
        name: 'Top Bottom Seeding',
        size: 8,
        hostId: 'p1',
        hostName: 'Seed 1',
        hostColor: 1,
      });

      for (let i = 2; i <= 8; i++) {
        manager.joinTournament(tournament.id, `p${i}`, `Seed ${i}`, i);
      }

      const started = manager.startTournament(tournament.id);
      const firstRound = started!.bracket.rounds[0];

      // Check that top half seeds (1-4) are matched with bottom half (5-8)
      for (const match of firstRound) {
        const seeds = [match.player1?.seed, match.player2?.seed].filter(Boolean) as number[];
        if (seeds.length === 2) {
          const hasTopHalf = seeds.some(s => s <= 4);
          const hasBottomHalf = seeds.some(s => s > 4);
          expect(hasTopHalf && hasBottomHalf).toBe(true);
        }
      }
    });
  });

  describe('match advancement', () => {
    it('should not start tournament without full player count', () => {
      const tournament = manager.createTournament({
        name: 'Incomplete Tournament',
        size: 4,
        hostId: 'p1',
        hostName: 'Player 1',
        hostColor: 1,
      });

      manager.joinTournament(tournament.id, 'p2', 'Player 2', 2);
      // Only 2 players for a 4-player tournament

      const result = manager.startTournament(tournament.id);
      expect(result).toBeNull();
    });

    it('should advance winner to next round', () => {
      const tournament = manager.createTournament({
        name: 'Advancement Test',
        size: 4,
        hostId: 'p1',
        hostName: 'Player 1',
        hostColor: 1,
      });

      manager.joinTournament(tournament.id, 'p2', 'Player 2', 2);
      manager.joinTournament(tournament.id, 'p3', 'Player 3', 3);
      manager.joinTournament(tournament.id, 'p4', 'Player 4', 4);

      manager.startTournament(tournament.id);

      // Start and complete first match
      const match = manager.getMatchForPlayer(tournament.id, 'p1')!;
      manager.startMatch(tournament.id, match.matchId, 'ROOM1');
      manager.completeMatch(tournament.id, match.matchId, 'p1', 10, 5);

      // Start and complete second match
      const match2 = manager.getMatchForPlayer(tournament.id, 'p2')!;
      manager.startMatch(tournament.id, match2.matchId, 'ROOM2');
      manager.completeMatch(tournament.id, match2.matchId, 'p2', 8, 6);

      // Check that winners advanced to final
      const updated = manager.getTournament(tournament.id);
      const final = updated!.bracket.rounds[1][0];
      
      expect(final.player1?.id).toBe('p1');
      expect(final.player2?.id).toBe('p2');
      expect(final.state).toBe('pending');
    });

    it('should update match state when starting', () => {
      const tournament = manager.createTournament({
        name: 'Match State Test',
        size: 4,
        hostId: 'p1',
        hostName: 'Player 1',
        hostColor: 1,
      });

      for (let i = 2; i <= 4; i++) {
        manager.joinTournament(tournament.id, `p${i}`, `Player ${i}`, i);
      }

      manager.startTournament(tournament.id);

      const match = manager.getMatchForPlayer(tournament.id, 'p1')!;
      expect(match.state).toBe('pending');

      const started = manager.startMatch(tournament.id, match.matchId, 'ROOM');
      expect(started!.state).toBe('playing');
      expect(started!.roomCode).toBe('ROOM');
    });

    it('should record scores when completing match', () => {
      const tournament = manager.createTournament({
        name: 'Score Test',
        size: 4,
        hostId: 'p1',
        hostName: 'Player 1',
        hostColor: 1,
      });

      for (let i = 2; i <= 4; i++) {
        manager.joinTournament(tournament.id, `p${i}`, `Player ${i}`, i);
      }

      manager.startTournament(tournament.id);

      const match = manager.getMatchForPlayer(tournament.id, 'p1')!;
      manager.startMatch(tournament.id, match.matchId, 'ROOM');

      manager.completeMatch(tournament.id, match.matchId, 'p1', 15, 10);

      const updated = manager.getTournament(tournament.id);
      const completedMatch = updated!.bracket.rounds[0].find(m => m.matchId === match.matchId);
      
      expect(completedMatch!.winnerId).toBe('p1');
      expect(completedMatch!.loserId).toBe('p4');
      expect(completedMatch!.score1).toBe(15);
      expect(completedMatch!.score2).toBe(10);
      expect(completedMatch!.state).toBe('completed');
    });

    it('should reject invalid winner for match completion', () => {
      const tournament = manager.createTournament({
        name: 'Invalid Winner Test',
        size: 4,
        hostId: 'p1',
        hostName: 'Player 1',
        hostColor: 1,
      });

      for (let i = 2; i <= 4; i++) {
        manager.joinTournament(tournament.id, `p${i}`, `Player ${i}`, i);
      }

      manager.startTournament(tournament.id);

      const match = manager.getMatchForPlayer(tournament.id, 'p1')!;
      manager.startMatch(tournament.id, match.matchId, 'ROOM');

      // Try to set a winner who is not in this match
      const result = manager.completeMatch(tournament.id, match.matchId, 'p2', 10, 5);
      expect(result).toBeNull();
    });
  });

  describe('winner determination', () => {
    it('should determine champion when final match is completed', () => {
      const tournament = manager.createTournament({
        name: 'Champion Test',
        size: 4,
        hostId: 'p1',
        hostName: 'Player 1',
        hostColor: 1,
      });

      manager.joinTournament(tournament.id, 'p2', 'Player 2', 2);
      manager.joinTournament(tournament.id, 'p3', 'Player 3', 3);
      manager.joinTournament(tournament.id, 'p4', 'Player 4', 4);

      manager.startTournament(tournament.id);

      // Complete semifinals
      const match1 = manager.getMatchForPlayer(tournament.id, 'p1')!;
      manager.startMatch(tournament.id, match1.matchId, 'ROOM1');
      manager.completeMatch(tournament.id, match1.matchId, 'p1', 10, 5);

      const match2 = manager.getMatchForPlayer(tournament.id, 'p2')!;
      manager.startMatch(tournament.id, match2.matchId, 'ROOM2');
      manager.completeMatch(tournament.id, match2.matchId, 'p2', 8, 6);

      // Complete final
      const final = manager.getMatchForPlayer(tournament.id, 'p1')!;
      manager.startMatch(tournament.id, final.matchId, 'ROOM_FINAL');
      manager.completeMatch(tournament.id, final.matchId, 'p1', 12, 8);

      const completed = manager.getTournament(tournament.id);
      expect(completed!.bracket.champion).toBe('p1');
      expect(completed!.state).toBe('completed');
      expect(completed!.completedAt).toBeDefined();
    });

    it('should track current round throughout tournament', () => {
      const tournament = manager.createTournament({
        name: 'Round Tracking',
        size: 8,
        hostId: 'p1',
        hostName: 'Player 1',
        hostColor: 1,
      });

      for (let i = 2; i <= 8; i++) {
        manager.joinTournament(tournament.id, `p${i}`, `Player ${i}`, i);
      }

      manager.startTournament(tournament.id);
      
      let current = manager.getTournament(tournament.id);
      expect(current!.currentRound).toBe(1); // Quarterfinals

      // Complete all quarterfinal matches
      const qf = current!.bracket.rounds[0];
      for (let i = 0; i < qf.length; i++) {
        const match = qf[i];
        manager.startMatch(tournament.id, match.matchId, `ROOM_QF${i}`);
        manager.completeMatch(tournament.id, match.matchId, match.player1!.id, 10, 5);
      }

      current = manager.getTournament(tournament.id);
      expect(current!.currentRound).toBe(2); // Semifinals

      // Complete all semifinal matches
      const sf = current!.bracket.rounds[1];
      for (let i = 0; i < sf.length; i++) {
        const match = sf[i];
        manager.startMatch(tournament.id, match.matchId, `ROOM_SF${i}`);
        manager.completeMatch(tournament.id, match.matchId, match.player1!.id, 10, 5);
      }

      current = manager.getTournament(tournament.id);
      expect(current!.currentRound).toBe(3); // Final
    });

    it('should not allow joining after tournament starts', () => {
      const tournament = manager.createTournament({
        name: 'Late Join Test',
        size: 4,
        hostId: 'p1',
        hostName: 'Player 1',
        hostColor: 1,
      });

      manager.joinTournament(tournament.id, 'p2', 'Player 2', 2);
      manager.joinTournament(tournament.id, 'p3', 'Player 3', 3);
      manager.joinTournament(tournament.id, 'p4', 'Player 4', 4);

      manager.startTournament(tournament.id);

      // Try to join after start
      const result = manager.joinTournament(tournament.id, 'p5', 'Late Player', 5);
      expect(result).toBeNull();
    });
  });

  describe('difficulty settings', () => {
    it('should create tournament with default medium difficulty', () => {
      const tournament = manager.createTournament({
        name: 'Default Difficulty',
        size: 4,
        hostId: 'h1',
        hostName: 'Host',
        hostColor: 1,
      });

      expect(tournament.difficulty).toBe('medium');
    });

    it('should create tournament with specified difficulty', () => {
      const tournament = manager.createTournament({
        name: 'Hard Tournament',
        size: 4,
        difficulty: 'hard',
        hostId: 'h1',
        hostName: 'Host',
        hostColor: 1,
      });

      expect(tournament.difficulty).toBe('hard');
    });

    it('should return correct difficulty config', () => {
      const tournament = manager.createTournament({
        name: 'Easy Tournament',
        size: 4,
        difficulty: 'easy',
        hostId: 'h1',
        hostName: 'Host',
        hostColor: 1,
      });

      const config = manager.getDifficultyConfig(tournament.id);
      expect(config).toEqual(DIFFICULTY_SETTINGS.easy);
      expect(config!.maxWrongGuesses).toBe(8);
      expect(config!.wordDifficultyMin).toBe(1);
    });
  });

  describe('tournament stats', () => {
    it('should return correct tournament statistics', () => {
      // Create multiple tournaments
      const t1 = manager.createTournament({
        name: 'T1',
        size: 4,
        hostId: 'h1',
        hostName: 'Host',
        hostColor: 1,
      });

      manager.createTournament({
        name: 'T2',
        size: 4,
        hostId: 'h2',
        hostName: 'Host',
        hostColor: 1,
      });

      // Start one tournament
      manager.joinTournament(t1.id, 'p2', 'P2', 2);
      manager.joinTournament(t1.id, 'p3', 'P3', 3);
      manager.joinTournament(t1.id, 'p4', 'P4', 4);
      manager.startTournament(t1.id);

      const stats = manager.getTournamentStats();
      expect(stats.total).toBe(2);
      expect(stats.active).toBe(1);
      expect(stats.completed).toBe(0);
    });
  });

  describe('leave tournament', () => {
    it('should allow player to leave before tournament starts', () => {
      const tournament = manager.createTournament({
        name: 'Leave Test',
        size: 4,
        hostId: 'p1',
        hostName: 'Player 1',
        hostColor: 1,
      });

      manager.joinTournament(tournament.id, 'p2', 'Player 2', 2);
      expect(tournament.players.size).toBe(2);

      const result = manager.leaveTournament(tournament.id, 'p2');
      expect(result!.players.size).toBe(1);
      expect(result!.players.has('p2')).toBe(false);
    });

    it('should not allow leaving after tournament starts', () => {
      const tournament = manager.createTournament({
        name: 'No Leave Test',
        size: 4,
        hostId: 'p1',
        hostName: 'Player 1',
        hostColor: 1,
      });

      manager.joinTournament(tournament.id, 'p2', 'Player 2', 2);
      manager.joinTournament(tournament.id, 'p3', 'Player 3', 3);
      manager.joinTournament(tournament.id, 'p4', 'Player 4', 4);

      manager.startTournament(tournament.id);

      const result = manager.leaveTournament(tournament.id, 'p2');
      expect(result).toBeNull();
    });
  });
});
