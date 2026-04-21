/**
 * Comprehensive tests for PowerUpUI module
 * Covers: constructor, DOM structure, rendering power-up buttons (hint, skip, extra-life),
 * click event handling, disabling buttons when unavailable, updating remaining counts,
 * show/hide/destroy lifecycle, hover styling, getContainer, and edge cases.
 *
 * Uses a lightweight DOM mock installed before module import so bun (no built-in DOM)
 * can run these tests.
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
  let _innerHTML = '';
  const dataset: Record<string, string> = {};

  const element: any = {
    tagName: tagName.toUpperCase(),
    id: '',
    className: '',
    textContent: '',
    get innerHTML() { return _innerHTML; },
    set innerHTML(html: string) {
      _innerHTML = html;
      children.length = 0;
      const tagRe = /<(\w+)((?:\s[^>]*)?)>/g;
      let match: RegExpExecArray | null;
      while ((match = tagRe.exec(html)) !== null) {
        const tName = match[1].toUpperCase();
        if (tName.startsWith('/')) continue;
        const child = createMockElement(tName);
        const attrStr = match[2];
        const attrRe = /([\w-]+)\s*=\s*"([^"]*)"/g;
        let am: RegExpExecArray | null;
        while ((am = attrRe.exec(attrStr)) !== null) {
          const name = am[1];
          const value = am[2];
          child.setAttribute(name, value);
          if (name === 'id') child.id = value;
          else if (name === 'class') child.className = value;
        }
        child.parentNode = element;
        children.push(child);
      }
    },
    style,
    dataset,
    disabled: false,
    parentNode: null as any,
    get children() { return children; },
    get childNodes() { return children; },
    _removed: false,
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
        if (idx > -1) element.parentNode.children.splice(idx, 1);
      }
      element.parentNode = null;
      element._removed = true;
    },
    querySelector(selector: string): any {
      const selectors = selector.split(',').map(s => s.trim());
      for (const sel of selectors) {
        const result = queryOne(element, sel);
        if (result) return result;
      }
      return null;
    },
    querySelectorAll(selector: string): any[] {
      const results: any[] = [];
      const selectors = selector.split(',').map(s => s.trim());
      for (const sel of selectors) {
        queryAll(element, sel, results);
      }
      return results;
    },
    addEventListener(event: string, handler: Function) {
      if (!eventListeners[event]) eventListeners[event] = [];
      eventListeners[event].push(handler);
    },
    removeEventListener(event: string, handler: Function) {
      const arr = eventListeners[event];
      if (arr) { const i = arr.indexOf(handler); if (i > -1) arr.splice(i, 1); }
    },
    click() {
      (eventListeners['click'] || []).forEach(h => h());
    },
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
    get _listeners() { return eventListeners; },
    get _attributes() { return attributes; },
  };

  return element;
}

function queryOne(el: any, selector: string): any {
  if (selector.startsWith('#')) {
    const id = selector.slice(1);
    if (el.id === id) return el;
    for (const child of (el.children || [])) {
      const found = queryOne(child, selector);
      if (found) return found;
    }
  } else if (selector.startsWith('.')) {
    const cn = selector.slice(1);
    if (el.className && typeof el.className === 'string' && el.className.includes(cn)) return el;
    for (const child of (el.children || [])) {
      const found = queryOne(child, selector);
      if (found) return found;
    }
  }
  return null;
}

function queryAll(el: any, selector: string, results: any[]) {
  if (selector.startsWith('#')) {
    if (el.id === selector.slice(1)) results.push(el);
  } else if (selector.startsWith('.')) {
    const cn = selector.slice(1);
    if (el.className && typeof el.className === 'string' && el.className.includes(cn)) results.push(el);
  }
  for (const child of (el.children || [])) {
    queryAll(child, selector, results);
  }
}

let mockBody: any;

function setupGlobalDOM(): void {
  mockBody = createMockElement('body');

  const mockDoc = {
    createElement: (tag: string) => createMockElement(tag),
    body: mockBody,
    getElementById(id: string): any {
      const search = (el: any): any => {
        if (el._removed) return null;
        if (el.id === id) return el;
        for (const child of (el.children || [])) {
          const found = search(child);
          if (found) return found;
        }
        return null;
      };
      return search(mockBody);
    },
    querySelector(selector: string): any {
      return queryOne(mockBody, selector);
    },
    querySelectorAll(selector: string): any[] {
      const results: any[] = [];
      const selectors = selector.split(',').map(s => s.trim());
      for (const sel of selectors) {
        queryAll(mockBody, sel, results);
      }
      return results;
    },
  };

  (globalThis as any).document = mockDoc;
}

// ---------------------------------------------------------------------------
// Install DOM BEFORE import
// ---------------------------------------------------------------------------

setupGlobalDOM();

import { PowerUpUI, type PowerUpUIOptions } from './powerup-ui';
import { MAX_INVENTORY } from './powerups';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const POWERUP_TYPES = ['hint', 'skip', 'extra-life'] as const;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PowerUpUI', () => {
  let onPowerUp: ReturnType<typeof vi.fn>;
  let ui: PowerUpUI;

  beforeEach(() => {
    setupGlobalDOM();
    onPowerUp = vi.fn();
  });

  afterEach(() => {
    try { ui?.destroy(); } catch { /* swallow */ }
  });

  function createUI(cb?: ReturnType<typeof vi.fn>): PowerUpUI {
    onPowerUp = cb ?? vi.fn();
    ui = new PowerUpUI({ onPowerUp });
    return ui;
  }

  // =========================================================================
  // Constructor & DOM structure
  // =========================================================================
  describe('constructor', () => {
    it('creates a container with id="powerup-ui"', () => {
      createUI();
      const container = document.getElementById('powerup-ui');
      expect(container).not.toBeNull();
    });

    it('sets role="toolbar" on the container', () => {
      createUI();
      expect(document.getElementById('powerup-ui')?.getAttribute('role')).toBe('toolbar');
    });

    it('sets aria-label="Power-ups" on the container', () => {
      createUI();
      expect(document.getElementById('powerup-ui')?.getAttribute('aria-label')).toBe('Power-ups');
    });

    it('appends the container to document.body', () => {
      createUI();
      const body = (globalThis as any).document.body;
      const found = body.children.some((c: any) => c.id === 'powerup-ui');
      expect(found).toBe(true);
    });

    it('creates exactly 3 power-up buttons', () => {
      createUI();
      const container = document.getElementById('powerup-ui');
      expect(container.children.length).toBe(3);
    });

    it('creates buttons for hint, skip, and extra-life', () => {
      createUI();
      for (const type of POWERUP_TYPES) {
        const btn = document.getElementById(`powerup-${type}`);
        expect(btn).not.toBeNull();
      }
    });

    it('each button has class "powerup-btn"', () => {
      createUI();
      for (const type of POWERUP_TYPES) {
        const btn = document.getElementById(`powerup-${type}`);
        expect(btn?.className).toBe('powerup-btn');
      }
    });

    it('each button has aria-label describing the power-up', () => {
      createUI();
      const hintBtn = document.getElementById('powerup-hint');
      expect(hintBtn?.getAttribute('aria-label')).toBe('Use Hint power-up');

      const skipBtn = document.getElementById('powerup-skip');
      expect(skipBtn?.getAttribute('aria-label')).toBe('Use Skip Word power-up');

      const extraLifeBtn = document.getElementById('powerup-extra-life');
      expect(extraLifeBtn?.getAttribute('aria-label')).toBe('Use Extra Life power-up');
    });

    it('container starts hidden (display: none in cssText)', () => {
      createUI();
      const container = document.getElementById('powerup-ui');
      expect(container?.style.cssText).toContain('display: none');
    });
  });

  // =========================================================================
  // Click events
  // =========================================================================
  describe('click event handling', () => {
    it('calls onPowerUp with "hint" when hint button is clicked', () => {
      createUI();
      document.getElementById('powerup-hint')?.click();
      expect(onPowerUp).toHaveBeenCalledWith('hint');
    });

    it('calls onPowerUp with "skip" when skip button is clicked', () => {
      createUI();
      document.getElementById('powerup-skip')?.click();
      expect(onPowerUp).toHaveBeenCalledWith('skip');
    });

    it('calls onPowerUp with "extra-life" when extra-life button is clicked', () => {
      createUI();
      document.getElementById('powerup-extra-life')?.click();
      expect(onPowerUp).toHaveBeenCalledWith('extra-life');
    });

    it('calls onPowerUp once per click', () => {
      createUI();
      document.getElementById('powerup-hint')?.click();
      expect(onPowerUp).toHaveBeenCalledTimes(1);
    });

    it('multiple clicks call onPowerUp multiple times', () => {
      createUI();
      const btn = document.getElementById('powerup-hint');
      btn?.click();
      btn?.click();
      btn?.click();
      expect(onPowerUp).toHaveBeenCalledTimes(3);
    });
  });

  // =========================================================================
  // updateInventory
  // =========================================================================
  describe('updateInventory', () => {
    it('updates button innerHTML with icon, name, and count for hint', () => {
      createUI();
      ui.updateInventory({ hint: 2, skip: 1, 'extra-life': 1 });
      const btn = document.getElementById('powerup-hint');
      expect(btn?.innerHTML).toContain('💡');
      expect(btn?.innerHTML).toContain('Hint');
      expect(btn?.innerHTML).toContain('2/3');
    });

    it('updates button innerHTML with icon, name, and count for skip', () => {
      createUI();
      ui.updateInventory({ hint: 1, skip: 1, 'extra-life': 0 });
      const btn = document.getElementById('powerup-skip');
      expect(btn?.innerHTML).toContain('⏭️');
      expect(btn?.innerHTML).toContain('Skip Word');
      expect(btn?.innerHTML).toContain('1/2');
    });

    it('updates button innerHTML with icon, name, and count for extra-life', () => {
      createUI();
      ui.updateInventory({ hint: 0, skip: 0, 'extra-life': 2 });
      const btn = document.getElementById('powerup-extra-life');
      expect(btn?.innerHTML).toContain('❤️');
      expect(btn?.innerHTML).toContain('Extra Life');
      expect(btn?.innerHTML).toContain('2/2');
    });

    it('renders count as (count/max) format', () => {
      createUI();
      ui.updateInventory({ hint: 1, skip: 2, 'extra-life': 0 });
      const hintBtn = document.getElementById('powerup-hint');
      expect(hintBtn?.innerHTML).toContain('(1/3)');
      const skipBtn = document.getElementById('powerup-skip');
      expect(skipBtn?.innerHTML).toContain('(2/2)');
    });

    it('enables buttons when count > 0', () => {
      createUI();
      ui.updateInventory({ hint: 2, skip: 1, 'extra-life': 1 });
      for (const type of POWERUP_TYPES) {
        const btn = document.getElementById(`powerup-${type}`);
        expect(btn?.disabled).toBe(false);
        expect(btn?.style.opacity).toBe('1');
        expect(btn?.style.cursor).toBe('pointer');
      }
    });

    it('disables hint button when count is 0', () => {
      createUI();
      ui.updateInventory({ hint: 0, skip: 1, 'extra-life': 1 });
      const btn = document.getElementById('powerup-hint');
      expect(btn?.disabled).toBe(true);
      expect(btn?.style.opacity).toBe('0.4');
      expect(btn?.style.cursor).toBe('not-allowed');
    });

    it('disables skip button when count is 0', () => {
      createUI();
      ui.updateInventory({ hint: 1, skip: 0, 'extra-life': 1 });
      const btn = document.getElementById('powerup-skip');
      expect(btn?.disabled).toBe(true);
      expect(btn?.style.opacity).toBe('0.4');
      expect(btn?.style.cursor).toBe('not-allowed');
    });

    it('disables extra-life button when count is 0', () => {
      createUI();
      ui.updateInventory({ hint: 1, skip: 1, 'extra-life': 0 });
      const btn = document.getElementById('powerup-extra-life');
      expect(btn?.disabled).toBe(true);
      expect(btn?.style.opacity).toBe('0.4');
      expect(btn?.style.cursor).toBe('not-allowed');
    });

    it('disables all buttons when all counts are 0', () => {
      createUI();
      ui.updateInventory({ hint: 0, skip: 0, 'extra-life': 0 });
      for (const type of POWERUP_TYPES) {
        const btn = document.getElementById(`powerup-${type}`);
        expect(btn?.disabled).toBe(true);
      }
    });

    it('re-enables a previously disabled button after restocking', () => {
      createUI();
      ui.updateInventory({ hint: 0, skip: 0, 'extra-life': 0 });
      const btn = document.getElementById('powerup-hint');
      expect(btn?.disabled).toBe(true);

      ui.updateInventory({ hint: 1, skip: 0, 'extra-life': 0 });
      expect(btn?.disabled).toBe(false);
      expect(btn?.style.opacity).toBe('1');
      expect(btn?.style.cursor).toBe('pointer');
    });

    it('updates multiple inventories sequentially', () => {
      createUI();

      ui.updateInventory({ hint: 3, skip: 2, 'extra-life': 2 });
      expect(document.getElementById('powerup-hint')?.innerHTML).toContain('3/3');
      expect(document.getElementById('powerup-skip')?.innerHTML).toContain('2/2');
      expect(document.getElementById('powerup-extra-life')?.innerHTML).toContain('2/2');

      ui.updateInventory({ hint: 1, skip: 0, 'extra-life': 1 });
      expect(document.getElementById('powerup-hint')?.innerHTML).toContain('1/3');
      expect(document.getElementById('powerup-skip')?.disabled).toBe(true);
      expect(document.getElementById('powerup-extra-life')?.innerHTML).toContain('1/2');
    });

    it('does nothing if container is null (after destroy)', () => {
      createUI();
      ui.destroy();
      expect(() => {
        ui.updateInventory({ hint: 5, skip: 5, 'extra-life': 5 });
      }).not.toThrow();
    });
  });

  // =========================================================================
  // show / hide / destroy lifecycle
  // =========================================================================
  describe('show/hide/destroy', () => {
    it('show() sets container display to flex', () => {
      createUI();
      ui.show();
      const container = document.getElementById('powerup-ui');
      expect(container?.style.display).toBe('flex');
    });

    it('hide() sets container display to none', () => {
      createUI();
      ui.show();
      ui.hide();
      const container = document.getElementById('powerup-ui');
      expect(container?.style.display).toBe('none');
    });

    it('show() after hide() makes container visible again', () => {
      createUI();
      ui.show();
      ui.hide();
      ui.show();
      expect(document.getElementById('powerup-ui')?.style.display).toBe('flex');
    });

    it('destroy() removes the container from the DOM', () => {
      createUI();
      expect(document.getElementById('powerup-ui')).not.toBeNull();
      ui.destroy();
      expect(document.getElementById('powerup-ui')).toBeNull();
    });

    it('destroy() sets container to null (getContainer returns null)', () => {
      createUI();
      ui.destroy();
      expect(ui.getContainer()).toBeNull();
    });

    it('destroy() is safe to call multiple times', () => {
      createUI();
      ui.destroy();
      expect(() => ui.destroy()).not.toThrow();
    });

    it('show() after destroy() does not crash', () => {
      createUI();
      ui.destroy();
      expect(() => ui.show()).not.toThrow();
    });

    it('hide() after destroy() does not crash', () => {
      createUI();
      ui.destroy();
      expect(() => ui.hide()).not.toThrow();
    });

    it('buttons still fire click after show/hide cycle', () => {
      createUI();
      ui.show();
      ui.hide();
      ui.show();
      document.getElementById('powerup-hint')?.click();
      expect(onPowerUp).toHaveBeenCalledWith('hint');
    });
  });

  // =========================================================================
  // getContainer
  // =========================================================================
  describe('getContainer', () => {
    it('returns the container element before destroy', () => {
      createUI();
      const container = ui.getContainer();
      expect(container).not.toBeNull();
      expect(container?.id).toBe('powerup-ui');
    });

    it('returns null after destroy', () => {
      createUI();
      ui.destroy();
      expect(ui.getContainer()).toBeNull();
    });
  });

  // =========================================================================
  // Hover styling
  // =========================================================================
  describe('hover styling', () => {
    it('hint button scales up on mouseenter when not disabled', () => {
      createUI();
      const btn = document.getElementById('powerup-hint');
      btn.disabled = false;
      const listeners = btn._listeners?.['mouseenter'] || [];
      expect(listeners.length).toBeGreaterThan(0);
      listeners[0]();
      expect(btn.style.transform).toBe('scale(1.05)');
    });

    it('hint button resets on mouseleave', () => {
      createUI();
      const btn = document.getElementById('powerup-hint');
      const enterListeners = btn._listeners?.['mouseenter'] || [];
      enterListeners[0]();
      const leaveListeners = btn._listeners?.['mouseleave'] || [];
      leaveListeners[0]();
      expect(btn.style.transform).toBe('scale(1)');
    });

    it('skip button scales up on mouseenter when not disabled', () => {
      createUI();
      const btn = document.getElementById('powerup-skip');
      btn.disabled = false;
      const listeners = btn._listeners?.['mouseenter'] || [];
      listeners[0]();
      expect(btn.style.transform).toBe('scale(1.05)');
    });

    it('skip button resets on mouseleave', () => {
      createUI();
      const btn = document.getElementById('powerup-skip');
      const enterListeners = btn._listeners?.['mouseenter'] || [];
      enterListeners[0]();
      const leaveListeners = btn._listeners?.['mouseleave'] || [];
      leaveListeners[0]();
      expect(btn.style.transform).toBe('scale(1)');
    });

    it('extra-life button scales up on mouseenter when not disabled', () => {
      createUI();
      const btn = document.getElementById('powerup-extra-life');
      btn.disabled = false;
      const listeners = btn._listeners?.['mouseenter'] || [];
      listeners[0]();
      expect(btn.style.transform).toBe('scale(1.05)');
    });

    it('extra-life button resets on mouseleave', () => {
      createUI();
      const btn = document.getElementById('powerup-extra-life');
      const enterListeners = btn._listeners?.['mouseenter'] || [];
      enterListeners[0]();
      const leaveListeners = btn._listeners?.['mouseleave'] || [];
      leaveListeners[0]();
      expect(btn.style.transform).toBe('scale(1)');
    });

    it('does not scale on mouseenter when disabled', () => {
      createUI();
      const btn = document.getElementById('powerup-hint');
      btn.disabled = true;
      const listeners = btn._listeners?.['mouseenter'] || [];
      listeners[0]();
      // transform should NOT be set to scale(1.05) when disabled
      expect(btn.style.transform).not.toBe('scale(1.05)');
    });

    it('mouseEnter changes border color on enabled button', () => {
      createUI();
      const btn = document.getElementById('powerup-hint');
      btn.disabled = false;
      const listeners = btn._listeners?.['mouseenter'] || [];
      listeners[0]();
      expect(btn.style.borderColor).toBe('rgba(255, 255, 255, 0.5)');
    });

    it('mouseLeave resets border color', () => {
      createUI();
      const btn = document.getElementById('powerup-hint');
      const enterListeners = btn._listeners?.['mouseenter'] || [];
      enterListeners[0]();
      const leaveListeners = btn._listeners?.['mouseleave'] || [];
      leaveListeners[0]();
      expect(btn.style.borderColor).toBe('rgba(255, 255, 255, 0.2)');
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================
  describe('edge cases', () => {
    it('handles updateInventory with all max values', () => {
      createUI();
      ui.updateInventory({ hint: 3, skip: 2, 'extra-life': 2 });
      expect(document.getElementById('powerup-hint')?.innerHTML).toContain('3/3');
      expect(document.getElementById('powerup-skip')?.innerHTML).toContain('2/2');
      expect(document.getElementById('powerup-extra-life')?.innerHTML).toContain('2/2');
    });

    it('handles updateInventory with negative-like edge (0 count)', () => {
      createUI();
      ui.updateInventory({ hint: 0, skip: 0, 'extra-life': 0 });
      for (const type of POWERUP_TYPES) {
        const btn = document.getElementById(`powerup-${type}`);
        expect(btn?.disabled).toBe(true);
        expect(btn?.style.opacity).toBe('0.4');
      }
    });

    it('clicking a disabled button still fires onPowerUp', () => {
      // The UI code does not prevent click when disabled — the caller
      // is expected to check inventory. Verify the click still goes through.
      createUI();
      const btn = document.getElementById('powerup-hint');
      btn.disabled = true;
      btn.click();
      expect(onPowerUp).toHaveBeenCalledWith('hint');
    });

    it('multiple PowerUpUI instances can coexist', () => {
      createUI();
      const firstContainer = ui.getContainer();
      expect(firstContainer).not.toBeNull();

      const onPowerUp2 = vi.fn();
      const ui2 = new PowerUpUI({ onPowerUp: onPowerUp2 });
      // Second instance creates its own container
      expect(ui2.getContainer()).not.toBeNull();

      ui2.destroy();
    });

    it('destroy followed by new PowerUpUI creates fresh instance', () => {
      createUI();
      ui.destroy();

      const onPowerUp2 = vi.fn();
      const ui2 = new PowerUpUI({ onPowerUp: onPowerUp2 });
      expect(ui2.getContainer()).not.toBeNull();
      expect(ui2.getContainer()?.id).toBe('powerup-ui');

      ui2.destroy();
    });

    it('updateInventory can be called before show', () => {
      createUI();
      ui.updateInventory({ hint: 2, skip: 1, 'extra-life': 0 });
      const hintBtn = document.getElementById('powerup-hint');
      expect(hintBtn?.innerHTML).toContain('2/3');
      // extra-life should be disabled
      const extraLifeBtn = document.getElementById('powerup-extra-life');
      expect(extraLifeBtn?.disabled).toBe(true);
    });

    it('buttons have correct initial styles (gradient in cssText)', () => {
      createUI();
      const btn = document.getElementById('powerup-hint');
      expect(btn?.style.cssText).toContain('linear-gradient');
    });

    it('container has fixed positioning at bottom-right in cssText', () => {
      createUI();
      const container = document.getElementById('powerup-ui');
      const css = container?.style.cssText;
      expect(css).toContain('position: fixed');
      expect(css).toContain('bottom: 20px');
      expect(css).toContain('right: 20px');
    });

    it('container has z-index 200 in cssText', () => {
      createUI();
      const container = document.getElementById('powerup-ui');
      expect(container?.style.cssText).toContain('z-index: 200');
    });

    it('container has flex-direction column in cssText', () => {
      createUI();
      const container = document.getElementById('powerup-ui');
      expect(container?.style.cssText).toContain('flex-direction: column');
    });
  });
});
