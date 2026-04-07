/**
 * Centralized configuration for Hangman 3D game
 * 
 * This module contains all configuration constants, magic values, and settings
 * used throughout the Hangman game. Centralizing these values makes it easy to
 * adjust game parameters without hunting through the codebase.
 * 
 * @module config
 * @example
 * ```typescript
 * import { GAME_CONFIG, SCENE_CONFIG } from './config';
 * 
 * // Use game configuration
 * const remainingGuesses = GAME_CONFIG.maxWrongGuesses - wrongGuesses;
 * 
 * // Use scene configuration
 * camera.fov = SCENE_CONFIG.camera.fov;
 * ```
 */

/**
 * API configuration for server communication.
 * 
 * @constant
 * @property {string} baseUrl - Base URL for API requests (from environment or empty for same-origin)
 * @property {string} wordEndpoint - Endpoint path for word retrieval
 */
export const API_CONFIG = {
  /** Base URL for API requests, defaults to empty string for same-origin requests */
  baseUrl: import.meta.env?.VITE_API_BASE || '',
  /** API endpoint for fetching random words */
  wordEndpoint: '/api/word',
};

/**
 * Game mechanics configuration.
 * 
 * Controls core gameplay parameters including difficulty progression,
 * scoring, and round management.
 * 
 * @constant
 * @example
 * ```typescript
 * // Check if player can continue after wrong guess
 * if (wrongGuesses < GAME_CONFIG.maxWrongGuesses) {
 *   // Player still has chances
 * }
 * ```
 */
export const GAME_CONFIG = {
  /** Maximum number of wrong guesses before game over (6 body parts) */
  maxWrongGuesses: 6,
  /** Number of wins required to increase difficulty level */
  difficultyIncrementWins: 3,
  /** Maximum difficulty level (1-5) */
  maxDifficulty: 5,
  /** Delay in milliseconds before starting next round */
  roundDelayMs: 3000,
  /** Score multiplier based on word length */
  baseScoreMultiplier: 10,
  /** Points deducted for each wrong guess */
  wrongGuessPenalty: 5,
  /** Minimum score awarded for winning a round */
  minimumScore: 10,
  /** Number of hints available per round */
  hintsPerRound: 1,
  /** Points deducted when using a hint */
  hintPenalty: 5,
};

/**
 * 3D Scene configuration for Three.js rendering.
 * 
 * Contains all settings for the 3D scene including camera parameters,
 * controls, and lighting setup.
 * 
 * @constant
 * @example
 * ```typescript
 * // Create camera with config settings
 * const camera = new THREE.PerspectiveCamera(
 *   SCENE_CONFIG.camera.fov,
 *   window.innerWidth / window.innerHeight,
 *   SCENE_CONFIG.camera.near,
 *   SCENE_CONFIG.camera.far
 * );
 * ```
 */
export const SCENE_CONFIG = {
  /** Background color for the 3D scene (dark blue) */
  backgroundColor: 0x1a1a2e,
  /** Camera configuration */
  camera: {
    /** Field of view in degrees */
    fov: 60,
    /** Near clipping plane */
    near: 0.1,
    /** Far clipping plane */
    far: 1000,
    /** Initial camera position */
    position: { x: 0, y: 2, z: 10 },
  },
  /** Orbit controls configuration */
  controls: {
    /** Damping factor for smooth camera movement */
    dampingFactor: 0.05,
    /** Maximum zoom-out distance */
    maxDistance: 20,
    /** Minimum zoom-in distance */
    minDistance: 5,
  },
  /** Lighting configuration */
  lighting: {
    /** Ambient light intensity (0-1) */
    ambientIntensity: 0.4,
    /** Main directional light intensity (0-1) */
    directionalIntensity: 0.8,
    /** Fill light color (blue tint) */
    fillLightColor: 0x4a90d9,
    /** Fill light intensity (0-1) */
    fillLightIntensity: 0.3,
    /** Main light position in scene */
    mainLightPosition: { x: 5, y: 10, z: 5 },
    /** Fill light position in scene */
    fillLightPosition: { x: -5, y: 5, z: -5 },
    /** Shadow map resolution (higher = better quality, more performance cost) */
    shadowMapSize: 2048,
  },
};

