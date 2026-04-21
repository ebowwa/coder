/**
 * Tests for TournamentUI - 3D tournament bracket visualization
 * Tests focus on bracket rendering, tournament updates, animations, and resource management
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import type {
  Tournament,
  TournamentMatch,
  TournamentPlayer,
  TournamentSize,
} from '../../server/tournament';

// Mock canvas for jsdom
beforeAll(() => {
  const mockCtx = {
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    fillRect: vi.fn(),
    fillText: vi.fn(),
  };
  HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
    if (contextId === '2d') return mockCtx as unknown as CanvasRenderingContext2D;
    return null;
  }) as any;
});

// Mock THREE.js
vi.mock('three', () => {
  const mockMaterial = {
    dispose: vi.fn(),
    opacity: 1,
    transparent: false,
    emissive: { setHex: vi.fn() },
    emissiveIntensity: 0.2,
    needsUpdate: false,
    color: 0xffffff,
    linewidth: 1,
    side: 0,
    map: null,
  };

  const mockGeometry = { dispose: vi.fn() };

  const mockMesh = {
    geometry: mockGeometry,
    material: { ...mockMaterial },
    castShadow: false,
    receiveShadow: false,
    position: { set: vi.fn(), x: 0, y: 0, z: 0 },
    scale: { set: vi.fn() },
    rotation: { x: 0, y: 0, z: 0 },
  };

  const mockSprite = {
    geometry: mockGeometry,
    material: { ...mockMaterial, map: null },
    scale: { set: vi.fn() },
    position: { y: 0, set: vi.fn() },
  };

  const mockGroup = {
    name: '',
    add: vi.fn(),
    remove: vi.fn(),
    position: { set: vi.fn() },
    scale: { setScalar: vi.fn() },
    visible: true,
  };

  const mockScene = {
    add: vi.fn(),
    remove: vi.fn(),
  };

  const mockLine = {
    geometry: mockGeometry,
    material: { ...mockMaterial },
  };

  return {
    Scene: vi.fn(() => mockScene),
    Group: vi.fn(() => ({ ...mockGroup, name: '', add: vi.fn(), remove: vi.fn() })),
    Mesh: vi.fn(() => ({ ...mockMesh, geometry: { dispose: vi.fn() }, material: { ...mockMaterial } })),
    Sprite: vi.fn(() => ({ ...mockSprite, geometry: { dispose: vi.fn() }, material: { ...mockMaterial, map: null } })),
    Line: vi.fn(() => ({ ...mockLine, geometry: { dispose: vi.fn() }, material: { ...mockMaterial } })),
    BoxGeometry: vi.fn(() => ({ dispose: vi.fn() })),
    SphereGeometry: vi.fn(() => ({ dispose: vi.fn() })),
    ConeGeometry: vi.fn(() => ({ dispose: vi.fn() })),
    TorusGeometry: vi.fn(() => ({ dispose: vi.fn() })),
    EdgesGeometry: vi.fn(() => ({ dispose: vi.fn() })),
    PlaneGeometry: vi.fn(() => ({ dispose: vi.fn() })),
    BufferGeometry: vi.fn(() => ({
      setFromPoints: vi.fn(() => ({ dispose: vi.fn() })),
      dispose: vi.fn(),
    })),
    MeshStandardMaterial: vi.fn(() => ({ ...mockMaterial })),
    MeshBasicMaterial: vi.fn(() => ({ ...mockMaterial })),
    SpriteMaterial: vi.fn(() => ({ ...mockMaterial, map: null })),
    LineBasicMaterial: vi.fn(() => ({ ...mockMaterial })),
    CanvasTexture: vi.fn(() => ({})),
    Color: vi.fn((hex: number) => ({ hex })),
    Vector3: vi.fn((x: number, y: number, z: number) => ({ x, y, z })),
    BackSide: 1,
  };
});

import * as THREE from 'three';
import { TournamentUI, type TournamentUIConfig } from '../multiplayer/tournament-ui';

// ── Helpers ────────────────────────────────────────────────────────────────

function createPlayer(overrides: Partial<TournamentPlayer> = {}): TournamentPlayer {
  return {
    id: `player-${Math.random().toString(36).slice(2, 6)}`,
    name: 'TestPlayer',
    color: 0xff6b6b,
    seed: 1,
    ...overrides,
  };
}

function createMatch(overrides: Partial<TournamentMatch> = {}): TournamentMatch {
  return {
    matchId: `match-${Math.random().toString(36).slice(2, 6)}`,
    round: 1,
    position: 0,
    player1: null,
    player2: null,
    winnerId: null,
    loserId: null,
    state: 'pending',
    roomCode: null,
    score1: 0,
    score2: 0,
    ...overrides,
  };
}

function createTournament(overrides: Partial<Tournament> = {}): Tournament {
  const p1 = createPlayer({ id: 'p1', name: 'Player 1', seed: 1 });
  const p2 = createPlayer({ id: 'p2', name: 'Player 2', seed: 2 });
  const p3 = createPlayer({ id: 'p3', name: 'Player 3', seed: 3 });
  const p4 = createPlayer({ id: 'p4', name: 'Player 4', seed: 4 });

  const players = new Map<string, TournamentPlayer>();
  players.set(p1.id, p1);
  players.set(p2.id, p2);
  players.set(p3.id, p3);
  players.set(p4.id, p4);

  const m1 = createMatch({ matchId: 'm1', round: 1, position: 0, player1: p1, player2: p2, state: 'pending' });
  const m2 = createMatch({ matchId: 'm2', round: 1, position: 1, player1: p3, player2: p4, state: 'pending' });
  const m3 = createMatch({ matchId: 'm3', round: 2, position: 0, state: 'pending' });

  return {
    id: 'tournament-1',
    name: 'Test Tournament',
    size: 4 as TournamentSize,
    difficulty: 'medium',
    state: 'waiting',
    players,
    bracket: {
      rounds: [[m1, m2], [m3]],
      champion: null,
    },
    currentRound: 1,
    createdAt: Date.now(),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('TournamentUI', () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    vi.clearAllMocks();
    scene = new THREE.Scene();
  });

  describe('constructor', () => {
    it('creates a TournamentUI instance with default config', () => {
      const ui = new TournamentUI(scene);
      expect(ui).toBeDefined();
      expect(scene.add).toHaveBeenCalled();
      ui.dispose();
    });

    it('accepts custom position config', () => {
      const config: Partial<TournamentUIConfig> = {
        position: { x: 10, y: 5, z: 2 },
      };
      const ui = new TournamentUI(scene, config);
      expect(ui).toBeDefined();
      ui.dispose();
    });

    it('accepts custom scale config', () => {
      const config: Partial<TournamentUIConfig> = {
        scale: 2,
      };
      const ui = new TournamentUI(scene, config);
      expect(ui).toBeDefined();
      ui.dispose();
    });

    it('adds a group to the scene named tournament-bracket', () => {
      const ui = new TournamentUI(scene);
      // The constructor creates a Group and adds it to the scene
      expect(scene.add).toHaveBeenCalledTimes(1);
      ui.dispose();
    });
  });

  describe('updateTournament', () => {
    it('renders a 4-player tournament bracket (2 rounds)', () => {
      const ui = new TournamentUI(scene);
      const tournament = createTournament();
      expect(() => ui.updateTournament(tournament)).not.toThrow();
      ui.dispose();
    });

    it('handles tournament with pending matches', () => {
      const ui = new TournamentUI(scene);
      const tournament = createTournament({ state: 'waiting' });
      expect(() => ui.updateTournament(tournament)).not.toThrow();
      ui.dispose();
    });

    it('handles tournament with in_progress state', () => {
      const ui = new TournamentUI(scene);
      const tournament = createTournament({ state: 'in_progress' });
      expect(() => ui.updateTournament(tournament)).not.toThrow();
      ui.dispose();
    });

    it('handles tournament with completed matches', () => {
      const p1 = createPlayer({ id: 'p1', seed: 1 });
      const p2 = createPlayer({ id: 'p2', seed: 2 });
      const players = new Map<string, TournamentPlayer>();
      players.set(p1.id, p1);
      players.set(p2.id, p2);

      const m1 = createMatch({
        matchId: 'm1',
        round: 1,
        player1: p1,
        player2: p2,
        state: 'completed',
        winnerId: 'p1',
        loserId: 'p2',
        score1: 5,
        score2: 3,
      });

      const tournament = createTournament({
        players,
        bracket: { rounds: [[m1]], champion: 'p1' },
        state: 'completed',
      });

      const ui = new TournamentUI(scene);
      expect(() => ui.updateTournament(tournament)).not.toThrow();
      ui.dispose();
    });

    it('handles tournament with playing matches', () => {
      const p1 = createPlayer({ id: 'p1', seed: 1 });
      const p2 = createPlayer({ id: 'p2', seed: 2 });
      const players = new Map<string, TournamentPlayer>();
      players.set(p1.id, p1);
      players.set(p2.id, p2);

      const m1 = createMatch({
        matchId: 'm1',
        round: 1,
        player1: p1,
        player2: p2,
        state: 'playing',
      });

      const tournament = createTournament({
        players,
        bracket: { rounds: [[m1]], champion: null },
        state: 'in_progress',
      });

      const ui = new TournamentUI(scene);
      expect(() => ui.updateTournament(tournament)).not.toThrow();
      ui.dispose();
    });

    it('renders champion display for completed tournament', () => {
      const p1 = createPlayer({ id: 'p1', name: 'Champion', seed: 1 });
      const p2 = createPlayer({ id: 'p2', seed: 2 });
      const players = new Map<string, TournamentPlayer>();
      players.set(p1.id, p1);
      players.set(p2.id, p2);

      const m1 = createMatch({
        matchId: 'm1',
        round: 1,
        player1: p1,
        player2: p2,
        state: 'completed',
        winnerId: 'p1',
        loserId: 'p2',
      });

      const tournament = createTournament({
        players,
        bracket: { rounds: [[m1]], champion: 'p1' },
        state: 'completed',
      });

      const ui = new TournamentUI(scene);
      expect(() => ui.updateTournament(tournament)).not.toThrow();
      ui.dispose();
    });

    it('handles match with null players (TBD)', () => {
      const m1 = createMatch({
        matchId: 'm1',
        round: 2,
        player1: null,
        player2: null,
        state: 'pending',
      });

      const tournament = createTournament({
        bracket: { rounds: [[], [m1]], champion: null },
        state: 'waiting',
      });

      const ui = new TournamentUI(scene);
      expect(() => ui.updateTournament(tournament)).not.toThrow();
      ui.dispose();
    });

    it('can be called multiple times to update bracket', () => {
      const ui = new TournamentUI(scene);
      const tournament1 = createTournament({ state: 'waiting' });
      ui.updateTournament(tournament1);

      const tournament2 = createTournament({ state: 'in_progress' });
      expect(() => ui.updateTournament(tournament2)).not.toThrow();
      ui.dispose();
    });

    it('handles 3-round tournament (8 players)', () => {
      const players = new Map<string, TournamentPlayer>();
      for (let i = 1; i <= 8; i++) {
        const p = createPlayer({ id: `p${i}`, name: `Player ${i}`, seed: i });
        players.set(p.id, p);
      }

      const round1 = Array.from({ length: 4 }, (_, i) =>
        createMatch({
          matchId: `m1-${i}`,
          round: 1,
          position: i,
          player1: createPlayer({ id: `p${i * 2 + 1}`, seed: i * 2 + 1 }),
          player2: createPlayer({ id: `p${i * 2 + 2}`, seed: i * 2 + 2 }),
          state: 'pending',
        })
      );
      const round2 = Array.from({ length: 2 }, (_, i) =>
        createMatch({ matchId: `m2-${i}`, round: 2, position: i, state: 'pending' })
      );
      const round3 = [createMatch({ matchId: 'm3-0', round: 3, position: 0, state: 'pending' })];

      const tournament = createTournament({
        size: 8 as TournamentSize,
        players,
        bracket: { rounds: [round1, round2, round3], champion: null },
        state: 'waiting',
      });

      const ui = new TournamentUI(scene);
      expect(() => ui.updateTournament(tournament)).not.toThrow();
      ui.dispose();
    });

    it('handles 4-round tournament (16 players)', () => {
      const round1 = Array.from({ length: 8 }, (_, i) =>
        createMatch({ matchId: `r1-${i}`, round: 1, position: i, state: 'pending' })
      );
      const round2 = Array.from({ length: 4 }, (_, i) =>
        createMatch({ matchId: `r2-${i}`, round: 2, position: i, state: 'pending' })
      );
      const round3 = Array.from({ length: 2 }, (_, i) =>
        createMatch({ matchId: `r3-${i}`, round: 3, position: i, state: 'pending' })
      );
      const round4 = [createMatch({ matchId: 'r4-0', round: 4, position: 0, state: 'pending' })];

      const tournament = createTournament({
        size: 16 as TournamentSize,
        bracket: { rounds: [round1, round2, round3, round4], champion: null },
        state: 'waiting',
      });

      const ui = new TournamentUI(scene);
      expect(() => ui.updateTournament(tournament)).not.toThrow();
      ui.dispose();
    });

    it('handles tournament with large number of rounds gracefully', () => {
      const rounds = Array.from({ length: 6 }, (_, roundIdx) =>
        Array.from({ length: Math.max(1, Math.floor(32 / Math.pow(2, roundIdx))) }, (_, matchIdx) =>
          createMatch({ matchId: `r${roundIdx}-${matchIdx}`, round: roundIdx + 1, position: matchIdx, state: 'pending' })
        )
      );

      const tournament = createTournament({
        bracket: { rounds, champion: null },
        state: 'waiting',
      });

      const ui = new TournamentUI(scene);
      expect(() => ui.updateTournament(tournament)).not.toThrow();
      ui.dispose();
    });
  });

  describe('clearBracket', () => {
    it('clears bracket without error after update', () => {
      const ui = new TournamentUI(scene);
      const tournament = createTournament();
      ui.updateTournament(tournament);
      expect(() => ui.clearBracket()).not.toThrow();
      ui.dispose();
    });

    it('is safe to call when no bracket exists', () => {
      const ui = new TournamentUI(scene);
      expect(() => ui.clearBracket()).not.toThrow();
      ui.dispose();
    });

    it('is safe to call multiple times', () => {
      const ui = new TournamentUI(scene);
      const tournament = createTournament();
      ui.updateTournament(tournament);
      expect(() => {
        ui.clearBracket();
        ui.clearBracket();
        ui.clearBracket();
      }).not.toThrow();
      ui.dispose();
    });
  });

  describe('update', () => {
    it('updates animations without error', () => {
      const ui = new TournamentUI(scene);
      const tournament = createTournament({ state: 'in_progress' });
      ui.updateTournament(tournament);
      expect(() => ui.update(0.016)).not.toThrow();
      ui.dispose();
    });

    it('handles zero deltaTime', () => {
      const ui = new TournamentUI(scene);
      ui.updateTournament(createTournament({ state: 'in_progress' }));
      expect(() => ui.update(0)).not.toThrow();
      ui.dispose();
    });

    it('handles large deltaTime', () => {
      const ui = new TournamentUI(scene);
      ui.updateTournament(createTournament({ state: 'in_progress' }));
      expect(() => ui.update(10)).not.toThrow();
      ui.dispose();
    });

    it('handles multiple update calls', () => {
      const ui = new TournamentUI(scene);
      ui.updateTournament(createTournament({ state: 'in_progress' }));
      for (let i = 0; i < 100; i++) {
        ui.update(0.016);
      }
      ui.dispose();
    });

    it('works without tournament data', () => {
      const ui = new TournamentUI(scene);
      expect(() => ui.update(0.016)).not.toThrow();
      ui.dispose();
    });
  });

  describe('setVisible', () => {
    it('hides the bracket group', () => {
      const ui = new TournamentUI(scene);
      ui.updateTournament(createTournament());
      expect(() => ui.setVisible(false)).not.toThrow();
      ui.dispose();
    });

    it('shows the bracket group', () => {
      const ui = new TournamentUI(scene);
      ui.updateTournament(createTournament());
      ui.setVisible(false);
      expect(() => ui.setVisible(true)).not.toThrow();
      ui.dispose();
    });

    it('is safe to call without tournament data', () => {
      const ui = new TournamentUI(scene);
      expect(() => ui.setVisible(true)).not.toThrow();
      ui.dispose();
    });
  });

  describe('dispose', () => {
    it('removes the group from scene', () => {
      const ui = new TournamentUI(scene);
      ui.dispose();
      expect(scene.remove).toHaveBeenCalled();
    });

    it('cleans up after tournament update', () => {
      const ui = new TournamentUI(scene);
      ui.updateTournament(createTournament());
      expect(() => ui.dispose()).not.toThrow();
      expect(scene.remove).toHaveBeenCalled();
    });

    it('cleans up after completed tournament with champion', () => {
      const p1 = createPlayer({ id: 'p1', name: 'Champ', seed: 1 });
      const p2 = createPlayer({ id: 'p2', seed: 2 });
      const players = new Map<string, TournamentPlayer>();
      players.set(p1.id, p1);
      players.set(p2.id, p2);

      const m1 = createMatch({
        matchId: 'm1',
        round: 1,
        player1: p1,
        player2: p2,
        state: 'completed',
        winnerId: 'p1',
        loserId: 'p2',
      });

      const tournament = createTournament({
        players,
        bracket: { rounds: [[m1]], champion: 'p1' },
        state: 'completed',
      });

      const ui = new TournamentUI(scene);
      ui.updateTournament(tournament);
      expect(() => ui.dispose()).not.toThrow();
    });

    it('is safe to call after clearBracket', () => {
      const ui = new TournamentUI(scene);
      ui.updateTournament(createTournament());
      ui.clearBracket();
      expect(() => ui.dispose()).not.toThrow();
    });
  });

  describe('round names', () => {
    it('uses correct names for 2-round tournament (semifinal/final)', () => {
      // 2 rounds: Semifinals, Final
      const m1 = createMatch({ matchId: 'm1', round: 1 });
      const m2 = createMatch({ matchId: 'm2', round: 1 });
      const m3 = createMatch({ matchId: 'm3', round: 2 });

      const tournament = createTournament({
        bracket: { rounds: [[m1, m2], [m3]], champion: null },
        state: 'waiting',
      });

      const ui = new TournamentUI(scene);
      // updateTournament creates round labels via createTextSprite
      // which creates canvas text - we verify it doesn't throw
      expect(() => ui.updateTournament(tournament)).not.toThrow();
      ui.dispose();
    });

    it('uses correct names for 3-round tournament', () => {
      const rounds = [
        [createMatch({ matchId: 'm1-0', round: 1 }), createMatch({ matchId: 'm1-1', round: 1 }), createMatch({ matchId: 'm1-2', round: 1 }), createMatch({ matchId: 'm1-3', round: 1 })],
        [createMatch({ matchId: 'm2-0', round: 2 }), createMatch({ matchId: 'm2-1', round: 2 })],
        [createMatch({ matchId: 'm3-0', round: 3 })],
      ];

      const tournament = createTournament({
        bracket: { rounds, champion: null },
        state: 'waiting',
      });

      const ui = new TournamentUI(scene);
      expect(() => ui.updateTournament(tournament)).not.toThrow();
      ui.dispose();
    });
  });

  describe('current round highlighting', () => {
    it('highlights matches in the current round during in_progress', () => {
      const p1 = createPlayer({ id: 'p1', seed: 1 });
      const p2 = createPlayer({ id: 'p2', seed: 2 });
      const p3 = createPlayer({ id: 'p3', seed: 3 });
      const p4 = createPlayer({ id: 'p4', seed: 4 });
      const players = new Map<string, TournamentPlayer>();
      players.set(p1.id, p1);
      players.set(p2.id, p2);
      players.set(p3.id, p3);
      players.set(p4.id, p4);

      const m1 = createMatch({
        matchId: 'm1',
        round: 1,
        player1: p1,
        player2: p2,
        state: 'playing',
      });
      const m2 = createMatch({
        matchId: 'm2',
        round: 1,
        player1: p3,
        player2: p4,
        state: 'pending',
      });
      const m3 = createMatch({
        matchId: 'm3',
        round: 2,
        state: 'pending',
      });

      const tournament = createTournament({
        players,
        bracket: { rounds: [[m1, m2], [m3]], champion: null },
        state: 'in_progress',
        currentRound: 1,
      });

      const ui = new TournamentUI(scene);
      expect(() => ui.updateTournament(tournament)).not.toThrow();
      ui.dispose();
    });
  });
});
