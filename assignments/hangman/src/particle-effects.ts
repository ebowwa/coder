/**
 * Particle Effects System for Hangman 3D
 * 
 * This module provides a 3D particle system for visual feedback during gameplay.
 * It supports various particle effects including win celebrations, lose animations,
 * confetti bursts, spirals, and ambient glow effects.
 * 
 * @module particle-effects
 * @example
 * ```typescript
 * import * as THREE from 'three';
 * import { ParticleEffects, ParticleConfig } from './particle-effects';
 * 
 * // Create particle system
 * const particles = new ParticleEffects(scene);
 * 
 * // Emit win particles at a position
 * particles.emitWin(new THREE.Vector3(0, 2, 0));
 * 
 * // Update in animation loop
 * function animate() {
 *   const delta = clock.getDelta();
 *   particles.update(delta);
 * }
 * ```
 */

import * as THREE from 'three';

/**
 * Configuration options for particle emission.
 * 
 * @interface ParticleConfig
 * @example
 * ```typescript
 * const config: ParticleConfig = {
 *   count: 100,
 *   color: [0xff0000, 0x00ff00, 0x0000ff],
 *   size: 0.2,
 *   lifetime: 2000,
 *   velocity: { x: 0, y: 5, z: 0 },
 *   spread: 3,
 *   gravity: -2
 * };
 * particles.emit(position, config);
 * ```
 */
export interface ParticleConfig {
    /**
     * Number of particles to emit in a single burst.
     * Higher values create denser effects but may impact performance.
     * @typical 50-150
     */
    count: number;
    
    /**
     * Color(s) for the particles. Can be a single hex color or an array of colors.
     * Particles will randomly select from the array if multiple colors provided.
     * @example 0xff6b6b
     * @example [0xff6b6b, 0x4ecdc4, 0xffe66d]
     */
    color: number | number[];
    
 /**
     * Base size of each particle in world units.
     * Particles use various geometries (boxes, spheres, tetrahedrons) at this scale.
     * @typical 0.1-0.2
     */
    size: number;
    
    /**
     * Duration of each particle's lifetime in milliseconds.
     * Particles will fade out and be removed after this time.
     * @typical 2000-3000
     */
    lifetime: number;
    
    /**
     * Initial velocity applied to particles.
     * Random variation is added to create natural-looking movement.
     */
    velocity: { x: number; y: number; z: number };
    
    /**
     * Spread radius around the emission point.
     * Particles are randomly positioned within this radius.
     * @typical 2-3
     */
    spread: number;
    
    /**
     * Gravity force applied to particles (negative = downward).
     * Set to 0 for floating particles, negative for falling.
     * @typical -2 to -4
     */
    gravity: number;
}

/**
 * Default configuration for win celebration particles.
 * 
 * Creates colorful confetti with upward velocity that gradually falls.
 * Colors: teal, yellow, red, mint, coral.
 * 
 * @constant
 * @type {ParticleConfig}
 */
const DEFAULT_WIN_CONFIG: ParticleConfig = {
    count: 100,
    color: [0x4ecdc4, 0xffe66d, 0xff6b6b, 0x95e1d3, 0xf38181],
    size: 0.15,
    lifetime: 3000,
    velocity: { x: 0, y: 5, z: 0 },
    spread: 3,
    gravity: -2,
};

/**
 * Default configuration for lose scenario particles.
 * 
 * Creates darker particles with less energy for a somber effect.
 * Colors: dark grays.
 * 
 * @constant
 * @type {ParticleConfig}
 */
const DEFAULT_LOSE_CONFIG: ParticleConfig = {
    count: 50,
    color: [0x333333, 0x555555, 0x666666],
    size: 0.1,
    lifetime: 2000,
    velocity: { x: 0, y: 2, z: 0 },
    spread: 2,
    gravity: -4,
};

/**
 * Internal representation of a single particle in the system.
 * 
 * @interface Particle
 * @internal
 */
interface Particle {
    /**
     * The Three.js mesh object representing this particle visually.
     */
    mesh: THREE.Mesh;
    
    /**
     * Current velocity vector in units per second.
     */
    velocity: THREE.Vector3;
    
    /**
     * Timestamp (milliseconds) when this particle was created.
     */
    birthTime: number;
    
    /**
     * Total lifetime of this particle in milliseconds.
     */
    lifetime: number;
    
    /**
     * Initial scale value for fade-out calculations.
     */
    initialScale: number;
}