/**
 * Hangman figure configuration.
 * 
 * Contains all dimensions, positions, and appearance settings
 * for the 3D hangman gallows and body parts.
 * 
 * @constant
 * @example
 * ```typescript
 * // Create gallows base
 * const base = new THREE.BoxGeometry(
 *   HANGMAN_CONFIG.base.width,
 *   HANGMAN_CONFIG.base.height,
 *   HANGMAN_CONFIG.base.depth
 * );
 * ```
 */
export const HANGMAN_CONFIG = {
  /** Overall position offset for the hangman figure */
  position: { x: -4, y: 0, z: 0 },
  /** Color for wooden gallows parts (brown) */
  materialColor: 0x8b4513,
  /** Color for the rope (tan) */
  ropeColor: 0x8b7355,
  /** Color for body parts (skin tone) */
  bodyColor: 0xffdbac,
  /** Y position of the gallows base */
  baseY: -2,
  /** Height of the vertical pole */
  poleHeight: 5,
  /** Length of the horizontal beam */
  beamLength: 2,
  /** Length of the rope */
  ropeLength: 1,
  /** Radius of the head sphere */
  headRadius: 0.3,
  /** Height of the torso */
  bodyHeight: 1,
  /** Length of arms and legs */
  limbLength: 0.6,
  /** Length of legs */
  legLength: 0.7,
  
  /** Gallows base platform dimensions */
  base: {
    /** Width of the base (X axis) */
    width: 3,
    /** Height/thickness of the base (Y axis) */
    height: 0.2,
    /** Depth of the base (Z axis) */
    depth: 1,
  },
  
  /** Vertical pole dimensions and position */
  pole: {
    /** Width of the pole (X axis) */
    width: 0.2,
    /** Height of the pole (Y axis) */
    height: 5,
    /** Depth of the pole (Z axis) */
    depth: 0.2,
    /** X position offset */
    positionX: -1,
    /** Y position offset */
    positionY: 0.5,
  },
  
  /** Horizontal beam dimensions */
  beam: {
    /** Height/thickness of the beam */
    height: 0.2,
    /** Depth of the beam */
    depth: 0.2,
    /** Y position (height) of the beam */
    positionY: 3,
  },
  
  /** Rope configuration */
  rope: {
    /** Radius of the rope cylinder */
    radius: 0.05,
    /** Number of segments for the cylinder */
    segments: 8,
    /** X position of the rope attachment point */
    positionX: 0.8,
    /** Y position of the rope attachment point */
    positionY: 2.5,
  },
  
  /** Head configuration */
  head: {
    /** X position of the head */
    positionX: 0.8,
    /** Y position of the head */
    positionY: 1.8,
    /** Number of segments for sphere smoothness */
    segments: 16,
  },
  
  /** Torso configuration */
  body: {
    /** Radius of the torso cylinder */
    radius: 0.15,
    /** Number of segments for the cylinder */
    segments: 8,
    /** X position of the torso */
    positionX: 0.8,
    /** Y position of the torso */
    positionY: 1.2,
  },
  
  /** Arm configuration */
  arm: {
    /** Radius of arm cylinders */
    radius: 0.08,
    /** Number of segments for cylinders */
    segments: 8,
    /** X position of left arm */
    leftPositionX: 0.5,
    /** X position of right arm */
    rightPositionX: 1.1,
    /** Y position of arms */
    positionY: 1.3,
    /** Angle of arm rotation (radians) */
    rotationAngle: Math.PI / 4,
  },
  
  /** Leg configuration */
  leg: {
    /** Radius of leg cylinders */
    radius: 0.08,
    /** Number of segments for cylinders */
    segments: 8,
    /** X position of left leg */
    leftPositionX: 0.5,
    /** X position of right leg */
    rightPositionX: 1.1,
    /** Y position of legs */
    positionY: 0.1,
    /** Angle of leg rotation (radians) */
    rotationAngle: Math.PI / 6,
  },
  
  /** Detailed body parts configuration */
  bodyParts: {
    /** Material settings for body parts */
    material: {
      /** Skin color */
      color: 0xffdbac,
      /** Surface roughness (0-1) */
      roughness: 0.6,
    },
    /** Head settings */
    head: {
      /** Radius of the head sphere */
      radius: 0.3,
      /** Horizontal segments for sphere */
      widthSegments: 16,
      /** Vertical segments for sphere */
      heightSegments: 16,
      /** X position */
      positionX: 0.8,
      /** Y position */
      positionY: 1.8,
    },
    /** Torso settings */
    torso: {
      /** Radius at the top of the cylinder */
      radiusTop: 0.15,
      /** Radius at the bottom of the cylinder */
      radiusBottom: 0.2,
      /** Height of the torso */
      height: 1,
      /** Number of radial segments */
      segments: 8,
      /** X position */
      positionX: 0.8,
      /** Y position */
      positionY: 1.1,
    },
    /** Arm settings */
    arm: {
      /** Radius of arm cylinders */
      radius: 0.08,
      /** Length of arms */
      length: 0.6,
      /** Number of segments */
      segments: 8,
      /** X position of left arm */
      leftPositionX: 0.5,
      /** X position of right arm */
      rightPositionX: 1.1,
      /** Y position of arms */
      positionY: 1.3,
      /** Rotation angle (radians) */
      rotationAngle: Math.PI / 4,
    },
  },
  
  /** X position of the beam end where rope attaches */
  beamPositionX: 1,
};

