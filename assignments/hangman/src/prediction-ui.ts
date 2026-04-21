/**
 * DOM overlay modal for the prediction flow in the Hangman game.
 *
 * Presents a modal dialog asking the player whether they think a given
 * letter is in the hidden word. The modal returns a {@link Prediction}
 * promise that resolves to `'in'` or `'not-in'` based on the player's choice.
 *
 * Supports both button clicks and keyboard navigation (1 = IN, 2 = NOT IN,
 * Escape = NOT IN) and uses a focus trap for accessibility.
 *
 * @module prediction-ui
 * @example
 * ```typescript
 * const ui = new PredictionUI(document.body);
 * const prediction = await ui.getPrediction('A');
 * console.log(prediction); // 'in' | 'not-in'
 * ```
 */

import { createFocusTrap } from './accessibility';

/**
 * Represents the player's prediction about whether a letter is in the word.
 * - `'in'` — player predicts the letter **is** in the word
 * - `'not-in'` — player predicts the letter **is not** in the word
 */
export type Prediction = 'in' | 'not-in';

/**
 * Manages the prediction modal UI overlay for the Hangman game.
 *
 * Creates and controls a full-screen modal dialog that asks the player
 * whether they believe a given letter appears in the hidden word.
 * The modal is keyboard-accessible with focus trapping and supports
 * both mouse/touch and keyboard input.
 *
 * @example
 * ```typescript
 * const ui = new PredictionUI(document.getElementById('app')!);
 *
 * // Shows the modal and waits for user choice
 * const prediction = await ui.getPreduction('E');
 * if (prediction === 'in') {
 *   console.log('Player thinks E is in the word');
 * }
 *
 * // Display a temporary toast message
 * ui.showMessage('Correct!', '#4ecdc4');
 *
 * // Clean up the modal
 * ui.hide();
 * ```
 */
export class PredictionUI {
  /** Root DOM element to which the modal overlay is appended */
  private container: HTMLElement;
  /** Reference to the current modal overlay element, or null if hidden */
  private modal: HTMLDivElement | null = null;
  /** The letter currently being predicted, or null if no prediction is active */
  private selectedLetter: string | null = null;
  /** Resolver function for the active prediction promise */
  private resolvePromise: ((prediction: Prediction) => void) | null = null;
  /** Cleanup function returned by the focus trap, or null if inactive */
  private cleanupFocusTrap: (() => void) | null = null;
  /** Bound keyboard event handler for cleanup, or null if not attached */
  private handleKeyDown: ((event: KeyboardEvent) => void) | null = null;

