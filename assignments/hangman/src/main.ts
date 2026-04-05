/**
 * Main entry point for Hangman 3D game
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LetterTiles } from './letter-tiles';
import { WordDisplay } from './word-display';
import { PredictionUI } from './prediction-ui';
import { getRandomWord } from './words';
import type { Round, GameState, WordResponse } from './types';
import {
  API_CONFIG,
  GAME_CONFIG,
  SCENE_CONFIG,
  HANGMAN_CONFIG,
  UI_CONFIG,
} from './config';

class HangmanGame {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private letterTiles: LetterTiles;
  private wordDisplay: WordDisplay;
  private predictionUI: PredictionUI;
  private gameState: GameState;
  private hangmanGroup: THREE.Group;
  private bodyParts: THREE.Mesh[] = [];
  
  constructor() {
    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SCENE_CONFIG.backgroundColor);
    
    // Setup camera
    this.camera = new THREE.PerspectiveCamera(
      SCENE_CONFIG.camera.fov,
      window.innerWidth / window.innerHeight,
      SCENE_CONFIG.camera.near,
      SCENE_CONFIG.camera.far
    );
    this.camera.position.set(
      SCENE_CONFIG.camera.position.x,
      SCENE_CONFIG.camera.position.y,
      SCENE_CONFIG.camera.position.z
    );
    
    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);
    
    // Setup controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = SCENE_CONFIG.controls.dampingFactor;
    this.controls.maxDistance = SCENE_CONFIG.controls.maxDistance;
    this.controls.minDistance = SCENE_CONFIG.controls.minDistance;
    
    // Setup lighting
    this.setupLighting();
    
    // Initialize game components
    this.letterTiles = new LetterTiles(this.camera);
    this.letterTiles.setPosition(0, 0, 0);
    this.scene.add(this.letterTiles.getMesh());
    
    this.wordDisplay = new WordDisplay();
    this.wordDisplay.setPosition(0, 2, 0);
    this.scene.add(this.wordDisplay.getMesh());
    
    this.hangmanGroup = new THREE.Group();
    this.hangmanGroup.position.set(
      UI_CONFIG.hangmanPosition.x,
      UI_CONFIG.hangmanPosition.y,
      UI_CONFIG.hangmanPosition.z
    );
    this.scene.add(this.hangmanGroup);
    
    this.createHangmanFigure();
    
    // Initialize prediction UI
    const gameContainer = document.createElement('div');
    gameContainer.id = 'game-container';
    document.body.appendChild(gameContainer);
    this.predictionUI = new PredictionUI(gameContainer);
    
    // Initialize game state
    this.gameState = {
      currentRound: null,
      score: {
        totalScore: 0,
        roundScores: [],
        currentStreak: 0,
        bestStreak: 0,
        roundsWon: 0,
        roundsPlayed: 0,
      },
      livesRemaining: GAME_CONFIG.maxWrongGuesses,
      maxLives: GAME_CONFIG.maxWrongGuesses,
      isGameOver: false,
      difficulty: 1,
    };
    
    // Setup event handlers
    this.letterTiles.setTileClickHandler(this.handleLetterClick.bind(this));
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Start the game
    this.startNewRound();
    
    // Start animation loop
    this.animate();
  }
  
  private setupLighting(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, SCENE_CONFIG.lighting.ambientIntensity);
    this.scene.add(ambientLight);

    // Main directional light
    const mainLight = new THREE.DirectionalLight(0xffffff, SCENE_CONFIG.lighting.directionalIntensity);
    mainLight.position.set(
      SCENE_CONFIG.lighting.mainLightPosition.x,
      SCENE_CONFIG.lighting.mainLightPosition.y,
      SCENE_CONFIG.lighting.mainLightPosition.z
    );
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = SCENE_CONFIG.lighting.shadowMapSize;
    mainLight.shadow.mapSize.height = SCENE_CONFIG.lighting.shadowMapSize;
    this.scene.add(mainLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(
      SCENE_CONFIG.lighting.fillLightColor,
      SCENE_CONFIG.lighting.fillLightIntensity
    );
    fillLight.position.set(
      SCENE_CONFIG.lighting.fillLightPosition.x,
      SCENE_CONFIG.lighting.fillLightPosition.y,
      SCENE_CONFIG.lighting.fillLightPosition.z
    );
    this.scene.add(fillLight);
  }
  
  private createHangmanFigure(): void {
    // Gallows
    const gallowsMaterial = new THREE.MeshStandardMaterial({
      color: HANGMAN_CONFIG.materialColor,
      roughness: 0.8,
    });
    
    // Base
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(
        HANGMAN_CONFIG.base.width,
        HANGMAN_CONFIG.base.height,
        HANGMAN_CONFIG.base.depth
      ),
      gallowsMaterial
    );
    base.position.y = HANGMAN_CONFIG.baseY;
    base.castShadow = true;
    this.hangmanGroup.add(base);
    
    // Vertical pole
    const pole = new THREE.Mesh(
      new THREE.BoxGeometry(
        HANGMAN_CONFIG.pole.width,
        HANGMAN_CONFIG.pole.height,
        HANGMAN_CONFIG.pole.depth
      ),
      gallowsMaterial
    );
    pole.position.set(
      HANGMAN_CONFIG.pole.positionX,
      HANGMAN_CONFIG.pole.positionY,
      0
    );
    pole.castShadow = true;
    this.hangmanGroup.add(pole);
    
    // Horizontal beam
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(
        HANGMAN_CONFIG.beamLength,
        HANGMAN_CONFIG.beam.height,
        HANGMAN_CONFIG.beam.depth
      ),
      gallowsMaterial
    );
    beam.position.set(
      1,
      HANGMAN_CONFIG.beam.positionY,
      0
    );
    beam.castShadow = true;
    this.hangmanGroup.add(beam);
    
    // Rope
    const rope = new THREE.Mesh(
      new THREE.CylinderGeometry(
        HANGMAN_CONFIG.rope.radius,
        HANGMAN_CONFIG.rope.radius,
        HANGMAN_CONFIG.ropeLength,
        HANGMAN_CONFIG.rope.segments
      ),
      new THREE.MeshStandardMaterial({ color: HANGMAN_CONFIG.ropeColor })
    );
    rope.position.set(
      HANGMAN_CONFIG.rope.positionX,
      HANGMAN_CONFIG.rope.positionY,
      0
    );
    this.hangmanGroup.add(rope);
    
    // Create body parts (hidden initially)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xffdbac,
      roughness: 0.6,
    });
    
    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 16),
      bodyMaterial
    );
    head.position.set(0.8, 1.8, 0);
    head.visible = false;
    head.castShadow = true;
    this.bodyParts.push(head);
    this.hangmanGroup.add(head);
    
    // Body
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 1, 8),
      bodyMaterial
    );
    body.position.set(0.8, 1.1, 0);
    body.visible = false;
    body.castShadow = true;
    this.bodyParts.push(body);
    this.hangmanGroup.add(body);
    
    // Left arm
    const leftArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8),
      bodyMaterial
    );
    leftArm.position.set(0.5, 1.3, 0);
    leftArm.rotation.z = Math.PI / 4;
    leftArm.visible = false;
    leftArm.castShadow = true;
    this.bodyParts.push(leftArm);
    this.hangmanGroup.add(leftArm);
    
    // Right arm
    const rightArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8),
      bodyMaterial
    );
    rightArm.position.set(1.1, 1.3, 0);
    rightArm.rotation.z = -Math.PI / 4;
    rightArm.visible = false;
    rightArm.castShadow = true;
    this.bodyParts.push(rightArm);
    this.hangmanGroup.add(rightArm);
    
    // Left leg
    const leftLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(
        HANGMAN_CONFIG.leg.radius,
        HANGMAN_CONFIG.leg.radius,
        HANGMAN_CONFIG.legLength,
        HANGMAN_CONFIG.leg.segments
      ),
      bodyMaterial
    );
    leftLeg.position.set(
      HANGMAN_CONFIG.leg.leftPositionX,
      HANGMAN_CONFIG.leg.positionY,
      0
    );
    leftLeg.rotation.z = HANGMAN_CONFIG.leg.rotationAngle;
    leftLeg.visible = false;
    leftLeg.castShadow = true;
    this.bodyParts.push(leftLeg);
    this.hangmanGroup.add(leftLeg);
    
    // Right leg
    const rightLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(
        HANGMAN_CONFIG.leg.radius,
        HANGMAN_CONFIG.leg.radius,
        HANGMAN_CONFIG.legLength,
        HANGMAN_CONFIG.leg.segments
      ),
      bodyMaterial
    );
    rightLeg.position.set(
      HANGMAN_CONFIG.leg.rightPositionX,
      HANGMAN_CONFIG.leg.positionY,
      0
    );
    rightLeg.rotation.z = -HANGMAN_CONFIG.leg.rotationAngle;
    rightLeg.visible = false;
    rightLeg.castShadow = true;
    this.bodyParts.push(rightLeg);
    this.hangmanGroup.add(rightLeg);
  }
  
  private async startNewRound(): Promise<void> {
    try {
      // Fetch word from API
      const url = `${API_CONFIG.baseUrl}/api/word?difficulty=${this.gameState.difficulty}`;
      const response = await fetch(url);
      const wordData: WordResponse = await response.json();
      
      // Initialize new round
      this.gameState.currentRound = {
        word: wordData.word.toUpperCase(),
        category: wordData.category,
        difficulty: wordData.difficulty,
        revealedLetters: new Set(),
        wrongGuesses: 0,
        guessedLetters: new Set(),
        isComplete: false,
        isWon: false,
      };
      
      // Reset UI
      this.wordDisplay.setWord(this.gameState.currentRound.word);
      this.letterTiles.reset();
      this.resetHangman();
      
    } catch (error) {
      console.error('Failed to fetch word:', error);
      // Fallback to local word database
      const fallbackWord = getRandomWord(this.gameState.difficulty);
      this.gameState.currentRound = {
        word: fallbackWord.word.toUpperCase(),
        category: fallbackWord.category,
        difficulty: fallbackWord.difficulty,
        revealedLetters: new Set(),
        wrongGuesses: 0,
        guessedLetters: new Set(),
        isComplete: false,
        isWon: false,
      };
      
      this.wordDisplay.setWord(this.gameState.currentRound.word);
      this.letterTiles.reset();
      this.resetHangman();
    }
  }
  
  private async handleLetterClick(letter: string): Promise<void> {
    const round = this.gameState.currentRound;
    if (!round || round.isComplete) return;
    if (round.guessedLetters.has(letter)) return;
    
    round.guessedLetters.add(letter);
    
    // Check if letter is in word
    if (round.word.includes(letter)) {
      // Correct guess
      round.revealedLetters.add(letter);
      this.wordDisplay.updateDisplay(round);
      this.letterTiles.setTileStatus(letter, 'correct');
      
      // Check for win
      const allRevealed = round.word.split('').every(l => round.revealedLetters.has(l));
      if (allRevealed) {
        round.isComplete = true;
        round.isWon = true;
        this.handleRoundComplete();
      }
    } else {
      // Wrong guess
      round.wrongGuesses++;
      this.letterTiles.setTileStatus(letter, 'wrong');
      this.revealBodyPart(round.wrongGuesses - 1);
      
      // Check for loss
      if (round.wrongGuesses >= GAME_CONFIG.maxWrongGuesses) {
        round.isComplete = true;
        round.isWon = false;
        this.handleRoundComplete();
      }
    }
  }
  
  private revealBodyPart(index: number): void {
    if (index >= 0 && index < this.bodyParts.length) {
      this.bodyParts[index].visible = true;
    }
  }
  
  private resetHangman(): void {
    this.bodyParts.forEach(part => {
      part.visible = false;
    });
  }
  
  private handleRoundComplete(): void {
    const round = this.gameState.currentRound;
    if (!round) return;
    
    this.gameState.score.roundsPlayed++;
    
    if (round.isWon) {
      this.gameState.score.roundsWon++;
      this.gameState.score.currentStreak++;
      this.gameState.score.bestStreak = Math.max(
        this.gameState.score.bestStreak,
        this.gameState.score.currentStreak
      );
      
      // Calculate score
      const baseScore = round.word.length * GAME_CONFIG.baseScoreMultiplier;
      const wrongPenalty = round.wrongGuesses * GAME_CONFIG.wrongGuessPenalty;
      const roundScore = Math.max(baseScore - wrongPenalty, GAME_CONFIG.minimumScore);
      this.gameState.score.roundScores.push(roundScore);
      this.gameState.score.totalScore += roundScore;
      
      // Show full word
      this.wordDisplay.showFullWord();
      
      // Increase difficulty every N wins
      if (this.gameState.score.roundsWon % GAME_CONFIG.difficultyIncrementWins === 0) {
        this.gameState.difficulty = Math.min(GAME_CONFIG.maxDifficulty, this.gameState.difficulty + 1);
      }
    } else {
      this.gameState.score.currentStreak = 0;
      this.gameState.score.roundScores.push(0);
      this.gameState.livesRemaining--;
      
      // Show full word on loss
      this.wordDisplay.showFullWord();
      
      if (this.gameState.livesRemaining <= 0) {
        this.gameState.isGameOver = true;
      }
    }
    
    // Start new round after delay
    setTimeout(() => {
      if (!this.gameState.isGameOver) {
        this.startNewRound();
      }
    }, GAME_CONFIG.roundDelayMs);
  }
  
  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// Start the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new HangmanGame();
});