/**
 * Letter tiles configuration for the 3D keyboard.
 * 
 * Contains all settings for the interactive letter tile display,
 * including dimensions, colors, animations, and canvas rendering.
 * 
 * @constant
 * @example
 * ```typescript
 * // Create a letter tile
 * const geometry = new THREE.BoxGeometry(
 *   LETTER_TILES_CONFIG.tileWidth,
 *   LETTER_TILES_CONFIG.tileHeight,
 *   LETTER_TILES_CONFIG.tileDepth
 * );
 * ```
 */
export const LETTER_TILES_CONFIG = {
  /** Width of each tile (X axis) */
  tileWidth: 0.8,
  /** Height of each tile (Y axis) */
  tileHeight: 1,
  /** Depth of each tile (Z axis) */
  tileDepth: 0.2,
  /** Spacing between tiles */
  spacing: 0.15,
  /** Number of tiles per row in the keyboard layout */
  tilesPerRow: 13,
  /** Depth of the arc curve for the keyboard layout */
  arcDepth: 2,
  /** Starting Y position for the tile grid */
  startY: -4,
  /** Emissive color intensity when hovering (hex) */
  hoverEmissive: 0x333333,
  /** Scale factor when hovering over a tile */
  hoverScale: 1.1,
  /** Color for correctly guessed letters (green) */
  correctColor: 0x4caf50,
  /** Color for incorrectly guessed letters (red) */
  wrongColor: 0xf44336,
  /** Default tile color (white) */
  defaultColor: 0xffffff,
  /** Size of the letter face texture on each tile */
  letterFaceSize: 0.6,
  
  /** Animation settings for tile interactions */
  animation: {
    /** Distance the tile sinks when selected */
    sinkAmount: 0.3,
    /** Duration of the sink animation in milliseconds */
    duration: 200,
  },
  
  /** Canvas settings for rendering letter textures */
  canvas: {
    /** Width of the texture canvas in pixels */
    width: 128,
    /** Height of the texture canvas in pixels */
    height: 128,
    /** Background color for the canvas */
    backgroundColor: '#333333',
    /** Text color for the letter */
    textColor: '#ffffff',
    /** Font size for the letter */
    fontSize: 80,
  },
};

/**
 * Word display configuration for showing the guess word.
 * 
 * Contains settings for the 3D word display including letter blocks,
 * pedestals, animations, and text rendering.
 * 
 * @constant
 * @example
 * ```typescript
 * // Position the word display
 * wordDisplay.setPosition(
 *   WORD_DISPLAY_CONFIG.position.x,
 *   WORD_DISPLAY_CONFIG.position.y,
 *   WORD_DISPLAY_CONFIG.position.z
 * );
 * ```
 */
export const WORD_DISPLAY_CONFIG = {
  /** Width of each letter block */
  letterWidth: 1,
  /** Height of each letter block */
  letterHeight: 0.8,
  /** Depth of each letter block */
  letterDepth: 0.1,
  /** Spacing between letter blocks */
  spacing: 0.3,
  /** Height of the pedestal under each letter */
  pedestalHeight: 0.2,
  /** Depth of the pedestal */
  pedestalDepth: 0.8,
  /** Color of the pedestals (brown) */
  pedestalColor: 0x8b4513,
  /** Y position of the letter blocks */
  letterY: -0.5,
  /** Y position of the pedestals */
  pedestalY: -1,
  
  /** Animation settings for letter reveal */
  animation: {
    /** Duration of the reveal animation in milliseconds */
    duration: 300,
    /** Amplitude of the bounce effect */
    bounceAmplitude: 0.2,
    /** Height of the bounce */
    bounceHeight: 0.5,
  },
  
  /** Canvas settings for letter texture rendering */
  canvas: {
    /** Width of the texture canvas */
    width: 128,
    /** Height of the texture canvas */
    height: 128,
    /** Background color for the canvas */
    backgroundColor: '#2c3e50',
    /** Text color for the letter */
    textColor: '#ffffff',
    /** Font size for the letter */
    fontSize: 100,
  },
};

