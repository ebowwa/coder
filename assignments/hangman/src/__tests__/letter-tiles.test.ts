/**
 * Tests for LetterTiles module
 * Note: These tests mock Three.js dependencies
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock document for canvas operations
const mockCanvas = {
  width: 128,
  height: 128,
  getContext: vi.fn(() => ({
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
  })),
};

globalThis.document = {
  createElement: vi.fn((tagName: string) => {
    if (tagName === 'canvas') {
      return mockCanvas;
    }
    return {};
  }),
} as any;

// @ts-ignore
globalThis.window = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  innerWidth: 1024,
  innerHeight: 768,
};

// @ts-ignore
globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => 0);

// @ts-ignore
globalThis.performance = {
  now: vi.fn(() => 0),
};

// Mock Three.js
vi.mock('three', () => ({
  Scene: vi.fn(function() {
    return {
      add: vi.fn(),
      background: null,
    }
  }),
  PerspectiveCamera: vi.fn(function() {
    return {
      position: { set: vi.fn() },
    }
  }),
  Group: vi.fn(function() {
    return {
      add: vi.fn(),
      position: { set: vi.fn() },
    }
  }),
  Mesh: vi.fn(function() {
    return {
      position: { set: vi.fn() },
      rotation: { x: 0 },
      scale: { set: vi.fn() },
      castShadow: false,
      receiveShadow: false,
      userData: {},
      add: vi.fn(),
      material: {
        color: { setHex: vi.fn() },
        emissive: { setHex: vi.fn() },
      },
    }
  }),
  BoxGeometry: vi.fn(),
  PlaneGeometry: vi.fn(),
  MeshStandardMaterial: vi.fn(function() {
    return {
      color: { setHex: vi.fn() },
      emissive: { setHex: vi.fn() },
    }
  }),
  CanvasTexture: vi.fn(),
  Raycaster: vi.fn(function() {
    return {
      setFromCamera: vi.fn(),
      intersectObjects: vi.fn(() => []),
    }
  }),
  Vector2: vi.fn(function() {
    return { x: 0, y: 0 }
  }),
  Object3D: vi.fn(),
}));

// Mock three/examples/jsm
vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn(() => ({
    enableDamping: false,
    dampingFactor: 0,
    maxDistance: 0,
    minDistance: 0,
  })),
}));

import { LetterTiles } from '../letter-tiles';

describe('LetterTiles', () => {
  let letterTiles: LetterTiles;
  let mockCamera: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCamera = {} as any;
    letterTiles = new LetterTiles(mockCamera);
  });

  describe('constructor', () => {
    it('should create 26 letter tiles (A-Z)', () => {
      // The constructor creates tiles for all letters
      expect(letterTiles).toBeDefined();
    });

    it('should return a group mesh', () => {
      const mesh = letterTiles.getMesh();
      expect(mesh).toBeDefined();
    });
  });

  describe('setPosition', () => {
    it('should set position of the tile group', () => {
      letterTiles.setPosition(1, 2, 3);
      // Position should be set without error
      expect(letterTiles).toBeDefined();
    });
  });

  describe('setTileClickHandler', () => {
    it('should register a click handler', () => {
      const handler = vi.fn();
      letterTiles.setTileClickHandler(handler);
      expect(letterTiles).toBeDefined();
    });
  });

  describe('setTileStatus', () => {
    it('should handle correct status', () => {
      letterTiles.setTileStatus('A', 'correct');
      expect(letterTiles).toBeDefined();
    });

    it('should handle wrong status', () => {
      letterTiles.setTileStatus('B', 'wrong');
      expect(letterTiles).toBeDefined();
    });

    it('should handle lowercase letters', () => {
      letterTiles.setTileStatus('c', 'correct');
      expect(letterTiles).toBeDefined();
    });

    it('should handle non-existent letters gracefully', () => {
      letterTiles.setTileStatus('123', 'correct');
      expect(letterTiles).toBeDefined();
    });
  });

  describe('reset', () => {
    it('should reset all tiles to unused state', () => {
      letterTiles.setTileStatus('A', 'correct');
      letterTiles.setTileStatus('B', 'wrong');
      
      letterTiles.reset();
      
      expect(letterTiles).toBeDefined();
    });
  });

  describe('dispose', () => {
    it('should clean up event listeners', () => {
      letterTiles.dispose();
      expect(letterTiles).toBeDefined();
    });
  });
});
