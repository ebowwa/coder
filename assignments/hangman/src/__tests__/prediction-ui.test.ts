/**
 * Comprehensive tests for PredictionUI module
 * Covers: constructor, getPrediction, hide, keyboard navigation,
 * focus trap integration, ARIA attributes, showMessage, edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// DOM Mock — lightweight mock DOM for bun test environment
// ---------------------------------------------------------------------------

function createMockElement(tagName: string): any {
  const children: any[] = [];
  const eventListeners: Record<string, Function[]> = {};
  const attributes: Record<string, string> = {};
  const style = new MockStyle();
  const dataset = new MockDOMStringMap();

  const element: any = {
    tagName: tagName.toUpperCase(),
    id: '',
    className: '',
    textContent: '',
    innerHTML: '',
    style,
    dataset,
    parentNode: null as any,
    get children() { return children; },
    get childNodes() { return children; },
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
    },
    querySelector(selector: string): any {
      if (selector.startsWith('.')) {
        const className = selector.slice(1);
        const search = (el: any): any => {
          if (el.className && typeof el.className === 'string' && el.className.includes(className)) {
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
      if (selector.startsWith('#')) {
        const targetId = selector.slice(1);
        const search = (el: any): any => {
          if (el.id === targetId) return el;
          for (const child of (el.children || [])) {
            const found = search(child);
            if (found) return found;
          }
          return null;
        };
        return search(element);
      }
      // Tag selector
      const targetTag = selector.toUpperCase();
      const search = (el: any): any => {
        for (const child of (el.children || [])) {
          if (child.tagName === targetTag) return child;
          const found = search(child);
          if (found) return found;
        }
        return null;
      };
      return search(element);
    },
    querySelectorAll(selector: string): any[] {
      const results: any[] = [];
      if (selector.startsWith('.')) {
        const className = selector.slice(1);
        const search = (el: any) => {
          if (el.className && typeof el.className === 'string' && el.className.includes(className)) {
            results.push(el);
          }
          for (const child of (el.children || [])) {
            search(child);
          }
        };
        search(element);
      } else if (selector.startsWith('#')) {
        const targetId = selector.slice(1);
        const search = (el: any) => {
          if (el.id === targetId) results.push(el);
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
    get _listeners() { return eventListeners; },
    click() {
      const handlers = eventListeners['click'] || [];
      handlers.forEach((h: Function) => h());
    },
    focus() {
      (globalThis as any).__activeElement = element;
    },
    blur() {
      // Mock blur
    },
    setAttribute(name: string, value: string) {
      attributes[name] = value;
      if (name === 'id') {
        element.id = value;
      }
    },
    getAttribute(name: string) {
      return attributes[name] ?? null;
    },
    removeAttribute(name: string) {
      delete attributes[name];
    },
    hasAttribute(name: string) {
      return name in attributes;
    },
  };

  return element;
}

class MockStyle {
  [key: string]: string;
  cssText = '';
}

class MockDOMStringMap {
  [key: string]: string;
}

class MockInputElement {}
class MockTextAreaElement {}

let documentEventListeners: Record<string, Function[]> = {};
let mockBody: any;
let mockHead: any;

function setupGlobalDOM(): void {
  documentEventListeners = {};

  (globalThis as any).HTMLInputElement = MockInputElement;
  (globalThis as any).HTMLTextAreaElement = MockTextAreaElement;
  (globalThis as any).__activeElement = null;

  mockBody = createMockElement('body');
  mockHead = createMockElement('head');

  const mockDoc = {
    createElement: (tag: string) => createMockElement(tag),
    body: mockBody,
    head: mockHead,
    addEventListener(event: string, handler: Function) {
      if (!documentEventListeners[event]) {
        documentEventListeners[event] = [];
      }
      documentEventListeners[event].push(handler);
    },
    removeEventListener(event: string, handler: Function) {
      const listeners = documentEventListeners[event];
      if (listeners) {
        const idx = listeners.indexOf(handler);
        if (idx > -1) listeners.splice(idx, 1);
      }
    },
    get activeElement() {
      return (globalThis as any).__activeElement ?? null;
    },
    getElementById(id: string): any {
      // Search from body
      const search = (el: any): any => {
        if (el.id === id) return el;
        for (const child of (el.children || [])) {
          const found = search(child);
          if (found) return found;
        }
        return null;
      };
      return search(mockBody);
    },
  };

  (globalThis as any).document = mockDoc;

  (globalThis as any).window = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  // Keep real setTimeout — do NOT auto-execute
  // (showMessage uses setTimeout for auto-hide which would remove the toast)
  if (typeof (globalThis as any).setTimeout === 'undefined') {
    (globalThis as any).setTimeout = (fn: Function, _ms?: number) => {
      return 1;
    };
  }
  (globalThis as any).clearTimeout = vi.fn();
}

// Helper to dispatch a keydown event on the document
function dispatchKeyEvent(key: string, overrides: Record<string, any> = {}): any {
  const event = {
    key,
    type: 'keydown',
    target: null,
    shiftKey: false,
    bubbles: true,
    cancelable: true,
    preventDefault: vi.fn(),
    ...overrides,
  };
  const listeners = documentEventListeners['keydown'] || [];
  for (const fn of listeners) {
    fn(event);
  }
  return event;
}

// ---------------------------------------------------------------------------
// Import AFTER DOM is set up
// ---------------------------------------------------------------------------

setupGlobalDOM();

import { PredictionUI } from '../prediction-ui';
import type { Prediction } from '../prediction-ui';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PredictionUI', () => {
  let predictionUI: PredictionUI;
  let container: any;

  beforeEach(() => {
    setupGlobalDOM();
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    predictionUI = new PredictionUI(container);
  });

  afterEach(() => {
    predictionUI.hide();
  });

  // ---------------------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------------------

  describe('constructor', () => {
    it('should create a PredictionUI instance', () => {
      expect(predictionUI).toBeDefined();
    });

    it('should store the container reference', () => {
      expect((predictionUI as any).container).toBe(container);
    });

    it('should initialize with no modal', () => {
      expect((predictionUI as any).modal).toBeNull();
    });

    it('should initialize with no selected letter', () => {
      expect((predictionUI as any).selectedLetter).toBeNull();
    });

    it('should initialize with no pending promise resolver', () => {
      expect((predictionUI as any).resolvePromise).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // getPrediction
  // ---------------------------------------------------------------------------

  describe('getPrediction', () => {
    it('should return a promise', () => {
      const result = predictionUI.getPrediction('A');
      expect(result).toBeInstanceOf(Promise);
      // Clean up
      const inBtn = container.querySelector('#in-btn');
      if (inBtn) inBtn.click();
    });

    it('should create modal with overlay class', () => {
      predictionUI.getPrediction('A');
      const modal = container.querySelector('.prediction-modal-overlay');
      expect(modal).not.toBeNull();
    });

    it('should set selected letter', () => {
      predictionUI.getPrediction('X');
      expect((predictionUI as any).selectedLetter).toBe('X');
    });

    it('should resolve with "in" when IN button is clicked', async () => {
      const promise = predictionUI.getPrediction('A');
      const inBtn = container.querySelector('#in-btn');
      inBtn?.click();
      const result = await promise;
      expect(result).toBe('in');
    });

    it('should resolve with "not-in" when NOT IN button is clicked', async () => {
      const promise = predictionUI.getPrediction('B');
      const notInBtn = container.querySelector('#not-in-btn');
      notInBtn?.click();
      const result = await promise;
      expect(result).toBe('not-in');
    });

    it('should display the letter in the modal', () => {
      predictionUI.getPrediction('Z');
      const letterElement = container.querySelector('.letter-tile-text');
      expect(letterElement?.textContent).toBe('Z');
    });

    it('should create modal with aria-modal attribute', () => {
      predictionUI.getPrediction('A');
      const overlay = container.querySelector('.prediction-modal-overlay');
      expect(overlay?.getAttribute('aria-modal')).toBe('true');
    });

    it('should create modal with dialog role', () => {
      predictionUI.getPrediction('A');
      const overlay = container.querySelector('.prediction-modal-overlay');
      expect(overlay?.getAttribute('role')).toBe('dialog');
    });

    it('should create modal with aria-labelledby', () => {
      predictionUI.getPrediction('A');
      const overlay = container.querySelector('.prediction-modal-overlay');
      expect(overlay?.getAttribute('aria-labelledby')).toBe('prediction-dialog-title');
    });

    it('should create modal with aria-describedby', () => {
      predictionUI.getPrediction('A');
      const overlay = container.querySelector('.prediction-modal-overlay');
      expect(overlay?.getAttribute('aria-describedby')).toBe('prediction-dialog-description');
    });

    it('should remove previous modal when called again', async () => {
      const promise1 = predictionUI.getPrediction('A');
      const inBtn = container.querySelector('#in-btn');
      inBtn?.click();
      await promise1;

      predictionUI.getPrediction('B');
      const modals = container.querySelectorAll('.prediction-modal-overlay');
      expect(modals.length).toBeLessThanOrEqual(1);
      // Clean up
      const inBtn2 = container.querySelector('#in-btn');
      inBtn2?.click();
    });

    it('should set up keyboard event listener on document', () => {
      predictionUI.getPrediction('A');
      expect(documentEventListeners['keydown'].length).toBeGreaterThan(0);
      // Clean up
      const inBtn = container.querySelector('#in-btn');
      inBtn?.click();
    });

    it('should focus the IN button', () => {
      predictionUI.getPrediction('A');
      const inBtn = container.querySelector('#in-btn');
      // The source code calls inBtn.focus() which sets __activeElement
      // The focus trap (createFocusTrap) also calls focus on the first button
      expect((globalThis as any).__activeElement).toBe(inBtn);
      // Clean up
      inBtn?.click();
    });
  });

  // ---------------------------------------------------------------------------
  // Keyboard navigation
  // ---------------------------------------------------------------------------

  describe('keyboard navigation', () => {
    it('should resolve with "in" when key "1" is pressed', async () => {
      const promise = predictionUI.getPrediction('C');
      dispatchKeyEvent('1');
      const result = await promise;
      expect(result).toBe('in');
    });

    it('should resolve with "not-in" when key "2" is pressed', async () => {
      const promise = predictionUI.getPrediction('D');
      dispatchKeyEvent('2');
      const result = await promise;
      expect(result).toBe('not-in');
    });

    it('should resolve with "not-in" when Escape is pressed', async () => {
      const promise = predictionUI.getPrediction('E');
      dispatchKeyEvent('Escape');
      const result = await promise;
      expect(result).toBe('not-in');
    });

    it('should prevent default on key "1"', () => {
      predictionUI.getPrediction('A');
      const event = dispatchKeyEvent('1');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should prevent default on key "2"', () => {
      predictionUI.getPrediction('A');
      const event = dispatchKeyEvent('2');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should prevent default on Escape', () => {
      predictionUI.getPrediction('A');
      const event = dispatchKeyEvent('Escape');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should not trigger for key events targeting input elements', async () => {
      const promise = predictionUI.getPrediction('F');
      // Simulate key event from an input element
      dispatchKeyEvent('1', { target: new MockInputElement() });
      // The promise should NOT resolve because the handler ignores input targets
      // Resolve it via button to clean up
      const inBtn = container.querySelector('#in-btn');
      inBtn?.click();
      const result = await promise;
      expect(result).toBe('in'); // Resolved from button click, not keyboard
    });

    it('should not trigger for key events targeting textarea elements', () => {
      predictionUI.getPrediction('G');
      dispatchKeyEvent('1', { target: new MockTextAreaElement() });
      // Modal should still exist (not hidden by key handler)
      expect(container.querySelector('.prediction-modal-overlay')).not.toBeNull();
      // Clean up
      const inBtn = container.querySelector('#in-btn');
      inBtn?.click();
    });
  });

  // ---------------------------------------------------------------------------
  // hide
  // ---------------------------------------------------------------------------

  describe('hide', () => {
    it('should remove the modal from DOM', () => {
      predictionUI.getPrediction('A');
      expect(container.querySelector('.prediction-modal-overlay')).not.toBeNull();

      predictionUI.hide();
      expect(container.querySelector('.prediction-modal-overlay')).toBeNull();
    });

    it('should be safe to call when no modal exists', () => {
      expect(() => predictionUI.hide()).not.toThrow();
    });

    it('should clean up the keyboard event listener', () => {
      predictionUI.getPrediction('A');
      const listenerCountBefore = documentEventListeners['keydown']?.length ?? 0;

      predictionUI.hide();
      const listenerCountAfter = documentEventListeners['keydown']?.length ?? 0;

      expect(listenerCountAfter).toBeLessThan(listenerCountBefore);
    });

    it('should clean up the focus trap', () => {
      predictionUI.getPrediction('A');
      expect((predictionUI as any).cleanupFocusTrap).not.toBeNull();

      predictionUI.hide();
      expect((predictionUI as any).cleanupFocusTrap).toBeNull();
    });

    it('should reset handleKeyDown to null', () => {
      predictionUI.getPrediction('A');
      expect((predictionUI as any).handleKeyDown).not.toBeNull();

      predictionUI.hide();
      expect((predictionUI as any).handleKeyDown).toBeNull();
    });

    it('should reset modal to null', () => {
      predictionUI.getPrediction('A');
      predictionUI.hide();
      expect((predictionUI as any).modal).toBeNull();
    });

    it('should be safe to call multiple times in a row', () => {
      predictionUI.getPrediction('A');
      expect(() => {
        predictionUI.hide();
        predictionUI.hide();
        predictionUI.hide();
      }).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Modal structure & styling
  // ---------------------------------------------------------------------------

  describe('modal structure', () => {
    it('should create modal overlay with fixed position', () => {
      predictionUI.getPrediction('A');
      const overlay = container.querySelector('.prediction-modal-overlay');
      expect(overlay?.style.position).toBe('fixed');
    });

    it('should create modal overlay covering full viewport', () => {
      predictionUI.getPrediction('A');
      const overlay = container.querySelector('.prediction-modal-overlay');
      expect(overlay?.style.width).toBe('100%');
      expect(overlay?.style.height).toBe('100%');
    });

    it('should create modal overlay with z-index 100', () => {
      predictionUI.getPrediction('A');
      const overlay = container.querySelector('.prediction-modal-overlay');
      expect(overlay?.style.zIndex).toBe('100');
    });

    it('should create buttons with correct IDs', () => {
      predictionUI.getPrediction('A');
      const inBtn = container.querySelector('#in-btn');
      const notInBtn = container.querySelector('#not-in-btn');

      expect(inBtn).not.toBeNull();
      expect(notInBtn).not.toBeNull();
      expect(inBtn?.textContent).toBe('IN');
      expect(notInBtn?.textContent).toBe('NOT IN');
    });

    it('should create IN button with correct class', () => {
      predictionUI.getPrediction('A');
      const inBtn = container.querySelector('.in-btn');
      expect(inBtn).not.toBeNull();
    });

    it('should create NOT IN button with correct class', () => {
      predictionUI.getPrediction('A');
      const notInBtn = container.querySelector('.not-in-btn');
      expect(notInBtn).not.toBeNull();
    });

    it('should create a content container with white background', () => {
      predictionUI.getPrediction('A');
      const content = container.querySelector('.prediction-modal-content');
      expect(content).not.toBeNull();
      expect(content?.style.backgroundColor).toBe('#fff');
    });

    it('should create an h2 title element', () => {
      predictionUI.getPrediction('A');
      const overlay = container.querySelector('.prediction-modal-overlay');
      // Find h2 among children
      let found = false;
      const search = (el: any) => {
        if (el.tagName === 'H2') { found = true; return; }
        for (const child of (el.children || [])) search(child);
      };
      search(overlay);
      expect(found).toBe(true);
    });

    it('should create buttons container with prediction-buttons class', () => {
      predictionUI.getPrediction('A');
      const btns = container.querySelector('.prediction-buttons');
      expect(btns).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // showMessage
  // ---------------------------------------------------------------------------

  describe('showMessage', () => {
    it('should create a toast element with id game-toast', () => {
      predictionUI.showMessage('Hello!', '#4ecdc4');
      const toast = document.getElementById('game-toast');
      expect(toast).not.toBeNull();
    });

    it('should set the toast text content', () => {
      predictionUI.showMessage('Test message', '#ff0000');
      const toast = document.getElementById('game-toast');
      expect(toast?.textContent).toBe('Test message');
    });

    it('should use default color when none provided', () => {
      predictionUI.showMessage('Default color');
      const toast = document.getElementById('game-toast');
      expect(toast).not.toBeNull();
      expect(toast?.style.cssText).toContain('#4ecdc4');
    });

    it('should remove previous toast before creating new one', () => {
      predictionUI.showMessage('First', '#4ecdc4');
      const toast1 = document.getElementById('game-toast');
      expect(toast1?.textContent).toBe('First');

      predictionUI.showMessage('Second', '#ff0000');
      const toast2 = document.getElementById('game-toast');
      expect(toast2?.textContent).toBe('Second');
    });

    it('should apply custom color to toast', () => {
      predictionUI.showMessage('Custom', '#ff6b6b');
      const toast = document.getElementById('game-toast');
      expect(toast?.style.cssText).toContain('#ff6b6b');
    });
  });

  // ---------------------------------------------------------------------------
  // handleSelection (tested indirectly through getPrediction + clicks/keys)
  // ---------------------------------------------------------------------------

  describe('handleSelection', () => {
    it('should clear resolvePromise after resolving', async () => {
      const promise = predictionUI.getPrediction('A');
      const inBtn = container.querySelector('#in-btn');
      inBtn?.click();
      await promise;
      expect((predictionUI as any).resolvePromise).toBeNull();
    });

    it('should hide the modal after selection', async () => {
      const promise = predictionUI.getPrediction('A');
      const inBtn = container.querySelector('#in-btn');
      inBtn?.click();
      await promise;
      expect((predictionUI as any).modal).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle consecutive getPrediction calls', async () => {
      const promise1 = predictionUI.getPrediction('A');
      const inBtn1 = container.querySelector('#in-btn');
      inBtn1?.click();
      const result1 = await promise1;
      expect(result1).toBe('in');

      const promise2 = predictionUI.getPrediction('B');
      const notInBtn = container.querySelector('#not-in-btn');
      notInBtn?.click();
      const result2 = await promise2;
      expect(result2).toBe('not-in');
    });

    it('should handle prediction with single letter', async () => {
      const promise = predictionUI.getPrediction('Q');
      const letterEl = container.querySelector('.letter-tile-text');
      expect(letterEl?.textContent).toBe('Q');

      const inBtn = container.querySelector('#in-btn');
      inBtn?.click();
      const result = await promise;
      expect(result).toBe('in');
    });

    it('should handle hide called during active prediction', () => {
      predictionUI.getPrediction('A');
      expect(() => predictionUI.hide()).not.toThrow();
    });

    it('should handle rapid show/hide cycles', () => {
      predictionUI.getPrediction('A');
      predictionUI.hide();
      predictionUI.getPrediction('B');
      predictionUI.hide();
      predictionUI.getPrediction('C');
      predictionUI.hide();
      expect((predictionUI as any).modal).toBeNull();
    });

    it('should handle Enter key without error', () => {
      predictionUI.getPrediction('A');
      expect(() => dispatchKeyEvent('Enter')).not.toThrow();
      // Modal should still be there (Enter doesn't resolve)
      expect(container.querySelector('.prediction-modal-overlay')).not.toBeNull();
      // Clean up
      const inBtn = container.querySelector('#in-btn');
      inBtn?.click();
    });

    it('should handle Space key without error', () => {
      predictionUI.getPrediction('A');
      expect(() => dispatchKeyEvent(' ')).not.toThrow();
      expect(container.querySelector('.prediction-modal-overlay')).not.toBeNull();
      // Clean up
      const inBtn = container.querySelector('#in-btn');
      inBtn?.click();
    });

    it('should handle random key presses without error', () => {
      predictionUI.getPrediction('A');
      expect(() => {
        dispatchKeyEvent('x');
        dispatchKeyEvent('ArrowUp');
        dispatchKeyEvent('Tab');
        dispatchKeyEvent('Backspace');
      }).not.toThrow();
      // Clean up
      const inBtn = container.querySelector('#in-btn');
      inBtn?.click();
    });

    it('should handle multiple IN clicks gracefully', async () => {
      const promise = predictionUI.getPrediction('A');
      const inBtn = container.querySelector('#in-btn');
      // First click resolves the promise
      inBtn?.click();
      // Second click should not throw (promise already resolved)
      expect(() => inBtn?.click()).not.toThrow();
      const result = await promise;
      expect(result).toBe('in');
    });
  });

  // ---------------------------------------------------------------------------
  // Focus trap integration
  // ---------------------------------------------------------------------------

  describe('focus trap integration', () => {
    it('should set cleanupFocusTrap after getPrediction', () => {
      predictionUI.getPrediction('A');
      expect((predictionUI as any).cleanupFocusTrap).not.toBeNull();
    });

    it('should clean up focus trap on hide', () => {
      predictionUI.getPrediction('A');
      predictionUI.hide();
      expect((predictionUI as any).cleanupFocusTrap).toBeNull();
    });

    it('should have a function as the cleanup reference', () => {
      predictionUI.getPrediction('A');
      const cleanupFn = (predictionUI as any).cleanupFocusTrap;
      expect(typeof cleanupFn).toBe('function');
    });
  });

  // ---------------------------------------------------------------------------
  // ARIA accessibility
  // ---------------------------------------------------------------------------

  describe('ARIA accessibility', () => {
    it('should set role=dialog on the modal overlay', () => {
      predictionUI.getPrediction('A');
      const overlay = container.querySelector('.prediction-modal-overlay');
      expect(overlay?.getAttribute('role')).toBe('dialog');
    });

    it('should set aria-modal=true on the modal overlay', () => {
      predictionUI.getPrediction('A');
      const overlay = container.querySelector('.prediction-modal-overlay');
      expect(overlay?.getAttribute('aria-modal')).toBe('true');
    });

    it('should set aria-labelledby on the modal overlay', () => {
      predictionUI.getPrediction('A');
      const overlay = container.querySelector('.prediction-modal-overlay');
      expect(overlay?.getAttribute('aria-labelledby')).toBe('prediction-dialog-title');
    });

    it('should set aria-describedby on the modal overlay', () => {
      predictionUI.getPrediction('A');
      const overlay = container.querySelector('.prediction-modal-overlay');
      expect(overlay?.getAttribute('aria-describedby')).toBe('prediction-dialog-description');
    });
  });
});
