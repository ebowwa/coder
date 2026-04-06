/**
 * Particle Effects System for Hangman 3D
 * Provides visual feedback for win/lose scenarios and special events
 */

import * as THREE from 'three';

export interface ParticleConfig {
  count: number;
  color: number | number[];
  size: number;
  lifetime: number;
  velocity: { x: number; y: number; z: number };
  spread: number;
  gravity: number;
}

const DEFAULT_WIN_CONFIG: ParticleConfig = {
  count: 100,
  color: [0x4ecdc4, 0xffe66d, 0xff6b6b, 0x95e1d3, 0xf38181],
  size: 0.15,
  lifetime: 3000,
  velocity: { x: 0, y: 5, z: 0 },
  spread: 3,
  gravity: -2,
};

const DEFAULT_LOSE_CONFIG: ParticleConfig = {
  count: 50,
  color: [0x333333, 0x555555, 0x666666],
  size: 0.1,
  lifetime: 2000,
  velocity: { x: 0, y: 2, z: 0 },
  spread: 2,
  gravity: -4,
};

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  birthTime: number;
  lifetime: number;
  initialScale: number;
}

export class ParticleEffects {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private clock: THREE.Clock;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.clock = new THREE.Clock();
  }

  /**
   * Emit particles for a win celebration
   */
  emitWin(position: THREE.Vector3 = new THREE.Vector3(0, 0, 0)): void {
    this.emit(position, DEFAULT_WIN_CONFIG);
  }

  /**
   * Emit particles for a lose scenario
   */
  emitLose(position: THREE.Vector3 = new THREE.Vector3(0, 0, 0)): void {
    this.emit(position, DEFAULT_LOSE_CONFIG);
  }

  /**
   * Emit particles with custom configuration
   */
  emit(position: THREE.Vector3, config: ParticleConfig): void {
    const colors = Array.isArray(config.color) ? config.color : [config.color];

    for (let i = 0; i < config.count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      // Create particle geometry (use different shapes for variety)
      let geometry: THREE.BufferGeometry;
      const shapeType = Math.random();
      
      if (shapeType < 0.5) {
        geometry = new THREE.BoxGeometry(config.size, config.size, config.size);
      } else if (shapeType < 0.8) {
        geometry = new THREE.SphereGeometry(config.size * 0.5, 8, 8);
      } else {
        geometry = new THREE.TetrahedronGeometry(config.size * 0.6);
      }

      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 1,
      });

      const mesh = new THREE.Mesh(geometry, material);
      
      // Set position with spread
      mesh.position.set(
        position.x + (Math.random() - 0.5) * config.spread,
        position.y + (Math.random() - 0.5) * config.spread * 0.5,
        position.z + (Math.random() - 0.5) * config.spread
      );

      // Random rotation
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      this.scene.add(mesh);

      // Create velocity with randomness
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * config.velocity.x * 2 + (Math.random() - 0.5) * config.spread,
        config.velocity.y * (0.5 + Math.random() * 0.5),
        (Math.random() - 0.5) * config.velocity.z * 2
      );

      this.particles.push({
        mesh,
        velocity,
        birthTime: Date.now(),
        lifetime: config.lifetime * (0.5 + Math.random() * 0.5),
        initialScale: mesh.scale.x,
      });
    }
  }

  /**
   * Emit confetti burst from multiple points
   */
  emitConfettiBurst(centerY: number = 2): void {
    const positions = [
      new THREE.Vector3(-3, centerY, 0),
      new THREE.Vector3(0, centerY, 0),
      new THREE.Vector3(3, centerY, 0),
    ];

    positions.forEach(pos => {
      this.emit(pos, {
        ...DEFAULT_WIN_CONFIG,
        count: 40,
        velocity: { x: 0, y: 8, z: 0 },
        spread: 1,
      });
    });
  }

  /**
   * Emit spiral particles around a position
   */
  emitSpiral(position: THREE.Vector3, color: number = 0x4ecdc4): void {
    const spiralCount = 30;
    
    for (let i = 0; i < spiralCount; i++) {
      const angle = (i / spiralCount) * Math.PI * 4;
      const radius = (i / spiralCount) * 2;
      
      const geometry = new THREE.SphereGeometry(0.08, 8, 8);
      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 1,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        position.x + Math.cos(angle) * radius,
        position.y + i * 0.1,
        position.z + Math.sin(angle) * radius
      );

      this.scene.add(mesh);

      const velocity = new THREE.Vector3(
        Math.cos(angle) * 2,
        3,
        Math.sin(angle) * 2
      );

      this.particles.push({
        mesh,
        velocity,
        birthTime: Date.now() - i * 20, // Stagger birth times
        lifetime: 2000,
        initialScale: 1,
      });
    }
  }

  /**
   * Clear all active particles immediately
   */
  clear(): void {
    this.particles.forEach(p => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    });
    this.particles = [];
  }

  /**
   * Update particle positions and remove expired ones
   * Call this from the game's animation loop
   */
  update(deltaTime: number): void {
    const now = Date.now();
    const toRemove: number[] = [];

    this.particles.forEach((particle, index) => {
      const age = now - particle.birthTime;
      const lifePercent = age / particle.lifetime;

      if (lifePercent >= 1) {
        toRemove.push(index);
        return;
      }

      // Apply gravity
      particle.velocity.y -= 9.8 * deltaTime;

      // Update position
      particle.mesh.position.add(
        particle.velocity.clone().multiplyScalar(deltaTime)
      );

      // Rotate particle
      particle.mesh.rotation.x += deltaTime * 2;
      particle.mesh.rotation.y += deltaTime * 3;

      // Fade out
      const material = particle.mesh.material as THREE.MeshStandardMaterial;
      material.opacity = 1 - lifePercent;

      // Scale down near end
      if (lifePercent > 0.7) {
        const scale = particle.initialScale * (1 - (lifePercent - 0.7) / 0.3);
        particle.mesh.scale.setScalar(scale);
      }
    });

    // Remove expired particles (in reverse order to maintain indices)
    toRemove.reverse().forEach(index => {
      const particle = this.particles[index];
      this.scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
      this.particles.splice(index, 1);
    });
  }

  /**
   * Get count of active particles
   */
  getActiveCount(): number {
    return this.particles.length;
  }

  /**
   * Check if any particles are active
   */
  hasActiveParticles(): boolean {
    return this.particles.length > 0;
  }
}
