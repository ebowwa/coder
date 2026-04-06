/**
 * Category Selection UI - DOM overlay for selecting word categories
 * Appears before game start in single-player mode
 */

import { getAllCategories } from './words';

export interface CategoryUIOptions {
  onCategorySelected: (category: string | null) => void;
  onCancel?: () => void;
}

export class CategoryUI {
  private container: HTMLDivElement;
  private overlay: HTMLDivElement;
  private options: CategoryUIOptions;
  private selectedCategory: string | null = null;

  constructor(options: CategoryUIOptions) {
    this.options = options;

    // Create container
    this.container = document.createElement('div');
    this.container.id = 'category-ui';
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

    this.render();
  }

  private render(): void {
    const categories = getAllCategories();
    
    // Category icons/colors for visual appeal
    const categoryStyles: Record<string, { color: string; icon: string }> = {
      'Animals': { color: '#4caf50', icon: '🐾' },
      'Actions': { color: '#ff9800', icon: '⚡' },
      'Objects': { color: '#9c27b0', icon: '📦' },
      'Nature': { color: '#8bc34a', icon: '🌿' },
      'Food': { color: '#f44336', icon: '🍎' },
      'Colors': { color: '#e91e63', icon: '🎨' },
      'Places': { color: '#3f51b5', icon: '🏠' },
      'Body': { color: '#ff5722', icon: '💪' },
      'Emotions': { color: '#9c27b0', icon: '💭' },
      'Space': { color: '#673ab7', icon: '🌙' },
      'Weather': { color: '#03a9f4', icon: '🌧️' },
      'Sports': { color: '#00bcd4', icon: '⚽' },
      'People': { color: '#795548', icon: '👤' },
      'Vehicles': { color: '#607d8b', icon: '🚗' },
      'Arts': { color: '#e91e63', icon: '🎭' },
      'Time': { color: '#ffc107', icon: '⏰' },
      'Structures': { color: '#795548', icon: '🏰' },
      'Events': { color: '#ff4081', icon: '🎉' },
      'Concepts': { color: '#00bcd4', icon: '💡' },
      'Science': { color: '#009688', icon: '🔬' },
    };

    const defaultStyle = { color: '#4ecdc4', icon: '📝' };

    this.overlay.innerHTML = `
      <div style="
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
        <h1 style="
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
        <div id="category-random" style="
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
          <span style="font-size: 2em;">🎲</span>
          <span style="
            color: #fff;
            font-size: 1.3em;
            font-weight: bold;
          ">Random (All Words)</span>
        </div>

        <div style="
          display: flex;
          align-items: center;
          margin: 20px 0;
        ">
          <div style="flex: 1; height: 1px; background: #333;"></div>
          <span style="color: #666; padding: 0 15px; font-size: 0.85em;">OR PICK A CATEGORY</span>
          <div style="flex: 1; height: 1px; background: #333;"></div>
        </div>

        <!-- Category grid -->
        <div id="category-grid" style="
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
        ">
          ${categories.map(category => {
            const style = categoryStyles[category] || defaultStyle;
            return `
              <div class="category-item" data-category="${category}" style="
                background: rgba(255, 255, 255, 0.05);
                border: 2px solid ${style.color};
                border-radius: 10px;
                padding: 15px 10px;
                cursor: pointer;
                text-align: center;
                transition: transform 0.2s, background 0.2s;
              ">
                <div style="font-size: 1.8em; margin-bottom: 8px;">${style.icon}</div>
                <div style="color: #fff; font-size: 0.9em; font-weight: 500;">${category}</div>
              </div>
            `;
          }).join('')}
        </div>

        <button id="cancel-category-btn" style="
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

    this.setupEvents();
  }

  private setupEvents(): void {
    // Random button
    const randomBtn = document.getElementById('category-random');
    randomBtn?.addEventListener('click', () => {
      this.handleCategorySelect(null);
    });

    // Category items
    const categoryItems = document.querySelectorAll('.category-item');
    categoryItems.forEach(item => {
      item.addEventListener('click', () => {
        const category = (item as HTMLElement).dataset.category;
        if (category) {
          this.handleCategorySelect(category);
        }
      });

      // Hover effects
      item.addEventListener('mouseenter', () => {
        (item as HTMLElement).style.transform = 'scale(1.05)';
        (item as HTMLElement).style.background = 'rgba(255, 255, 255, 0.1)';
      });
      item.addEventListener('mouseleave', () => {
        (item as HTMLElement).style.transform = 'scale(1)';
        (item as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
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
  }

  private handleCategorySelect(category: string | null): void {
    this.selectedCategory = category;
    
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
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  destroy(): void {
    this.container.remove();
  }

  getSelectedCategory(): string | null {
    return this.selectedCategory;
  }
}