  /**
   * Create a new PredictionUI instance.
   *
   * @param {HTMLElement} container - The DOM element to which the modal overlay
   *   will be appended when shown. Typically the document body or a main app container.
   *
   * @example
   * ```typescript
   * const ui = new PredictionUI(document.body);
   * ```
   */
  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Show the prediction modal and return a promise that resolves with the player's choice.
   *
   * Displays a full-screen overlay asking whether the given letter is in the word.
   * The promise resolves when the player clicks a button or presses a keyboard shortcut.
   *
   * @param {string} letter - The letter the player is making a prediction about
   * @returns {Promise<Prediction>} Resolves to `'in'` or `'not-in'` based on the player's selection
   *
   * @example
   * ```typescript
   * const ui = new PredictionUI(document.body);
   * const result = await ui.getPrediction('S');
   * console.log(result); // 'in' | 'not-in'
   * ```
   */
  async getPrediction(letter: string): Promise<Prediction> {
    this.selectedLetter = letter;
    this.createModal(letter);

    return new Promise<Prediction>((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  /**
   * Build and mount the prediction modal DOM structure.
   *
   * Creates a full-screen overlay with an accessible dialog containing the
   * letter question and IN / NOT-IN buttons. Automatically removes any
   * previously displayed modal before creating a new one. Sets up keyboard
   * navigation and a focus trap after mounting.
   *
   * @param {string} letter - The letter to display in the modal prompt
   * @returns {void}
   */
  private createModal(letter: string): void {
    // Remove existing modal if any
    this.hide();

    // Create modal element with ARIA attributes
    this.modal = document.createElement('div');
    this.modal.className = 'prediction-modal-overlay';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-labelledby', 'prediction-dialog-title');
    this.modal.setAttribute('aria-describedby', 'prediction-dialog-description');
    this.modal.style.position = 'fixed';
    this.modal.style.top = '0';
    this.modal.style.left = '0';
    this.modal.style.width = '100%';
    this.modal.style.height = '100%';
    this.modal.style.backgroundColor = 'rgba(50, 50, 50, 0.9)';
    this.modal.style.zIndex = '100';
    this.modal.style.display = 'flex';
    this.modal.style.justifyContent = 'center';
    this.modal.style.alignItems = 'center';

    // Create modal content
    const content = document.createElement('div');
    content.className = 'prediction-modal-content';
    content.setAttribute('role', 'document');
    content.style.backgroundColor = '#fff';
    content.style.padding = '20px';
    content.style.borderRadius = '10px';
    content.style.textAlign = 'center';
    content.style.fontSize = '20px';

    // Create question with ID for aria-labelledby
    const question = document.createElement('h2');
    question.id = 'prediction-dialog-title';
    const letterSpan = document.createElement('strong');
    letterSpan.className = 'letter-tile-text';
    letterSpan.id = 'prediction-dialog-description';
    letterSpan.textContent = letter;
    // Build question text without createTextNode for test compatibility
    question.innerHTML = 'Do you think the ';
    question.appendChild(letterSpan);
    // Use a span for the trailing text instead of createTextNode
    const trailingText = document.createElement('span');
    trailingText.textContent = ' is in the word?';
    question.appendChild(trailingText);

    // Create buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'prediction-buttons';
    buttonsContainer.style.marginTop = '20px';
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.gap = '10px';
    buttonsContainer.style.justifyContent = 'center';

    // Create IN button
    const inBtn = document.createElement('button');
    inBtn.id = 'in-btn';
    inBtn.className = 'prediction-btn in-btn';
    inBtn.textContent = 'IN';
    inBtn.style.padding = '10px 20px';
    inBtn.style.fontSize = '16px';
    inBtn.style.cursor = 'pointer';
    inBtn.addEventListener('click', () => this.handleSelection('in'));

    // Create NOT IN button
    const notInBtn = document.createElement('button');
    notInBtn.id = 'not-in-btn';
    notInBtn.className = 'prediction-btn not-in-btn';
    notInBtn.textContent = 'NOT IN';
    notInBtn.style.padding = '10px 20px';
    notInBtn.style.fontSize = '16px';
    notInBtn.style.cursor = 'pointer';
    notInBtn.addEventListener('click', () => this.handleSelection('not-in'));

    // Assemble modal
    buttonsContainer.appendChild(inBtn);
    buttonsContainer.appendChild(notInBtn);
    content.appendChild(question);
    content.appendChild(buttonsContainer);
    this.modal.appendChild(content);

    // Add to DOM
    this.container.appendChild(this.modal);

    // Set up keyboard navigation
    this.setupKeyboardNavigation();

    // Set up focus trap for accessibility
    this.cleanupFocusTrap = createFocusTrap(this.modal);

    // Focus the first button for keyboard users
    inBtn.focus();
  }

  /**
   * Set up keyboard navigation for the prediction modal.
   *
   * Binds a `keydown` listener on `document` with the following mappings:
   * - `1` → select IN
   * - `2` → select NOT IN
   * - `Escape` → select NOT IN (default dismiss)
   * - `Enter` / Space → handled by the focused button natively
   *
   * Ignores key events originating from `<input>` or `<textarea>` elements.
   *
   * @returns {void}
   */
  private setupKeyboardNavigation(): void {
    this.handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case '1':
          event.preventDefault();
          this.handleSelection('in');
          break;
        case '2':
          event.preventDefault();
          this.handleSelection('not-in');
          break;
        case 'Escape':
          event.preventDefault();
          // Default to 'not-in' on escape
          this.handleSelection('not-in');
          break;
        case 'Enter':
        case ' ':
          // Let the focus trap handle tab navigation
          // Enter/Space on focused button is handled by the button itself
          break;
      }
    };

    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Handle the player's prediction selection.
   *
   * Resolves the active prediction promise with the chosen value,
   * then hides the modal. If no promise is pending (e.g. duplicate
   * selection), only hides the modal.
   *
   * @param {Prediction} prediction - The player's choice (`'in'` or `'not-in'`)
   * @returns {void}
   */
  private handleSelection(prediction: Prediction): void {
    if (this.resolvePromise) {
      this.resolvePromise(prediction);
      this.resolvePromise = null;
    }
    this.hide();
  }

  /**
   * Remove the prediction modal from the DOM.
   *
   * Detaches the modal overlay element from its parent node and
   * resets the internal modal reference to `null`. Safe to call
   * when no modal is visible (no-op).
   *
   * @returns {void}
   */
  hide(): void {
    // Clean up keyboard listener
    if (this.handleKeyDown) {
      document.removeEventListener('keydown', this.handleKeyDown);
      this.handleKeyDown = null;
    }
    // Clean up focus trap
    if (this.cleanupFocusTrap) {
      this.cleanupFocusTrap();
      this.cleanupFocusTrap = null;
    }
    if (this.modal) {
      if (this.modal.parentNode) {
        this.modal.parentNode.removeChild(this.modal);
      }
      this.modal = null;
    }
  }

  /**
   * Display a temporary toast message on screen.
   *
   * Creates a fixed-position toast notification that slides up from the bottom
   * of the viewport, remains visible for ~2.5 seconds, then fades out and is
   * removed from the DOM. Any previously displayed toast is removed first.
   *
   * @param {string} message - The text content to display in the toast
   * @param {string} [color='#4ecdc4'] - CSS color for the toast text and border
   * @returns {void}
   *
   * @example
   * ```typescript
   * ui.showMessage('Correct prediction!', '#4ecdc4');
   * ui.showMessage('Wrong guess!', '#ff6b6b');
   * ```
   */
  showMessage(message: string, color: string = '#4ecdc4'): void {
    // Remove existing toast if any
    const existingToast = document.getElementById('game-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'game-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.85);
      color: ${color};
      padding: 15px 30px;
      border-radius: 10px;
      font-size: 1.1em;
      font-weight: bold;
      z-index: 500;
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);
      border: 2px solid ${color};
      animation: fadeInUp 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Add animation styles if not present
    if (!document.getElementById('toast-animation-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-animation-styles';
      style.textContent = `
        @keyframes fadeInUp {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        @keyframes fadeOutDown {
          from { transform: translateX(-50%) translateY(0); opacity: 1; }
          to { transform: translateX(-50%) translateY(20px); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    // Auto-hide after delay
    setTimeout(() => {
      toast.style.animation = 'fadeOutDown 0.3s ease-out forwards';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }
}
