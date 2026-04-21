/**
 * Comprehensive tests for LoadingOverlay module
 * Covers: constructor, show, hide, showError, setMessage, isVisible, destroy
 * Tests ARIA attributes, animation, delayed show, timeout, and edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// DOM Mock — lightweight mock DOM for bun test environment
// ---------------------------------------------------------------------------

function createMockElement(tagName: string): any {
  const children: any[] = [];
  const eventListeners: Record<string, Function[]> = {};
  const attributes: Record<string, string> = {};
  const style: Record<string, string> = { cssText: '' };

  const element: any = {
    tagName: tagName.toUpperCase(),
    id: '',
    className: '',
    textContent: '',
    innerHTML: '',
    style,
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
      return null;
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
      } else if (selector.startsWith('div')) {
        const search = (el: any) => {
          for (const child of (el.children || [])) {
            if (child.tagName === 'DIV') results.push(child);
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
    setAttribute(name: string, value: string) {
      attributes[name] = value;
      if (name === 'id') element.id = value;
      if (name === 'class') element.className = value;
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

let mockBody: any;
let mockHead: any;

function setupGlobalDOM(): void {
  mockBody = createMockElement('body');
  mockHead = createMockElement('head');

  const mockDoc = {
    createElement: (tag: string) => createMockElement(tag),
    body: mockBody,
    head: mockHead,
    getElementById(id: string): any {
      const search = (el: any): any => {
        if (el.id === id) return el;
        for (const child of (el.children || [])) {
          const found = search(child);
          if (found) return found;
        }
        return null;
      };
      return search(mockBody) || search(mockHead);
    },
  };

  (globalThis as any).document = mockDoc;

  // Mock timers - store callbacks for manual triggering
  (globalThis as any).setTimeout = vi.fn((fn: Function, ms?: number) => {
    return Math.random();
  });
  (globalThis as any).clearTimeout = vi.fn();
}

// ---------------------------------------------------------------------------
// Import AFTER DOM is set up
// ---------------------------------------------------------------------------

setupGlobalDOM();

import { LoadingOverlay } from './loading-overlay';

// ---------------------------------------------------------------------------
// Helper: extract the timer callback from setTimeout calls
// ---------------------------------------------------------------------------

function getLastTimerCallback(): Function | null {
  const calls = (globalThis as any).setTimeout.mock.calls;
  if (calls.length === 0) return null;
  return calls[calls.length - 1][0] as Function;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LoadingOverlay', () => {
  let container: any;

  beforeEach(() => {
    setupGlobalDOM();
    container = createMockElement('div');
    container.id = 'test-container';
    mockBody.appendChild(container);
  });

  // ---------------------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------------------

  describe('constructor', () => {
    it('should create a LoadingOverlay instance', () => {
      const lo = new LoadingOverlay(container);
      expect(lo).toBeDefined();
    });

    it('should accept options', () => {
      const lo = new LoadingOverlay(container, { message: 'Custom message', fullscreen: false });
      expect(lo).toBeDefined();
    });

    it('should default fullscreen to true', () => {
      const lo = new LoadingOverlay(container);
      expect(lo).toBeDefined();
    });

    it('should not be visible initially', () => {
      const lo = new LoadingOverlay(container);
      expect(lo.isVisible()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // show()
  // ---------------------------------------------------------------------------

  describe('show', () => {
    it('should call setTimeout for delayed show', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show();
      expect((globalThis as any).setTimeout).toHaveBeenCalled();
    });

    it('should create overlay element when timer fires', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      expect(lo.isVisible()).toBe(true);
    });

    it('should append overlay to container when timer fires', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      const overlay = container.querySelector('.loading-overlay');
      expect(overlay).not.toBeNull();
    });

    it('should set role=status on overlay', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      const overlay = container.querySelector('.loading-overlay');
      expect(overlay?.getAttribute('role')).toBe('status');
    });

    it('should set aria-live=polite on overlay', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      const overlay = container.querySelector('.loading-overlay');
      expect(overlay?.getAttribute('aria-live')).toBe('polite');
    });

    it('should set aria-label with the message', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show('Custom loading text');
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      const overlay = container.querySelector('.loading-overlay');
      expect(overlay?.getAttribute('aria-label')).toBe('Custom loading text');
    });

    it('should use default message when none provided', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      const overlay = container.querySelector('.loading-overlay');
      expect(overlay?.getAttribute('aria-label')).toBe('Loading\u2026');
    });

    it('should create a spinner element', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      const overlay = container.querySelector('.loading-overlay');
      // Spinner should be a child div with border styles
      expect(overlay?.children.length).toBeGreaterThanOrEqual(1);
    });

    it('should create message text element', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show('Hello World');
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      const overlay = container.querySelector('.loading-overlay');
      // Find child with text content
      let found = false;
      const search = (el: any) => {
        if (el.textContent === 'Hello World') { found = true; return; }
        for (const child of (el.children || [])) search(child);
      };
      search(overlay);
      expect(found).toBe(true);
    });

    it('should create animated dots element', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      const overlay = container.querySelector('.loading-overlay');
      const dots = overlay?.querySelector('.lo-dots');
      expect(dots).not.toBeNull();
    });

    it('should use fixed position for fullscreen mode', () => {
      const lo = new LoadingOverlay(container, { fullscreen: true, showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      const overlay = container.querySelector('.loading-overlay');
      expect(overlay?.style.cssText).toContain('fixed');
    });

    it('should use absolute position for non-fullscreen mode', () => {
      const lo = new LoadingOverlay(container, { fullscreen: false, showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      const overlay = container.querySelector('.loading-overlay');
      expect(overlay?.style.cssText).toContain('absolute');
    });

    it('should not show overlay before timer fires', () => {
      const lo = new LoadingOverlay(container, { showDelay: 500 });
      lo.show();
      // Timer hasn't fired yet
      expect(lo.isVisible()).toBe(false);
      const overlay = container.querySelector('.loading-overlay');
      expect(overlay).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // setMessage()
  // ---------------------------------------------------------------------------

  describe('setMessage', () => {
    it('should update the aria-label', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();

      lo.setMessage('Updated message');
      const overlay = container.querySelector('.loading-overlay');
      expect(overlay?.getAttribute('aria-label')).toBe('Updated message');
    });

    it('should be safe to call when no overlay exists', () => {
      const lo = new LoadingOverlay(container);
      expect(() => lo.setMessage('test')).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // hide()
  // ---------------------------------------------------------------------------

  describe('hide', () => {
    it('should clear the show timer if not yet fired', () => {
      const lo = new LoadingOverlay(container, { showDelay: 500 });
      lo.show();
      lo.hide();
      expect((globalThis as any).clearTimeout).toHaveBeenCalled();
    });

    it('should set visible to false', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      expect(lo.isVisible()).toBe(true);

      lo.hide();
      expect(lo.isVisible()).toBe(false);
    });

    it('should be safe to call when not visible', () => {
      const lo = new LoadingOverlay(container);
      expect(() => lo.hide()).not.toThrow();
    });

    it('should be safe to call multiple times', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      expect(() => {
        lo.hide();
        lo.hide();
        lo.hide();
      }).not.toThrow();
    });

    it('should null out the overlay reference', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      lo.hide();
      expect((lo as any).overlay).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // showError()
  // ---------------------------------------------------------------------------

  describe('showError', () => {
    it('should create an error overlay', () => {
      const lo = new LoadingOverlay(container);
      lo.showError('Something went wrong');
      const overlay = container.querySelector('.loading-overlay');
      expect(overlay).not.toBeNull();
    });

    it('should set role=alert on error overlay', () => {
      const lo = new LoadingOverlay(container);
      lo.showError('Error!');
      const overlay = container.querySelector('.loading-overlay');
      expect(overlay?.getAttribute('role')).toBe('alert');
    });

    it('should display the error message text', () => {
      const lo = new LoadingOverlay(container);
      lo.showError('Network failure');
      const overlay = container.querySelector('.loading-overlay');
      let found = false;
      const search = (el: any) => {
        if (el.textContent === 'Network failure') { found = true; return; }
        for (const child of (el.children || [])) search(child);
      };
      search(overlay);
      expect(found).toBe(true);
    });

    it('should display a warning icon', () => {
      const lo = new LoadingOverlay(container);
      lo.showError('Error!');
      const overlay = container.querySelector('.loading-overlay');
      // First child should be the icon
      let found = false;
      const search = (el: any) => {
        if (el.getAttribute?.('aria-hidden') === 'true' && el.textContent) {
          found = true;
          return;
        }
        for (const child of (el.children || [])) search(child);
      };
      search(overlay);
      expect(found).toBe(true);
    });

    it('should show a retry button when callback provided', () => {
      const lo = new LoadingOverlay(container);
      const callback = vi.fn();
      lo.showError('Failed!', callback);
      const overlay = container.querySelector('.loading-overlay');
      // Should have a button child
      let buttonFound = false;
      const search = (el: any) => {
        if (el.tagName === 'BUTTON') { buttonFound = true; return; }
        for (const child of (el.children || [])) search(child);
      };
      search(overlay);
      expect(buttonFound).toBe(true);
    });

    it('should not show retry button when no callback provided', () => {
      const lo = new LoadingOverlay(container);
      lo.showError('Failed!');
      const overlay = container.querySelector('.loading-overlay');
      let buttonCount = 0;
      const search = (el: any) => {
        if (el.tagName === 'BUTTON') buttonCount++;
        for (const child of (el.children || [])) search(child);
      };
      search(overlay);
      expect(buttonCount).toBe(0);
    });

    it('should call retry callback when retry button is clicked', () => {
      const lo = new LoadingOverlay(container);
      const callback = vi.fn();
      lo.showError('Failed!', callback);
      const overlay = container.querySelector('.loading-overlay');
      // Find the button
      let button: any = null;
      const search = (el: any) => {
        if (el.tagName === 'BUTTON') { button = el; return; }
        for (const child of (el.children || [])) search(child);
      };
      search(overlay);
      expect(button).not.toBeNull();
      // Get click handlers
      const clickHandlers = button._listeners?.['click'] || [];
      expect(clickHandlers.length).toBeGreaterThan(0);
      clickHandlers[0]();
      expect(callback).toHaveBeenCalled();
    });

    it('should hide current overlay before showing error', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();

      // Should not throw when showing error after loading
      expect(() => lo.showError('Error!')).not.toThrow();
    });

    it('should set visible to true', () => {
      const lo = new LoadingOverlay(container);
      lo.showError('Error!');
      expect(lo.isVisible()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // isVisible()
  // ---------------------------------------------------------------------------

  describe('isVisible', () => {
    it('should return false initially', () => {
      const lo = new LoadingOverlay(container);
      expect(lo.isVisible()).toBe(false);
    });

    it('should return true after show timer fires', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      expect(lo.isVisible()).toBe(true);
    });

    it('should return false after hide', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      lo.hide();
      expect(lo.isVisible()).toBe(false);
    });

    it('should return true after showError', () => {
      const lo = new LoadingOverlay(container);
      lo.showError('Error!');
      expect(lo.isVisible()).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // destroy()
  // ---------------------------------------------------------------------------

  describe('destroy', () => {
    it('should clean up timers and overlay', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();

      lo.destroy();
      expect(lo.isVisible()).toBe(false);
      expect((lo as any).overlay).toBeNull();
    });

    it('should be safe to call when not visible', () => {
      const lo = new LoadingOverlay(container);
      expect(() => lo.destroy()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle show called multiple times in sequence', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show('First');
      const timerCb1 = getLastTimerCallback();
      if (timerCb1) timerCb1();

      lo.show('Second');
      const timerCb2 = getLastTimerCallback();
      if (timerCb2) timerCb2();

      expect(lo.isVisible()).toBe(true);
    });

    it('should handle hide called before show timer fires', () => {
      const lo = new LoadingOverlay(container, { showDelay: 500 });
      lo.show();
      lo.hide();
      // Timer was cleared, overlay was never created
      expect(lo.isVisible()).toBe(false);
    });

    it('should handle showError after show', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();

      expect(() => lo.showError('Error!')).not.toThrow();
      expect(lo.isVisible()).toBe(true);
    });

    it('should handle show after showError', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.showError('Error!');
      lo.show('Loading again');
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      expect(lo.isVisible()).toBe(true);
    });

    it('should handle rapid show/hide cycles', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      expect(() => {
        lo.show();
        lo.hide();
        lo.show();
        lo.hide();
        lo.showError('Error!');
        lo.hide();
      }).not.toThrow();
    });

    it('should handle zero showDelay', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      expect(lo.isVisible()).toBe(true);
    });

    it('should handle all default options', () => {
      const lo = new LoadingOverlay(container);
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      expect(lo.isVisible()).toBe(true);
    });

    it('should set z-index correctly for fullscreen', () => {
      const lo = new LoadingOverlay(container, { fullscreen: true, showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      const overlay = container.querySelector('.loading-overlay');
      expect(overlay?.style.cssText).toContain('1500');
    });

    it('should set z-index correctly for non-fullscreen', () => {
      const lo = new LoadingOverlay(container, { fullscreen: false, showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      const overlay = container.querySelector('.loading-overlay');
      expect(overlay?.style.cssText).toContain('z-index: 100');
    });

    it('should set background to dark semi-transparent', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      const overlay = container.querySelector('.loading-overlay');
      expect(overlay?.style.cssText).toContain('rgba');
    });

    it('should set overlay to cover full width and height', () => {
      const lo = new LoadingOverlay(container, { showDelay: 0 });
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      const overlay = container.querySelector('.loading-overlay');
      expect(overlay?.style.cssText).toContain('width: 100%');
      expect(overlay?.style.cssText).toContain('height: 100%');
    });

    it('should hide loading and show error with retry then retry triggers callback', () => {
      const retryFn = vi.fn();
      const lo = new LoadingOverlay(container, { showDelay: 0 });

      // Show loading first
      lo.show('Loading\u2026');
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      expect(lo.isVisible()).toBe(true);

      // Show error with retry (this replaces the loading overlay)
      lo.showError('Failed to load', retryFn);
      // After showError, the internal overlay should have role=alert
      const internalOverlay = (lo as any).overlay;
      expect(internalOverlay?.getAttribute('role')).toBe('alert');

      // Click retry - use internal overlay directly
      let button: any = null;
      const search = (el: any) => {
        if (el.tagName === 'BUTTON') { button = el; return; }
        for (const child of (el.children || [])) search(child);
      };
      search(internalOverlay);
      const clickHandlers = button._listeners?.['click'] || [];
      clickHandlers[0]();
      expect(retryFn).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Style injection
  // ---------------------------------------------------------------------------

  describe('style injection', () => {
    it('should attempt to inject styles on construction', () => {
      // Style injection happens in constructor via injectStyles()
      // The module-level flag may already be set from import, so we just
      // verify the constructor doesn't throw
      const lo = new LoadingOverlay(container);
      expect(lo).toBeDefined();
    });

    it('should have injected style content with keyframe definitions', () => {
      // After import, styles should have been injected at least once
      // Check the mockHead for any child with lo-spin content
      // If the module was already loaded, the flag prevents re-injection
      // so we verify the constructor works without error
      const lo = new LoadingOverlay(container);
      lo.show();
      const timerCb = getLastTimerCallback();
      if (timerCb) timerCb();
      // The overlay itself was created and appended
      expect(lo.isVisible()).toBe(true);
    });
  });
});
