/**
 * Tests for PredictionUI module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Setup DOM environment for bun test (vitest jsdom env not auto-loaded)
// Always set up our own mock DOM, even if globalThis.document already exists
// (other test files may overwrite it with an incomplete mock).
// @ts-ignore
{
  // Element registry for tracking created elements by ID
  const elementsById = new Map<string, any>();

  // Helper to create a mock DOM element
  const createMockElement = (tagName: string): any => {
    const children: any[] = [];
    const eventListeners: Record<string, Function[]> = {};
    const styleObj: Record<string, string> = {};
    
    const element: any = {
      tagName: tagName.toUpperCase(),
      id: '',
      className: '',
      textContent: '',
      innerHTML: '',
      parentNode: null as any,
      get children() { return children; },
      appendChild(child: any) {
        child.parentNode = element;
        children.push(child);
        return child;
      },
      removeChild(child: any) {
        const idx = children.indexOf(child);
        if (idx > -1) {
          children.splice(idx, 1);
          child.parentNode = null;
        }
        return child;
      },
      remove() {
        if (element.parentNode && element.parentNode.children) {
          const idx = element.parentNode.children.indexOf(element);
          if (idx > -1) {
            element.parentNode.children.splice(idx, 1);
          }
        }
        element.parentNode = null;
        if (element.id) {
          elementsById.delete(element.id);
        }
      },
      querySelector(selector: string): any {
        if (selector.startsWith('.')) {
          const className = selector.slice(1);
          const search = (el: any): any => {
            if (el.className && el.className.includes(className)) {
              return el;
            }
            for (const child of (el.children || [])) {
              const found = search(child);
              if (found) return found;
            }
            return null;
          };
          return search(element);
        }
        return null;
      },
      querySelectorAll(selector: string): any[] {
        const results: any[] = [];
        if (selector.startsWith('.')) {
          const className = selector.slice(1);
          const search = (el: any) => {
            if (el.className && el.className.includes(className)) {
              results.push(el);
            }
            for (const child of (el.children || [])) {
              search(child);
            }
          };
          search(element);
        }
        return results;
      },
      addEventListener(event: string, handler: Function) {
        if (!eventListeners[event]) {
          eventListeners[event] = [];
        }
        eventListeners[event].push(handler);
      },
      removeEventListener(event: string, handler: Function) {
        const listeners = eventListeners[event];
        if (listeners) {
          const idx = listeners.indexOf(handler);
          if (idx > -1) listeners.splice(idx, 1);
        }
      },
      click() {
        const handlers = eventListeners['click'] || [];
        handlers.forEach((h: Function) => h());
      },
      focus() {
        // Mock focus - does nothing in test environment
      },
      blur() {
        // Mock blur - does nothing in test environment
      },
      setAttribute(name: string, value: string) {
        (element as any)[name] = value;
      },
      getAttribute(name: string) {
        return (element as any)[name];
      },
      dataset: {} as Record<string, string>,
    };
    
    // Style as a plain object that can be string-indexed
    element.style = styleObj;

    return element;
  };

  // Document-level event listeners storage
  const documentEventListeners: Record<string, Function[]> = {};

  // @ts-ignore
  globalThis.document = {
    createElement(tagName: string) {
      const element = createMockElement(tagName);
      // Use a proxy to track id assignments
      return new Proxy(element, {
        set(target: any, prop: string, value: any) {
          target[prop] = value;
          if (prop === 'id' && value) {
            elementsById.set(value, target);
          }
          return true;
        },
        get(target: any, prop: string) {
          // Bind methods to target so they work correctly
          const value = target[prop];
          if (typeof value === 'function') {
            return value.bind(target);
          }
          return value;
        }
      });
    },
    getElementById(id: string): any {
      return elementsById.get(id) || null;
    },
    body: createMockElement('body'),
    head: createMockElement('head'),
    addEventListener(event: string, handler: EventListenerOrEventListenerObject) {
      if (!documentEventListeners[event]) {
        documentEventListeners[event] = [];
      }
      documentEventListeners[event].push(handler as EventListener);
    },
    removeEventListener(event: string, handler: EventListenerOrEventListenerObject) {
      const listeners = documentEventListeners[event];
      if (listeners) {
        const idx = listeners.indexOf(handler as EventListener);
        if (idx > -1) listeners.splice(idx, 1);
      }
    },
  };
  
  // @ts-ignore
  globalThis.window = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

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
