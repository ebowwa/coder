/**
 * Tests for CategoryUI module
 * Covers: constructor, rendering, category selection, cancel, keyboard navigation,
 * focus trap, screen reader announcements, show/hide/destroy lifecycle
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CategoryUI } from './category-ui';

describe('CategoryUI', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  function createUI(onCategorySelected = vi.fn(), onCancel?: () => void): CategoryUI {
    return new CategoryUI({
      onCategorySelected,
      onCancel,
    });
  }

  // --------------------------------------------------------------------------
  // Constructor & DOM structure
  // --------------------------------------------------------------------------
  describe('constructor', () => {
    it('creates a dialog container with role="dialog"', () => {
      const ui = createUI();
      const dialog = document.getElementById('category-ui');
      expect(dialog).toBeTruthy();
      expect(dialog?.getAttribute('role')).toBe('dialog');
      ui.destroy();
    });

    it('sets aria-modal="true" on the container', () => {
      const ui = createUI();
      const dialog = document.getElementById('category-ui');
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
      ui.destroy();
    });

    it('sets aria-label on the container', () => {
      const ui = createUI();
      const dialog = document.getElementById('category-ui');
      expect(dialog?.getAttribute('aria-label')).toBe('Choose a word category');
      ui.destroy();
    });

    it('renders the category grid with category items', () => {
      const ui = createUI();
      const items = document.querySelectorAll('.category-item');
      expect(items.length).toBeGreaterThan(0);
      ui.destroy();
    });

    it('renders the random button', () => {
      const ui = createUI();
      const randomBtn = document.getElementById('category-random');
      expect(randomBtn).toBeTruthy();
      ui.destroy();
    });

    it('renders the cancel button', () => {
      const ui = createUI();
      const cancelBtn = document.getElementById('cancel-category-btn');
      expect(cancelBtn).toBeTruthy();
      ui.destroy();
    });

    it('creates a screen reader announcer element', () => {
      const ui = createUI();
      const announcer = document.querySelector('[aria-live="polite"]');
      expect(announcer).toBeTruthy();
      ui.destroy();
    });
  });

  // --------------------------------------------------------------------------
  // Category selection
  // --------------------------------------------------------------------------
  describe('category selection', () => {
    it('calls onCategorySelected with null when random button is clicked', () => {
      const onSelected = vi.fn();
      const ui = createUI(onSelected);
      const randomBtn = document.getElementById('category-random') as HTMLElement;
      expect(randomBtn).toBeTruthy();
      randomBtn.click();
      // Selection happens after a 150ms setTimeout
      vi.advanceTimersByTime(200);
      expect(onSelected).toHaveBeenCalledWith(null);
      ui.destroy();
    });

    it('calls onCategorySelected with category name when category item is clicked', () => {
      const onSelected = vi.fn();
      const ui = createUI(onSelected);
      const firstItem = document.querySelector('.category-item') as HTMLElement;
      expect(firstItem).toBeTruthy();
      const category = firstItem.dataset.category;
      expect(category).toBeTruthy();
      firstItem.click();
      vi.advanceTimersByTime(200);
      expect(onSelected).toHaveBeenCalledWith(category);
      ui.destroy();
    });
  });

  // --------------------------------------------------------------------------
  // Cancel
  // --------------------------------------------------------------------------
  describe('cancel', () => {
    it('calls onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn();
      const ui = createUI(vi.fn(), onCancel);
      const cancelBtn = document.getElementById('cancel-category-btn') as HTMLElement;
      cancelBtn.click();
      expect(onCancel).toHaveBeenCalled();
      ui.destroy();
    });

    it('hides the dialog on cancel', () => {
      const ui = createUI(vi.fn(), vi.fn());
      const container = document.getElementById('category-ui') as HTMLElement;
      expect(container.style.display).not.toBe('none');
      const cancelBtn = document.getElementById('cancel-category-btn') as HTMLElement;
      cancelBtn.click();
      expect(container.style.display).toBe('none');
      ui.destroy();
    });
  });

  // --------------------------------------------------------------------------
  // show / hide / destroy lifecycle
  // --------------------------------------------------------------------------
  describe('show/hide/destroy', () => {
    it('show makes the container visible', () => {
      const ui = createUI();
      const container = document.getElementById('category-ui') as HTMLElement;
      container.style.display = 'none';
      ui.show();
      expect(container.style.display).toBe('block');
      ui.destroy();
    });

    it('hide sets display to none', () => {
      const ui = createUI();
      const container = document.getElementById('category-ui') as HTMLElement;
      ui.hide();
      expect(container.style.display).toBe('none');
      ui.destroy();
    });

    it('destroy removes the container from the DOM', () => {
      const ui = createUI();
      expect(document.getElementById('category-ui')).toBeTruthy();
      ui.destroy();
      expect(document.getElementById('category-ui')).toBeNull();
    });

    it('getSelectedCategory returns null initially', () => {
      const ui = createUI();
      expect(ui.getSelectedCategory()).toBeNull();
      ui.destroy();
    });

    it('getSelectedCategory returns the selected category after selection', () => {
      const ui = createUI();
      const firstItem = document.querySelector('.category-item') as HTMLElement;
      const category = firstItem.dataset.category!;
      firstItem.click();
      expect(ui.getSelectedCategory()).toBe(category);
      ui.destroy();
    });

    it('getSelectedCategory returns null when random is selected', () => {
      const ui = createUI();
      const randomBtn = document.getElementById('category-random') as HTMLElement;
      randomBtn.click();
      expect(ui.getSelectedCategory()).toBeNull();
      ui.destroy();
    });
  });

  // --------------------------------------------------------------------------
  // Keyboard navigation
  // --------------------------------------------------------------------------
  describe('keyboard navigation', () => {
    it('activates random button on Enter key', () => {
      const onSelected = vi.fn();
      const ui = createUI(onSelected);
      const randomBtn = document.getElementById('category-random') as HTMLElement;
      randomBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      vi.advanceTimersByTime(200);
      expect(onSelected).toHaveBeenCalledWith(null);
      ui.destroy();
    });

    it('activates random button on Space key', () => {
      const onSelected = vi.fn();
      const ui = createUI(onSelected);
      const randomBtn = document.getElementById('category-random') as HTMLElement;
      randomBtn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      vi.advanceTimersByTime(200);
      expect(onSelected).toHaveBeenCalledWith(null);
      ui.destroy();
    });

    it('activates category item on Enter key', () => {
      const onSelected = vi.fn();
      const ui = createUI(onSelected);
      const firstItem = document.querySelector('.category-item') as HTMLElement;
      const category = firstItem.dataset.category;
      firstItem.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      vi.advanceTimersByTime(200);
      expect(onSelected).toHaveBeenCalledWith(category);
      ui.destroy();
    });

    it('calls onCancel on Escape key', () => {
      const onCancel = vi.fn();
      const ui = createUI(vi.fn(), onCancel);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(onCancel).toHaveBeenCalled();
      ui.destroy();
    });
  });

  // --------------------------------------------------------------------------
  // Accessibility
  // --------------------------------------------------------------------------
  describe('accessibility', () => {
    it('category grid has role="listbox"', () => {
      const ui = createUI();
      const grid = document.getElementById('category-grid');
      expect(grid?.getAttribute('role')).toBe('listbox');
      ui.destroy();
    });

    it('category items have role="option"', () => {
      const ui = createUI();
      const items = document.querySelectorAll('.category-item');
      items.forEach(item => {
        expect(item.getAttribute('role')).toBe('option');
      });
      ui.destroy();
    });

    it('random button has role="button"', () => {
      const ui = createUI();
      const randomBtn = document.getElementById('category-random');
      expect(randomBtn?.getAttribute('role')).toBe('button');
      ui.destroy();
    });

    it('random button is keyboard focusable with tabindex="0"', () => {
      const ui = createUI();
      const randomBtn = document.getElementById('category-random');
      expect(randomBtn?.getAttribute('tabindex')).toBe('0');
      ui.destroy();
    });

    it('category items are keyboard focusable with tabindex="0"', () => {
      const ui = createUI();
      const items = document.querySelectorAll('.category-item');
      items.forEach(item => {
        expect(item.getAttribute('tabindex')).toBe('0');
      });
      ui.destroy();
    });
  });
});
