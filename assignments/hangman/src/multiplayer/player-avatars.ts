/**
 * Player avatars/indicators in the 3D scene
 * Shows player information, turn status, and scores
 */

import * as THREE from 'three';
import type { PlayerInfo, MultiplayerRound } from './types';

export interface PlayerAvatarConfig {
  position: THREE.Vector3;
  playerInfo: PlayerInfo;
  isCurrentTurn: boolean;
}

export class PlayerAvatars {
  private group: THREE.Group;
  private avatars: Map<string, PlayerAvatar> = new Map();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'player-avatars';
    scene.add(this.group);
  }

  /**
   * Update the list of player avatars
   */
  updatePlayers(players: PlayerInfo[], currentTurnPlayerId: string | null): void {
    // Remove avatars for players no longer in the list
    const currentPlayerIds = new Set(players.map(p => p.id));
    this.avatars.forEach((avatar, playerId) => {
      if (!currentPlayerIds.has(playerId)) {
        avatar.dispose();
        this.avatars.delete(playerId);
      }
    });

    // Calculate positions in a circle
    const radius = 4;
    const totalPlayers = players.length;

    players.forEach((player, index) => {
      const angle = (index / totalPlayers) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      let avatar = this.avatars.get(player.id);
      if (!avatar) {
        avatar = new PlayerAvatar(this.group, player);
        this.avatars.set(player.id, avatar);
      }

      avatar.setPosition(x, 1.5, z);
      avatar.setTurnActive(player.id === currentTurnPlayerId);
      avatar.updateScore(player.score);
      avatar.setConnectionStatus(player.isConnected);
    });
  }

  /**
   * Highlight the current player's turn
   */
  setCurrentTurn(playerId: string): void {
    this.avatars.forEach((avatar, id) => {
      avatar.setTurnActive(id === playerId);
    });
  }

  /**
   * Show a guess animation for a player
   */
  showGuessAnimation(playerId: string, isCorrect: boolean): void {
    const avatar = this.avatars.get(playerId);
    if (avatar) {
      avatar.playGuessAnimation(isCorrect);
    }
  }

  /**
   * Clear all avatars
   */
  clear(): void {
    this.avatars.forEach(avatar => avatar.dispose());
    this.avatars.clear();
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.clear();
    this.scene.remove(this.group);
  }
}

/**
 * Individual player avatar with name, score, and turn indicator
 */
class PlayerAvatar {
  private container: THREE.Group;
  private parent: THREE.Group;
  private playerInfo: PlayerInfo;
  private nameSprite: THREE.Sprite;
  private scoreSprite: THREE.Sprite;
  private avatarMesh: THREE.Mesh;
  private turnRing: THREE.Mesh;
  private turnGlow: THREE.Mesh;
  private pulseAnimation: { active: boolean; time: number } = { active: false, time: 0 };
  private guessAnimation: { active: boolean; time: number; isCorrect: boolean } = { active: false, time: 0, isCorrect: false };

