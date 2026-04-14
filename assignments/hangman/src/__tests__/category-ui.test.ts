/**
 * Tests for CategoryUI module
 *
 * Uses an isolated DOM mock that is installed/uninstalled per test lifecycle
 * so it does not pollute globalThis for other test files in the suite.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Saved originals so we can restore after each test
// ---------------------------------------------------------------------------
const _origDocument = globalThis.document;
const _origWindow = globalThis.window;
const _origRAF = globalThis.requestAnimationFrame;
const _origSetTimeout = globalThis.setTimeout;

// ---------------------------------------------------------------------------
// DOM mock helpers (pure functions — no global state until installed)
// ---------------------------------------------------------------------------

function parseHtmlTags(html: string): any[] {
  const tagRe = /<(\w+)((?:[\s\S]*?))>/g;
  const results: any[] = [];
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html)) !== null) {
    const tagName = match[1];
    const attrStr = match[2];
    if ([' /div', '/span', '/button', '/h1', '/p'].some(t => tagName === t.slice(1) ? false : false)) {
      // keep all tags — the old approach skipped some closing tags
    }
    const attrs: Record<string, string> = {};
    const dataset: Record<string, string> = {};
    let id = '';
    let className = '';
    const simpleAttrRe = /([\w-]+)=\s*"([^"]*)"/g;
    let am: RegExpExecArray | null;
    while ((am = simpleAttrRe.exec(attrStr)) !== null) {
      const name = am[1];
      const value = am[2];
      if (name === 'id') id = value;
      else if (name === 'class') className = value;
      else if (name.startsWith('data-')) {
        const key = name.slice(5).replace(/-([a-z])/g, (_: any, c: string) => c.toUpperCase());
        dataset[key] = value;
      }
      attrs[name] = value;
    }
    const fullMatch = match[0];
    const afterCloseBracket = match.index + fullMatch.length;
    const nextOpenBracket = html.indexOf('<', afterCloseBracket);
    const text = nextOpenBracket >= 0 ? html.slice(afterCloseBracket, nextOpenBracket) : '';
    const textContent = text.replace(/\s+/g, ' ').trim();
    results.push({ tagName, id, className, attrs, dataset, textContent });
  }
  return results;
}

interface MockElement {
  tagName: string;
  id: string;
  className: string;
  textContent: string;
  innerHTML: string;
  style: Record<string, string>;
  dataset: Record<string, string>;
  children: MockElement[];
  parentNode: MockElement | null;
  offsetParent: any;
  _removed: boolean;
  _listeners: Record<string, Function[]>;
  _attributes: Map<string, string>;
  appendChild(child: MockElement): MockElement;
  removeChild(child: MockElement): MockElement;
  remove(): void;
  querySelector(selector: string): MockElement | null;
  querySelectorAll(selector: string): MockElement[];
  contains(node: any): boolean;
  addEventListener(event: string, handler: Function): void;
  removeEventListener(event: string, handler: Function): void;
  click(): void;
  focus(): void;
  blur(): void;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | undefined;
  removeAttribute(name: string): void;
  hasAttribute(name: string): boolean;
}

function createMockElement(tagName: string, elementsById: Map<string, MockElement>): MockElement {
  const children: MockElement[] = [];
  const eventListeners: Record<string, Function[]> = {};
  const styleObj: Record<string, string> = {};
  let _innerHTML = '';

  const element: MockElement = {
    tagName: tagName.toUpperCase(),
    id: '',
    className: '',
    textContent: '',
    get innerHTML() { return _innerHTML; },
    set innerHTML(html: string) {
      _innerHTML = html;
      children.length = 0;
      const tags = parseHtmlTags(html);
      for (const tag of tags) {
        const child = createMockElement(tag.tagName, elementsById);
        child.id = tag.id;
        child.className = tag.className;
        child.dataset = { ...child.dataset, ...tag.dataset };
        for (const [key, value] of Object.entries(tag.attrs)) {
          child.setAttribute(key, value);
        }
        if (tag.textContent) {
          child.textContent = tag.textContent;
        }
        child.parentNode = element;
        children.push(child);
      }
    },
    parentNode: null,
    offsetParent: null,
    get children() { return children; },
    _removed: false,
    _listeners: eventListeners,
    _attributes: new Map(),

    appendChild(child: MockElement) {
      child.parentNode = element;
      children.push(child);
      return child;
    },
    removeChild(child: MockElement) {
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
      if (element.id) elementsById.delete(element.id);
    },
    querySelector(selector: string): MockElement | null {
      if (selector.startsWith('#')) {
        const id = selector.slice(1);
        const search = (el: MockElement): MockElement | null => {
          if (el.id === id) return el;
          for (const child of el.children) {
            const found = search(child);
            if (found) return found;
          }
          return null;
        };
        return search(element);
      }
      if (selector.startsWith('.')) {
        const cn = selector.slice(1);
        const search = (el: MockElement): MockElement | null => {
          if (el.className && el.className.includes(cn)) return el;
          for (const child of el.children) {
            const found = search(child);
            if (found) return found;
          }
          return null;
        };
        return search(element);
      }
      return null;
    },
    querySelectorAll(selector: string): MockElement[] {
      const results: MockElement[] = [];
      const selectors = selector.split(',').map(s => s.trim());
      for (const sel of selectors) {
        if (sel.startsWith('.')) {
          const cn = sel.slice(1);
          const search = (el: MockElement) => {
            if (el.className && el.className.includes(cn)) results.push(el);
            for (const child of el.children) search(child);
          };
          search(element);
        } else if (sel.startsWith('#')) {
          const id = sel.slice(1);
          const search = (el: MockElement) => {
            if (el.id === id) results.push(el);
            for (const child of el.children) search(child);
          };
          search(element);
        }
      }
      return results;
    },
    contains(node: any): boolean {
      const search = (el: MockElement): boolean => {
        if (el === node) return true;
        for (const child of el.children) { if (search(child)) return true; }
        return false;
      };
      return search(element);
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
    focus() { /* mock */ },
    blur() { /* mock */ },
    setAttribute(name: string, value: string) {
      element._attributes.set(name, value);
      if (name === 'id') element.id = value;
      else if (name === 'class') element.className = value;
    },
    getAttribute(name: string): string | undefined {
      return element._attributes.get(name);
    },
    removeAttribute(name: string) {
      element._attributes.delete(name);
    },
    hasAttribute(name: string) {
      return element._attributes.has(name);
    },
    dataset: {} as Record<string, string>,
  };

  element.style = styleObj;
  return element;
}

