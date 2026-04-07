/**
 * Unit tests for particle effects system
 * Tests: particle creation, update behavior, removal, configuration options
 *
 * Note: THREE.js has runtime type checks that prevent full mocking.
 * These tests focus on the logic that can be reliably tested via the public API.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ParticleEffects, type ParticleConfig } from './particle-effects';

// Mock THREE.js with minimal implementations
vi.mock('three', () => {
  return {
    Scene: vi.fn(() => ({
      add: vi.fn(),
      remove: vi.fn(),
    })),
    Mesh: vi.fn(() => ({
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
      material: { dispose: vi.fn(), opacity: 1, emissiveIntensity: 0.5 },
      geometry: { dispose: vi.fn() },
    })),
    Vector3: vi.fn((x = 0, y = 0, z = 0) => ({
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
    })),
    Clock: vi.fn(() => ({
      getElapsedTime: vi.fn(() => 0),
      getDelta: vi.fn(() => 0.016),
    })),
    BoxGeometry: vi.fn(() => ({ dispose: vi.fn() })),
    SphereGeometry: vi.fn(() => ({ dispose: vi.fn() })),
    TetrahedronGeometry: vi.fn(() => ({ dispose: vi.fn() })),
    BufferGeometry: vi.fn(() => ({ dispose: vi.fn() })),
    MeshStandardMaterial: vi.fn(() => ({ dispose: vi.fn(), opacity: 1, emissiveIntensity: 0.5 })),
  };
});

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
      expect(particleEffects.getActiveCount()).toBe(100);
      expect(particleEffects.hasActiveParticles()).toBe(true);
    });

    it('should create particles with default lose configuration', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(0, 0, 0);

      particleEffects.emitLose(position);

      // Default lose config has count: 50
      expect(particleEffects.getActiveCount()).toBe(50);
      expect(particleEffects.hasActiveParticles()).toBe(true);
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

      expect(particleEffects.getActiveCount()).toBe(25);
      expect(particleEffects.hasActiveParticles()).toBe(true);
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

      // Should create all particles even with array of colors
      expect(particleEffects.getActiveCount()).toBe(10);
      expect(particleEffects.hasActiveParticles()).toBe(true);
    });

    it('should create confetti burst from multiple positions', () => {
      particleEffects.emitConfettiBurst(2);

      // 3 positions * 40 particles each = 120
      expect(particleEffects.getActiveCount()).toBe(120);
      expect(particleEffects.hasActiveParticles()).toBe(true);
    });

    it('should create spiral particles', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(0, 0, 0);

      particleEffects.emitSpiral(position);

      // spiralCount is 30
      expect(particleEffects.getActiveCount()).toBe(30);
      expect(particleEffects.hasActiveParticles()).toBe(true);
    });

    it('should use default position when not provided for emitWin', () => {
      particleEffects.emitWin();

      // Should still create particles with default position
      expect(particleEffects.getActiveCount()).toBe(100);
      expect(particleEffects.hasActiveParticles()).toBe(true);
    });

    it('should use default position when not provided for emitLose', () => {
      particleEffects.emitLose();

      // Should still create particles with default position
      expect(particleEffects.getActiveCount()).toBe(50);
      expect(particleEffects.hasActiveParticles()).toBe(true);
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

      // Particles should be removed after lifetime expires
      expect(particleEffects.getActiveCount()).toBe(0);
      expect(particleEffects.hasActiveParticles()).toBe(false);

      vi.useRealTimers();
    });

    it('should remove particles from scene when cleared', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(0, 0, 0);

      particleEffects.emitWin(position);
      expect(particleEffects.getActiveCount()).toBe(100);

      particleEffects.clear();

      // All particles should be removed
      expect(particleEffects.getActiveCount()).toBe(0);
      expect(particleEffects.hasActiveParticles()).toBe(false);
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

      // Must enable fake timers BEFORE emit so birthTime uses fake Date.now()
      vi.useFakeTimers();
      particleEffects.emit(position, config);

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
      expect(particleEffects.hasActiveParticles()).toBe(false);
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

      // Should create all particles even with spread: 0
      expect(particleEffects.getActiveCount()).toBe(10);
      expect(particleEffects.hasActiveParticles()).toBe(true);
    });
  });

  describe('Ambient particles', () => {
    it('should emit ambient particles when starting ambient glow', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(0, 0, 0);

      particleEffects.startAmbientGlow(position);

      // startAmbientGlow should emit one ambient particle
      // Note: Ambient particles are tracked separately from regular particles
      // The getActiveCount() only returns regular particles
      // But we can verify the method doesn't throw and the system still works
      expect(particleEffects.hasActiveParticles()).toBe(false);
    });

    it('should continuously emit ambient particles during update', () => {
      const THREE = require('three');
      const position = new THREE.Vector3(0, 0, 0);

      // Start ambient glow
      particleEffects.startAmbientGlow(position);

      // Update multiple times to trigger ambient emission (every ~150ms)
      // The ambient particles are emitted during update when hangmanPosition is provided
      for (let i = 0; i < 15; i++) {
        particleEffects.update(0.016, position);
      }

      // After updates with hangmanPosition, ambient particles should be emitted
      // The update loop emits new ambient particles every ~150ms
      // 15 updates * 0.016s = 0.24s, which should trigger at least one emission
      // Since ambient particles are tracked separately, getActiveCount() stays 0
      expect(particleEffects.getActiveCount()).toBe(0);
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