  constructor(parent: THREE.Group, playerInfo: PlayerInfo) {
    this.parent = parent;
    this.playerInfo = playerInfo;
    this.container = new THREE.Group();
    this.container.name = `avatar-${playerInfo.id}`;
    parent.add(this.container);

    // Create avatar body (colored sphere)
    const color = new THREE.Color(playerInfo.color);
    const avatarGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const avatarMaterial = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3,
      metalness: 0.2,
      emissive: color,
      emissiveIntensity: 0.2,
    });
    this.avatarMesh = new THREE.Mesh(avatarGeometry, avatarMaterial);
    this.avatarMesh.castShadow = true;
    this.container.add(this.avatarMesh);

    // Create name label
    const nameCanvas = this.createTextCanvas(playerInfo.name, '#ffffff', 24);
    const nameTexture = new THREE.CanvasTexture(nameCanvas);
    const nameMaterial = new THREE.SpriteMaterial({
      map: nameTexture,
      transparent: true,
    });
    this.nameSprite = new THREE.Sprite(nameMaterial);
    this.nameSprite.scale.set(1.5, 0.4, 1);
    this.nameSprite.position.y = 0.6;
    this.container.add(this.nameSprite);

    // Create score label
    const scoreCanvas = this.createTextCanvas(`Score: ${playerInfo.score}`, '#4ecdc4', 18);
    const scoreTexture = new THREE.CanvasTexture(scoreCanvas);
    const scoreMaterial = new THREE.SpriteMaterial({
      map: scoreTexture,
      transparent: true,
    });
    this.scoreSprite = new THREE.Sprite(scoreMaterial);
    this.scoreSprite.scale.set(1.2, 0.3, 1);
    this.scoreSprite.position.y = -0.5;
    this.container.add(this.scoreSprite);

    // Create turn indicator ring
    const ringGeometry = new THREE.TorusGeometry(0.4, 0.05, 8, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x4ecdc4,
      transparent: true,
      opacity: 0,
    });
    this.turnRing = new THREE.Mesh(ringGeometry, ringMaterial);
    this.turnRing.rotation.x = Math.PI / 2;
    this.turnRing.position.y = 0;
    this.container.add(this.turnRing);

    // Create glow effect for active turn
    const glowGeometry = new THREE.SphereGeometry(0.45, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x4ecdc4,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
    });
    this.turnGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.container.add(this.turnGlow);
  }

  private createTextCanvas(text: string, color: string, fontSize: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;

    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.roundRect(0, 0, canvas.width, canvas.height, 10);
    context.fill();

    context.font = `bold ${fontSize}px Arial, sans-serif`;
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    return canvas;
  }

  setPosition(x: number, y: number, z: number): void {
    this.container.position.set(x, y, z);
  }

  setTurnActive(isActive: boolean): void {
    this.pulseAnimation.active = isActive;
    this.pulseAnimation.time = 0;

    const ringMaterial = this.turnRing.material as THREE.MeshBasicMaterial;
    const glowMaterial = this.turnGlow.material as THREE.MeshBasicMaterial;

    if (isActive) {
      ringMaterial.opacity = 1;
      glowMaterial.opacity = 0.3;
    } else {
      ringMaterial.opacity = 0;
      glowMaterial.opacity = 0;
    }
  }

  updateScore(score: number): void {
    const scoreCanvas = this.createTextCanvas(`Score: ${score}`, '#4ecdc4', 18);
    const scoreTexture = new THREE.CanvasTexture(scoreCanvas);
    (this.scoreSprite.material as THREE.SpriteMaterial).map = scoreTexture;
    this.scoreSprite.material.needsUpdate = true;
  }

  setConnectionStatus(isConnected: boolean): void {
    const material = this.avatarMesh.material as THREE.MeshStandardMaterial;
    material.opacity = isConnected ? 1 : 0.5;
    material.transparent = !isConnected;
  }

  playGuessAnimation(isCorrect: boolean): void {
    this.guessAnimation.active = true;
    this.guessAnimation.time = 0;
    this.guessAnimation.isCorrect = isCorrect;
  }

  /**
   * Update animation frame - call this from the game loop
   */
  update(deltaTime: number): void {
    // Pulse animation for active turn
    if (this.pulseAnimation.active) {
      this.pulseAnimation.time += deltaTime * 3;
      const scale = 1 + Math.sin(this.pulseAnimation.time) * 0.1;
      this.avatarMesh.scale.set(scale, scale, scale);

      // Rotate the ring
      this.turnRing.rotation.z += deltaTime * 2;

      // Pulse the glow
      const glowMaterial = this.turnGlow.material as THREE.MeshBasicMaterial;
      glowMaterial.opacity = 0.2 + Math.sin(this.pulseAnimation.time * 2) * 0.1;
    } else {
      this.avatarMesh.scale.set(1, 1, 1);
    }

    // Guess animation
    if (this.guessAnimation.active) {
      this.guessAnimation.time += deltaTime;

      // Color flash
      const material = this.avatarMesh.material as THREE.MeshStandardMaterial;
      const flashColor = this.guessAnimation.isCorrect ? 0x4ecdc4 : 0xff6b6b;
      const flashIntensity = Math.max(0, 1 - this.guessAnimation.time * 2);
      material.emissive.setHex(this.guessAnimation.isCorrect ? 0x4ecdc4 : 0xff6b6b);
      material.emissiveIntensity = flashIntensity;

      // Bounce effect
      const bounce = Math.sin(this.guessAnimation.time * 10) * Math.max(0, 0.2 - this.guessAnimation.time * 0.1);
      this.container.position.y = 1.5 + bounce;

      // End animation
      if (this.guessAnimation.time > 1) {
        this.guessAnimation.active = false;
        material.emissive.setHex(this.playerInfo.color);
        material.emissiveIntensity = 0.2;
        this.container.position.y = 1.5;
      }
    }
  }

  dispose(): void {
    // Dispose geometries and materials
    this.avatarMesh.geometry.dispose();
    (this.avatarMesh.material as THREE.Material).dispose();
    this.nameSprite.geometry.dispose();
    (this.nameSprite.material as THREE.Material).dispose();
    this.scoreSprite.geometry.dispose();
    (this.scoreSprite.material as THREE.Material).dispose();
    this.turnRing.geometry.dispose();
    (this.turnRing.material as THREE.Material).dispose();
    this.turnGlow.geometry.dispose();
    (this.turnGlow.material as THREE.Material).dispose();

    this.parent.remove(this.container);
  }
}
