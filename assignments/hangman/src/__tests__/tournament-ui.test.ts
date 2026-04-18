/**
 * Tests for TournamentUI - 3D tournament bracket visualization
 * Tests focus on bracket rendering, tournament updates, and resource management
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import type { Tournament, TournamentMatch, TournamentPlayer, TournamentSize } from '../../server/tournament';

// Mock canvas for jsdom (tournament-ui creates canvas elements internally)
beforeAll(() => {
  const mockCtx = {
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    fillRect: vi.fn(),
    fillText: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
  };
  HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
    if (contextId === '2d') return mockCtx as unknown as CanvasRenderingContext2D;
    return null;
  }) as any;
});

// Mock THREE.js before importing
vi.mock('three', () => {
  const mockMaterial = {
    dispose: vi.fn(),
    opacity: 1,
    transparent: false,
    emissive: { setHex: vi.fn() },
    emissiveIntensity: 0.2,
    needsUpdate: false,
  };
  const mockGeometry = { dispose: vi.fn() };
  const mockGroup = {
    name: '',
    add: vi.fn(),
    remove: vi.fn(),
    position: { set: vi.fn() },
    scale: { setScalar: vi.fn() },
    visible: true,
  };
  const mockSprite = {
    geometry: mockGeometry,
    material: { ...mockMaterial, map: null },
    scale: { set: vi.fn() },
    position: { y: 0, set: vi.fn() },
  };
  const mockLine = {
    geometry: mockGeometry,
    material: mockMaterial,
  };

  return {
    Scene: vi.fn(() => ({ add: vi.fn(), remove: vi.fn() })),
    Group: vi.fn(() => ({ ...mockGroup })),
    Mesh: vi.fn(() => ({
      geometry: mockGeometry,
      material: mockMaterial,
      position: { set: vi.fn() },
      rotation: { x: 0, y: 0, z: 0 },
    })),
    Sprite: vi.fn(() => ({ ...mockSprite })),
    Line: vi.fn(() => mockLine),
    BoxGeometry: vi.fn(() => mockGeometry),
    EdgesGeometry: vi.fn(() => mockGeometry),
    ConeGeometry: vi.fn(() => mockGeometry),
    SphereGeometry: vi.fn(() => mockGeometry),
    TorusGeometry: vi.fn(() => mockGeometry),
    BufferGeometry: vi.fn(() => ({
      setFromPoints: vi.fn(() => mockGeometry),
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

function createPlayer(overrides: Partial<TournamentPlayer> = {}): TournamentPlayer {
  return {
    id: `player-${Math.random().toString(36).slice(2, 6)}`,
    name: 'TestPlayer',
    color: 0xff6b6b,
    seed: 1,
    ...overrides,
  };
}

function createTournament(overrides: Partial<Tournament> = {}): Tournament {
  const p1 = createPlayer({ id: 'p1', name: 'Alice', seed: 1 });
  const p2 = createPlayer({ id: 'p2', name: 'Bob', seed: 2 });
  const p3 = createPlayer({ id: 'p3', name: 'Charlie', seed: 3 });
  const p4 = createPlayer({ id: 'p4', name: 'Diana', seed: 4 });

  const players = new Map<string, TournamentPlayer>();
  players.set('p1', p1);
  players.set('p2', p2);
  players.set('p3', p3);
  players.set('p4', p4);

  const match1 = createMatch({
    matchId: 'm1', round: 1, position: 0,
    player1: p1, player2: p2,
    state: 'pending',
  });
  const match2 = createMatch({
    matchId: 'm2', round: 1, position: 1,
    player1: p3, player2: p4,
    state: 'pending',
  });
  const finalMatch = createMatch({
    matchId: 'm3', round: 2, position: 0,
    player1: null, player2: null,
    state: 'pending',
  });

  return {
    id: 'tournament-1',
    name: 'Test Tournament',
    size: 4 as TournamentSize,
    difficulty: 'medium',
    state: 'in_progress',
    players,
    bracket: { rounds: [[match1, match2], [finalMatch]], champion: null },
    currentRound: 1,
    createdAt: Date.now(),
    startedAt: Date.now(),
    completedAt: null,
    ...overrides,
  };
}

describe('TournamentUI', () => {
  let tournamentUI: TournamentUI;
  let scene: THREE.Scene;

  beforeEach(() => {
    vi.clearAllMocks();
    scene = new THREE.Scene();
    tournamentUI = new TournamentUI(scene);
  });

  describe('construction', () => {
    it('creates a tournament bracket group', () => {
      expect(scene.add).toHaveBeenCalled();
    });

    it('accepts custom config for position and scale', () => {
      const config: Partial<TournamentUIConfig> = {
        position: { x: 10, y: 5, z: 0 },
        scale: 2,
      };
      const ui = new TournamentUI(scene, config);
      expect(ui).toBeDefined();
    });

    it('uses default config when none provided', () => {
      const ui = new TournamentUI(scene);
      expect(ui).toBeDefined();
    });
  });

  describe('updateTournament', () => {
    it('renders a 4-player tournament bracket (2 rounds)', () => {
      const tournament = createTournament();
      expect(() => tournamentUI.updateTournament(tournament)).not.toThrow();
    });

    it('renders a completed tournament with champion', () => {
      const tournament = createTournament({
        state: 'completed',
        bracket: {
          rounds: [
            [
              createMatch({ matchId: 'm1', state: 'completed', winnerId: 'p1', loserId: 'p2', player1: createPlayer({ id: 'p1' }), player2: createPlayer({ id: 'p2' }), score1: 3, score2: 1 }),
              createMatch({ matchId: 'm2', state: 'completed', winnerId: 'p3', loserId: 'p4', player1: createPlayer({ id: 'p3' }), player2: createPlayer({ id: 'p4' }), score1: 2, score2: 1 }),
            ],
            [
              createMatch({ matchId: 'm3', state: 'completed', winnerId: 'p1', loserId: 'p3', player1: createPlayer({ id: 'p1' }), player2: createPlayer({ id: 'p3' }), score1: 3, score2: 2 }),
            ],
          ],
          champion: 'p1',
        },
        currentRound: 2,
        completedAt: Date.now(),
      });
      expect(() => tournamentUI.updateTournament(tournament)).not.toThrow();
    });

    it('handles tournament with playing matches', () => {
      const tournament = createTournament({
        bracket: {
          rounds: [
            [
              createMatch({ matchId: 'm1', state: 'playing', player1: createPlayer({ id: 'p1' }), player2: createPlayer({ id: 'p2' }) }),
              createMatch({ matchId: 'm2', state: 'pending', player1: createPlayer({ id: 'p3' }), player2: createPlayer({ id: 'p4' }) }),
            ],
            [createMatch({ matchId: 'm3', state: 'pending' })],
          ],
          champion: null,
        },
      });
      expect(() => tournamentUI.updateTournament(tournament)).not.toThrow();
    });

    it('handles a single-round tournament (2 players)', () => {
      const p1 = createPlayer({ id: 'p1', name: 'Alice' });
      const p2 = createPlayer({ id: 'p2', name: 'Bob' });
      const players = new Map<string, TournamentPlayer>();
      players.set('p1', p1);
      players.set('p2', p2);

      const tournament: Tournament = {
        id: 't1',
        name: 'Duel',
        size: 4 as TournamentSize,
        difficulty: 'easy',
        state: 'in_progress',
        players,
        bracket: {
          rounds: [[createMatch({ matchId: 'm1', state: 'playing', player1: p1, player2: p2 })]],
          champion: null,
        },
        currentRound: 1,
        createdAt: Date.now(),
        startedAt: Date.now(),
        completedAt: null,
      };
      expect(() => tournamentUI.updateTournament(tournament)).not.toThrow();
    });

    it('clears previous bracket when updating with new data', () => {
      const tournament1 = createTournament();
      tournamentUI.updateTournament(tournament1);

      const tournament2 = createTournament({ id: 'tournament-2' });
      expect(() => tournamentUI.updateTournament(tournament2)).not.toThrow();
    });
  });

  describe('clearBracket', () => {
    it('clears bracket without errors when no tournament loaded', () => {
      expect(() => tournamentUI.clearBracket()).not.toThrow();
    });

    it('clears bracket after tournament was loaded', () => {
      const tournament = createTournament();
      tournamentUI.updateTournament(tournament);
      expect(() => tournamentUI.clearBracket()).not.toThrow();
    });
  });

  describe('update', () => {
    it('runs animation frame without errors', () => {
      const tournament = createTournament();
      tournamentUI.updateTournament(tournament);
      expect(() => tournamentUI.update(0.016)).not.toThrow();
    });

    it('handles multiple update frames', () => {
      const tournament = createTournament();
      tournamentUI.updateTournament(tournament);
      for (let i = 0; i < 10; i++) {
        tournamentUI.update(0.016);
      }
      // No throw = success
      expect(true).toBe(true);
    });
  });

  describe('setVisible', () => {
    it('toggles visibility', () => {
      expect(() => tournamentUI.setVisible(false)).not.toThrow();
      expect(() => tournamentUI.setVisible(true)).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('cleans up all resources after rendering a tournament', () => {
      const tournament = createTournament();
      tournamentUI.updateTournament(tournament);
      expect(() => tournamentUI.dispose()).not.toThrow();
    });

    it('is safe to dispose when empty', () => {
      expect(() => tournamentUI.dispose()).not.toThrow();
    });
  });
});
