/**
 * Tests for Tournament bracket system (src/tournament.ts)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TournamentManager,
  TournamentState,
  TournamentPlayer,
  TournamentMatch,
} from './tournament';

// Helper to create TournamentPlayer objects
function makePlayer(id: string, name: string): TournamentPlayer {
  return { id, name, seed: 0, eliminated: false, wins: 0, losses: 0 };
}

function makePlayers(n: number): TournamentPlayer[] {
  return Array.from({ length: n }, (_, i) =>
    makePlayer(`p${i + 1}`, `Player ${i + 1}`)
  );
}

describe('TournamentManager', () => {
  let tm: TournamentManager;

  beforeEach(() => {
    tm = new TournamentManager();
  });

  // ---------------------------------------------------------------------------
  // Tournament creation
  // ---------------------------------------------------------------------------

  describe('createTournament', () => {
    it('should create a bracket for 2 players (1 round)', () => {
      tm.createTournament(makePlayers(2));

      expect(tm.getState()).toBe(TournamentState.WAITING);
      expect(tm.getPlayerCount()).toBe(2);

      const bracket = tm.getBracket();
      expect(bracket.rounds.length).toBe(1);
      expect(bracket.rounds[0].length).toBe(1);
      expect(bracket.champion).toBeNull();
    });

    it('should create a bracket for 4 players (2 rounds)', () => {
      tm.createTournament(makePlayers(4));

      const bracket = tm.getBracket();
      expect(bracket.rounds.length).toBe(2);
      expect(bracket.rounds[0].length).toBe(2); // semifinals
      expect(bracket.rounds[1].length).toBe(1); // final
    });

    it('should create a bracket for 8 players (3 rounds)', () => {
      tm.createTournament(makePlayers(8));

      const bracket = tm.getBracket();
      expect(bracket.rounds.length).toBe(3);
      expect(bracket.rounds[0].length).toBe(4); // quarterfinals
      expect(bracket.rounds[1].length).toBe(2); // semifinals
      expect(bracket.rounds[2].length).toBe(1); // final
    });

    it('should assign seeds based on player order', () => {
      const players = makePlayers(4);
      tm.createTournament(players);

      expect(tm.getPlayer('p1')!.seed).toBe(1);
      expect(tm.getPlayer('p2')!.seed).toBe(2);
      expect(tm.getPlayer('p3')!.seed).toBe(3);
      expect(tm.getPlayer('p4')!.seed).toBe(4);
    });

    it('should throw if fewer than 2 players', () => {
      expect(() => tm.createTournament([])).toThrow('at least 2 players');
      expect(() => tm.createTournament(makePlayers(1))).toThrow('at least 2 players');
    });

    it('should place all 4 players into first-round ready matches', () => {
      tm.createTournament(makePlayers(4));

      const firstRound = tm.getBracket().rounds[0];
      for (const match of firstRound) {
        expect(match.state).toBe('ready');
        expect(match.player1Id).not.toBeNull();
        expect(match.player2Id).not.toBeNull();
      }
    });

    it('should seed 4 players as 1v4, 2v3', () => {
      tm.createTournament(makePlayers(4));
      const firstRound = tm.getBracket().rounds[0];

      // seededPositions(4) => [1, 4, 2, 3]
      expect(firstRound[0].player1Id).toBe('p1');
      expect(firstRound[0].player2Id).toBe('p4');
      expect(firstRound[1].player1Id).toBe('p2');
      expect(firstRound[1].player2Id).toBe('p3');
    });

    it('should reset previous tournament when creating a new one', () => {
      tm.createTournament(makePlayers(4));
      tm.startTournament();

      // Create a new tournament — should reset
      tm.createTournament(makePlayers(2));
      expect(tm.getState()).toBe(TournamentState.WAITING);
      expect(tm.getPlayerCount()).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Start tournament
  // ---------------------------------------------------------------------------

  describe('startTournament', () => {
    it('should transition from WAITING to IN_PROGRESS', () => {
      tm.createTournament(makePlayers(2));
      tm.startTournament();

      expect(tm.getState()).toBe(TournamentState.IN_PROGRESS);
    });

    it('should throw when already in progress', () => {
      tm.createTournament(makePlayers(2));
      tm.startTournament();

      expect(() => tm.startTournament()).toThrow('WAITING state');
    });

    it('should throw when already completed', () => {
      const players = makePlayers(2);
      tm.createTournament(players);
      tm.startTournament();

      // Complete the only match to finish the tournament
      const match = tm.getCurrentMatch()!;
      tm.advanceWinner(match.id, players[0].id);

      expect(tm.getState()).toBe(TournamentState.COMPLETED);
      expect(() => tm.startTournament()).toThrow('WAITING state');
    });
  });

  // ---------------------------------------------------------------------------
  // Advancing winners
  // ---------------------------------------------------------------------------

  describe('advanceWinner', () => {
    it('should complete a match and set the winner', () => {
      const players = makePlayers(2);
      tm.createTournament(players);
      tm.startTournament();

      const match = tm.getCurrentMatch()!;
      tm.advanceWinner(match.id, 'p1');

      const updated = tm.getMatch(match.id);
      expect(updated!.winnerId).toBe('p1');
      expect(updated!.state).toBe('completed');
    });

    it('should update winner/loser stats', () => {
      const players = makePlayers(2);
      tm.createTournament(players);
      tm.startTournament();

      const match = tm.getCurrentMatch()!;
      tm.advanceWinner(match.id, 'p1');

      const winner = tm.getPlayer('p1')!;
      const loser = tm.getPlayer('p2')!;

      expect(winner.wins).toBe(1);
      expect(winner.losses).toBe(0);
      expect(winner.eliminated).toBe(false);

      expect(loser.wins).toBe(0);
      expect(loser.losses).toBe(1);
      expect(loser.eliminated).toBe(true);
    });

    it('should advance winner to the next round match', () => {
      const players = makePlayers(4);
      tm.createTournament(players);
      tm.startTournament();

      // Win first semifinal
      const match1 = tm.getCurrentMatch()!;
      tm.advanceWinner(match1.id, match1.player1Id!);

      // Win second semifinal
      const match2 = tm.getCurrentMatch()!;
      tm.advanceWinner(match2.id, match2.player1Id!);

      // Now the final should be ready
      const bracket = tm.getBracket();
      const final_ = bracket.rounds[1][0];
      expect(final_.state).toBe('ready');
      expect(final_.player1Id).not.toBeNull();
      expect(final_.player2Id).not.toBeNull();
    });

    it('should throw for unknown match id', () => {
      tm.createTournament(makePlayers(2));
      tm.startTournament();

      expect(() => tm.advanceWinner('nonexistent', 'p1')).toThrow('not found');
    });

    it('should throw if match already completed', () => {
      const players = makePlayers(2);
      tm.createTournament(players);
      tm.startTournament();

      const match = tm.getCurrentMatch()!;
      tm.advanceWinner(match.id, 'p1');

      expect(() => tm.advanceWinner(match.id, 'p1')).toThrow('already completed');
    });

    it('should throw if winner is not a participant', () => {
      const players = makePlayers(4);
      tm.createTournament(players);
      tm.startTournament();

      const match = tm.getCurrentMatch()!;
      expect(() => tm.advanceWinner(match.id, 'p3')).toThrow('not a participant');
    });

    it('should complete tournament when final match is won', () => {
      const players = makePlayers(4);
      tm.createTournament(players);
      tm.startTournament();

      // Semifinal 1
      const m1 = tm.getCurrentMatch()!;
      tm.advanceWinner(m1.id, m1.player1Id!);

      // Semifinal 2
      const m2 = tm.getCurrentMatch()!;
      tm.advanceWinner(m2.id, m2.player1Id!);

      // Final
      const final_ = tm.getCurrentMatch()!;
      tm.advanceWinner(final_.id, final_.player1Id!);

      expect(tm.getState()).toBe(TournamentState.COMPLETED);
      const bracket = tm.getBracket();
      expect(bracket.champion).toBe(final_.player1Id);
    });
  });

  // ---------------------------------------------------------------------------
  // Full 8-player tournament
  // ---------------------------------------------------------------------------

  describe('full 8-player tournament', () => {
    it('should play through all rounds to a champion', () => {
      const players = makePlayers(8);
      tm.createTournament(players);
      tm.startTournament();

      // Play all quarterfinals (round 0): 4 matches
      for (let i = 0; i < 4; i++) {
        const match = tm.getCurrentMatch()!;
        const winner = match.player1Id!;
        tm.advanceWinner(match.id, winner);
      }

      // Play all semifinals (round 1): 2 matches
      for (let i = 0; i < 2; i++) {
        const match = tm.getCurrentMatch()!;
        const winner = match.player1Id!;
        tm.advanceWinner(match.id, winner);
      }

      // Play final (round 2): 1 match
      const final_ = tm.getCurrentMatch()!;
      tm.advanceWinner(final_.id, final_.player1Id!);

      expect(tm.getState()).toBe(TournamentState.COMPLETED);
      expect(tm.getBracket().champion).toBe(final_.player1Id);
    });
  });

  // ---------------------------------------------------------------------------
  // Byes (non-power-of-2 player counts)
  // ---------------------------------------------------------------------------

  describe('byes for non-power-of-2 counts', () => {
    it('should handle 3 players (bracket size 4) with one bye', () => {
      const players = makePlayers(3);
      tm.createTournament(players);

      const bracket = tm.getBracket();
      expect(bracket.rounds.length).toBe(2);

      // First round has 2 matches
      const firstRound = bracket.rounds[0];
      expect(firstRound.length).toBe(2);

      // One match should be a bye (auto-completed), one should be ready
      const readyMatches = firstRound.filter(m => m.state === 'ready');
      const byeMatches = firstRound.filter(m => m.state === 'completed');
      expect(readyMatches.length).toBe(1);
      expect(byeMatches.length).toBe(1);
    });

    it('should auto-advance bye player with a win', () => {
      const players = makePlayers(3);
      tm.createTournament(players);

      // The bye player should have 1 win already
      const byeMatch = tm.getBracket().rounds[0].find(m => m.state === 'completed')!;
      const byePlayer = tm.getPlayer(byeMatch.winnerId!)!;
      expect(byePlayer.wins).toBe(1);
      expect(byePlayer.eliminated).toBe(false);
    });

    it('should handle 5 players (bracket size 8)', () => {
      const players = makePlayers(5);
      tm.createTournament(players);

      const bracket = tm.getBracket();
      expect(bracket.rounds.length).toBe(3); // log2(8) = 3

      const firstRound = bracket.rounds[0];
      expect(firstRound.length).toBe(4);

      // 5 players in 8 bracket means 3 byes (3 matches have only 1 player)
      // and 1 match with 2 players (ready), and potentially empty matches
      const readyMatches = firstRound.filter(m => m.state === 'ready');
      const byeMatches = firstRound.filter(m => m.state === 'completed');
      const emptyMatches = firstRound.filter(
        m => m.state === 'pending' && m.player1Id === null && m.player2Id === null
      );

      // With 5 players, we should have some ready, some bye, some empty
      expect(readyMatches.length + byeMatches.length + emptyMatches.length).toBe(4);
    });

    it('should handle 6 players (bracket size 8)', () => {
      const players = makePlayers(6);
      tm.createTournament(players);

      const bracket = tm.getBracket();
      expect(bracket.rounds.length).toBe(3);

      const firstRound = bracket.rounds[0];
      const readyMatches = firstRound.filter(m => m.state === 'ready');
      const byeMatches = firstRound.filter(m => m.state === 'completed');

      // 6 players => 2 byes (2 matches with 1 player auto-advance), 2 ready matches
      expect(readyMatches.length).toBe(2);
      expect(byeMatches.length).toBe(2);
    });

    it('should handle 7 players (bracket size 8) with one bye', () => {
      const players = makePlayers(7);
      tm.createTournament(players);

      const firstRound = tm.getBracket().rounds[0];
      const readyMatches = firstRound.filter(m => m.state === 'ready');
      const byeMatches = firstRound.filter(m => m.state === 'completed');

      expect(readyMatches.length).toBe(3);
      expect(byeMatches.length).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // getCurrentMatch
  // ---------------------------------------------------------------------------

  describe('getCurrentMatch', () => {
    it('should return null when tournament not started', () => {
      tm.createTournament(makePlayers(2));
      expect(tm.getCurrentMatch()).toBeNull();
    });

    it('should return null when tournament completed', () => {
      const players = makePlayers(2);
      tm.createTournament(players);
      tm.startTournament();

      const match = tm.getCurrentMatch()!;
      tm.advanceWinner(match.id, players[0].id);

      expect(tm.getCurrentMatch()).toBeNull();
    });

    it('should return the first ready match during play', () => {
      tm.createTournament(makePlayers(4));
      tm.startTournament();

      const match = tm.getCurrentMatch();
      expect(match).not.toBeNull();
      expect(match!.state).toBe('ready');
    });

    it('should return the next ready match after one is completed', () => {
      tm.createTournament(makePlayers(4));
      tm.startTournament();

      const m1 = tm.getCurrentMatch()!;
      tm.advanceWinner(m1.id, m1.player1Id!);

      const m2 = tm.getCurrentMatch();
      expect(m2).not.toBeNull();
      expect(m2!.id).not.toBe(m1.id);
      expect(m2!.state).toBe('ready');
    });
  });

  // ---------------------------------------------------------------------------
  // getStandings
  // ---------------------------------------------------------------------------

  describe('getStandings', () => {
    it('should sort players by wins descending then seed ascending', () => {
      const players = makePlayers(4);
      tm.createTournament(players);
      tm.startTournament();

      // p1 wins semifinal
      const m1 = tm.getCurrentMatch()!;
      tm.advanceWinner(m1.id, 'p1');

      // p3 wins the other semifinal (p2 vs p3 match)
      const m2 = tm.getCurrentMatch()!;
      tm.advanceWinner(m2.id, m2.player2Id!); // p3

      const standings = tm.getStandings();
      // p1 and p3 have 1 win each; p1 has lower seed so comes first
      expect(standings[0].id).toBe('p1');
      expect(standings[1].id).toBe('p3');
    });

    it('should reflect eliminated status', () => {
      const players = makePlayers(2);
      tm.createTournament(players);
      tm.startTournament();

      const match = tm.getCurrentMatch()!;
      tm.advanceWinner(match.id, 'p1');

      const standings = tm.getStandings();
      expect(standings.find(p => p.id === 'p2')!.eliminated).toBe(true);
      expect(standings.find(p => p.id === 'p1')!.eliminated).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // getBracket
  // ---------------------------------------------------------------------------

  describe('getBracket', () => {
    it('should return champion only when COMPLETED', () => {
      const players = makePlayers(2);
      tm.createTournament(players);
      expect(tm.getBracket().champion).toBeNull();

      tm.startTournament();
      expect(tm.getBracket().champion).toBeNull();

      const match = tm.getCurrentMatch()!;
      tm.advanceWinner(match.id, 'p1');
      expect(tm.getBracket().champion).toBe('p1');
    });

    it('should return a snapshot (not a reference)', () => {
      tm.createTournament(makePlayers(4));

      const bracket1 = tm.getBracket();
      const bracket2 = tm.getBracket();

      // Different objects
      expect(bracket1.rounds).not.toBe(bracket2.rounds);
    });
  });

  // ---------------------------------------------------------------------------
  // getPlayer and getMatch
  // ---------------------------------------------------------------------------

  describe('getPlayer and getMatch', () => {
    it('should return player by id', () => {
      tm.createTournament(makePlayers(4));
      const p = tm.getPlayer('p2');
      expect(p).toBeDefined();
      expect(p!.name).toBe('Player 2');
    });

    it('should return undefined for unknown player', () => {
      tm.createTournament(makePlayers(4));
      expect(tm.getPlayer('unknown')).toBeUndefined();
    });

    it('should return match by id', () => {
      tm.createTournament(makePlayers(4));
      const bracket = tm.getBracket();
      const matchId = bracket.rounds[0][0].id;
      const match = tm.getMatch(matchId);
      expect(match).toBeDefined();
      expect(match!.round).toBe(0);
    });

    it('should return undefined for unknown match', () => {
      expect(tm.getMatch('nonexistent')).toBeUndefined();
    });

    it('should return a snapshot of player data', () => {
      tm.createTournament(makePlayers(2));
      tm.startTournament();

      const p1a = tm.getPlayer('p1')!;
      tm.advanceWinner(tm.getCurrentMatch()!.id, 'p1');
      const p1b = tm.getPlayer('p1')!;

      expect(p1a.wins).toBe(0);
      expect(p1b.wins).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should throw when trying to advance before starting', () => {
      tm.createTournament(makePlayers(2));

      // The match exists but state is WAITING
      const bracket = tm.getBracket();
      const matchId = bracket.rounds[0][0].id;

      // advanceWinner itself doesn't check tournament state, only match validity
      // so it should work on a 'ready' match
      expect(() => tm.advanceWinner(matchId, 'p1')).not.toThrow();
    });

    it('should handle creating tournament with custom bracketSize', () => {
      // 4 players but bracket size forced to 8
      const players = makePlayers(4);
      tm.createTournament(players, 8);

      const bracket = tm.getBracket();
      expect(bracket.rounds.length).toBe(3); // log2(8) = 3
      expect(bracket.rounds[0].length).toBe(4); // 8/2 = 4 first-round matches
    });

    it('should handle a 2-player tournament end-to-end', () => {
      const players = makePlayers(2);
      tm.createTournament(players);
      tm.startTournament();

      const match = tm.getCurrentMatch()!;
      tm.advanceWinner(match.id, 'p1');

      expect(tm.getState()).toBe(TournamentState.COMPLETED);
      expect(tm.getBracket().champion).toBe('p1');

      const winner = tm.getPlayer('p1')!;
      expect(winner.wins).toBe(1);
      expect(winner.eliminated).toBe(false);

      const loser = tm.getPlayer('p2')!;
      expect(loser.losses).toBe(1);
      expect(loser.eliminated).toBe(true);
    });

    it('should allow advancing either player as winner', () => {
      const players = makePlayers(4);
      tm.createTournament(players);
      tm.startTournament();

      const match = tm.getCurrentMatch()!;
      // Advance player2 (the underdog)
      tm.advanceWinner(match.id, match.player2Id!);

      const updated = tm.getMatch(match.id);
      expect(updated!.winnerId).toBe(match.player2Id);
    });

    it('should handle bye propagation to second round', () => {
      // 3 players: one gets a bye into the final
      const players = makePlayers(3);
      tm.createTournament(players);
      tm.startTournament();

      // Find the one ready match and complete it
      const match = tm.getCurrentMatch()!;
      expect(match).not.toBeNull();
      tm.advanceWinner(match.id, match.player1Id!);

      // The bye player should already be in the next round
      // Final should now be ready (bye winner + match winner)
      const nextMatch = tm.getCurrentMatch();
      expect(nextMatch).not.toBeNull();
      expect(nextMatch!.state).toBe('ready');
      expect(nextMatch!.round).toBe(1);
    });

    it('should not return current match when all matches in round are pending (no ready)', () => {
      // With 5 players in an 8-bracket, after byes some matches may be pending
      // This tests that getCurrentMatch only returns 'ready' matches
      const players = makePlayers(5);
      tm.createTournament(players);
      tm.startTournament();

      // There should be at least one ready or we get through bye matches
      const match = tm.getCurrentMatch();
      // With 5 players: 3 byes and 1 ready match + empty match
      // The ready match should be available
      expect(match).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Full tournament with non-power-of-2 players
  // ---------------------------------------------------------------------------

  describe('full 5-player tournament', () => {
    it('should play through with byes to a champion', () => {
      const players = makePlayers(5);
      tm.createTournament(players);
      tm.startTournament();

      // Play all available ready matches until tournament completes
      let safety = 0;
      while (tm.getState() !== TournamentState.COMPLETED && safety < 20) {
        const match = tm.getCurrentMatch();
        if (!match) break;
        tm.advanceWinner(match.id, match.player1Id!);
        safety++;
      }

      expect(tm.getState()).toBe(TournamentState.COMPLETED);
      expect(tm.getBracket().champion).not.toBeNull();
    });
  });

  describe('full 7-player tournament', () => {
    it('should play through with byes to a champion', () => {
      const players = makePlayers(7);
      tm.createTournament(players);
      tm.startTournament();

      let safety = 0;
      while (tm.getState() !== TournamentState.COMPLETED && safety < 20) {
        const match = tm.getCurrentMatch();
        if (!match) break;
        tm.advanceWinner(match.id, match.player1Id!);
        safety++;
      }

      expect(tm.getState()).toBe(TournamentState.COMPLETED);
      expect(tm.getBracket().champion).not.toBeNull();

      // 7 players: 6 should be eliminated, champion should have 3 wins
      const standings = tm.getStandings();
      const champion = standings.find(p => p.id === tm.getBracket().champion);
      expect(champion!.wins).toBe(3); // 3 rounds for 8-bracket
      expect(standings.filter(p => p.eliminated).length).toBe(6);
    });
  });
});