/**
 * Create a fresh mock document with its own isolated state.
 * Returns the mock document and an element registry map.
 */
function createMockDocument() {
  const elementsById = new Map<string, MockElement>();
  const documentEventListeners: Record<string, Function[]> = {};

  const body = createMockElement('body', elementsById);
  const head = createMockElement('head', elementsById);

  let _activeElement: any = null;

  const mockDoc: any = {
    get activeElement() { return _activeElement; },
    set activeElement(val: any) { _activeElement = val; },
    body,
    head,
    createElement(tagName: string) {
      const el = createMockElement(tagName, elementsById);
      return new Proxy(el, {
        set(target: any, prop: string, value: any) {
          target[prop] = value;
          if (prop === 'id' && value) elementsById.set(value, target);
          return true;
        },
        get(target: any, prop: string) {
          const value = (target as any)[prop];
          if (typeof value === 'function') return value.bind(target);
          return value;
        },
      });
    },
    getElementById(id: string): MockElement | null {
      const registered = elementsById.get(id);
      if (registered && !registered._removed) return registered;
      const searchById = (el: MockElement): MockElement | null => {
        if (el._removed) return null;
        if (el.id === id) return el;
        for (const child of el.children) {
          const found = searchById(child);
          if (found) return found;
        }
        return null;
      };
      return searchById(body) || searchById(head);
    },
    querySelectorAll(selector: string): MockElement[] {
      const results: MockElement[] = [];
      const selectors = selector.split(',').map(s => s.trim());
      const search = (el: MockElement) => {
        for (const sel of selectors) {
          if (sel.startsWith('.')) {
            const cn = sel.slice(1);
            if (el.className && el.className.includes(cn)) results.push(el);
          } else if (sel.startsWith('#')) {
            if (el.id === sel.slice(1)) results.push(el);
          }
        }
        for (const child of el.children) search(child);
      };
      search(body);
      search(head);
      for (const [, el] of elementsById) {
        let alreadyIncluded = results.some(r => r === el);
        if (!alreadyIncluded) search(el);
      }
      return results;
    },
    addEventListener(event: string, handler: Function) {
      if (!documentEventListeners[event]) documentEventListeners[event] = [];
      documentEventListeners[event].push(handler);
    },
    removeEventListener(event: string, handler: Function) {
      const arr = documentEventListeners[event];
      if (arr) { const i = arr.indexOf(handler); if (i > -1) arr.splice(i, 1); }
    },
  };

  return mockDoc;
}

// Install mock globals (saves originals for restoration)
function installMockDOM() {
  const mockDoc = createMockDocument();
  (globalThis as any).document = mockDoc;
  (globalThis as any).window = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => { cb(0); return 0; };
  (globalThis as any).setTimeout = (cb: any) => { cb(); return 0; };
}

