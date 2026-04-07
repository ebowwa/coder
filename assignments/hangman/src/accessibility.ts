/**
 * Accessibility module for Hangman game
 * Provides ARIA labels, keyboard navigation, and screen reader support
 */

import type { LetterStatus, Round, GameState } from './types';
import { GAME_CONFIG } from './config';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export interface AccessibilityOptions {
  onLetterSelect: (letter: string) => void;
  getRoundState: () => Round | null;
  getGameState: () => GameState;
}

export class AccessibilityManager {
  private container: HTMLDivElement;
  private keyboardContainer: HTMLDivElement | null = null;
  private wordDisplayRegion: HTMLDivElement | null = null;
  private hangmanDescriptionRegion: HTMLDivElement | null = null;
  private gameStatusRegion: HTMLDivElement | null = null;
  private options: AccessibilityOptions;
  private letterButtons: Map<string, HTMLButtonElement> = new Map();
  private previousRevealedCount: number = 0;
  private previousWrongGuesses: number = 0;

  constructor(options: AccessibilityOptions) {
    this.options = options;
    this.container = document.createElement('div');
    this.container.id = 'accessibility-layer';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      z-index: 50;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);

    this.createLiveRegions();
    this.createAccessibleKeyboard();
    this.setupKeyboardShortcuts();
  }

  /**
   * Create ARIA live regions for screen reader announcements
   */
  private createLiveRegions(): void {
    // Word display live region - announces when letters are revealed
    this.wordDisplayRegion = document.createElement('div');
    this.wordDisplayRegion.id = 'word-display-announcer';
    this.wordDisplayRegion.setAttribute('role', 'status');
    this.wordDisplayRegion.setAttribute('aria-live', 'polite');
    this.wordDisplayRegion.setAttribute('aria-atomic', 'true');
    this.wordDisplayRegion.className = 'sr-only';
    this.wordDisplayRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    this.container.appendChild(this.wordDisplayRegion);

    // Hangman figure description region
    this.hangmanDescriptionRegion = document.createElement('div');
    this.hangmanDescriptionRegion.id = 'hangman-description';
    this.hangmanDescriptionRegion.setAttribute('role', 'img');
    this.hangmanDescriptionRegion.setAttribute('aria-label', 'Hangman figure: game not started');
    this.hangmanDescriptionRegion.className = 'sr-only';
    this.hangmanDescriptionRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    this.container.appendChild(this.hangmanDescriptionRegion);

    // Game status region for win/lose announcements
    this.gameStatusRegion = document.createElement('div');
    this.gameStatusRegion.id = 'game-status-announcer';
    this.gameStatusRegion.setAttribute('role', 'alert');
    this.gameStatusRegion.setAttribute('aria-live', 'assertive');
    this.gameStatusRegion.className = 'sr-only';
    this.gameStatusRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    this.container.appendChild(this.gameStatusRegion);
  }

  /**
   * Create accessible on-screen keyboard with ARIA labels
   */
  private createAccessibleKeyboard(): void {
    this.keyboardContainer = document.createElement('div');
    this.keyboardContainer.id = 'accessible-keyboard';
    this.keyboardContainer.setAttribute('role', 'group');
    this.keyboardContainer.setAttribute('aria-label', 'Letter selection keyboard');
    this.keyboardContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 15px;
      background: rgba(0, 0, 0, 0.85);
      border-radius: 15px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      z-index: 100;
      pointer-events: auto;
    `;

    // Create keyboard rows (QWERTY layout)
    const rows = [
      'QWERTYUIOP',
      'ASDFGHJKL',
      'ZXCVBNM'
    ];

    rows.forEach((row, rowIndex) => {
      const rowDiv = document.createElement('div');
      rowDiv.style.cssText = `
        display: flex;
        justify-content: center;
        gap: 6px;
      `;

      row.split('').forEach(letter => {
        const button = this.createLetterButton(letter);
        this.letterButtons.set(letter, button);
        rowDiv.appendChild(button);
      });

      this.keyboardContainer!.appendChild(rowDiv);
    });

    // Add keyboard instructions
    const instructions = document.createElement('div');
    instructions.style.cssText = `
      color: #888;
      font-size: 0.75em;
      text-align: center;
      margin-top: 8px;
    `;
    instructions.textContent = 'Use Tab to navigate, Enter/Space to select, or press letter keys directly';
    this.keyboardContainer.appendChild(instructions);

    this.container.appendChild(this.keyboardContainer);
  }

  /**
   * Create a single letter button with proper ARIA attributes
   */
  private createLetterButton(letter: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = `letter-btn-${letter}`;
    button.textContent = letter;
    button.dataset.letter = letter;
    button.dataset.status = 'unused';

    // Set initial ARIA label
    this.updateButtonAriaLabel(button, letter, 'unused');

    button.style.cssText = `
      width: 44px;
      height: 44px;
      font-size: 1.1em;
      font-weight: bold;
      cursor: pointer;
      border: 2px solid #4ecdc4;
      border-radius: 8px;
      background: rgba(78, 205, 196, 0.1);
      color: #4ecdc4;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Hover and focus styles
    button.addEventListener('mouseenter', () => {
      if (button.dataset.status === 'unused') {
        button.style.background = 'rgba(78, 205, 196, 0.3)';
        button.style.transform = 'scale(1.1)';
      }
    });
    button.addEventListener('mouseleave', () => {
      if (button.dataset.status === 'unused') {
        button.style.background = 'rgba(78, 205, 196, 0.1)';
        button.style.transform = 'scale(1)';
      }
    });

    // Focus styles for keyboard navigation
    button.addEventListener('focus', () => {
      if (button.dataset.status === 'unused') {
        button.style.outline = '3px solid #ffe66d';
        button.style.outlineOffset = '2px';
      }
    });
    button.addEventListener('blur', () => {
      button.style.outline = 'none';
    });

    // Click handler
    button.addEventListener('click', () => {
      if (button.dataset.status === 'unused') {
        this.options.onLetterSelect(letter);
      }
    });

    return button;
  }

  /**
   * Update button ARIA label based on its status
   */
  private updateButtonAriaLabel(button: HTMLButtonElement, letter: string, status: LetterStatus): void {
    let ariaLabel: string;
    
    switch (status) {
      case 'correct':
        ariaLabel = `Letter ${letter}, correct, already guessed`;
        break;
      case 'wrong':
        ariaLabel = `Letter ${letter}, wrong, already guessed`;
        break;
      case 'unused':
      default:
        ariaLabel = `Letter ${letter}, not guessed`;
        break;
    }

    button.setAttribute('aria-label', ariaLabel);
    button.dataset.status = status;
  }

  /**
   * Set up keyboard shortcuts for direct letter input
   */
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      // Only handle if not in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = event.key.toUpperCase();
      
      // Handle letter keys A-Z
      if (ALPHABET.includes(key)) {
        const button = this.letterButtons.get(key);
        if (button && button.dataset.status === 'unused') {
          event.preventDefault();
          this.options.onLetterSelect(key);
        }
      }
    });
  }

  /**
   * Update letter button status and appearance
   */
  setLetterStatus(letter: string, status: LetterStatus): void {
    const button = this.letterButtons.get(letter);
    if (!button) return;

    this.updateButtonAriaLabel(button, letter, status);

    // Update visual appearance
    if (status === 'correct') {
      button.style.background = 'rgba(46, 204, 113, 0.6)';
      button.style.borderColor = '#2ecc71';
      button.style.color = '#fff';
      button.style.cursor = 'not-allowed';
      button.style.opacity = '0.8';
    } else if (status === 'wrong') {
      button.style.background = 'rgba(231, 76, 60, 0.6)';
      button.style.borderColor = '#e74c3c';
      button.style.color = '#fff';
      button.style.cursor = 'not-allowed';
      button.style.opacity = '0.8';
    }

    // Disable the button
    button.setAttribute('aria-disabled', 'true');
  }

  /**
   * Update word display announcement for screen readers
   */
  updateWordDisplay(round: Round): void {
    if (!this.wordDisplayRegion) return;

    const revealedLetters: string[] = [];
    const hiddenCount = round.word.split('').filter(l => !round.revealedLetters.has(l)).length;
    
    round.word.split('').forEach(letter => {
      if (round.revealedLetters.has(letter)) {
        revealedLetters.push(letter);
      } else {
        revealedLetters.push('blank');
      }
    });

    // Check if new letters were revealed
    const currentRevealedCount = round.revealedLetters.size;
    if (currentRevealedCount > this.previousRevealedCount) {
      // Find newly revealed letters
      const newLetters = Array.from(round.revealedLetters)
        .filter(l => !round.word.split('').slice(0, this.previousRevealedCount).includes(l));
      
      if (newLetters.length > 0) {
        const letterWord = newLetters.length === 1 ? 'letter' : 'letters';
        this.announceWord(`Revealed ${letterWord}: ${newLetters.join(', ')}. Word now shows: ${revealedLetters.join(', ')}`);
      }
    }

    this.previousRevealedCount = currentRevealedCount;

    // Update the region's label for screen readers
    const wordDisplay = revealedLetters.join(' ');
    this.wordDisplayRegion.setAttribute('aria-label', 
      `Word display: ${wordDisplay}. ${hiddenCount} letters remaining.`
    );
  }

  /**
   * Update hangman figure description for screen readers
   */
  updateHangmanDescription(wrongGuesses: number, maxGuesses: number): void {
    if (!this.hangmanDescriptionRegion) return;

    const bodyParts = this.getBodyPartsVisible(wrongGuesses);
    const remaining = maxGuesses - wrongGuesses;

    let description = `Hangman figure: `;
    
    if (wrongGuesses === 0) {
      description += `no body parts visible. ${remaining} of ${maxGuesses} wrong guesses allowed.`;
    } else {
      description += `${bodyParts} visible. ${wrongGuesses} of ${maxGuesses} wrong guesses used, ${remaining} remaining.`;
    }

    this.hangmanDescriptionRegion.setAttribute('aria-label', description);

    // Announce if wrong guesses increased
    if (wrongGuesses > this.previousWrongGuesses) {
      this.announceWord(`Wrong guess! ${bodyParts} now visible. ${remaining} guesses remaining.`);
    }
    
    this.previousWrongGuesses = wrongGuesses;
  }

  /**
   * Get human-readable body parts visible
   */
  private getBodyPartsVisible(count: number): string {
    const parts = ['head', 'body', 'left arm', 'right arm', 'left leg', 'right leg'];
    const visible = parts.slice(0, count);
    
    if (visible.length === 0) return 'nothing';
    if (visible.length === 1) return visible[0];
    if (visible.length === 2) return visible.join(' and ');
    
    return `${visible.slice(0, -1).join(', ')}, and ${visible[visible.length - 1]}`;
  }

  /**
   * Announce game over state
   */
  announceGameOver(won: boolean, word: string): void {
    if (!this.gameStatusRegion) return;

    const message = won
      ? `Congratulations! You won! The word was: ${word}`
      : `Game over! You lost. The word was: ${word}`;

    this.gameStatusRegion.textContent = message;
    
    // Also make an announcement through the word display region
    this.announceWord(message);
  }

  /**
   * Announce message to screen readers
   */
  announceWord(message: string): void {
    if (!this.wordDisplayRegion) return;

    // Clear and set message to trigger announcement
    this.wordDisplayRegion.textContent = '';
    setTimeout(() => {
      this.wordDisplayRegion!.textContent = message;
    }, 50);
  }

  /**
   * Reset keyboard for new round
   */
  reset(): void {
    this.letterButtons.forEach((button, letter) => {
      button.dataset.status = 'unused';
      this.updateButtonAriaLabel(button, letter, 'unused');
      
      // Reset visual appearance
      button.style.background = 'rgba(78, 205, 196, 0.1)';
      button.style.borderColor = '#4ecdc4';
      button.style.color = '#4ecdc4';
      button.style.cursor = 'pointer';
      button.style.opacity = '1';
      button.style.transform = 'scale(1)';
      button.removeAttribute('aria-disabled');
    });

    this.previousRevealedCount = 0;
    this.previousWrongGuesses = 0;

    // Clear announcements
    if (this.wordDisplayRegion) {
      this.wordDisplayRegion.textContent = '';
    }
    if (this.gameStatusRegion) {
      this.gameStatusRegion.textContent = '';
    }
  }

  /**
   * Show the accessible keyboard
   */
  show(): void {
    if (this.keyboardContainer) {
      this.keyboardContainer.style.display = 'flex';
    }
  }

  /**
   * Hide the accessible keyboard
   */
  hide(): void {
    if (this.keyboardContainer) {
      this.keyboardContainer.style.display = 'none';
    }
  }

  /**
   * Focus the first unused letter button
   */
  focusFirstUnused(): void {
    for (const letter of ALPHABET) {
      const button = this.letterButtons.get(letter);
      if (button && button.dataset.status === 'unused') {
        button.focus();
        break;
      }
    }
  }

  /**
   * Move focus to a specific element (for modal focus management)
   */
  moveFocusTo(element: HTMLElement): void {
    element.focus();
  }

  /**
   * Clean up accessibility layer
   */
  destroy(): void {
    this.container.remove();
  }
}

/**
 * Create a focus trap for modals
 */
export function createFocusTrap(container: HTMLElement): () => void {
  const focusableSelector = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ');

  const getFocusableElements = () => 
    Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Focus first element
  const focusable = getFocusableElements();
  if (focusable.length > 0) {
    focusable[0].focus();
  }

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Add ARIA attributes to existing hint button
 */
export function enhanceHintButton(button: HTMLButtonElement, hintsRemaining: number, maxHints: number): void {
  button.setAttribute('aria-label', `Use hint. ${hintsRemaining} of ${maxHints} hints remaining.`);
  button.setAttribute('role', 'button');
  
  if (hintsRemaining <= 0) {
    button.setAttribute('aria-disabled', 'true');
  } else {
    button.removeAttribute('aria-disabled');
  }
}
