/**
 * Power-up Selection UI - DOM overlay for using power-ups during gameplay
 *
 * Displays available power-ups as buttons the player can click.
 * Shows remaining count and disables unavailable power-ups.
 *
 * @module powerup-ui
 */

import {
  type PowerUpType,
  type PowerUpInventory,
  getPowerUpName,
  getPowerUpIcon,
  MAX_INVENTORY,
} from './powerups';

export interface PowerUpUIOptions {
  /** Called when a power-up button is clicked */
  onPowerUp: (type: PowerUpType) => void;
}

const POWERUP_TYPES: PowerUpType[] = ['hint', 'skip', 'extra-life'];

/**
 * DOM overlay that shows power-up buttons during gameplay
 */
export class PowerUpUI {
  private container: HTMLDivElement | null = null;
  private options: PowerUpUIOptions;

  constructor(options: PowerUpUIOptions) {
    this.options = options;
    this.createUI();
  }

  private createUI(): void {
    this.container = document.createElement('div');
    this.container.id = 'powerup-ui';
    this.container.setAttribute('role', 'toolbar');
    this.container.setAttribute('aria-label', 'Power-ups');
    this.container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: none;
      flex-direction: column;
      gap: 8px;
      z-index: 200;
    `;

    for (const type of POWERUP_TYPES) {
      const btn = document.createElement('button');
      btn.id = `powerup-${type}`;
      btn.className = 'powerup-btn';
      btn.setAttribute('aria-label', `Use ${getPowerUpName(type)} power-up`);
      btn.style.cssText = `
        padding: 10px 16px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        color: white;
        background: linear-gradient(135deg, #2d1b69 0%, #11998e 100%);
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 8px;
      `;

      btn.addEventListener('click', () => {
        this.options.onPowerUp(type);
      });

      btn.addEventListener('mouseenter', () => {
        if (!btn.disabled) {
          btn.style.transform = 'scale(1.05)';
          btn.style.borderColor = 'rgba(255, 255, 255, 0.5)';
        }
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      });

      this.container.appendChild(btn);
    }

    document.body.appendChild(this.container);
  }

  /**
   * Update the displayed power-up counts and button states
   */
  updateInventory(inventory: PowerUpInventory): void {
    if (!this.container) return;

    for (const type of POWERUP_TYPES) {
      const btn = this.container.querySelector(`#powerup-${type}`) as HTMLButtonElement | null;
      if (!btn) continue;

      const count = inventory[type];
      const icon = getPowerUpIcon(type);
      const name = getPowerUpName(type);
      btn.innerHTML = `${icon} ${name} <span class="powerup-count">(${count}/${MAX_INVENTORY[type]})</span>`;

      if (count <= 0) {
        btn.disabled = true;
        btn.style.opacity = '0.4';
        btn.style.cursor = 'not-allowed';
      } else {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      }
    }
  }

  /**
   * Show the power-up UI
   */
  show(): void {
    if (this.container) {
      this.container.style.display = 'flex';
    }
  }

  /**
   * Hide the power-up UI
   */
  hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * Remove the power-up UI from the DOM
   */
  destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  /**
   * Get the container element (for testing)
   */
  getContainer(): HTMLDivElement | null {
    return this.container;
  }
}
