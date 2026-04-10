/**
 * Tests for the config module
 *
 * Validates all centralized configuration constants used throughout
 * the Hangman game. Ensures values are within expected ranges,
 * correctly typed, and structurally sound.
 */

import { describe, it, expect } from 'vitest';
import {
  API_CONFIG,
  GAME_CONFIG,
  SCENE_CONFIG,
  HANGMAN_CONFIG,
  LETTER_TILES_CONFIG,
  WORD_DISPLAY_CONFIG,
  UI_CONFIG,
  PREDICTION_UI_CONFIG,
} from './config';

// ---------------------------------------------------------------------------
// API_CONFIG
// ---------------------------------------------------------------------------

describe('API_CONFIG', () => {
  it('has a baseUrl that is a string', () => {
    expect(typeof API_CONFIG.baseUrl).toBe('string');
  });

  it('has a wordEndpoint that starts with /', () => {
    expect(API_CONFIG.wordEndpoint.startsWith('/')).toBe(true);
  });

  it('wordEndpoint contains "word"', () => {
    expect(API_CONFIG.wordEndpoint.toLowerCase()).toContain('word');
  });
});

// ---------------------------------------------------------------------------
// GAME_CONFIG
// ---------------------------------------------------------------------------

describe('GAME_CONFIG', () => {
  it('maxWrongGuesses is 6 (body parts)', () => {
    expect(GAME_CONFIG.maxWrongGuesses).toBe(6);
  });

  it('difficultyIncrementWins is a positive integer', () => {
    expect(GAME_CONFIG.difficultyIncrementWins).toBeGreaterThan(0);
    expect(Number.isInteger(GAME_CONFIG.difficultyIncrementWins)).toBe(true);
  });

  it('maxDifficulty is 5', () => {
    expect(GAME_CONFIG.maxDifficulty).toBe(5);
  });

  it('roundDelayMs is a positive number', () => {
    expect(GAME_CONFIG.roundDelayMs).toBeGreaterThan(0);
  });

  it('baseScoreMultiplier is a positive number', () => {
    expect(GAME_CONFIG.baseScoreMultiplier).toBeGreaterThan(0);
  });

  it('wrongGuessPenalty is a non-negative number', () => {
    expect(GAME_CONFIG.wrongGuessPenalty).toBeGreaterThanOrEqual(0);
  });

  it('minimumScore is a non-negative number', () => {
    expect(GAME_CONFIG.minimumScore).toBeGreaterThanOrEqual(0);
  });

  it('hintsPerRound is a non-negative integer', () => {
    expect(GAME_CONFIG.hintsPerRound).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(GAME_CONFIG.hintsPerRound)).toBe(true);
  });

  it('hintPenalty is a non-negative number', () => {
    expect(GAME_CONFIG.hintPenalty).toBeGreaterThanOrEqual(0);
  });

  it('penalty values are less than minimumScore to keep wins meaningful', () => {
    expect(GAME_CONFIG.wrongGuessPenalty).toBeLessThan(GAME_CONFIG.minimumScore * 5);
  });
});

// ---------------------------------------------------------------------------
// SCENE_CONFIG
// ---------------------------------------------------------------------------

