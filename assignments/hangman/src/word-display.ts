/**
 * 3D Word display for Hangman game
 */

import * as THREE from 'three';
import type { Round } from './types';
import { WORD_DISPLAY_CONFIG } from './config';

export class WordDisplay {
  private group: THREE.Group;
  private letterMeshes: THREE.Mesh[];
  private pedestalMeshes: THREE.Mesh[];
  private currentWord: string;

  constructor() {
    this.group = new THREE.Group();
    this.letterMeshes = [];
    this.pedestalMeshes = [];
    this.currentWord = '';
  }

  setWord(word: string): void {
    this.clearWord();
    this.currentWord = word.toUpperCase();
    
    const letterWidth = 1;
    const spacing = 0.3;
    const totalWidth = this.currentWord.length * letterWidth + (this.currentWord.length - 1) * spacing;
    const startX = -totalWidth / 2 + letterWidth / 2;
    
    this.currentWord.split('').forEach((letter, index) => {
      // Create pedestal
      const pedestalGeometry = new THREE.BoxGeometry(letterWidth, 0.2, 0.8);
      const pedestalMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b4513,
        roughness: 0.8,
        metalness: 0.1,
      });
      const pedestal = new THREE.Mesh(pedestalGeometry, pedestalMaterial);
      pedestal.position.set(startX + index * (letterWidth + spacing), -1, 0);
      pedestal.castShadow = true;
      pedestal.receiveShadow = true;
      this.pedestalMeshes.push(pedestal);
      this.group.add(pedestal);
      
      // Create letter mesh (hidden initially)
      const letterMesh = this.createLetterMesh(letter);
      letterMesh.position.set(startX + index * (letterWidth + spacing), -0.5, 0);
      letterMesh.scale.set(0, 0, 0);
      letterMesh.castShadow = true;
      this.letterMeshes.push(letterMesh);
      this.group.add(letterMesh);
    });
  }

  private createLetterMesh(letter: string): THREE.Mesh {
    // Create canvas texture for letter
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 100px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter, 64, 64);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.1);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.5,
      metalness: 0.1,
    });
    
    return new THREE.Mesh(geometry, material);
  }

  updateDisplay(round: Round): void {
    const wordLetters = round.word.split('');
    
    wordLetters.forEach((letter, index) => {
      if (round.revealedLetters.has(letter) && index < this.letterMeshes.length) {
        this.revealLetter(index);
      }
    });
  }

  private revealLetter(index: number): void {
    const mesh = this.letterMeshes[index];
    if (!mesh || mesh.scale.x > 0) return;
    
    const duration = 300;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Bounce effect
      const bounce = Math.sin(progress * Math.PI) * 0.2;
      const scale = progress * (1 + bounce);
      
      mesh.scale.set(scale, scale, scale);
      mesh.position.y = -0.5 + bounce * 0.5;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        mesh.scale.set(1, 1, 1);
        mesh.position.y = -0.5;
      }
    };
    
    requestAnimationFrame(animate);
  }

  private clearWord(): void {
    this.letterMeshes.forEach(mesh => this.group.remove(mesh));
    this.pedestalMeshes.forEach(mesh => this.group.remove(mesh));
    this.letterMeshes = [];
    this.pedestalMeshes = [];
    this.currentWord = '';
  }

  getMesh(): THREE.Group {
    return this.group;
  }

  setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  showFullWord(): void {
    this.letterMeshes.forEach((mesh, index) => {
      if (mesh.scale.x === 0) {
        this.revealLetter(index);
      }
    });
  }
}
