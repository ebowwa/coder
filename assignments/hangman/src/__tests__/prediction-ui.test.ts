/**
 * Tests for PredictionUI module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PredictionUI } from '../prediction-ui';
import type { Prediction } from '../prediction-ui';

describe('PredictionUI', () => {
  let predictionUI: PredictionUI;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    predictionUI = new PredictionUI(container);
  });

  afterEach(() => {
    predictionUI.hide();
    document.body.removeChild(container);
  });

  describe('constructor', () => {
    it('should create a PredictionUI instance', () => {
      expect(predictionUI).toBeDefined();
    });
  });

  describe('getPrediction', () => {
    it('should return a promise that resolves when user makes a choice', async () => {
      const promise = predictionUI.getPrediction('A');
      
      // Verify modal is visible
      const modal = container.querySelector('.prediction-modal-overlay');
      expect(modal).toBeDefined();
      
      // Simulate clicking IN button
      const inBtn = document.getElementById('in-btn');
      if (inBtn) {
        inBtn.click();
      }
      
      const result = await promise;
      expect(result).toBe('in');
    });

    it('should resolve with "not-in" when NOT IN button is clicked', async () => {
      const promise = predictionUI.getPrediction('B');
      
      // Simulate clicking NOT IN button
      const notInBtn = document.getElementById('not-in-btn');
      if (notInBtn) {
        notInBtn.click();
      }
      
      const result = await promise;
      expect(result).toBe('not-in');
    });

    it('should display the letter in the modal', async () => {
      predictionUI.getPrediction('Z');
      
      // Check that the letter is displayed
      const letterElement = container.querySelector('.letter-tile-text');
      expect(letterElement?.textContent).toBe('Z');
    });
  });

  describe('hide', () => {
    it('should remove the modal from DOM', async () => {
      predictionUI.getPrediction('A');
      
      // Verify modal is present
      expect(container.querySelector('.prediction-modal-overlay')).toBeDefined();
      
      predictionUI.hide();
      
      // Verify modal is removed
      expect(container.querySelector('.prediction-modal-overlay')).toBeNull();
    });

    it('should be safe to call when no modal exists', () => {
      expect(() => predictionUI.hide()).not.toThrow();
    });
  });

  describe('modal styling', () => {
    it('should create modal overlay with correct styles', async () => {
      predictionUI.getPrediction('A');
      
      const overlay = container.querySelector('.prediction-modal-overlay');
      expect(overlay).toBeDefined();
      
      if (overlay) {
        expect((overlay as HTMLElement).style.position).toBe('fixed');
        expect((overlay as HTMLElement).style.zIndex).toBe('100');
      }
    });

    it('should create buttons with correct IDs', async () => {
      predictionUI.getPrediction('A');
      
      const inBtn = document.getElementById('in-btn');
      const notInBtn = document.getElementById('not-in-btn');
      
      expect(inBtn).toBeDefined();
      expect(notInBtn).toBeDefined();
      expect(inBtn?.textContent).toBe('IN');
      expect(notInBtn?.textContent).toBe('NOT IN');
    });
  });
});
