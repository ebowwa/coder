/**
 * Category Selection UI - DOM overlay for selecting word categories
 * Appears before game start in single-player mode
 *
 * Accessibility: ARIA dialog pattern with focus trap, keyboard navigation,
 * screen reader announcements, and focus-visible styling.
 */

import { getAllCategories, getCategoryMetadata, getCategoriesData } from './words';
import { transitionIn, transitionOut, injectTransitionStyles } from './screen-transitions';

export interface CategoryUIOptions {
  onCategorySelected: (category: string | null) => void;
  onCancel?: () => void;
}

/** Screen-reader-only utility class (injected once) */
const SR_ONLY_CLASS = 'category-ui-sr-only';
let srOnlyInjected = false;

function injectSrOnlyStyle(): void {
  if (srOnlyInjected) return;
  srOnlyInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .${SR_ONLY_CLASS} {
      position: absolute; width: 1px; height: 1px;
      padding: 0; margin: -1px; overflow: hidden;
      clip: rect(0,0,0,0); white-space: nowrap; border: 0;
    }
  `;
  document.head.appendChild(style);
}

export class CategoryUI {
  private container: HTMLDivElement;
  private overlay: HTMLDivElement;
  private options: CategoryUIOptions;
  private selectedCategory: string | null = null;
  private previouslyFocusedElement: Element | null = null;
  private focusTrapHandler: ((e: KeyboardEvent) => void) | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private announcer: HTMLDivElement | null = null;

  constructor(options: CategoryUIOptions) {
    this.options = options;

    injectSrOnlyStyle();

    // Save the currently focused element to restore later
    this.previouslyFocusedElement = document.activeElement;

    // Create container with ARIA dialog attributes
    this.container = document.createElement('div');
    this.container.id = 'category-ui';
    this.container.setAttribute('role', 'dialog');
    this.container.setAttribute('aria-modal', 'true');
    this.container.setAttribute('aria-label', 'Choose a word category');
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1100;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      pointer-events: auto;
    `;
    this.container.appendChild(this.overlay);

    // Create live announcer for screen readers
    this.announcer = document.createElement('div');
    this.announcer.className = SR_ONLY_CLASS;
    this.announcer.setAttribute('role', 'status');
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(this.announcer);

    this.render();
  }

  private render(): void {
    const categories = getAllCategories();
    const defaultStyle = { color: '#4ecdc4', icon: '📝' };

    this.overlay.innerHTML = `
      <div role="document" style="
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 20px;
        padding: 40px;
        max-width: 700px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
      ">
        <h1 id="category-dialog-title" style="
          color: #fff;
          text-align: center;
          margin: 0 0 10px 0;
          font-size: 2em;
          text-shadow: 0 0 20px rgba(78, 205, 196, 0.5);
        ">Choose a Category</h1>
        <p style="
          color: #888;
          text-align: center;
          margin: 0 0 30px 0;
          font-size: 0.95em;
        ">Select a word category or play with all words</p>

        <!-- Random option (prominent) -->
        <div id="category-random" role="button" tabindex="0" aria-label="Random category, all words" style="
          background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 25px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: transform 0.2s, box-shadow 0.2s;
        ">
          <span style="font-size: 2em;" aria-hidden="true">🎲</span>
          <span style="
            color: #fff;
            font-size: 1.3em;
            font-weight: bold;
          ">Random (All Words)</span>
        </div>

        <div role="separator" style="
          display: flex;
          align-items: center;
          margin: 20px 0;
        ">
          <div style="flex: 1; height: 1px; background: #333;"></div>
          <span style="color: #666; padding: 0 15px; font-size: 0.85em;">OR PICK A CATEGORY</span>
          <div style="flex: 1; height: 1px; background: #333;"></div>
        </div>

        <!-- Category grid -->
        <div id="category-grid" role="listbox" aria-label="Word categories" style="
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 15px;
        ">
          ${categories.map(category => {
            const metadata = getCategoryMetadata(category);
            const style = metadata || defaultStyle;
            return `
              <div class="category-item" role="option" tabindex="0" data-category="${category}" aria-label="${category} category" style="
                background: rgba(255, 255, 255, 0.05);
                border: 2px solid ${style.color};
                border-radius: 10px;
                padding: 20px 15px;
                cursor: pointer;
                text-align: center;
                transition: transform 0.2s, background 0.2s;
              ">
                <div style="font-size: 2em; margin-bottom: 10px;" aria-hidden="true">${style.icon}</div>
                <div style="color: #fff; font-size: 1em; font-weight: 500;">${category}</div>
              </div>
            `;
          }).join('')}
        </div>

        <button id="cancel-category-btn" aria-label="Back to menu" style="
          width: 100%;
          padding: 12px;
          background: transparent;
          border: 2px solid #666;
          border-radius: 10px;
          color: #888;
          font-size: 0.95em;
          cursor: pointer;
          margin-top: 25px;
          transition: border-color 0.3s, color 0.3s;
        ">Back to Menu</button>
      </div>
    `;

    // Wire up aria-labelledby on the dialog
    this.container.setAttribute('aria-labelledby', 'category-dialog-title');

    this.setupEvents();
  }

  private setupEvents(): void {
    // Random button
    const randomBtn = document.getElementById('category-random');
    randomBtn?.addEventListener('click', () => {
      this.handleCategorySelect(null);
    });
    // Keyboard activation for random button (Enter/Space)
    randomBtn?.addEventListener('keydown', ((e: Event) => {
      const ke = e as KeyboardEvent;
      if (ke.key === 'Enter' || ke.key === ' ') {
        ke.preventDefault();
        this.handleCategorySelect(null);
      }
    }) as EventListener);

    // Category items
    const categoryItems = document.querySelectorAll('.category-item');
    categoryItems.forEach(item => {
      item.addEventListener('click', () => {
        const category = (item as HTMLElement).dataset.category;
        if (category) {
          this.handleCategorySelect(category);
        }
      });

      // Keyboard activation for category items (Enter/Space)
      item.addEventListener('keydown', ((e: Event) => {
        const ke = e as KeyboardEvent;
        if (ke.key === 'Enter' || ke.key === ' ') {
          ke.preventDefault();
          const category = (item as HTMLElement).dataset.category;
          if (category) {
            this.handleCategorySelect(category);
          }
        }
      }) as EventListener);

      // Hover effects
      item.addEventListener('mouseenter', () => {
        (item as HTMLElement).style.transform = 'scale(1.05)';
        (item as HTMLElement).style.background = 'rgba(255, 255, 255, 0.1)';
      });
      item.addEventListener('mouseleave', () => {
        (item as HTMLElement).style.transform = 'scale(1)';
        (item as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
      });

      // Focus-visible styling
      item.addEventListener('focus', () => {
        (item as HTMLElement).style.transform = 'scale(1.05)';
        (item as HTMLElement).style.background = 'rgba(255, 255, 255, 0.1)';
        (item as HTMLElement).style.outline = '2px solid #4ecdc4';
        (item as HTMLElement).style.outlineOffset = '2px';
      });
      item.addEventListener('blur', () => {
        (item as HTMLElement).style.transform = 'scale(1)';
        (item as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
        (item as HTMLElement).style.outline = '';
        (item as HTMLElement).style.outlineOffset = '';
      });
    });

    // Random button hover
    randomBtn?.addEventListener('mouseenter', () => {
      randomBtn.style.transform = 'scale(1.02)';
      randomBtn.style.boxShadow = '0 10px 30px rgba(78, 205, 196, 0.3)';
    });
    randomBtn?.addEventListener('mouseleave', () => {
      randomBtn.style.transform = 'scale(1)';
      randomBtn.style.boxShadow = 'none';
    });

    // Random button focus-visible
    randomBtn?.addEventListener('focus', () => {
      randomBtn.style.transform = 'scale(1.02)';
      randomBtn.style.boxShadow = '0 10px 30px rgba(78, 205, 196, 0.3)';
      randomBtn.style.outline = '2px solid #fff';
      randomBtn.style.outlineOffset = '2px';
    });
    randomBtn?.addEventListener('blur', () => {
      randomBtn.style.transform = 'scale(1)';
      randomBtn.style.boxShadow = 'none';
      randomBtn.style.outline = '';
      randomBtn.style.outlineOffset = '';
    });

    // Cancel button
    const cancelBtn = document.getElementById('cancel-category-btn');
    cancelBtn?.addEventListener('click', () => {
      this.options.onCancel?.();
      this.hide();
    });

    cancelBtn?.addEventListener('mouseenter', () => {
      cancelBtn.style.borderColor = '#888';
      cancelBtn.style.color = '#aaa';
    });
    cancelBtn?.addEventListener('mouseleave', () => {
      cancelBtn.style.borderColor = '#666';
      cancelBtn.style.color = '#888';
    });

    // Global keydown handler: Escape closes dialog, focus trap
    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.options.onCancel?.();
        this.hide();
        return;
      }
      // Focus trap: keep Tab cycling within dialog
      if (e.key === 'Tab') {
        this.handleFocusTrap(e);
      }
    };
    document.addEventListener('keydown', this.keydownHandler);

    // Announce dialog to screen readers
    this.announce('Category selection dialog opened. Choose a word category or press Escape to go back.');

    // Auto-focus the random button for keyboard users
    requestAnimationFrame(() => {
      randomBtn?.focus();
    });
  }

  /**
   * Trap focus within the dialog so Tab / Shift+Tab cycles only among
   * interactive children of the dialog.
   */
  private handleFocusTrap(e: KeyboardEvent): void {
    const focusableSelectors = [
      '#category-random',
      '.category-item',
      '#cancel-category-btn',
    ].join(', ');
    const focusable = Array.from(
      this.container.querySelectorAll<HTMLElement>(focusableSelectors)
    ).filter(el => el.offsetParent !== null); // visible only

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || !this.container.contains(active as Node)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last || !this.container.contains(active as Node)) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  /** Announce a message via the live region for screen readers */
  private announce(message: string): void {
    if (this.announcer) {
      this.announcer.textContent = '';
      // Force the DOM to register the empty text so the next set is announced
      requestAnimationFrame(() => {
        if (this.announcer) {
          this.announcer.textContent = message;
        }
      });
    }
  }

  private handleCategorySelect(category: string | null): void {
    this.selectedCategory = category;

    const label = category ?? 'Random (All Words)';
    this.announce(`Selected ${label}. Starting game…`);

    // Visual feedback
    this.overlay.style.opacity = '0.5';

    // Small delay for visual feedback
    setTimeout(() => {
      this.options.onCategorySelected(category);
      this.hide();
    }, 150);
  }

  show(): void {
    this.container.style.display = 'block';
    this.overlay.style.opacity = '1';

    // Auto-focus first interactive element when shown
    requestAnimationFrame(() => {
      const first = this.container.querySelector<HTMLElement>('#category-random');
      first?.focus();
    });
  }

  hide(): void {
    this.container.style.display = 'none';
    this.restoreFocus();
  }

  destroy(): void {
    // Remove global keydown handler
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
    // Remove announcer
    if (this.announcer) {
      this.announcer.remove();
      this.announcer = null;
    }
    this.container.remove();
    this.restoreFocus();
  }

  /** Restore focus to the element that was active before the dialog opened */
  private restoreFocus(): void {
    if (
      this.previouslyFocusedElement &&
      'focus' in this.previouslyFocusedElement &&
      typeof (this.previouslyFocusedElement as HTMLElement).focus === 'function'
    ) {
      (this.previouslyFocusedElement as HTMLElement).focus();
    }
  }

  getSelectedCategory(): string | null {
    return this.selectedCategory;
  }
}