/**
 * UI positioning configuration for 3D elements.
 * 
 * Defines the world positions for major UI components in the 3D scene.
 * 
 * @constant
 * @example
 * ```typescript
 * // Position the hangman figure
 * hangmanGroup.position.set(
 *   UI_CONFIG.hangmanPosition.x,
 *   UI_CONFIG.hangmanPosition.y,
 *   UI_CONFIG.hangmanPosition.z
 * );
 * ```
 */
export const UI_CONFIG = {
  /** Position of the word display in the scene */
  wordDisplayPosition: { x: 0, y: 2, z: 0 },
  /** Position of the letter tiles keyboard in the scene */
  letterTilesPosition: { x: 0, y: 0, z: 0 },
  /** Position of the hangman figure in the scene */
  hangmanPosition: { x: -4, y: 0, z: 0 },
};

/**
 * 3D Prediction UI configuration.
 * 
 * Contains all settings for the in-game prediction panel where players
 * guess whether letters are in the word.
 * 
 * @constant
 * @example
 * ```typescript
 * // Create prediction panel
 * const panelWidth = PREDICTION_UI_CONFIG.panel.width;
 * const panelHeight = PREDICTION_UI_CONFIG.panel.height;
 * ```
 */
export const PREDICTION_UI_CONFIG = {
  /** Background panel settings */
  panel: {
    /** Width of the panel */
    width: 8,
    /** Height of the panel */
    height: 5,
    /** Background color (dark blue-gray) */
    backgroundColor: 0x2c3e50,
    /** Z position offset from camera */
    positionZ: 0,
  },
  
  /** Button settings for IN/NOT IN choices */
  button: {
    /** Width of each button */
    width: 2,
    /** Height of each button */
    height: 0.8,
    /** Depth of each button */
    depth: 0.2,
    /** Color for the IN button (green) */
    inColor: 0x4caf50,
    /** Color for the NOT IN button (red) */
    notInColor: 0xf44336,
    /** Emissive color when hovering */
    hoverEmissive: 0x444444,
    /** Scale factor when hovering */
    hoverScale: 1.15,
  },
  
  /** Text rendering settings */
  text: {
    /** Font size for the question text */
    questionFontSize: 40,
    /** Font size for the letter display */
    letterFontSize: 100,
    /** Font size for button labels */
    buttonFontSize: 50,
    /** Font size for toast messages */
    toastFontSize: 60,
    /** Default text color (white) */
    color: 0xffffff,
    /** Color for the highlighted letter (yellow) */
    letterColor: 0xffeb3b,
    /** Color for button text */
    buttonTextColor: 0xffffff,
    /** Width of text planes */
    textWidth: 6,
    /** Height of text planes */
    textHeight: 1,
  },
  
  /** Canvas settings for text rendering */
  canvas: {
    /** Width of text canvases */
    width: 512,
    /** Height of text canvases */
    height: 128,
    /** Background color for canvases */
    backgroundColor: '#2c3e50',
  },
  
  /** Layout positions for UI elements */
  layout: {
    /** Y position of the question text */
    questionY: 1.5,
    /** Y position of the letter display */
    letterY: 0.5,
    /** Y position of the suffix text */
    suffixY: -0.3,
    /** Y position of the buttons */
    buttonY: -1.5,
    /** Y position of toast messages */
    toastY: -3,
    /** X position of the IN button */
    inButtonX: -1.5,
    /** X position of the NOT IN button */
    notInButtonX: 1.5,
    /** Z offset for buttons (in front of panel) */
    buttonZ: 0.2,
    /** Z offset for text elements */
    textZ: 0.1,
    /** Z offset for toast messages */
    toastZ: 0.5,
  },
  
  /** Animation settings */
  animation: {
    /** Duration of show animation in milliseconds */
    showDuration: 300,
    /** Duration of hide animation in milliseconds */
    hideDuration: 200,
    /** Scale when fully visible */
    showScale: 1,
  },
  
  /** Toast message settings */
  toast: {
    /** Duration to show toast messages in milliseconds */
    duration: 2500,
  },
};
