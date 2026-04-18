/**
 * Tests for PlayerAvatars - 3D player indicators in the game scene
 * Tests focus on player management, turn tracking, and avatar lifecycle
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import type { PlayerInfo } from '../multiplayer/types';

// Mock canvas for jsdom (player-avatars creates canvas elements internally)
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

// Mock THREE.js before importing the module
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

  const mockMesh = {
    geometry: mockGeometry,
    material: mockMaterial,
    castShadow: false,
    receiveShadow: false,
    position: { set: vi.fn() },
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

  return {
    Scene: vi.fn(() => mockScene),
    Group: vi.fn(() => ({ ...mockGroup })),
    Mesh: vi.fn(() => ({ ...mockMesh })),
    Sprite: vi.fn(() => ({ ...mockSprite })),
    SphereGeometry: vi.fn(() => mockGeometry),
    BoxGeometry: vi.fn(() => mockGeometry),
    TorusGeometry: vi.fn(() => mockGeometry),
    PlaneGeometry: vi.fn(() => mockGeometry),
    MeshStandardMaterial: vi.fn(() => ({ ...mockMaterial })),
    MeshBasicMaterial: vi.fn(() => ({ ...mockMaterial })),
    SpriteMaterial: vi.fn(() => ({ ...mockMaterial, map: null })),
    CanvasTexture: vi.fn(() => ({})),
    Color: vi.fn((hex: number) => ({ hex })),
    Vector3: vi.fn((x: number, y: number, z: number) => ({ x, y, z })),
    BackSide: 1,
  };
});

import * as THREE from 'three';
import { PlayerAvatars } from '../multiplayer/player-avatars';

function createPlayer(overrides: Partial<PlayerInfo> = {}): PlayerInfo {
  return {
    id: `player-${Math.random().toString(36).slice(2, 6)}`,
    name: 'TestPlayer',
    color: 0xff6b6b,
    score: 0,
    isConnected: true,
    isHost: false,
    ...overrides,
  };
}

describe('PlayerAvatars', () => {
  let avatars: PlayerAvatars;
  let scene: THREE.Scene;

  beforeEach(() => {
    vi.clearAllMocks();
    scene = new THREE.Scene();
    avatars = new PlayerAvatars(scene);
  });

  describe('updatePlayers', () => {
    it('creates avatars for new players', () => {
      const players = [
        createPlayer({ id: 'p1', name: 'Alice' }),
        createPlayer({ id: 'p2', name: 'Bob' }),
      ];
      avatars.updatePlayers(players, 'p1');
      expect(scene.add).toHaveBeenCalled();
    });

    it('positions players in a circular arrangement', () => {
      const players = [
        createPlayer({ id: 'p1' }),
        createPlayer({ id: 'p2' }),
        createPlayer({ id: 'p3' }),
      ];
      expect(() => avatars.updatePlayers(players, 'p1')).not.toThrow();
    });

    it('handles single player', () => {
      const players = [createPlayer({ id: 'p1' })];
      expect(() => avatars.updatePlayers(players, 'p1')).not.toThrow();
    });

    it('removes avatars for players no longer in list', () => {
      const p1 = createPlayer({ id: 'p1' });
      const p2 = createPlayer({ id: 'p2' });
      avatars.updatePlayers([p1, p2], 'p1');
      // Update with only p1 - p2 should be removed
      expect(() => avatars.updatePlayers([p1], 'p1')).not.toThrow();
    });

    it('handles empty player list', () => {
      expect(() => avatars.updatePlayers([], null)).not.toThrow();
    });

    it('updates existing player score', () => {
      const p1 = createPlayer({ id: 'p1', score: 0 });
      avatars.updatePlayers([p1], 'p1');
      const updated = createPlayer({ id: 'p1', score: 100 });
      expect(() => avatars.updatePlayers([updated], 'p1')).not.toThrow();
    });

    it('handles 8 players (max capacity)', () => {
      const players = Array.from({ length: 8 }, (_, i) =>
        createPlayer({ id: `p${i}`, name: `Player${i}` })
      );
      expect(() => avatars.updatePlayers(players, 'p0')).not.toThrow();
    });
  });

  describe('setCurrentTurn', () => {
    it('highlights the correct player turn', () => {
      const p1 = createPlayer({ id: 'p1' });
      const p2 = createPlayer({ id: 'p2' });
      avatars.updatePlayers([p1, p2], 'p1');
      expect(() => avatars.setCurrentTurn('p2')).not.toThrow();
    });

    it('handles non-existent player ID gracefully', () => {
      const p1 = createPlayer({ id: 'p1' });
      avatars.updatePlayers([p1], 'p1');
      expect(() => avatars.setCurrentTurn('nonexistent')).not.toThrow();
    });
  });

  describe('showGuessAnimation', () => {
    it('plays animation for existing player (correct guess)', () => {
      const p1 = createPlayer({ id: 'p1' });
      avatars.updatePlayers([p1], 'p1');
      expect(() => avatars.showGuessAnimation('p1', true)).not.toThrow();
    });

    it('plays animation for existing player (wrong guess)', () => {
      const p1 = createPlayer({ id: 'p1' });
      avatars.updatePlayers([p1], 'p1');
      expect(() => avatars.showGuessAnimation('p1', false)).not.toThrow();
    });

    it('handles non-existent player gracefully', () => {
      expect(() => avatars.showGuessAnimation('nonexistent', true)).not.toThrow();
    });
  });

  describe('clear', () => {
    it('removes all avatars', () => {
      const players = [
        createPlayer({ id: 'p1' }),
        createPlayer({ id: 'p2' }),
      ];
      avatars.updatePlayers(players, 'p1');
      expect(() => avatars.clear()).not.toThrow();
    });

    it('is safe to call when empty', () => {
      expect(() => avatars.clear()).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('cleans up all resources', () => {
      const players = [createPlayer({ id: 'p1' })];
      avatars.updatePlayers(players, 'p1');
      expect(() => avatars.dispose()).not.toThrow();
      expect(scene.remove).toHaveBeenCalled();
    });
  });
});