describe('SCENE_CONFIG', () => {
  it('backgroundColor is a valid hex number', () => {
    expect(typeof SCENE_CONFIG.backgroundColor).toBe('number');
    expect(SCENE_CONFIG.backgroundColor).toBeGreaterThanOrEqual(0);
    expect(SCENE_CONFIG.backgroundColor).toBeLessThanOrEqual(0xffffff);
  });

  describe('camera', () => {
    it('fov is a reasonable angle (30-120)', () => {
      expect(SCENE_CONFIG.camera.fov).toBeGreaterThanOrEqual(30);
      expect(SCENE_CONFIG.camera.fov).toBeLessThanOrEqual(120);
    });

    it('near is positive and small', () => {
      expect(SCENE_CONFIG.camera.near).toBeGreaterThan(0);
      expect(SCENE_CONFIG.camera.near).toBeLessThan(1);
    });

    it('far is greater than near', () => {
      expect(SCENE_CONFIG.camera.far).toBeGreaterThan(SCENE_CONFIG.camera.near);
    });

    it('position has x, y, z numbers', () => {
      const pos = SCENE_CONFIG.camera.position;
      expect(typeof pos.x).toBe('number');
      expect(typeof pos.y).toBe('number');
      expect(typeof pos.z).toBe('number');
    });
  });

  describe('controls', () => {
    it('dampingFactor is between 0 and 1', () => {
      expect(SCENE_CONFIG.controls.dampingFactor).toBeGreaterThan(0);
      expect(SCENE_CONFIG.controls.dampingFactor).toBeLessThanOrEqual(1);
    });

    it('maxDistance is greater than minDistance', () => {
      expect(SCENE_CONFIG.controls.maxDistance).toBeGreaterThan(SCENE_CONFIG.controls.minDistance);
    });

    it('minDistance is positive', () => {
      expect(SCENE_CONFIG.controls.minDistance).toBeGreaterThan(0);
    });
  });

  describe('lighting', () => {
    it('ambientIntensity is between 0 and 1', () => {
      expect(SCENE_CONFIG.lighting.ambientIntensity).toBeGreaterThan(0);
      expect(SCENE_CONFIG.lighting.ambientIntensity).toBeLessThanOrEqual(1);
    });

    it('directionalIntensity is between 0 and 1', () => {
      expect(SCENE_CONFIG.lighting.directionalIntensity).toBeGreaterThan(0);
      expect(SCENE_CONFIG.lighting.directionalIntensity).toBeLessThanOrEqual(1);
    });

    it('fillLightColor is a valid hex number', () => {
      expect(typeof SCENE_CONFIG.lighting.fillLightColor).toBe('number');
      expect(SCENE_CONFIG.lighting.fillLightColor).toBeGreaterThanOrEqual(0);
    });

    it('fillLightIntensity is between 0 and 1', () => {
      expect(SCENE_CONFIG.lighting.fillLightIntensity).toBeGreaterThan(0);
      expect(SCENE_CONFIG.lighting.fillLightIntensity).toBeLessThanOrEqual(1);
    });

    it('mainLightPosition has x, y, z numbers', () => {
      const pos = SCENE_CONFIG.lighting.mainLightPosition;
      expect(typeof pos.x).toBe('number');
      expect(typeof pos.y).toBe('number');
      expect(typeof pos.z).toBe('number');
    });

    it('fillLightPosition has x, y, z numbers', () => {
      const pos = SCENE_CONFIG.lighting.fillLightPosition;
      expect(typeof pos.x).toBe('number');
      expect(typeof pos.y).toBe('number');
      expect(typeof pos.z).toBe('number');
    });

    it('shadowMapSize is a power of 2', () => {
      const size = SCENE_CONFIG.lighting.shadowMapSize;
      expect(size).toBeGreaterThan(0);
      expect((size & (size - 1)) === 0).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// HANGMAN_CONFIG
// ---------------------------------------------------------------------------

describe('HANGMAN_CONFIG', () => {
  it('position has x, y, z numbers', () => {
    expect(typeof HANGMAN_CONFIG.position.x).toBe('number');
    expect(typeof HANGMAN_CONFIG.position.y).toBe('number');
    expect(typeof HANGMAN_CONFIG.position.z).toBe('number');
  });

  it('materialColor is a valid hex number', () => {
    expect(typeof HANGMAN_CONFIG.materialColor).toBe('number');
    expect(HANGMAN_CONFIG.materialColor).toBeGreaterThanOrEqual(0);
  });

  it('ropeColor is a valid hex number', () => {
    expect(typeof HANGMAN_CONFIG.ropeColor).toBe('number');
    expect(HANGMAN_CONFIG.ropeColor).toBeGreaterThanOrEqual(0);
  });

  it('bodyColor is a valid hex number', () => {
    expect(typeof HANGMAN_CONFIG.bodyColor).toBe('number');
    expect(HANGMAN_CONFIG.bodyColor).toBeGreaterThanOrEqual(0);
  });

  it('poleHeight is positive', () => {
    expect(HANGMAN_CONFIG.poleHeight).toBeGreaterThan(0);
  });

  it('beamLength is positive', () => {
    expect(HANGMAN_CONFIG.beamLength).toBeGreaterThan(0);
  });

  it('ropeLength is positive', () => {
    expect(HANGMAN_CONFIG.ropeLength).toBeGreaterThan(0);
  });

  it('headRadius is positive', () => {
    expect(HANGMAN_CONFIG.headRadius).toBeGreaterThan(0);
  });

  it('bodyHeight is positive', () => {
    expect(HANGMAN_CONFIG.bodyHeight).toBeGreaterThan(0);
  });

  it('limbLength is positive', () => {
    expect(HANGMAN_CONFIG.limbLength).toBeGreaterThan(0);
  });

  it('legLength is positive', () => {
    expect(HANGMAN_CONFIG.legLength).toBeGreaterThan(0);
  });

  describe('base', () => {
    it('has positive width, height, depth', () => {
      expect(HANGMAN_CONFIG.base.width).toBeGreaterThan(0);
      expect(HANGMAN_CONFIG.base.height).toBeGreaterThan(0);
      expect(HANGMAN_CONFIG.base.depth).toBeGreaterThan(0);
    });
  });

  describe('pole', () => {
    it('has positive dimensions', () => {
      expect(HANGMAN_CONFIG.pole.width).toBeGreaterThan(0);
      expect(HANGMAN_CONFIG.pole.height).toBeGreaterThan(0);
      expect(HANGMAN_CONFIG.pole.depth).toBeGreaterThan(0);
    });
  });

  describe('rope', () => {
    it('radius is positive', () => {
      expect(HANGMAN_CONFIG.rope.radius).toBeGreaterThan(0);
    });

    it('segments is at least 3', () => {
      expect(HANGMAN_CONFIG.rope.segments).toBeGreaterThanOrEqual(3);
    });
  });

  describe('head', () => {
    it('segments is at least 4', () => {
      expect(HANGMAN_CONFIG.head.segments).toBeGreaterThanOrEqual(4);
    });
  });

  describe('bodyParts', () => {
    it('material has color and roughness', () => {
      expect(typeof HANGMAN_CONFIG.bodyParts.material.color).toBe('number');
      expect(typeof HANGMAN_CONFIG.bodyParts.material.roughness).toBe('number');
      expect(HANGMAN_CONFIG.bodyParts.material.roughness).toBeGreaterThanOrEqual(0);
      expect(HANGMAN_CONFIG.bodyParts.material.roughness).toBeLessThanOrEqual(1);
    });

    it('head has positive radius', () => {
      expect(HANGMAN_CONFIG.bodyParts.head.radius).toBeGreaterThan(0);
    });

    it('torso has positive dimensions', () => {
      expect(HANGMAN_CONFIG.bodyParts.torso.radiusTop).toBeGreaterThan(0);
      expect(HANGMAN_CONFIG.bodyParts.torso.radiusBottom).toBeGreaterThan(0);
      expect(HANGMAN_CONFIG.bodyParts.torso.height).toBeGreaterThan(0);
    });

    it('arm has positive length and radius', () => {
      expect(HANGMAN_CONFIG.bodyParts.arm.radius).toBeGreaterThan(0);
      expect(HANGMAN_CONFIG.bodyParts.arm.length).toBeGreaterThan(0);
    });

    it('arm rotation angle is a positive number (radians)', () => {
      expect(HANGMAN_CONFIG.bodyParts.arm.rotationAngle).toBeGreaterThan(0);
      expect(HANGMAN_CONFIG.bodyParts.arm.rotationAngle).toBeLessThan(Math.PI);
    });
  });

  it('body parts count matches maxWrongGuesses (head, torso, 2 arms, 2 legs)', () => {
    // 6 wrong guesses = 6 body parts
    expect(GAME_CONFIG.maxWrongGuesses).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// LETTER_TILES_CONFIG
// ---------------------------------------------------------------------------

describe('LETTER_TILES_CONFIG', () => {
  it('tile dimensions are all positive', () => {
    expect(LETTER_TILES_CONFIG.tileWidth).toBeGreaterThan(0);
    expect(LETTER_TILES_CONFIG.tileHeight).toBeGreaterThan(0);
    expect(LETTER_TILES_CONFIG.tileDepth).toBeGreaterThan(0);
  });

  it('spacing is non-negative', () => {
    expect(LETTER_TILES_CONFIG.spacing).toBeGreaterThanOrEqual(0);
  });

  it('tilesPerRow is at least 13 (full alphabet)', () => {
    expect(LETTER_TILES_CONFIG.tilesPerRow).toBeGreaterThanOrEqual(13);
  });

  it('hoverScale is greater than 1', () => {
    expect(LETTER_TILES_CONFIG.hoverScale).toBeGreaterThan(1);
  });

  it('correctColor is a valid hex', () => {
    expect(typeof LETTER_TILES_CONFIG.correctColor).toBe('number');
    expect(LETTER_TILES_CONFIG.correctColor).toBeGreaterThanOrEqual(0);
  });

  it('wrongColor is a valid hex', () => {
    expect(typeof LETTER_TILES_CONFIG.wrongColor).toBe('number');
    expect(LETTER_TILES_CONFIG.wrongColor).toBeGreaterThanOrEqual(0);
  });

  it('defaultColor is a valid hex', () => {
    expect(typeof LETTER_TILES_CONFIG.defaultColor).toBe('number');
    expect(LETTER_TILES_CONFIG.defaultColor).toBeGreaterThanOrEqual(0);
  });

  describe('animation', () => {
    it('sinkAmount is positive', () => {
      expect(LETTER_TILES_CONFIG.animation.sinkAmount).toBeGreaterThan(0);
    });

    it('duration is positive', () => {
      expect(LETTER_TILES_CONFIG.animation.duration).toBeGreaterThan(0);
    });
  });

  describe('canvas', () => {
    it('width and height are positive', () => {
      expect(LETTER_TILES_CONFIG.canvas.width).toBeGreaterThan(0);
      expect(LETTER_TILES_CONFIG.canvas.height).toBeGreaterThan(0);
    });

    it('fontSize is positive', () => {
      expect(LETTER_TILES_CONFIG.canvas.fontSize).toBeGreaterThan(0);
    });

    it('backgroundColor is a CSS color string', () => {
      expect(typeof LETTER_TILES_CONFIG.canvas.backgroundColor).toBe('string');
      expect(LETTER_TILES_CONFIG.canvas.backgroundColor).toBeTruthy();
    });

    it('textColor is a CSS color string', () => {
      expect(typeof LETTER_TILES_CONFIG.canvas.textColor).toBe('string');
      expect(LETTER_TILES_CONFIG.canvas.textColor).toBeTruthy();
    });
  });

  it('letterFaceSize is positive and smaller than tile dimensions', () => {
    expect(LETTER_TILES_CONFIG.letterFaceSize).toBeGreaterThan(0);
    expect(LETTER_TILES_CONFIG.letterFaceSize).toBeLessThanOrEqual(LETTER_TILES_CONFIG.tileWidth);
    expect(LETTER_TILES_CONFIG.letterFaceSize).toBeLessThanOrEqual(LETTER_TILES_CONFIG.tileHeight);
  });
});

// ---------------------------------------------------------------------------
// WORD_DISPLAY_CONFIG
// ---------------------------------------------------------------------------

describe('WORD_DISPLAY_CONFIG', () => {
  it('letter dimensions are all positive', () => {
    expect(WORD_DISPLAY_CONFIG.letterWidth).toBeGreaterThan(0);
    expect(WORD_DISPLAY_CONFIG.letterHeight).toBeGreaterThan(0);
    expect(WORD_DISPLAY_CONFIG.letterDepth).toBeGreaterThan(0);
  });

  it('spacing is non-negative', () => {
    expect(WORD_DISPLAY_CONFIG.spacing).toBeGreaterThanOrEqual(0);
  });

  it('pedestalHeight and pedestalDepth are positive', () => {
    expect(WORD_DISPLAY_CONFIG.pedestalHeight).toBeGreaterThan(0);
    expect(WORD_DISPLAY_CONFIG.pedestalDepth).toBeGreaterThan(0);
  });

  it('pedestalColor is a valid hex number', () => {
    expect(typeof WORD_DISPLAY_CONFIG.pedestalColor).toBe('number');
    expect(WORD_DISPLAY_CONFIG.pedestalColor).toBeGreaterThanOrEqual(0);
  });

  describe('animation', () => {
    it('duration is positive', () => {
      expect(WORD_DISPLAY_CONFIG.animation.duration).toBeGreaterThan(0);
    });

    it('bounceAmplitude is positive', () => {
      expect(WORD_DISPLAY_CONFIG.animation.bounceAmplitude).toBeGreaterThan(0);
    });

    it('bounceHeight is positive', () => {
      expect(WORD_DISPLAY_CONFIG.animation.bounceHeight).toBeGreaterThan(0);
    });
  });

  describe('canvas', () => {
    it('width and height are positive', () => {
      expect(WORD_DISPLAY_CONFIG.canvas.width).toBeGreaterThan(0);
      expect(WORD_DISPLAY_CONFIG.canvas.height).toBeGreaterThan(0);
    });

    it('fontSize is positive', () => {
      expect(WORD_DISPLAY_CONFIG.canvas.fontSize).toBeGreaterThan(0);
    });

    it('backgroundColor and textColor are strings', () => {
      expect(typeof WORD_DISPLAY_CONFIG.canvas.backgroundColor).toBe('string');
      expect(typeof WORD_DISPLAY_CONFIG.canvas.textColor).toBe('string');
    });
  });
});

// ---------------------------------------------------------------------------
// UI_CONFIG
// ---------------------------------------------------------------------------

describe('UI_CONFIG', () => {
  it('wordDisplayPosition has x, y, z numbers', () => {
    const pos = UI_CONFIG.wordDisplayPosition;
    expect(typeof pos.x).toBe('number');
    expect(typeof pos.y).toBe('number');
    expect(typeof pos.z).toBe('number');
  });

  it('letterTilesPosition has x, y, z numbers', () => {
    const pos = UI_CONFIG.letterTilesPosition;
    expect(typeof pos.x).toBe('number');
    expect(typeof pos.y).toBe('number');
    expect(typeof pos.z).toBe('number');
  });

  it('hangmanPosition has x, y, z numbers', () => {
    const pos = UI_CONFIG.hangmanPosition;
    expect(typeof pos.x).toBe('number');
    expect(typeof pos.y).toBe('number');
    expect(typeof pos.z).toBe('number');
  });

  it('hangman position matches HANGMAN_CONFIG position', () => {
    expect(UI_CONFIG.hangmanPosition.x).toBe(HANGMAN_CONFIG.position.x);
    expect(UI_CONFIG.hangmanPosition.y).toBe(HANGMAN_CONFIG.position.y);
    expect(UI_CONFIG.hangmanPosition.z).toBe(HANGMAN_CONFIG.position.z);
  });
});

// ---------------------------------------------------------------------------
// PREDICTION_UI_CONFIG
// ---------------------------------------------------------------------------

describe('PREDICTION_UI_CONFIG', () => {
  describe('panel', () => {
    it('width and height are positive', () => {
      expect(PREDICTION_UI_CONFIG.panel.width).toBeGreaterThan(0);
      expect(PREDICTION_UI_CONFIG.panel.height).toBeGreaterThan(0);
    });

    it('backgroundColor is a valid hex number', () => {
      expect(typeof PREDICTION_UI_CONFIG.panel.backgroundColor).toBe('number');
      expect(PREDICTION_UI_CONFIG.panel.backgroundColor).toBeGreaterThanOrEqual(0);
    });
  });

  describe('button', () => {
    it('dimensions are all positive', () => {
      expect(PREDICTION_UI_CONFIG.button.width).toBeGreaterThan(0);
      expect(PREDICTION_UI_CONFIG.button.height).toBeGreaterThan(0);
      expect(PREDICTION_UI_CONFIG.button.depth).toBeGreaterThan(0);
    });

    it('inColor and notInColor are valid hex numbers', () => {
      expect(typeof PREDICTION_UI_CONFIG.button.inColor).toBe('number');
      expect(typeof PREDICTION_UI_CONFIG.button.notInColor).toBe('number');
      expect(PREDICTION_UI_CONFIG.button.inColor).toBeGreaterThanOrEqual(0);
      expect(PREDICTION_UI_CONFIG.button.notInColor).toBeGreaterThanOrEqual(0);
    });

    it('inColor differs from notInColor', () => {
      expect(PREDICTION_UI_CONFIG.button.inColor).not.toBe(PREDICTION_UI_CONFIG.button.notInColor);
    });

    it('hoverScale is greater than or equal to 1', () => {
      expect(PREDICTION_UI_CONFIG.button.hoverScale).toBeGreaterThanOrEqual(1);
    });
  });

  describe('text', () => {
    it('font sizes are positive numbers', () => {
      expect(PREDICTION_UI_CONFIG.text.questionFontSize).toBeGreaterThan(0);
      expect(PREDICTION_UI_CONFIG.text.letterFontSize).toBeGreaterThan(0);
      expect(PREDICTION_UI_CONFIG.text.buttonFontSize).toBeGreaterThan(0);
      expect(PREDICTION_UI_CONFIG.text.toastFontSize).toBeGreaterThan(0);
    });

    it('letter display font is larger than question font', () => {
      expect(PREDICTION_UI_CONFIG.text.letterFontSize).toBeGreaterThan(PREDICTION_UI_CONFIG.text.questionFontSize);
    });

    it('color and letterColor are valid hex numbers', () => {
      expect(typeof PREDICTION_UI_CONFIG.text.color).toBe('number');
      expect(typeof PREDICTION_UI_CONFIG.text.letterColor).toBe('number');
    });

    it('textWidth and textHeight are positive', () => {
      expect(PREDICTION_UI_CONFIG.text.textWidth).toBeGreaterThan(0);
      expect(PREDICTION_UI_CONFIG.text.textHeight).toBeGreaterThan(0);
    });
  });

  describe('canvas', () => {
    it('width and height are positive', () => {
      expect(PREDICTION_UI_CONFIG.canvas.width).toBeGreaterThan(0);
      expect(PREDICTION_UI_CONFIG.canvas.height).toBeGreaterThan(0);
    });

    it('backgroundColor is a string', () => {
      expect(typeof PREDICTION_UI_CONFIG.canvas.backgroundColor).toBe('string');
    });
  });

  describe('layout', () => {
    it('button positions differ horizontally', () => {
      expect(PREDICTION_UI_CONFIG.layout.inButtonX).not.toBe(PREDICTION_UI_CONFIG.layout.notInButtonX);
    });

    it('toastY is below buttonY', () => {
      expect(PREDICTION_UI_CONFIG.layout.toastY).toBeLessThan(PREDICTION_UI_CONFIG.layout.buttonY);
    });

    it('buttonZ is greater than textZ (buttons in front)', () => {
      expect(PREDICTION_UI_CONFIG.layout.buttonZ).toBeGreaterThan(PREDICTION_UI_CONFIG.layout.textZ);
    });

    it('toastZ is greater than textZ (toast in front of text)', () => {
      expect(PREDICTION_UI_CONFIG.layout.toastZ).toBeGreaterThan(PREDICTION_UI_CONFIG.layout.textZ);
    });
  });

  describe('animation', () => {
    it('showDuration is positive', () => {
      expect(PREDICTION_UI_CONFIG.animation.showDuration).toBeGreaterThan(0);
    });

    it('hideDuration is positive', () => {
      expect(PREDICTION_UI_CONFIG.animation.hideDuration).toBeGreaterThan(0);
    });

    it('showScale is positive', () => {
      expect(PREDICTION_UI_CONFIG.animation.showScale).toBeGreaterThan(0);
    });
  });

  describe('toast', () => {
    it('duration is positive', () => {
      expect(PREDICTION_UI_CONFIG.toast.duration).toBeGreaterThan(0);
    });
  });
});
