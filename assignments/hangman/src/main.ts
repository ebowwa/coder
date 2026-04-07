// Vision test April 6
// Hangman - Spelling Prediction Game
/**
 * Main entry point for Hangman 3D game
 * Supports both single-player and multiplayer modes
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LetterTiles } from './letter-tiles';
import { WordDisplay } from './word-display';
import { PredictionUI3D } from './prediction-ui-3d';
import { getRandomWord, getRandomWordByCategory } from './words';
import { soundEffects } from './sound-effects';
import { ParticleEffects } from './particle-effects';
import { CategoryUI } from './category-ui';
import type { Round, GameState, WordResponse } from './types';
import {
  API_CONFIG,
  GAME_CONFIG,
  SCENE_CONFIG,
  HANGMAN_CONFIG,
  UI_CONFIG,
} from './config';

// Multiplayer imports
import { MultiplayerSync } from './multiplayer/sync';
import { LobbyUI } from './multiplayer/lobby-ui';
import { PlayerAvatars } from './multiplayer/player-avatars';
import { TournamentUI } from './multiplayer/tournament-ui';
import type {
  MultiplayerRound,
  PlayerInfo,
  GameStartedPayload,
  LetterGuessedPayload,
  TurnChangedPayload,
  RoundCompletePayload,
} from './multiplayer/types';
import type { Tournament } from '../server/tournament';

type GameMode = 'single' | 'multiplayer' | 'none';

class HangmanGame {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private letterTiles: LetterTiles;
  private wordDisplay: WordDisplay;
  private predictionUI: PredictionUI3D;
  private gameState: GameState;
  private hangmanGroup: THREE.Group;
  private bodyParts: THREE.Mesh[] = [];
  private clock: THREE.Clock;
  private hintButton: HTMLButtonElement | null = null;
  private particleEffects: ParticleEffects;
  private categoryUI: CategoryUI | null = null;

  // Multiplayer state
  private gameMode: GameMode = 'none';
  private multiplayerSync: MultiplayerSync | null = null;
  private lobbyUI: LobbyUI | null = null;
  private playerAvatars: PlayerAvatars | null = null;
  private tournamentUI: TournamentUI | null = null;
  private multiplayerRound: MultiplayerRound | null = null;
  private players: PlayerInfo[] = [];
  private unsubscribers: (() => void)[] = [];

  constructor() {
    this.clock = new THREE.Clock();

    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    
    // Create gradient background
    this.createGradientBackground();

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

    // Initialize 3D prediction UI
    this.predictionUI = new PredictionUI3D(this.scene, this.camera);
    this.predictionUI.setPosition(0, 1, 5);

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
      hintsRemaining: GAME_CONFIG.hintsPerRound,
      maxHints: GAME_CONFIG.hintsPerRound,
      selectedCategory: null,
    };

    // Create hint button UI
    this.createHintButton();

    // Initialize particle effects
    this.particleEffects = new ParticleEffects(this.scene);

    // Start ambient glow behind hangman figure
    const hangmanPos = new THREE.Vector3(
      UI_CONFIG.hangmanPosition.x,
      UI_CONFIG.hangmanPosition.y,
      UI_CONFIG.hangmanPosition.z
    );
    this.particleEffects.startAmbientGlow(hangmanPos);

    // Setup event handlers
    this.letterTiles.setTileClickHandler(this.handleLetterClick.bind(this));

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Initialize multiplayer
    this.initializeMultiplayer();

    // Start animation loop
    this.animate();
  }

  private initializeMultiplayer(): void {
    // Create multiplayer sync client
    this.multiplayerSync = new MultiplayerSync();

    // Create player avatars
    this.playerAvatars = new PlayerAvatars(this.scene);

    // Create tournament UI (hidden by default)
    this.tournamentUI = new TournamentUI(this.scene, {
      position: { x: -8, y: 2, z: -5 },
      scale: 0.5,
    });
    this.tournamentUI.setVisible(false);

    // Create lobby UI
    this.lobbyUI = new LobbyUI(this.multiplayerSync, {
      onRoomCreated: (payload) => {
        console.log('Room created:', payload.roomCode);
      },
      onRoomJoined: (payload) => {
        console.log('Joined room:', payload.roomCode);
      },
      onGameStarted: (payload) => {
        this.startMultiplayerGame(payload);
      },
      onLeaveRoom: () => {
        this.cleanupMultiplayerGame();
      },
    });

    // Subscribe to multiplayer events
    this.setupMultiplayerEvents();

    // Listen for single player start
    document.addEventListener('start-single-player', () => {
      this.startSinglePlayerGame();
    });
  }

  private setupMultiplayerEvents(): void {
    if (!this.multiplayerSync) return;

    const unsub1 = this.multiplayerSync.on('game-started', (msg) => {
      const payload = msg.payload as GameStartedPayload;
      this.startMultiplayerGame(payload);
    });

    const unsub2 = this.multiplayerSync.on('letter-guessed', (msg) => {
      const payload = msg.payload as LetterGuessedPayload;
      this.handleMultiplayerLetterGuessed(payload);
    });

    const unsub3 = this.multiplayerSync.on('turn-changed', (msg) => {
      const payload = msg.payload as TurnChangedPayload;
      this.handleTurnChanged(payload);
    });

    const unsub4 = this.multiplayerSync.on('round-complete', (msg) => {
      const payload = msg.payload as RoundCompletePayload;
      this.handleMultiplayerRoundComplete(payload);
    });

    this.unsubscribers.push(unsub1, unsub2, unsub3, unsub4);
  }

  private startSinglePlayerGame(): void {
    this.lobbyUI?.hide();
    
    // Show category picker first
    if (!this.categoryUI) {
      this.categoryUI = new CategoryUI({
        onCategorySelected: (category) => {
          this.gameMode = 'single';
          this.gameState.selectedCategory = category;
          this.startNewRound();
        },
        onCancel: () => {
          this.lobbyUI?.show();
        },
      });
    }
    this.categoryUI.show();
  }

  private startMultiplayerGame(payload: GameStartedPayload): void {
    this.gameMode = 'multiplayer';
    this.multiplayerRound = payload.round;
    this.players = payload.players;

    this.lobbyUI?.hide();

    // Update player avatars
    this.playerAvatars?.updatePlayers(this.players, payload.round.currentGuesserId);

    // Setup the round display
    this.setupMultiplayerRound(payload.round);
  }

  private setupMultiplayerRound(round: MultiplayerRound): void {
    // Convert multiplayer round to local round format for display
    this.gameState.currentRound = {
      word: round.word,
      category: round.category,
      difficulty: round.difficulty,
      revealedLetters: new Set(round.revealedLetters),
      wrongGuesses: round.wrongGuesses,
      guessedLetters: new Set(round.guessedLetters),
      isComplete: round.isComplete,
      isWon: round.isWon,
    };

    // Reset UI
    this.wordDisplay.setWord(round.word);
    this.letterTiles.reset();
    this.resetHangman();

    // Re-apply already guessed letters
    round.guessedLetters.forEach(letter => {
      const isCorrect = round.revealedLetters.includes(letter);
      this.letterTiles.setTileStatus(letter, isCorrect ? 'correct' : 'wrong');
    });

    // Update word display with revealed letters
    const revealedSet = new Set(round.revealedLetters);
    this.wordDisplay.updateDisplay({
      ...this.gameState.currentRound,
      revealedLetters: revealedSet,
      guessedLetters: new Set(round.guessedLetters),
    });

    // Update hangman figure
    for (let i = 0; i < round.wrongGuesses; i++) {
      this.revealBodyPart(i);
    }

    // Show turn indicator
    this.updateTurnIndicator();
  }

  private updateTurnIndicator(): void {
    if (!this.multiplayerSync || this.gameMode !== 'multiplayer') return;

    const isMyTurn = this.multiplayerSync.isMyTurn();
    const state = this.multiplayerSync.getState();

    // Update UI to show whose turn it is
    if (isMyTurn) {
      this.predictionUI.showMessage('Your turn! Guess a letter.', '#4ecdc4');
    } else {
      const currentPlayer = this.players.find(p => p.id === state.roomState?.currentRound?.currentGuesserId);
      this.predictionUI.showMessage(`${currentPlayer?.name || 'Someone'}'s turn...`, '#ffe66d');
    }
  }

  private handleMultiplayerLetterGuessed(payload: LetterGuessedPayload): void {
    if (!this.multiplayerRound || !this.gameState.currentRound) return;

    // Update the multiplayer round state
    this.multiplayerRound.guessedLetters.push(payload.letter);
    this.multiplayerRound.wrongGuesses = payload.wrongGuesses;
    this.multiplayerRound.revealedLetters = payload.revealedLetters;

    // Update local round state
    this.gameState.currentRound.guessedLetters.add(payload.letter);
    this.gameState.currentRound.wrongGuesses = payload.wrongGuesses;
    payload.revealedLetters.forEach(l => this.gameState.currentRound!.revealedLetters.add(l));

    // Update letter tiles
    this.letterTiles.setTileStatus(payload.letter, payload.isCorrect ? 'correct' : 'wrong');

    // Update word display
    this.wordDisplay.updateDisplay(this.gameState.currentRound);

    // Update hangman
    if (!payload.isCorrect) {
      this.revealBodyPart(payload.wrongGuesses - 1);
    }

    // Show animation on avatar
    this.playerAvatars?.showGuessAnimation(payload.playerId, payload.isCorrect);

    // Show message
    const message = payload.isCorrect
      ? `${payload.playerName} guessed "${payload.letter}" - Correct!`
      : `${payload.playerName} guessed "${payload.letter}" - Wrong!`;
    this.predictionUI.showMessage(message, payload.isCorrect ? '#4ecdc4' : '#ff6b6b');
  }

  private handleTurnChanged(payload: TurnChangedPayload): void {
    if (!this.multiplayerRound) return;

    // Update current guesser
    this.multiplayerRound.currentGuesserId = payload.currentTurnPlayerId;

    // Update player avatars
    this.playerAvatars?.setCurrentTurn(payload.currentTurnPlayerId);

    // Update turn indicator
    this.updateTurnIndicator();
  }

  private handleMultiplayerRoundComplete(payload: RoundCompletePayload): void {
    if (!this.multiplayerRound || !this.gameState.currentRound) return;

    this.multiplayerRound.isComplete = true;
    this.multiplayerRound.isWon = payload.isWon;
    this.gameState.currentRound.isComplete = true;
    this.gameState.currentRound.isWon = payload.isWon;

    // Show full word
    this.wordDisplay.showFullWord();

    // Show result message
    const message = payload.isWon
      ? 'Round complete! The word was guessed!'
      : `Round over! The word was: ${payload.word}`;
    this.predictionUI.showMessage(message, payload.isWon ? '#4ecdc4' : '#ff6b6b');

    // Update player scores in avatars
    payload.playerScores.forEach(({ playerId, score }) => {
      const player = this.players.find(p => p.id === playerId);
      if (player) {
        player.score = score;
      }
    });
    this.playerAvatars?.updatePlayers(this.players, null);
  }

  private cleanupMultiplayerGame(): void {
    this.gameMode = 'none';
    this.multiplayerRound = null;
    this.players = [];
    this.playerAvatars?.clear();
    this.lobbyUI?.show();
  }

  /**
   * Show the tournament bracket UI
   */
  showTournamentBracket(tournament: Tournament): void {
    if (!this.tournamentUI) {
      this.tournamentUI = new TournamentUI(this.scene, {
        position: { x: -8, y: 2, z: -5 },
        scale: 0.5,
      });
    }
    this.tournamentUI.updateTournament(tournament);
    this.tournamentUI.setVisible(true);
  }

  /**
   * Hide the tournament bracket UI
   */
  hideTournamentBracket(): void {
    this.tournamentUI?.setVisible(false);
  }

  /**
   * Update tournament bracket with new data
   */
  updateTournamentBracket(tournament: Tournament): void {
    this.tournamentUI?.updateTournament(tournament);
  }

  private createGradientBackground(): void {
    // Create a gradient texture for the background
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Create gradient from deep purple to dark blue
      const gradient = ctx.createLinearGradient(0, 0, 0, 512);
      gradient.addColorStop(0, '#1a1a3e');    // Deep purple at top
      gradient.addColorStop(0.3, '#1e2a4a');  // Dark blue-purple
      gradient.addColorStop(0.6, '#16213e');  // Navy blue
      gradient.addColorStop(1, '#0f0f23');    // Very dark blue at bottom
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 2, 512);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    
    this.scene.background = texture;
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

  private createHintButton(): void {
    this.hintButton = document.createElement('button');
    this.hintButton.id = 'hint-button';
    this.hintButton.innerHTML = `<span id="hint-icon">💡</span> Hint (<span id="hint-count">${this.gameState.hintsRemaining}</span>)`;
    this.hintButton.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      z-index: 200;
      transition: all 0.3s ease;
      display: none;
    `;

    // Add hover effects
    this.hintButton.addEventListener('mouseenter', () => {
      if (this.gameState.hintsRemaining > 0) {
        this.hintButton!.style.transform = 'scale(1.05)';
        this.hintButton!.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
      }
    });
    this.hintButton.addEventListener('mouseleave', () => {
      this.hintButton!.style.transform = 'scale(1)';
      this.hintButton!.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
    });

    // Add click handler
    this.hintButton.addEventListener('click', () => this.useHint());

    document.body.appendChild(this.hintButton);
  }

  private updateHintButton(): void {
    if (!this.hintButton) return;

    const countSpan = this.hintButton.querySelector('#hint-count');
    if (countSpan) {
      countSpan.textContent = String(this.gameState.hintsRemaining);
    }

    // Update button state based on hints remaining
    if (this.gameState.hintsRemaining <= 0) {
      this.hintButton.style.opacity = '0.5';
      this.hintButton.style.cursor = 'not-allowed';
    } else {
      this.hintButton.style.opacity = '1';
      this.hintButton.style.cursor = 'pointer';
    }

    // Show/hide based on game state
    const shouldShow = this.gameMode === 'single' && 
                       this.gameState.currentRound && 
                       !this.gameState.currentRound.isComplete;
    this.hintButton.style.display = shouldShow ? 'block' : 'none';
  }

  private useHint(): void {
    const round = this.gameState.currentRound;
    
    // Validate we can use a hint
    if (!round || round.isComplete) {
      this.predictionUI.showMessage('No active round!', '#ff6b6b');
      return;
    }
    
    if (this.gameState.hintsRemaining <= 0) {
      this.predictionUI.showMessage('No hints remaining!', '#ff6b6b');
      return;
    }
    
    if (this.gameMode !== 'single') {
      this.predictionUI.showMessage('Hints only available in single player!', '#ffe66d');
      return;
    }

    // Find unrevealed letters in the word
    const unrevealedLetters: string[] = [];
    for (const letter of round.word) {
      if (!round.revealedLetters.has(letter) && !round.guessedLetters.has(letter)) {
        // Add unique letters only
        if (!unrevealedLetters.includes(letter)) {
          unrevealedLetters.push(letter);
        }
      }
    }

    if (unrevealedLetters.length === 0) {
      this.predictionUI.showMessage('No letters to reveal!', '#ffe66d');
      return;
    }

    // Pick a random unrevealed letter
    const hintLetter = unrevealedLetters[Math.floor(Math.random() * unrevealedLetters.length)];

    // Use the hint
    this.gameState.hintsRemaining--;
    round.guessedLetters.add(hintLetter);
    round.revealedLetters.add(hintLetter);

    // Update UI
    this.wordDisplay.updateDisplay(round);
    this.letterTiles.setTileStatus(hintLetter, 'correct');
    this.updateHintButton();

    // Apply hint penalty to score
    this.gameState.score.totalScore = Math.max(0, this.gameState.score.totalScore - GAME_CONFIG.hintPenalty);

    // Show message
    this.predictionUI.showMessage(`Hint: The letter "${hintLetter}" is in the word! (-${GAME_CONFIG.hintPenalty} points)`, '#667eea');
    soundEffects.play('correct');

    // Check for win
    const allRevealed = round.word.split('').every(l => round.revealedLetters.has(l));
    if (allRevealed) {
      round.isComplete = true;
      round.isWon = true;
      soundEffects.play('win');
      this.handleRoundComplete();
    }
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

    // Create body parts (hidden initially) - improved with smoother geometry
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xffdbac,
      roughness: 0.5,
      metalness: 0.1,
    });

    // Head with smoother sphere and face
    const headGroup = new THREE.Group();
    
    // Main head sphere - smoother with 32 segments
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 32, 32),
      bodyMaterial
    );
    headGroup.add(head);
    
    // Add face features
    // Eyes - white spheres with black pupils
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2 });
    
    // Left eye
    const leftEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 16, 16),
      eyeMaterial
    );
    leftEye.position.set(-0.1, 0.05, 0.27);
    headGroup.add(leftEye);
    
    const leftPupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 12, 12),
      pupilMaterial
    );
    leftPupil.position.set(-0.1, 0.05, 0.32);
    headGroup.add(leftPupil);
    
    // Right eye
    const rightEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 16, 16),
      eyeMaterial
    );
    rightEye.position.set(0.1, 0.05, 0.27);
    headGroup.add(rightEye);
    
    const rightPupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 12, 12),
      pupilMaterial
    );
    rightPupil.position.set(0.1, 0.05, 0.32);
    headGroup.add(rightPupil);
    
    // Nose
    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 12, 12),
      bodyMaterial
    );
    nose.position.set(0, -0.02, 0.29);
    nose.scale.set(1, 0.8, 0.8);
    headGroup.add(nose);
    
    // Mouth - curved line using torus
    const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0xcc6666, roughness: 0.4 });
    const mouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.08, 0.015, 8, 16, Math.PI),
      mouthMaterial
    );
    mouth.position.set(0, -0.12, 0.26);
    mouth.rotation.x = Math.PI;
    headGroup.add(mouth);
    
    // Eyebrows
    const eyebrowMaterial = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.6 });
    
    const leftEyebrow = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.02, 0.02),
      eyebrowMaterial
    );
    leftEyebrow.position.set(-0.1, 0.13, 0.27);
    leftEyebrow.rotation.z = 0.1;
    headGroup.add(leftEyebrow);
    
    const rightEyebrow = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.02, 0.02),
      eyebrowMaterial
    );
    rightEyebrow.position.set(0.1, 0.13, 0.27);
    rightEyebrow.rotation.z = -0.1;
    headGroup.add(rightEyebrow);
    
    headGroup.position.set(0.8, 1.8, 0);
    headGroup.visible = false;
    (headGroup as any).castShadow = true;
    this.bodyParts.push(headGroup as unknown as THREE.Mesh);
    this.hangmanGroup.add(headGroup);

    // Body - smoother cylinder
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 1, 24),
      bodyMaterial
    );
    body.position.set(0.8, 1.1, 0);
    body.visible = false;
    body.castShadow = true;
    this.bodyParts.push(body);
    this.hangmanGroup.add(body);

    // Left arm - smoother cylinder
    const leftArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.6, 16),
      bodyMaterial
    );
    leftArm.position.set(0.5, 1.3, 0);
    leftArm.rotation.z = Math.PI / 4;
    leftArm.visible = false;
    leftArm.castShadow = true;
    this.bodyParts.push(leftArm);
    this.hangmanGroup.add(leftArm);

    // Right arm - smoother cylinder
    const rightArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.6, 16),
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
    if (this.gameMode !== 'single') return;

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
      
      // Reset hints for new round
      this.gameState.hintsRemaining = GAME_CONFIG.hintsPerRound;
      this.updateHintButton();
    }
  }

  private async handleLetterClick(letter: string): Promise<void> {
    // Handle multiplayer mode
    if (this.gameMode === 'multiplayer') {
      this.handleMultiplayerLetterClick(letter);
      return;
    }

    // Single player mode
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
      soundEffects.play('correct');

      // Check for win
      const allRevealed = round.word.split('').every(l => round.revealedLetters.has(l));
      if (allRevealed) {
        round.isComplete = true;
        round.isWon = true;
        soundEffects.play('win');
        // Emit win particles
        this.particleEffects.emitConfettiBurst(2);
        this.handleRoundComplete();
      }
    } else {
      // Wrong guess
      round.wrongGuesses++;
      this.letterTiles.setTileStatus(letter, 'wrong');
      this.revealBodyPart(round.wrongGuesses - 1);
      soundEffects.play('wrong');

      // Check for loss
      if (round.wrongGuesses >= GAME_CONFIG.maxWrongGuesses) {
        round.isComplete = true;
        round.isWon = false;
        soundEffects.play('lose');
        // Emit lose particles
        this.particleEffects.emitLose(new THREE.Vector3(0, 0, 0));
        this.handleRoundComplete();
      }
    }
  }

  private handleMultiplayerLetterClick(letter: string): void {
    if (!this.multiplayerSync) return;

    // Check if it's the player's turn
    if (!this.multiplayerSync.isMyTurn()) {
      this.predictionUI.showMessage("It's not your turn!", '#ff6b6b');
      return;
    }

    // Check if letter was already guessed
    if (this.multiplayerRound?.guessedLetters.includes(letter)) {
      this.predictionUI.showMessage('Letter already guessed!', '#ffe66d');
      return;
    }

    // Check if round is complete
    if (this.multiplayerRound?.isComplete) {
      this.predictionUI.showMessage('Round is over!', '#ffe66d');
      return;
    }

    // Send guess to server
    this.multiplayerSync.guessLetter(letter);
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

    // Start new round after delay (only in single player)
    if (this.gameMode === 'single') {
      setTimeout(() => {
        if (!this.gameState.isGameOver) {
          this.startNewRound();
        }
      }, GAME_CONFIG.roundDelayMs);
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();

    this.controls.update();

    // Update tournament UI (for animations)
    if (this.tournamentUI) {
      this.tournamentUI.update(deltaTime);
    }

    // Update particle effects
    this.particleEffects.update(deltaTime);

    this.renderer.render(this.scene, this.camera);
  }
}

// Start the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new HangmanGame();
});
