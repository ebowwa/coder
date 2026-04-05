/**
 * 3D Letter tiles for Hangman game
 */

import * as THREE from 'three';
import type { LetterTile, LetterStatus } from './types';
import { LETTER_TILES_CONFIG } from './config';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export class LetterTiles {
  private group: THREE.Group;
  private tiles: Map<string, LetterTile>;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.PerspectiveCamera;
  private hoveredTile: LetterTile | null = null;
  private onTileClick: ((letter: string) => void) | null = null;

  constructor(camera: THREE.PerspectiveCamera) {
    this.group = new THREE.Group();
    this.tiles = new Map();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.camera = camera;
    
    this.createTiles();
    this.setupMouseEvents();
  }

  private createTiles(): void {
    const { tileWidth, tileHeight, spacing, tilesPerRow, tileDepth, arcDepth, startY } = LETTER_TILES_CONFIG;

    const totalWidth = tilesPerRow * tileWidth + (tilesPerRow - 1) * spacing;
    const startX = -totalWidth / 2 + tileWidth / 2;
    
    ALPHABET.split('').forEach((letter, index) => {
      const row = Math.floor(index / tilesPerRow);
      const col = index % tilesPerRow;
      
      // Create tile geometry
      const geometry = new THREE.BoxGeometry(tileWidth, tileHeight, LETTER_TILES_CONFIG.tileDepth);
      
      // Create material with letter texture
      const material = new THREE.MeshStandardMaterial({
        color: LETTER_TILES_CONFIG.defaultColor,
        roughness: 0.3,
        metalness: 0.1,
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // Position tile in arc
      const x = startX + col * (tileWidth + spacing);
      const z = Math.sin(col / tilesPerRow * Math.PI) * LETTER_TILES_CONFIG.arcDepth;
      const y = LETTER_TILES_CONFIG.startY - row * (tileHeight + spacing);
      
      mesh.position.set(x, y, z);
      mesh.rotation.x = -0.1;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      // Add letter as user data
      mesh.userData.letter = letter;
      
      const tile: LetterTile = {
        letter,
        status: 'unused',
        mesh,
      };
      
      this.tiles.set(letter, tile);
      this.group.add(mesh);
      
      // Create letter text on tile
      this.addLetterToTile(mesh, letter);
    });
  }

  private addLetterToTile(mesh: THREE.Mesh, letter: string): void {
    // Create a simple canvas texture for the letter
    const canvas = document.createElement('canvas');
    canvas.width = LETTER_TILES_CONFIG.canvas.width;
    canvas.height = LETTER_TILES_CONFIG.canvas.height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = LETTER_TILES_CONFIG.canvas.backgroundColor;
      ctx.fillRect(0, 0, LETTER_TILES_CONFIG.canvas.width, LETTER_TILES_CONFIG.canvas.height);
      ctx.fillStyle = LETTER_TILES_CONFIG.canvas.textColor;
      ctx.font = `bold ${LETTER_TILES_CONFIG.canvas.fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter, LETTER_TILES_CONFIG.canvas.width / 2, LETTER_TILES_CONFIG.canvas.height / 2);
      
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.5,
      });
      
      // Add letter face
      const letterGeometry = new THREE.PlaneGeometry(LETTER_TILES_CONFIG.letterFaceSize, LETTER_TILES_CONFIG.letterFaceSize);
      const letterMesh = new THREE.Mesh(letterGeometry, material);
      letterMesh.position.z = LETTER_TILES_CONFIG.tileDepth / 2 + 0.01;
      mesh.add(letterMesh);
    }
  }

  private setupMouseEvents(): void {
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('click', this.onClick.bind(this));
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    this.checkHover();
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const meshes = Array.from(this.tiles.values())
      .filter(t => t.status === 'unused')
      .map(t => t.mesh);
    
    const intersects = this.raycaster.intersectObjects(meshes as THREE.Object3D[]);
    
    // Reset previous hover
    if (this.hoveredTile) {
      const mat = this.hoveredTile.mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(0x000000);
      this.hoveredTile.mesh.scale.set(1, 1, 1);
    }
    
    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const letter = mesh.userData.letter;
      const tile = this.tiles.get(letter);
      
      if (tile && tile.status === 'unused') {
        this.hoveredTile = tile;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(LETTER_TILES_CONFIG.hoverEmissive);
        mesh.scale.set(LETTER_TILES_CONFIG.hoverScale, LETTER_TILES_CONFIG.hoverScale, LETTER_TILES_CONFIG.hoverScale);
      }
    } else {
      this.hoveredTile = null;
    }
  }

  private onClick(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const meshes = Array.from(this.tiles.values())
      .filter(t => t.status === 'unused')
      .map(t => t.mesh);
    
    const intersects = this.raycaster.intersectObjects(meshes as THREE.Object3D[], true);
    
    if (intersects.length > 0) {
      let mesh = intersects[0].object as THREE.Mesh;
      
      // Check if we clicked on a child mesh (letter face)
      if (!mesh.userData.letter && mesh.parent) {
        mesh = mesh.parent as THREE.Mesh;
      }
      
      const letter = mesh.userData.letter;
      if (letter && this.onTileClick) {
        this.onTileClick(letter);
      }
    }
  }

  setTileClickHandler(handler: (letter: string) => void): void {
    this.onTileClick = handler;
  }

  setTileStatus(letter: string, status: LetterStatus): void {
    const tile = this.tiles.get(letter.toUpperCase());
    if (!tile) return;
    
    tile.status = status;
    const mat = tile.mesh.material as THREE.MeshStandardMaterial;
    
    if (status === 'correct') {
      mat.color.setHex(LETTER_TILES_CONFIG.correctColor);
      mat.emissive.setHex(0x000000);
    } else if (status === 'wrong') {
      mat.color.setHex(LETTER_TILES_CONFIG.wrongColor);
      mat.emissive.setHex(0x000000);
    }
    
    // Animate tile sinking
    this.animateTileDown(tile);
  }

  private animateTileDown(tile: LetterTile): void {
    const startY = tile.mesh.position.y;
    const endY = startY - LETTER_TILES_CONFIG.animation.sinkAmount;
    const duration = LETTER_TILES_CONFIG.animation.duration;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      tile.mesh.position.y = startY + (endY - startY) * progress;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  reset(): void {
    this.tiles.forEach(tile => {
      tile.status = 'unused';
      const mat = tile.mesh.material as THREE.MeshStandardMaterial;
      mat.color.setHex(LETTER_TILES_CONFIG.defaultColor);
      mat.emissive.setHex(0x000000);
      tile.mesh.scale.set(1, 1, 1);
    });
  }

  getMesh(): THREE.Group {
    return this.group;
  }

  setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  dispose(): void {
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    window.removeEventListener('click', this.onClick.bind(this));
  }
}
