/**
 * Centralized configuration for Hangman 3D game
 * All magic values and constants should be defined here
 */

// API configuration
export const API_CONFIG = {
  baseUrl: import.meta.env?.VITE_API_BASE || '',
  wordEndpoint: '/api/word',
};

// Game mechanics configuration
export const GAME_CONFIG = {
  maxWrongGuesses: 6,
  difficultyIncrementWins: 3,
  maxDifficulty: 5,
  roundDelayMs: 3000,
  baseScoreMultiplier: 10,
  wrongGuessPenalty: 5,
  minimumScore: 10,
  hintsPerRound: 1,
  hintPenalty: 5,
};

// Scene configuration
export const SCENE_CONFIG = {
  backgroundColor: 0x1a1a2e,
  camera: {
    fov: 60,
    near: 0.1,
    far: 1000,
    position: { x: 0, y: 2, z: 10 },
  },
  controls: {
    dampingFactor: 0.05,
    maxDistance: 20,
    minDistance: 5,
  },
  lighting: {
    ambientIntensity: 0.4,
    directionalIntensity: 0.8,
    fillLightColor: 0x4a90d9,
    fillLightIntensity: 0.3,
    mainLightPosition: { x: 5, y: 10, z: 5 },
    fillLightPosition: { x: -5, y: 5, z: -5 },
    shadowMapSize: 2048,
  },
};

// Hangman figure configuration
export const HANGMAN_CONFIG = {
  position: { x: -4, y: 0, z: 0 },
  materialColor: 0x8b4513,
  ropeColor: 0x8b7355,
  bodyColor: 0xffdbac,
  baseY: -2,
  poleHeight: 5,
  beamLength: 2,
  ropeLength: 1,
  headRadius: 0.3,
  bodyHeight: 1,
  limbLength: 0.6,
  legLength: 0.7,
  // Gallows dimensions
  base: {
    width: 3,
    height: 0.2,
    depth: 1,
  },
  pole: {
    width: 0.2,
    height: 5,
    depth: 0.2,
    positionX: -1,
    positionY: 0.5,
  },
  beam: {
    height: 0.2,
    depth: 0.2,
    positionY: 3,
  },
  rope: {
    radius: 0.05,
    segments: 8,
    positionX: 0.8,
    positionY: 2.5,
  },
  // Body parts
  head: {
    positionX: 0.8,
    positionY: 1.8,
    segments: 16,
  },
  body: {
    radius: 0.15,
    segments: 8,
    positionX: 0.8,
    positionY: 1.2,
  },
  arm: {
    radius: 0.08,
    segments: 8,
    leftPositionX: 0.5,
    rightPositionX: 1.1,
    positionY: 1.3,
    rotationAngle: Math.PI / 4,
  },
  leg: {
    radius: 0.08,
    segments: 8,
    leftPositionX: 0.5,
    rightPositionX: 1.1,
    positionY: 0.1,
    rotationAngle: Math.PI / 6,
  },
  // Body parts detailed config
  bodyParts: {
    material: {
      color: 0xffdbac,
      roughness: 0.6,
    },
    head: {
      radius: 0.3,
      widthSegments: 16,
      heightSegments: 16,
      positionX: 0.8,
      positionY: 1.8,
    },
    torso: {
      radiusTop: 0.15,
      radiusBottom: 0.2,
      height: 1,
      segments: 8,
      positionX: 0.8,
      positionY: 1.1,
    },
    arm: {
      radius: 0.08,
      length: 0.6,
      segments: 8,
      leftPositionX: 0.5,
      rightPositionX: 1.1,
      positionY: 1.3,
      rotationAngle: Math.PI / 4,
    },
  },
  // Beam position X
  beamPositionX: 1,
};

// Letter tiles configuration
export const LETTER_TILES_CONFIG = {
  tileWidth: 0.8,
  tileHeight: 1,
  tileDepth: 0.2,
  spacing: 0.15,
  tilesPerRow: 13,
  arcDepth: 2,
  startY: -4,
  hoverEmissive: 0x333333,
  hoverScale: 1.1,
  correctColor: 0x4caf50,
  wrongColor: 0xf44336,
  defaultColor: 0xffffff,
  letterFaceSize: 0.6,
  animation: {
    sinkAmount: 0.3,
    duration: 200,
  },
  canvas: {
    width: 128,
    height: 128,
    backgroundColor: '#333333',
    textColor: '#ffffff',
    fontSize: 80,
  },
};

// Word display configuration
export const WORD_DISPLAY_CONFIG = {
  letterWidth: 1,
  letterHeight: 0.8,
  letterDepth: 0.1,
  spacing: 0.3,
  pedestalHeight: 0.2,
  pedestalDepth: 0.8,
  pedestalColor: 0x8b4513,
  letterY: -0.5,
  pedestalY: -1,
  animation: {
    duration: 300,
    bounceAmplitude: 0.2,
    bounceHeight: 0.5,
  },
  canvas: {
    width: 128,
    height: 128,
    backgroundColor: '#2c3e50',
    textColor: '#ffffff',
    fontSize: 100,
  },
};

// UI positioning configuration
export const UI_CONFIG = {
  wordDisplayPosition: { x: 0, y: 2, z: 0 },
  letterTilesPosition: { x: 0, y: 0, z: 0 },
  hangmanPosition: { x: -4, y: 0, z: 0 },
};
