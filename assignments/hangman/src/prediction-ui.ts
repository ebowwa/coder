/**
 * DOM overlay modal for prediction flow - Returns Promise<Prediction> that resolves to 'in' or 'not-in'
 */

import { createFocusTrap } from './accessibility';

export type Prediction = 'in' | 'not-in';

export class PredictionUI {
  private container: HTMLElement;
  private modal: HTMLDivElement | null = null;
  private selectedLetter: string | null = null;
  private resolvePromise: ((prediction: Prediction) => void) | null = null;
  private cleanupFocusTrap: (() => void) | null = null;
  private handleKeyDown: ((event: KeyboardEvent) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Show prediction modal and return a promise that resolves when user makes a choice
   */
  async getPrediction(letter: string): Promise<Prediction> {
    this.selectedLetter = letter;
    this.createModal(letter);

    return new Promise<Prediction>((resolve) => {
      this.resolvePromise = resolve;
    });
  }

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
   * Set up keyboard navigation for the prediction modal
   * 1 = IN, 2 = NOT IN, Escape = close
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

  private handleSelection(prediction: Prediction): void {
    if (this.resolvePromise) {
      this.resolvePromise(prediction);
      this.resolvePromise = null;
    }
    this.hide();
  }

  hide(): void {
    if (this.modal) {
      if (this.modal.parentNode) {
        this.modal.parentNode.removeChild(this.modal);
      }
      this.modal = null;
    }
  }

  /**
   * Show a temporary message toast
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
