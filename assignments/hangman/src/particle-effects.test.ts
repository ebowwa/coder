/**
 * Unit tests for particle effects system
 * Tests: particle creation, update behavior, removal, configuration options
 * 
 * Note: THREE.js has runtime type checks that prevent full mocking.
 * These tests focus on the logic that can be reliably tested.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock THREE.js - focus on mocking the parts we can control
const mockAdd = vi.fn();
const mockRemove = vi.fn();
const mockDispose = vi.fn();

vi.mock('three', () => {
  // Simple mock objects that won't trigger THREE.js validation
  const createMockScene = () => ({
    add: mockAdd,
    remove: mockRemove,
  });

  const createMockMesh = () => ({
    position: {
      x: 0,
      y: 0,
      z: 0,
      set: vi.fn(function(this: any, x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
      }),
      add: vi.fn(),
      clone: vi.fn(() => ({ multiplyScalar: vi.fn(() => ({ x: 0, y: 0, z: 0 })) })),
    },
    rotation: { x: 0, y: 0, z: 0, set: vi.fn() },
    scale: { x: 1, y: 1, z: 1, setScalar: vi.fn() },
    material: { dispose: mockDispose, opacity: 1, emissiveIntensity: 0.5 },
    geometry: { dispose: mockDispose },
  });

  const createMockVector3 = (x = 0, y = 0, z = 0) => ({
    x, y, z,
    clone: vi.fn(() => ({
      multiplyScalar: vi.fn((scalar: number) => ({ x: x * scalar, y: y * scalar, z: z * scalar })),
    })),
    multiplyScalar: vi.fn(function(this: any, scalar: number) {
      this.x *= scalar;
      this.y *= scalar;
      this.z *= scalar;
      return this;
    }),
    add: vi.fn(function(this: any, v: any) {
      this.x += v.x;
      this.y += v.y;
      this.z += v.z;
      return this;
    }),
    set: vi.fn(function(this: any, x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }),
  });

  return {
    Scene: vi.fn(() => createMockScene()),
    Mesh: vi.fn(() => createMockMesh()),
    Vector3: vi.fn((x = 0, y = 0, z = 0) => createMockVector3(x, y, z)),
    Clock: vi.fn(() => ({
      getElapsedTime: vi.fn(() => 0),
      getDelta: vi.fn(() => 0.016),
    })),
    BoxGeometry: vi.fn(() => ({ dispose: mockDispose })),
    SphereGeometry: vi.fn(() => ({ dispose: mockDispose })),
    TetrahedronGeometry: vi.fn(() => ({ dispose: mockDispose })),
    BufferGeometry: vi.fn(() => ({ dispose: mockDispose })),
    MeshStandardMaterial: vi.fn(() => ({ dispose: mockDispose, opacity: 1, emissiveIntensity: 0.5 })),
  };
});

import { ParticleEffects, type ParticleConfig } from './particle-effects';

describe('ParticleEffects System', () => {
  let particleEffects: ParticleEffects;
  let mockScene: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const THREE = require('three');
    mockScene = new THREE.Scene();
    particleEffects = new ParticleEffects(mockScene);
  });

  afterEach(() => {
    particleEffects.clear();
    vi.useRealTimers();
  });

  describe('Initial state', () => {
    it('should start with no active particles', () => {
      expect(particleEffects.hasActiveParticles()).toBe(false);
      expect(particleEffects.getActiveCount()).toBe(0);
    });
  });

  describe('Particle creation with correct initial properties', () => {
    it('should create particles with default win configuration', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(0, 0, 0);
      
      particleEffects.emitWin(position);
      
      // Default win config has count: 100
      expect(mockAdd).toHaveBeenCalledTimes(100);
      expect(particleEffects.getActiveCount()).toBe(100);
    });

    it('should create particles with default lose configuration', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(0, 0, 0);
      
      particleEffects.emitLose(position);
      
      // Default lose config has count: 50
      expect(mockAdd).toHaveBeenCalledTimes(50);
      expect(particleEffects.getActiveCount()).toBe(50);
    });

    it('should create particles with custom configuration', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(0, 0, 0);
      const customConfig: ParticleConfig = {
        count: 25,
        color: 0xff0000,
        size: 0.2,
        lifetime: 1000,
        velocity: { x: 1, y: 2, z: 1 },
        spread: 1,
        gravity: -1,
      };
      
      particleEffects.emit(position, customConfig);
      
      expect(mockAdd).toHaveBeenCalledTimes(25);
      expect(particleEffects.getActiveCount()).toBe(25);
    });

    it('should handle array of colors in configuration', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(0, 0, 0);
      const config: ParticleConfig = {
        count: 10,
        color: [0xff0000, 0x00ff00, 0x0000ff],
        size: 0.1,
        lifetime: 1000,
        velocity: { x: 0, y: 1, z: 0 },
        spread: 1,
        gravity: -1,
      };
      
      particleEffects.emit(position, config);
      
      expect(mockAdd).toHaveBeenCalledTimes(10);
    });

    it('should create confetti burst from multiple positions', () => {
      particleEffects.emitConfettiBurst(2);
      
      // 3 positions * 40 particles each = 120
      expect(mockAdd).toHaveBeenCalledTimes(120);
      expect(particleEffects.getActiveCount()).toBe(120);
    });

    it('should create spiral particles', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(0, 0, 0);
      
      particleEffects.emitSpiral(position);
      
      // spiralCount is 30
      expect(mockAdd).toHaveBeenCalledTimes(30);
      expect(particleEffects.getActiveCount()).toBe(30);
    });

    it('should use default position when not provided for emitWin', () => {
      particleEffects.emitWin();
      
      expect(mockAdd).toHaveBeenCalledTimes(100);
    });

    it('should use default position when not provided for emitLose', () => {
      particleEffects.emitLose();
      
      expect(mockAdd).toHaveBeenCalledTimes(50);
    });
  });

  describe('Particle update behavior', () => {
    it('should keep particles active during update', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(0, 0, 0);
      const config: ParticleConfig = {
        count: 1,
        color: 0xffffff,
        size: 0.1,
        lifetime: 5000,
        velocity: { x: 1, y: 5, z: 1 },
        spread: 0,
        gravity: -2,
      };
      
      particleEffects.emit(position, config);
      particleEffects.update(0.016);
      
      expect(particleEffects.hasActiveParticles()).toBe(true);
    });

    it('should keep particles active after multiple updates', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(0, 0, 0);
      const config: ParticleConfig = {
        count: 1,
        color: 0xffffff,
        size: 0.1,
        lifetime: 5000,
        velocity: { x: 0, y: 10, z: 0 },
        spread: 0,
        gravity: -9.8,
      };
      
      particleEffects.emit(position, config);
      
      for (let i = 0; i < 10; i++) {
        particleEffects.update(0.016);
      }
      
      expect(particleEffects.hasActiveParticles()).toBe(true);
    });

    it('should keep particles active before lifetime expires', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(0, 0, 0);
      const config: ParticleConfig = {
        count: 1,
        color: 0xffffff,
        size: 0.1,
        lifetime: 500,
        velocity: { x: 0, y: 1, z: 0 },
        spread: 0,
        gravity: -1,
      };
      
      particleEffects.emit(position, config);
      
      vi.useFakeTimers();
      vi.advanceTimersByTime(250); // Half lifetime
      particleEffects.update(0.016);
      
      expect(particleEffects.hasActiveParticles()).toBe(true);
      
      vi.useRealTimers();
    });
  });

  describe('Particle removal when lifetime expires', () => {
    it('should remove particles when lifetime expires', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(0, 0, 0);
      const config: ParticleConfig = {
        count: 5,
        color: 0xffffff,
        size: 0.1,
        lifetime: 10,
        velocity: { x: 0, y: 1, z: 0 },
        spread: 0,
        gravity: -1,
      };
      
      particleEffects.emit(position, config);
      expect(particleEffects.getActiveCount()).toBe(5);
      
      vi.useFakeTimers();
      vi.advanceTimersByTime(20);
      particleEffects.update(0.016);
      
      expect(particleEffects.getActiveCount()).toBe(0);
      expect(mockRemove).toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('should remove particles from scene when cleared', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(0, 0, 0);
      
      particleEffects.emitWin(position);
      expect(particleEffects.getActiveCount()).toBe(100);
      
      particleEffects.clear();
      
      expect(particleEffects.getActiveCount()).toBe(0);
      expect(mockRemove).toHaveBeenCalled();
    });

    it('should handle multiple update cycles correctly', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(0, 0, 0);
      const config: ParticleConfig = {
        count: 3,
        color: 0xffffff,
        size: 0.1,
        lifetime: 50,
        velocity: { x: 0, y: 1, z: 0 },
        spread: 0,
        gravity: -1,
      };
      
      particleEffects.emit(position, config);
      
      vi.useFakeTimers();
      
      // Multiple updates before expiration
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(10);
        particleEffects.update(0.016);
        expect(particleEffects.getActiveCount()).toBe(3);
      }
      
      // Update past expiration
      vi.advanceTimersByTime(100);
      particleEffects.update(0.016);
      
      expect(particleEffects.getActiveCount()).toBe(0);
      
      vi.useRealTimers();
    });
  });

  describe('Configuration options', () => {
    it('should respect burst count configuration', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(0, 0, 0);
      const config: ParticleConfig = {
        count: 42,
        color: 0xffffff,
        size: 0.1,
        lifetime: 1000,
        velocity: { x: 0, y: 1, z: 0 },
        spread: 1,
        gravity: -1,
      };
      
      particleEffects.emit(position, config);
      
      expect(particleEffects.getActiveCount()).toBe(42);
    });

    it('should handle zero count configuration', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(0, 0, 0);
      const config: ParticleConfig = {
        count: 0,
        color: 0xffffff,
        size: 0.1,
        lifetime: 1000,
        velocity: { x: 0, y: 1, z: 0 },
        spread: 1,
        gravity: -1,
      };
      
      particleEffects.emit(position, config);
      
      expect(particleEffects.getActiveCount()).toBe(0);
      expect(mockAdd).not.toHaveBeenCalled();
    });

    it('should respect spread configuration', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(5, 5, 5);
      const config: ParticleConfig = {
        count: 10,
        color: 0xffffff,
        size: 0.1,
        lifetime: 1000,
        velocity: { x: 0, y: 1, z: 0 },
        spread: 0,
        gravity: -1,
      };
      
      particleEffects.emit(position, config);
      
      expect(mockAdd).toHaveBeenCalledTimes(10);
    });
  });

  describe('Ambient particles', () => {
    it('should emit ambient particles when starting ambient glow', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(0, 0, 0);
      
      particleEffects.startAmbientGlow(position);
      
      expect(mockAdd).toHaveBeenCalled();
    });

    it('should continuously emit ambient particles during update', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(0, 0, 0);
      
      const initialCallCount = mockAdd.mock.calls.length;
      
      // Update multiple times to trigger ambient emission (every ~150ms)
      for (let i = 0; i < 15; i++) {
        particleEffects.update(0.016, position);
      }
      
      expect(mockAdd.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  describe('hasActiveParticles and getActiveCount', () => {
    it('should return false when no particles are active', () => {
      expect(particleEffects.hasActiveParticles()).toBe(false);
      expect(particleEffects.getActiveCount()).toBe(0);
    });

    it('should return true when particles are active', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(0, 0, 0);
      
      particleEffects.emitWin(position);
      
      expect(particleEffects.hasActiveParticles()).toBe(true);
      expect(particleEffects.getActiveCount()).toBe(100);
    });

    it('should update count correctly after particles expire', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(0, 0, 0);
      const config: ParticleConfig = {
        count: 5,
        color: 0xffffff,
        size: 0.1,
        lifetime: 10,
        velocity: { x: 0, y: 1, z: 0 },
        spread: 0,
        gravity: -1,
      };
      
      particleEffects.emit(position, config);
      expect(particleEffects.getActiveCount()).toBe(5);
      
      vi.useFakeTimers();
      vi.advanceTimersByTime(20);
      particleEffects.update(0.016);
      
      expect(particleEffects.hasActiveParticles()).toBe(false);
      expect(particleEffects.getActiveCount()).toBe(0);
      
      vi.useRealTimers();
    });
  });
});
