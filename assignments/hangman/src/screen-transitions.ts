/**
 * Screen Transitions - Smooth animated transitions between game screens
 * Supports fade, slide, scale, and combined effects
 */

export type TransitionType = 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'scale' | 'fade-scale';

export interface TransitionOptions {
  type: TransitionType;
  duration: number; // milliseconds
  easing?: string;
  delay?: number;
}

const DEFAULT_DURATION = 400;
const DEFAULT_EASING = 'cubic-bezier(0.4, 0.0, 0.2, 1)'; // ease-out-cubic

/**
 * Apply transition styles to an element
 */
export function applyTransition(
  element: HTMLElement,
  options: TransitionOptions
): void {
  const { type, duration = DEFAULT_DURATION, easing = DEFAULT_EASING, delay = 0 } = options;

  // Add transition CSS
  element.style.transition = `all ${duration}ms ${easing} ${delay}ms`;
  element.style.willChange = 'transform, opacity';
}

/**
 * Transition an element in (show)
 */
export function transitionIn(
  element: HTMLElement,
  options: TransitionOptions,
  callback?: () => void
): void {
  const { type, duration = DEFAULT_DURATION } = options;

  // Set initial state based on transition type
  switch (type) {
    case 'fade':
      element.style.opacity = '0';
      element.style.transform = 'none';
      break;
    case 'slide-left':
      element.style.opacity = '0';
      element.style.transform = 'translateX(100%)';
      break;
    case 'slide-right':
      element.style.opacity = '0';
      element.style.transform = 'translateX(-100%)';
      break;
    case 'slide-up':
      element.style.opacity = '0';
      element.style.transform = 'translateY(100%)';
      break;
    case 'slide-down':
      element.style.opacity = '0';
      element.style.transform = 'translateY(-100%)';
      break;
    case 'scale':
      element.style.opacity = '0';
      element.style.transform = 'scale(0.8)';
      break;
    case 'fade-scale':
      element.style.opacity = '0';
      element.style.transform = 'scale(0.95)';
      break;
  }

  // Make visible
  element.style.display = 'block';
  element.style.pointerEvents = 'none';

  // Apply transition
  applyTransition(element, options);

  // Force reflow
  element.offsetHeight;

  // Animate to final state
  requestAnimationFrame(() => {
    element.style.opacity = '1';
    element.style.transform = 'translateX(0) translateY(0) scale(1)';
    element.style.pointerEvents = 'auto';

    // Call callback after transition completes
    if (callback) {
      setTimeout(callback, duration);
    }
  });
}

/**
 * Transition an element out (hide)
 */
export function transitionOut(
  element: HTMLElement,
  options: TransitionOptions,
  callback?: () => void
): void {
  const { type, duration = DEFAULT_DURATION } = options;

  // Apply transition
  applyTransition(element, options);
  element.style.pointerEvents = 'none';

  // Set target state based on transition type
  switch (type) {
    case 'fade':
      element.style.opacity = '0';
      element.style.transform = 'none';
      break;
    case 'slide-left':
      element.style.opacity = '0';
      element.style.transform = 'translateX(-100%)';
      break;
    case 'slide-right':
      element.style.opacity = '0';
      element.style.transform = 'translateX(100%)';
      break;
    case 'slide-up':
      element.style.opacity = '0';
      element.style.transform = 'translateY(-100%)';
      break;
    case 'slide-down':
      element.style.opacity = '0';
      element.style.transform = 'translateY(100%)';
      break;
    case 'scale':
      element.style.opacity = '0';
      element.style.transform = 'scale(0.8)';
      break;
    case 'fade-scale':
      element.style.opacity = '0';
      element.style.transform = 'scale(0.95)';
      break;
  }

  // Hide after transition completes
  setTimeout(() => {
    element.style.display = 'none';
    element.style.transition = '';
    element.style.willChange = 'auto';
    element.style.pointerEvents = 'auto';
    callback?.();
  }, duration);
}

/**
 * Cross-fade between two elements
 */
export function crossFade(
  outElement: HTMLElement,
  inElement: HTMLElement,
  options: Partial<TransitionOptions> = {}
): Promise<void> {
  return new Promise((resolve) => {
    const fullOptions: TransitionOptions = {
      type: 'fade',
      duration: options.duration || DEFAULT_DURATION,
      easing: options.easing,
      delay: options.delay,
    };

    transitionOut(outElement, fullOptions);
    setTimeout(() => {
      transitionIn(inElement, fullOptions, resolve);
    }, fullOptions.duration / 2);
  });
}

/**
 * Slide transition with optional overlay
 */
export function slideTransition(
  outElement: HTMLElement,
  inElement: HTMLElement,
  direction: 'left' | 'right',
  options: Partial<TransitionOptions> = {}
): Promise<void> {
  return new Promise((resolve) => {
    const outType = direction === 'left' ? 'slide-left' : 'slide-right';
    const inType = direction === 'left' ? 'slide-right' : 'slide-left';

    const outOptions: TransitionOptions = {
      type: outType,
      duration: options.duration || DEFAULT_DURATION,
      easing: options.easing,
      delay: options.delay,
    };

    const inOptions: TransitionOptions = {
      type: inType,
      duration: options.duration || DEFAULT_DURATION,
      easing: options.easing,
      delay: options.delay,
    };

    transitionOut(outElement, outOptions);
    setTimeout(() => {
      transitionIn(inElement, inOptions, resolve);
    }, outOptions.duration / 3);
  });
}

/**
 * Add transition styles to document head
 */
export function injectTransitionStyles(): void {
  if (document.getElementById('screen-transition-styles')) return;

  const style = document.createElement('style');
  style.id = 'screen-transition-styles';
  style.textContent = `
    /* Smooth transitions for game screens */
    #lobby-ui > div,
    #category-ui > div {
      transition-property: transform, opacity;
      transform-origin: center center;
    }
    
    /* Hardware acceleration for smoother animations */
    #lobby-ui,
    #category-ui {
      transform: translateZ(0);
      backface-visibility: hidden;
    }
    
    /* Ensure smooth rendering */
    #lobby-ui > div > div,
    #category-ui > div > div {
      will-change: auto;
    }
    
    /* Pulse animation for loading states */
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .transitioning {
      animation: pulse 1.5s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
}
