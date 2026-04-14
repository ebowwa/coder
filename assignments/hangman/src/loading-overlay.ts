/**
 * Loading Overlay - Reusable loading indicator for async operations
 *
 * Provides a themed loading spinner with optional message text,
 * progress indication, and error state. Used during API fetches,
 * room loading, and game state transitions.
 *
 * @module loading-overlay
 */

/** Style key constants to avoid magic strings */
const STYLE_FADE_IN = 'fadeIn 0.25s ease-out forwards';
const STYLE_FADE_OUT = 'fadeOut 0.2s ease-in forwards';

let stylesInjected = false;

function injectStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;

  const style = document.createElement('style');
  style.id = 'loading-overlay-styles';
  style.textContent = `
    @keyframes lo-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to   { opacity: 0; }
    }
    @keyframes lo-pulse {
      0%, 100% { opacity: 0.4; }
      50%      { opacity: 1; }
    }
    .lo-dots span {
      animation: lo-pulse 1.2s ease-in-out infinite;
    }
    .lo-dots span:nth-child(2) { animation-delay: 0.2s; }
    .lo-dots span:nth-child(3) { animation-delay: 0.4s; }
  `;
  document.head.appendChild(style);
}

export interface LoadingOverlayOptions {
  /** Message displayed below the spinner */
  message?: string;
  /** If true, covers the full viewport. Otherwise just the container. */
  fullscreen?: boolean;
  /** Delay in ms before showing (avoids flash for fast loads). Default 150. */
  showDelay?: number;
  /** Auto-dismiss after this many ms. 0 = no auto-dismiss. Default 0. */
  timeout?: number;
}

export class LoadingOverlay {
  private overlay: HTMLDivElement | null = null;
  private container: HTMLElement;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private visible = false;
  private options: Required<LoadingOverlayOptions>;

  constructor(container: HTMLElement, options: LoadingOverlayOptions = {}) {
    this.container = container;
    this.options = {
      message: options.message ?? 'Loading\u2026',
      fullscreen: options.fullscreen ?? true,
      showDelay: options.showDelay ?? 150,
      timeout: options.timeout ?? 0,
    };
    injectStyles();
  }

  /** Show the loading overlay. Resolves when visible. */
  show(message?: string): void {
    this.remove();

    const msg = message ?? this.options.message;

    this.overlay = document.createElement('div');
    this.overlay.className = 'loading-overlay';
    this.overlay.setAttribute('role', 'status');
    this.overlay.setAttribute('aria-live', 'polite');
    this.overlay.setAttribute('aria-label', msg);
    this.overlay.style.cssText = `
      position: ${this.options.fullscreen ? 'fixed' : 'absolute'};
      top: 0; left: 0;
      width: 100%; height: 100%;
      display: flex; flex-direction: column;
      justify-content: center; align-items: center;
      background: rgba(15, 15, 35, 0.85);
      z-index: ${this.options.fullscreen ? 1500 : 100};
      pointer-events: auto;
      opacity: 0;
    `;

    // Spinner
    const spinner = document.createElement('div');
    spinner.style.cssText = `
      width: 48px; height: 48px;
      border: 4px solid rgba(78, 205, 196, 0.25);
      border-top-color: #4ecdc4;
      border-radius: 50%;
      animation: lo-spin 0.8s linear infinite;
    `;
    spinner.setAttribute('aria-hidden', 'true');
    this.overlay.appendChild(spinner);

    // Message
    const msgEl = document.createElement('div');
    msgEl.style.cssText = `
      color: #ccc;
      font-size: 0.95em;
      margin-top: 16px;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    msgEl.textContent = msg;
    this.overlay.appendChild(msgEl);

    // Animated dots
    const dots = document.createElement('div');
    dots.className = 'lo-dots';
    dots.style.cssText = 'margin-top: 8px; display: flex; gap: 6px;';
    dots.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.style.cssText = `
        width: 6px; height: 6px; border-radius: 50%;
        background: #4ecdc4; display: inline-block;
      `;
      dots.appendChild(dot);
    }
    this.overlay.appendChild(dots);

    // Delayed show to avoid flash
    this.showTimer = setTimeout(() => {
      if (!this.overlay) return;
      this.container.appendChild(this.overlay);
      this.overlay.style.animation = STYLE_FADE_IN;
      this.visible = true;

      // Auto-dismiss
      if (this.options.timeout > 0) {
        this.timeoutTimer = setTimeout(() => this.hide(), this.options.timeout);
      }
    }, this.options.showDelay);
  }

  /** Update the message text while visible. */
  setMessage(message: string): void {
    if (!this.overlay) return;
    this.overlay.setAttribute('aria-label', message);
    const msgEl = this.overlay.querySelectorAll('div')[0];
    if (msgEl) msgEl.textContent = message;
  }

  /** Show an error state with a message and optional retry button. */
  showError(message: string, retryCallback?: () => void): void {
    this.hide();

    this.overlay = document.createElement('div');
    this.overlay.className = 'loading-overlay';
    this.overlay.setAttribute('role', 'alert');
    this.overlay.style.cssText = `
      position: ${this.options.fullscreen ? 'fixed' : 'absolute'};
      top: 0; left: 0;
      width: 100%; height: 100%;
      display: flex; flex-direction: column;
      justify-content: center; align-items: center;
      background: rgba(15, 15, 35, 0.9);
      z-index: ${this.options.fullscreen ? 1500 : 100};
      pointer-events: auto;
    `;

    const icon = document.createElement('div');
    icon.style.cssText = 'font-size: 2.5em; margin-bottom: 12px;';
    icon.textContent = '\u26A0\uFE0F';
    icon.setAttribute('aria-hidden', 'true');
    this.overlay.appendChild(icon);

    const msgEl = document.createElement('div');
    msgEl.style.cssText = `
      color: #f38181;
      font-size: 1em;
      font-family: system-ui, -apple-system, sans-serif;
      text-align: center;
      max-width: 320px;
    `;
    msgEl.textContent = message;
    this.overlay.appendChild(msgEl);

    if (retryCallback) {
      const btn = document.createElement('button');
      btn.textContent = 'Try Again';
      btn.style.cssText = `
        margin-top: 20px;
        padding: 10px 24px;
        border: 2px solid #4ecdc4;
        border-radius: 8px;
        background: transparent;
        color: #4ecdc4;
        font-size: 0.95em;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(78, 205, 196, 0.15)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'transparent';
      });
      btn.addEventListener('click', () => {
        this.hide();
        retryCallback();
      });
      this.overlay.appendChild(btn);
    }

    this.container.appendChild(this.overlay);
    this.visible = true;
  }

  /** Hide and remove the overlay. */
  hide(): void {
    if (this.showTimer !== null) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (this.timeoutTimer !== null) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }

    if (this.overlay && this.overlay.parentNode) {
      this.overlay.style.animation = STYLE_FADE_OUT;
      const el = this.overlay;
      setTimeout(() => el.remove(), 200);
    }
    this.overlay = null;
    this.visible = false;
  }

  /** Whether the overlay is currently visible. */
  isVisible(): boolean {
    return this.visible;
  }

  /** Clean up timers and DOM elements. */
  destroy(): void {
    this.remove();
  }

  /** Synchronous remove without animation. */
  private remove(): void {
    if (this.showTimer !== null) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (this.timeoutTimer !== null) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.visible = false;
  }
}