/**
 * Manages a 3D particle system for visual effects in the Hangman game.
 * 
 * This class handles creation, animation, and cleanup of particle effects
 * for win/lose scenarios and ambient atmospheric effects.
 * 
 * @class ParticleEffects
 * @example
 * ```typescript
 * const scene = new THREE.Scene();
 * const particles = new ParticleEffects(scene);
 * 
 * // Emit win celebration
 * particles.emitWin(new THREE.Vector3(0, 2, 0));
 * 
 * // In animation loop
 * function animate() {
 *   particles.update(clock.getDelta());
 * }
 * ```
 */
export class ParticleEffects {
    /** The Three.js scene to add particles to */
    private scene: THREE.Scene;
    /** Active particles currently being animated */
    private particles: Particle[] = [];
    /** Clock for timing particle animations */
    private clock: THREE.Clock;
    /** Ambient glow particles for atmospheric effect */
    private ambientParticles: Particle[] = [];
    /** Timer for ambient particle emission rate */
    private ambientEmitTimer: number = 0;

    /**
     * Creates a new ParticleEffects instance.
     * 
     * @param {THREE.Scene} scene - The Three.js scene to add particles to
     * @example
     * ```typescript
     * const scene = new THREE.Scene();
     * const particles = new ParticleEffects(scene);
     * ```
     */
    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.clock = new THREE.Clock();
    }
    /**
     * Emit particles for a win celebration.
     * 
     * Creates colorful confetti particles at the specified position
     * using the default win configuration.
     * 
     * @param {THREE.Vector3} [position=new THREE.Vector3(0, 0, 0)] - World position to emit particles from
     * @returns {void}
     * 
     * @example
     * ```typescript
     * // Emit win particles at center of scene
     * particles.emitWin(new THREE.Vector3(0, 2, 0));
     * ```
     */
    emitWin(position: THREE.Vector3 = new THREE.Vector3(0, 0, 0)): void {
        this.emit(position, DEFAULT_WIN_CONFIG);
    }
    /**
     * Emit particles for a lose scenario.
     * 
     * Creates darker, somber particles at the specified position
     * using the default lose configuration.
     * 
     * @param {THREE.Vector3} [position=new THREE.Vector3(0, 0, 0)] - World position to emit particles from
     * @returns {void}
     * 
     * @example
     * ```typescript
     * // Emit lose particles at hangman position
     * particles.emitLose(new THREE.Vector3(-4, 0, 0));
     * ```
     */
    emitLose(position: THREE.Vector3 = new THREE.Vector3(0, 0, 0)): void {
        this.emit(position, DEFAULT_LOSE_CONFIG);
    }
    /**
     * Emit particles with custom configuration.
     * 
     * @param {THREE.Vector3} position - World position to emit particles from
     * @param {ParticleConfig} config - Configuration options for particle emission
     * @returns {void}
     * 
     * @example
     * ```typescript
     * const customConfig: ParticleConfig = {
     *   count: 50,
     *   color: 0x00ff00,
     *   size: 0.1,
     *   lifetime: 1500,
     *   velocity: { x: 0, y: 3, z: 0 },
     *   spread: 1,
     *   gravity: -1
     * };
     * particles.emit(new THREE.Vector3(0, 0, 0), customConfig);
     * ```
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
     * Emit confetti burst from multiple points.
     * 
     * @param {number} [centerY=2] - Y coordinate for the center of the burst
     * @returns {void}
     * 
     * @example
     * ```typescript
     * // Emit confetti burst from three points at y=2
     * particles.emitConfettiBurst(2);
     * ```
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
     * Emit spiral particles around a position.
     * 
     * @param {THREE.Vector3} position - Center position for the spiral effect
     * @param {number} [color=0x4ecdc4] - Color for the spiral particles (hex)
     * @returns {void}
     * 
     * @example
     * ```typescript
     * // Create a cyan spiral at origin
     * particles.emitSpiral(new THREE.Vector3(0, 2, 0), 0x00ffff);
     * ```
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
     * Start emitting ambient glowing particles behind the hangman figure.
     * Creates a continuous magical aura effect.
     * 
     * @param {THREE.Vector3} hangmanPosition - Position of the hangman figure
     * @returns {void}
     * 
     * @example
     * ```typescript
     * // Start ambient glow around hangman at x=-4
     * particles.startAmbientGlow(new THREE.Vector3(-4, 0, 0));
     * ```
     */
    startAmbientGlow(hangmanPosition: THREE.Vector3): void {
        this.emitAmbientParticle(hangmanPosition);
    }
    /**
     * Emit a single ambient particle with glowing effect.
     * 
     * @param {THREE.Vector3} position - Base position for the particle
     * @private
     */
    private emitAmbientParticle(position: THREE.Vector3): void {
        // Glowing colors: cyan, purple, blue, white
        const glowColors = [0x00ffff, 0xff00ff, 0x4444ff, 0xffffff, 0x88ffff];
        const color = glowColors[Math.floor(Math.random() * glowColors.length)];
        // Create small glowing sphere
        const size = 0.05 + Math.random() * 0.1;
        const geometry = new THREE.SphereGeometry(size, 12, 12);
        const material = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.8 + Math.random() * 0.2,
            transparent: true,
            opacity: 0.6 + Math.random() * 0.4,
        });
        const mesh = new THREE.Mesh(geometry, material);
        // Position behind and around hangman figure
        mesh.position.set(
            position.x + (Math.random() - 0.5) * 3,
            position.y + Math.random() * 4,
            position.z - 0.5 - Math.random() * 1.5 // Behind the figure
        );
        this.scene.add(mesh);
        // Gentle upward velocity with slight drift
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            0.3 + Math.random() * 0.5,
            (Math.random() - 0.5) * 0.2
        );
        this.ambientParticles.push({
            mesh,
            velocity,
            birthTime: Date.now(),
            lifetime: 3000 + Math.random() * 2000, // 3-5 seconds
            initialScale: 1,
        });
    }
    /**
     * Clear all active particles immediately.
     * 
     * Removes all particle meshes from the scene and disposes of their resources.
     * Use this when resetting the game or switching scenes.
     * 
     * @returns {void}
     * 
     * @example
     * ```typescript
     * // Clear all particles
     * particles.clear();
     * ```
     */
    clear(): void {
        this.particles.forEach(p => {
            this.scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            (p.mesh.material as THREE.Material).dispose();
        });
        this.particles = [];
        // Also clear ambient particles
        this.ambientParticles.forEach(p => {
            this.scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            (p.mesh.material as THREE.Material).dispose();
        });
        this.ambientParticles = [];
    }
    /**
     * Update particle positions and remove expired ones.
     * Call this from the game's animation loop.
     * 
     * @param {number} deltaTime - Time elapsed since last frame in seconds
     * @param {THREE.Vector3} [hangmanPosition] - Optional position for continuous ambient particle emission
     * @returns {void}
     * 
     * @example
     * ```typescript
     * function animate() {
     *   const delta = clock.getDelta();
     *   particles.update(delta, hangmanPosition);
     * }
     * ```
     */
    update(deltaTime: number, hangmanPosition?: THREE.Vector3): void {
        const now = Date.now();
        const toRemove: number[] = [];
        // Update regular particles
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
        // Update ambient particles
        const ambientToRemove: number[] = [];
        this.ambientParticles.forEach((particle, index) => {
            const age = now - particle.birthTime;
            const lifePercent = age / particle.lifetime;
            if (lifePercent >= 1) {
                ambientToRemove.push(index);
                return;
            }
            // Gentle upward movement (no gravity for ambient particles)
            particle.mesh.position.add(
                particle.velocity.clone().multiplyScalar(deltaTime)
            );
            // Pulsing glow effect
            const pulse = Math.sin(age * 0.005) * 0.3 + 0.7;
            const material = particle.mesh.material as THREE.MeshStandardMaterial;
            material.emissiveIntensity = pulse * (0.8 + Math.random() * 0.2);
            // Fade out in the last 30% of life
            if (lifePercent > 0.7) {
                material.opacity = (1 - lifePercent) / 0.3 * 0.8;
                const scale = particle.initialScale * (1 - (lifePercent - 0.7) / 0.3);
                particle.mesh.scale.setScalar(scale);
            }
        });
        // Remove expired ambient particles
        ambientToRemove.reverse().forEach(index => {
            const particle = this.ambientParticles[index];
            this.scene.remove(particle.mesh);
            particle.mesh.geometry.dispose();
            (particle.mesh.material as THREE.Material).dispose();
            this.ambientParticles.splice(index, 1);
        });
        // Continuously emit new ambient particles if we have a hangman position
        if (hangmanPosition) {
            this.ambientEmitTimer += deltaTime;
            // Emit new particle every ~150ms (6-7 particles per second)
            if (this.ambientEmitTimer > 0.15) {
                this.emitAmbientParticle(hangmanPosition);
                this.ambientEmitTimer = 0;
            }
        }
    }
    /**
     * Get count of active particles.
     * 
     * @returns {number} Number of active particles currently being animated
     * 
     * @example
     * ```typescript
     * const count = particles.getActiveCount();
     * console.log(`Active particles: ${count}`);
     * ```
     */
    getActiveCount(): number {
        return this.particles.length;
    }
    /**
     * Check if any particles are active.
     * 
     * @returns {boolean} True if there are active particles, false otherwise
     * 
     * @example
     * ```typescript
     * if (particles.hasActiveParticles()) {
     *   console.log('Particles are animating...');
     * }
     * ```
     */
    hasActiveParticles(): boolean {
        return this.particles.length > 0;
    }
}