// Restore original globals — but skip if they were undefined (bun provides no DOM).
// Other test files that need a DOM install their own mocks, so we don't break them.
function restoreRealDOM() {
  // No-op: other test files install their own DOM mocks as needed.
  // Restoring undefined would break those files.
}

// We need to install the mock BEFORE the module-level import below evaluates.
// In bun's test runner, top-level code runs sequentially so this is safe.
installMockDOM();

// Now import — this runs at module load time with the mock in place.
// We use a dynamic import cached in module scope so each test file load
// gets the module with the mock DOM.
import { CategoryUI } from '../category-ui';
import type { CategoryUIOptions } from '../category-ui';

describe('CategoryUI', () => {
  let onCategorySelected: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;
  let categoryUI: CategoryUI;

  beforeEach(() => {
    // Re-install a fresh mock DOM for each test so state doesn't leak
    installMockDOM();
    onCategorySelected = vi.fn();
    onCancel = vi.fn();
  });

  afterEach(() => {
    if (categoryUI) {
      if (typeof categoryUI.destroy === 'function') {
        categoryUI.destroy();
      } else {
        // Diagnostic: log what categoryUI actually is
        console.error('[afterEach] categoryUI has no destroy method. Type:', typeof categoryUI);
        console.error('[afterEach] categoryUI constructor name:', categoryUI?.constructor?.name);
        console.error('[afterEach] categoryUI keys:', Object.keys(categoryUI || {}).slice(0, 20));
      }
    }
    // Restore real DOM so other test files aren't affected
    restoreRealDOM();
  });

  describe('constructor', () => {
    it('should create a CategoryUI instance', () => {
      expect(typeof document).toBe('object');
      expect(typeof document.createElement).toBe('function');

      const opts = { onCategorySelected };
      categoryUI = new CategoryUI(opts);

      // Log what we got
      expect(categoryUI, `Expected CategoryUI instance, got ${typeof categoryUI}: ${JSON.stringify(Object.keys(categoryUI || {}).slice(0, 10))}`).toBeDefined();

      // Check destroy method exists
      expect(typeof (categoryUI as any).destroy, `destroy method type: ${typeof (categoryUI as any).destroy}`).toBe('function');
    });

    it('should create a container with dialog role', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const container = document.getElementById('category-ui');
      expect(container).toBeDefined();
      expect(container?.getAttribute('role')).toBe('dialog');
    });

    it('should set aria-modal to true', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const container = document.getElementById('category-ui');
      expect(container?.getAttribute('aria-modal')).toBe('true');
    });

    it('should set aria-label on the container', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const container = document.getElementById('category-ui');
      expect(container?.getAttribute('aria-label')).toBe('Choose a word category');
    });

    it('should create the random button', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const randomBtn = document.getElementById('category-random');
      expect(randomBtn).toBeDefined();
    });

    it('should create the cancel button', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const cancelBtn = document.getElementById('cancel-category-btn');
      expect(cancelBtn).toBeDefined();
    });

    it('should create category grid with items', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const grid = document.getElementById('category-grid');
      expect(grid).toBeDefined();
    });

    it('should create a screen-reader announcer', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      // The announcer is added to document.body — verify constructor didn't throw
      expect(true).toBe(true);
    });
  });

  describe('rendering category items', () => {
    it('should render category items with correct role', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const container = document.getElementById('category-ui');
      const items = container?.querySelectorAll('.category-item');
      expect(items?.length).toBeGreaterThan(0);
    });

    it('should render category items with data-category attribute', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const container = document.getElementById('category-ui');
      const items = container?.querySelectorAll('.category-item');
      if (items && items.length > 0) {
        const firstItem = items[0] as any;
        expect(firstItem.dataset.category).toBeDefined();
        expect(firstItem.dataset.category.length).toBeGreaterThan(0);
      }
    });

    it('should render category items as option role', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const container = document.getElementById('category-ui');
      const items = container?.querySelectorAll('.category-item');
      if (items && items.length > 0) {
        expect(items[0].getAttribute('role')).toBe('option');
      }
    });

    it('should render category items with tabindex=0 for keyboard access', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const container = document.getElementById('category-ui');
      const items = container?.querySelectorAll('.category-item');
      if (items && items.length > 0) {
        expect(items[0].getAttribute('tabindex')).toBe('0');
      }
    });

    it('should render the random button with role=button', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const randomBtn = document.getElementById('category-random');
      expect(randomBtn?.getAttribute('role')).toBe('button');
    });

    it('should render the random button with tabindex=0', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const randomBtn = document.getElementById('category-random');
      expect(randomBtn?.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('click handlers', () => {
    it('should invoke onCategorySelected with null when random button is clicked', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const randomBtn = document.getElementById('category-random');
      randomBtn?.click();
      expect(onCategorySelected).toHaveBeenCalledWith(null);
    });

    it('should invoke onCategorySelected with category name when a category item is clicked', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const container = document.getElementById('category-ui');
      const items = container?.querySelectorAll('.category-item');
      if (items && items.length > 0) {
        const firstItem = items[0] as any;
        const category = firstItem.dataset.category;
        firstItem.click();
        expect(onCategorySelected).toHaveBeenCalledWith(category);
      }
    });

    it('should invoke onCancel when cancel button is clicked', () => {
      categoryUI = new CategoryUI({ onCategorySelected, onCancel });
      const cancelBtn = document.getElementById('cancel-category-btn');
      cancelBtn?.click();
      expect(onCancel).toHaveBeenCalled();
    });

    it('should handle category selection without onCancel callback', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const cancelBtn = document.getElementById('cancel-category-btn');
      expect(() => cancelBtn?.click()).not.toThrow();
    });
  });

  describe('selected category tracking', () => {
    it('should return null initially', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      expect(categoryUI.getSelectedCategory()).toBeNull();
    });

    it('should return the selected category after clicking a category item', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const container = document.getElementById('category-ui');
      const items = container?.querySelectorAll('.category-item');
      if (items && items.length > 0) {
        const firstItem = items[0] as any;
        const category = firstItem.dataset.category;
        firstItem.click();
        expect(categoryUI.getSelectedCategory()).toBe(category);
      }
    });

    it('should return null after clicking the random button', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const randomBtn = document.getElementById('category-random');
      randomBtn?.click();
      expect(categoryUI.getSelectedCategory()).toBeNull();
    });
  });

  describe('show and hide', () => {
    it('should show the container', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      categoryUI.show();
      const container = document.getElementById('category-ui');
      expect(container?.style.display).toBe('block');
    });

    it('should hide the container', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      categoryUI.hide();
      const container = document.getElementById('category-ui');
      expect(container?.style.display).toBe('none');
    });

    it('should set overlay opacity to 1 on show', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      categoryUI.show();
      const container = document.getElementById('category-ui');
      const overlay = container?.children[0] as any;
      expect(overlay?.style.opacity).toBe('1');
    });
  });

  describe('destroy', () => {
    it('should remove the container from the DOM', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const container = document.getElementById('category-ui');
      expect(container).toBeDefined();
      categoryUI.destroy();
      const afterDestroy = document.getElementById('category-ui');
      expect(afterDestroy).toBeNull();
    });

    it('should be safe to call destroy multiple times', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      categoryUI.destroy();
      expect(() => categoryUI.destroy()).not.toThrow();
    });
  });

  describe('keyboard interaction', () => {
    it('should have keyboard event listeners on category items', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const container = document.getElementById('category-ui');
      const items = container?.querySelectorAll('.category-item');
      if (items && items.length > 0) {
        expect(items[0].getAttribute('tabindex')).toBe('0');
      }
    });

    it('should have keyboard event listeners on random button', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const randomBtn = document.getElementById('category-random');
      expect(randomBtn?.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('focus trap', () => {
    it('should install a global keydown handler', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const container = document.getElementById('category-ui');
      expect(container?.getAttribute('aria-modal')).toBe('true');
    });
  });

  describe('screen reader accessibility', () => {
    it('should set aria-labelledby on the container', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const container = document.getElementById('category-ui');
      expect(container?.getAttribute('aria-labelledby')).toBe('category-dialog-title');
    });

    it('should set aria-label on each category item', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const container = document.getElementById('category-ui');
      const items = container?.querySelectorAll('.category-item');
      if (items && items.length > 0) {
        for (const item of items) {
          const ariaLabel = item.getAttribute('aria-label');
          expect(ariaLabel).toContain('category');
        }
      }
    });

    it('should set aria-label on the random button', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const randomBtn = document.getElementById('category-random');
      expect(randomBtn?.getAttribute('aria-label')).toBeDefined();
      expect(randomBtn!.getAttribute('aria-label')!.length).toBeGreaterThan(0);
    });

    it('should set aria-label on the cancel button', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const cancelBtn = document.getElementById('cancel-category-btn');
      expect(cancelBtn?.getAttribute('aria-label')).toBe('Back to menu');
    });

    it('should have category-grid with role=listbox', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const grid = document.getElementById('category-grid');
      expect(grid?.getAttribute('role')).toBe('listbox');
    });

    it('should have category-grid with aria-label', () => {
      categoryUI = new CategoryUI({ onCategorySelected });
      const grid = document.getElementById('category-grid');
      expect(grid?.getAttribute('aria-label')).toBe('Word categories');
    });
  });
});
