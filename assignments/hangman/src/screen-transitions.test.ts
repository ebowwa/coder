/**
 * Tests for screen-transitions.ts - Smooth animated transitions between game screens
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  applyTransition,
  transitionIn,
  transitionOut,
  crossFade,
  slideTransition,
  injectTransitionStyles,
  type TransitionType,
  type TransitionOptions,
} from './screen-transitions';

describe('screen-transitions', () => {
  let element: HTMLDivElement;

  beforeEach(() => {
    element = document.createElement('div');
    element.style.display = 'none';
    document.body.appendChild(element);
  });

  describe('TransitionType', () => {
    it('should support all defined transition types', () => {
      const types: TransitionType[] = [
        'fade',
        'slide-left',
        'slide-right',
        'slide-up',
        'slide-down',
        'scale',
        'fade-scale',
      ];
      expect(types).toHaveLength(7);
    });
  });

  describe('TransitionOptions', () => {
    it('should accept options with all fields', () => {
      const options: TransitionOptions = {
        type: 'fade',
        duration: 500,
        easing: 'ease-in-out',
        delay: 100,
      };
      expect(options.type).toBe('fade');
      expect(options.duration).toBe(500);
      expect(options.easing).toBe('ease-in-out');
      expect(options.delay).toBe(100);
    });
  });

  describe('applyTransition', () => {
    it('should set transition CSS on the element', () => {
      applyTransition(element, { type: 'fade', duration: 300 });
      expect(element.style.transition).toContain('300ms');
    });

    it('should use default duration of 400ms when not specified', () => {
      applyTransition(element, { type: 'fade', duration: 400 });
      expect(element.style.transition).toContain('400ms');
    });

    it('should set will-change for performance', () => {
      applyTransition(element, { type: 'fade', duration: 300 });
      expect(element.style.willChange).toBe('transform, opacity');
    });

    it('should use custom easing when provided', () => {
      applyTransition(element, { type: 'fade', duration: 300, easing: 'ease-in' });
      expect(element.style.transition).toContain('ease-in');
    });

    it('should include delay in transition when provided', () => {
      applyTransition(element, { type: 'fade', duration: 300, delay: 50 });
      expect(element.style.transition).toContain('50ms');
    });
  });

  describe('transitionIn', () => {
    it('should set display to block', () => {
      transitionIn(element, { type: 'fade', duration: 100 });
      expect(element.style.display).toBe('block');
    });

    it('should set initial opacity to 0 for fade', () => {
      transitionIn(element, { type: 'fade', duration: 100 });
      expect(element.style.opacity).toBe('0');
    });

    it('should set initial transform for slide-left', () => {
      transitionIn(element, { type: 'slide-left', duration: 100 });
      expect(element.style.transform).toBe('translateX(100%)');
    });

    it('should set initial transform for slide-right', () => {
      transitionIn(element, { type: 'slide-right', duration: 100 });
      expect(element.style.transform).toBe('translateX(-100%)');
    });

    it('should set initial transform for slide-up', () => {
      transitionIn(element, { type: 'slide-up', duration: 100 });
      expect(element.style.transform).toBe('translateY(100%)');
    });

    it('should set initial transform for slide-down', () => {
      transitionIn(element, { type: 'slide-down', duration: 100 });
      expect(element.style.transform).toBe('translateY(-100%)');
    });

    it('should set initial transform for scale', () => {
      transitionIn(element, { type: 'scale', duration: 100 });
      expect(element.style.transform).toBe('scale(0.8)');
    });

    it('should set initial transform for fade-scale', () => {
      transitionIn(element, { type: 'fade-scale', duration: 100 });
      expect(element.style.transform).toBe('scale(0.95)');
    });

    it('should disable pointer events during transition', () => {
      transitionIn(element, { type: 'fade', duration: 100 });
      expect(element.style.pointerEvents).toBe('none');
    });

    it('should call callback after duration', () => {
      vi.useFakeTimers();
      const callback = vi.fn();
      transitionIn(element, { type: 'fade', duration: 200 }, callback);
      vi.advanceTimersByTime(250);
      expect(callback).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('transitionOut', () => {
    beforeEach(() => {
      element.style.display = 'block';
      element.style.opacity = '1';
    });

    it('should set opacity to 0 for fade', () => {
      transitionOut(element, { type: 'fade', duration: 100 });
      expect(element.style.opacity).toBe('0');
    });

    it('should set transform for slide-left', () => {
      transitionOut(element, { type: 'slide-left', duration: 100 });
      expect(element.style.transform).toBe('translateX(-100%)');
    });

    it('should set transform for slide-right', () => {
      transitionOut(element, { type: 'slide-right', duration: 100 });
      expect(element.style.transform).toBe('translateX(100%)');
    });

    it('should set transform for slide-up', () => {
      transitionOut(element, { type: 'slide-up', duration: 100 });
      expect(element.style.transform).toBe('translateY(-100%)');
    });

    it('should set transform for slide-down', () => {
      transitionOut(element, { type: 'slide-down', duration: 100 });
      expect(element.style.transform).toBe('translateY(100%)');
    });

    it('should set transform for scale', () => {
      transitionOut(element, { type: 'scale', duration: 100 });
      expect(element.style.transform).toBe('scale(0.8)');
    });

    it('should set transform for fade-scale', () => {
      transitionOut(element, { type: 'fade-scale', duration: 100 });
      expect(element.style.transform).toBe('scale(0.95)');
    });

    it('should disable pointer events during transition', () => {
      transitionOut(element, { type: 'fade', duration: 100 });
      expect(element.style.pointerEvents).toBe('none');
    });

    it('should hide element after transition completes', () => {
      vi.useFakeTimers();
      transitionOut(element, { type: 'fade', duration: 200 });
      vi.advanceTimersByTime(250);
      expect(element.style.display).toBe('none');
      vi.useRealTimers();
    });

    it('should clear transition styles after completion', () => {
      vi.useFakeTimers();
      transitionOut(element, { type: 'fade', duration: 200 });
      vi.advanceTimersByTime(250);
      expect(element.style.transition).toBe('');
      expect(element.style.willChange).toBe('auto');
      vi.useRealTimers();
    });

    it('should call callback after completion', () => {
      vi.useFakeTimers();
      const callback = vi.fn();
      transitionOut(element, { type: 'fade', duration: 200 }, callback);
      vi.advanceTimersByTime(250);
      expect(callback).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('crossFade', () => {
    let inElement: HTMLDivElement;

    beforeEach(() => {
      inElement = document.createElement('div');
      inElement.style.display = 'none';
      document.body.appendChild(inElement);
    });

    it('should return a promise', () => {
      const result = crossFade(element, inElement, { duration: 100 });
      expect(result).toBeInstanceOf(Promise);
    });

    it('should hide the out element', () => {
      vi.useFakeTimers();
      crossFade(element, inElement, { duration: 100 });
      vi.advanceTimersByTime(200);
      expect(element.style.display).toBe('none');
      vi.useRealTimers();
    });
  });

  describe('slideTransition', () => {
    let inElement: HTMLDivElement;

    beforeEach(() => {
      inElement = document.createElement('div');
      inElement.style.display = 'none';
      document.body.appendChild(inElement);
    });

    it('should return a promise', () => {
      const result = slideTransition(element, inElement, 'left', { duration: 100 });
      expect(result).toBeInstanceOf(Promise);
    });

    it('should handle left direction', () => {
      vi.useFakeTimers();
      slideTransition(element, inElement, 'left', { duration: 100 });
      // Out element should get slide-left transform
      expect(element.style.transform).toBe('translateX(-100%)');
      vi.useRealTimers();
    });

    it('should handle right direction', () => {
      vi.useFakeTimers();
      slideTransition(element, inElement, 'right', { duration: 100 });
      // Out element should get slide-right transform
      expect(element.style.transform).toBe('translateX(100%)');
      vi.useRealTimers();
    });
  });

  describe('injectTransitionStyles', () => {
    it('should inject a style element into the document head', () => {
      // Remove any existing style first
      document.getElementById('screen-transition-styles')?.remove();

      injectTransitionStyles();
      const style = document.getElementById('screen-transition-styles');
      expect(style).not.toBeNull();
      expect(style?.tagName).toBe('STYLE');
    });

    it('should not inject duplicate styles', () => {
      document.getElementById('screen-transition-styles')?.remove();

      injectTransitionStyles();
      injectTransitionStyles();

      const styles = document.querySelectorAll('#screen-transition-styles');
      expect(styles.length).toBe(1);
    });

    it('should include transition CSS rules', () => {
      document.getElementById('screen-transition-styles')?.remove();

      injectTransitionStyles();
      const style = document.getElementById('screen-transition-styles');
      expect(style?.textContent).toContain('transition-property');
    });

    it('should include hardware acceleration rules', () => {
      document.getElementById('screen-transition-styles')?.remove();

      injectTransitionStyles();
      const style = document.getElementById('screen-transition-styles');
      expect(style?.textContent).toContain('translateZ(0)');
    });

    it('should include pulse animation keyframes', () => {
      document.getElementById('screen-transition-styles')?.remove();

      injectTransitionStyles();
      const style = document.getElementById('screen-transition-styles');
      expect(style?.textContent).toContain('@keyframes pulse');
    });
  });
});
