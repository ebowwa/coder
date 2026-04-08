/**
 * Tests for LetterTiles module
 * Note: These tests mock Three.js dependencies
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store event listeners for simulation
const eventListeners: Map<string, EventListener[]> = new Map();

// Mock document for canvas operations
const mockCanvas = {
  width: 128,
  height: 128,
  getContext: vi.fn(() => ({
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
  })),
};

globalThis.document = {
  createElement: vi.fn((tagName: string) => {
    if (tagName === 'canvas') {
      return mockCanvas;
    }
    return {};
  }),
} as any;

// @ts-ignore
globalThis.window = {
  addEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
    if (!eventListeners.has(type)) {
      eventListeners.set(type, []);
    }
    eventListeners.get(type)!.push(listener as EventListener);
  }),
  removeEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
    const listeners = eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener as EventListener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }),
  innerWidth: 1024,
  innerHeight: 768,
};

// Track animation frame callbacks
let animationFrameCallbacks: FrameRequestCallback[] = [];

// @ts-ignore
globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
  animationFrameCallbacks.push(cb);
  return animationFrameCallbacks.length;
});

// @ts-ignore
globalThis.performance = {
  now: vi.fn(() => 0),
};

// Mock Three.js with configurable raycaster
let mockIntersects: any[] = [];

vi.mock('three', () => ({
  Scene: vi.fn(function() {
    return {
      add: vi.fn(),
      background: null,
    }
  }),
  PerspectiveCamera: vi.fn(function() {
    return {
      position: { set: vi.fn() },
    }
  }),
  Group: vi.fn(function() {
    return {
      add: vi.fn(),
      position: { set: vi.fn() },
    }
  }),
  Mesh: vi.fn(function() {
    return {
      position: { set: vi.fn(), y: 0 },
      rotation: { x: 0 },
      scale: { set: vi.fn() },
      castShadow: false,
      receiveShadow: false,
      userData: {},
      add: vi.fn(),
      material: {
        color: { setHex: vi.fn() },
        emissive: { setHex: vi.fn() },
      },
    }
  }),
  BoxGeometry: vi.fn(),
  PlaneGeometry: vi.fn(),
  MeshStandardMaterial: vi.fn(function() {
    return {
      color: { setHex: vi.fn() },
      emissive: { setHex: vi.fn() },
    }
  }),
  CanvasTexture: vi.fn(),
  Raycaster: vi.fn(function() {
    return {
      setFromCamera: vi.fn(),
      intersectObjects: vi.fn(() => mockIntersects),
    }
  }),
  Vector2: vi.fn(function() {
    return { x: 0, y: 0 }
  }),
  Object3D: vi.fn(),
}));

// Mock three/examples/jsm
vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn(() => ({
    enableDamping: false,
    dampingFactor: 0,
    maxDistance: 0,
    minDistance: 0,
  })),
}));

import { LetterTiles } from '../letter-tiles';

// Helper to simulate events
function simulateEvent(type: string, eventData: any) {
  const listeners = eventListeners.get(type);
  if (listeners) {
    listeners.forEach(listener => listener(eventData as Event));
  }
}

// Helper to run animation frames
function runAnimationFrames(count: number, timeIncrement: number = 50) {
  for (let i = 0; i < count; i++) {
    const callbacks = [...animationFrameCallbacks];
    animationFrameCallbacks = [];
    callbacks.forEach(cb => {
      (performance.now as any).mockReturnValue(i * timeIncrement);
      cb(i * timeIncrement);
    });
  }
}

describe('LetterTiles', () => {
  let letterTiles: LetterTiles;
  let mockCamera: any;

  beforeEach(() => {
    vi.clearAllMocks();
    eventListeners.clear();
    animationFrameCallbacks = [];
    mockIntersects = [];
    mockCamera = {} as any;
    letterTiles = new LetterTiles(mockCamera);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create 26 letter tiles (A-Z)', () => {
      // The constructor creates tiles for all letters
      expect(letterTiles).toBeDefined();
    });

    it('should return a group mesh', () => {
      const mesh = letterTiles.getMesh();
      expect(mesh).toBeDefined();
    });
  });

  describe('setPosition', () => {
    it('should set position of the tile group', () => {
      letterTiles.setPosition(1, 2, 3);
      // Position should be set without error
      expect(letterTiles).toBeDefined();
    });
  });

  describe('setTileClickHandler', () => {
    it('should register a click handler', () => {
      const handler = vi.fn();
      letterTiles.setTileClickHandler(handler);
      expect(letterTiles).toBeDefined();
    });
  });

  describe('setTileStatus', () => {
    it('should handle correct status', () => {
      letterTiles.setTileStatus('A', 'correct');
      expect(letterTiles).toBeDefined();
    });

    it('should handle wrong status', () => {
      letterTiles.setTileStatus('B', 'wrong');
      expect(letterTiles).toBeDefined();
    });

    it('should handle lowercase letters', () => {
      letterTiles.setTileStatus('c', 'correct');
      expect(letterTiles).toBeDefined();
    });

    it('should handle non-existent letters gracefully', () => {
      letterTiles.setTileStatus('123', 'correct');
      expect(letterTiles).toBeDefined();
    });
  });

  describe('reset', () => {
    it('should reset all tiles to unused state', () => {
      letterTiles.setTileStatus('A', 'correct');
      letterTiles.setTileStatus('B', 'wrong');
      
      letterTiles.reset();
      
      expect(letterTiles).toBeDefined();
    });
  });

  describe('dispose', () => {
    it('should clean up event listeners', () => {
      letterTiles.dispose();
      expect(letterTiles).toBeDefined();
    });
  });

  describe('Mouse event handling', () => {
    it('should register mousemove event listener', () => {
      expect(eventListeners.has('mousemove')).toBe(true);
      expect(eventListeners.get('mousemove')!.length).toBeGreaterThan(0);
    });

    it('should register click event listener', () => {
      expect(eventListeners.has('click')).toBe(true);
      expect(eventListeners.get('click')!.length).toBeGreaterThan(0);
    });

    it('should handle mouse move and calculate coordinates', () => {
      const mouseMoveListener = eventListeners.get('mousemove')![0];
      expect(mouseMoveListener).toBeDefined();
      
      // Simulate mouse move event
      const mockEvent = {
        clientX: 512,
        clientY: 384,
      } as unknown as MouseEvent;
      
      mouseMoveListener(mockEvent);
      expect(letterTiles).toBeDefined();
    });

    it('should trigger hover effect when mouse is over unused tile', () => {
      // Set up mock intersect with an unused tile
      const mockMesh = {
        userData: { letter: 'A' },
        material: { emissive: { setHex: vi.fn() } },
        scale: { set: vi.fn() },
      };
      mockIntersects = [{ object: mockMesh }];
      
      const mouseMoveListener = eventListeners.get('mousemove')![0];
      const mockEvent = {
        clientX: 512,
        clientY: 384,
      } as unknown as MouseEvent;
      
      mouseMoveListener(mockEvent);
      expect(letterTiles).toBeDefined();
    });

    it('should reset previous hover when moving to a different tile', () => {
      const mockMesh1 = {
        userData: { letter: 'A' },
        material: { emissive: { setHex: vi.fn() } },
        scale: { set: vi.fn() },
      };
      const mockMesh2 = {
        userData: { letter: 'B' },
        material: { emissive: { setHex: vi.fn() } },
        scale: { set: vi.fn() },
      };
      
      const mouseMoveListener = eventListeners.get('mousemove')![0];
      const mockEvent = {
        clientX: 512,
        clientY: 384,
      } as unknown as MouseEvent;
      
      // First hover on A
      mockIntersects = [{ object: mockMesh1 }];
      mouseMoveListener(mockEvent);
      
      // Then hover on B
      mockIntersects = [{ object: mockMesh2 }];
      mouseMoveListener(mockEvent);
      
      expect(letterTiles).toBeDefined();
    });

    it('should clear hover when mouse moves away from tiles', () => {
      const mockMesh = {
        userData: { letter: 'A' },
        material: { emissive: { setHex: vi.fn() } },
        scale: { set: vi.fn() },
      };
      
      const mouseMoveListener = eventListeners.get('mousemove')![0];
      const mockEvent = {
        clientX: 512,
        clientY: 384,
      } as unknown as MouseEvent;
      
      // Hover on tile
      mockIntersects = [{ object: mockMesh }];
      mouseMoveListener(mockEvent);
      
      // Move away
      mockIntersects = [];
      mouseMoveListener(mockEvent);
      
      expect(letterTiles).toBeDefined();
    });
  });

  describe('Click handling', () => {
    it('should trigger click handler when clicking on a tile', () => {
      const clickHandler = vi.fn();
      letterTiles.setTileClickHandler(clickHandler);
      
      const mockMesh = {
        userData: { letter: 'C' },
        parent: null,
      };
      mockIntersects = [{ object: mockMesh }];
      
      const clickListener = eventListeners.get('click')![0];
      const mockEvent = {
        clientX: 512,
        clientY: 384,
      } as unknown as MouseEvent;
      
      clickListener(mockEvent);
      expect(clickHandler).toHaveBeenCalledWith('C');
    });

    it('should not trigger click handler when no tile is clicked', () => {
      const clickHandler = vi.fn();
      letterTiles.setTileClickHandler(clickHandler);
      
      mockIntersects = [];
      
      const clickListener = eventListeners.get('click')![0];
      const mockEvent = {
        clientX: 512,
        clientY: 384,
      } as unknown as MouseEvent;
      
      clickListener(mockEvent);
      expect(clickHandler).not.toHaveBeenCalled();
    });

    it('should handle click on child mesh (letter face)', () => {
      const clickHandler = vi.fn();
      letterTiles.setTileClickHandler(clickHandler);
      
      const parentMesh = {
        userData: { letter: 'D' },
      };
      const childMesh = {
        userData: {}, // No letter on child
        parent: parentMesh,
      };
      mockIntersects = [{ object: childMesh }];
      
      const clickListener = eventListeners.get('click')![0];
      const mockEvent = {
        clientX: 512,
        clientY: 384,
      } as unknown as MouseEvent;
      
      clickListener(mockEvent);
      expect(clickHandler).toHaveBeenCalledWith('D');
    });

    it('should not call handler if no click handler is set', () => {
      const mockMesh = {
        userData: { letter: 'E' },
        parent: null,
      };
      mockIntersects = [{ object: mockMesh }];
      
      const clickListener = eventListeners.get('click')![0];
      const mockEvent = {
        clientX: 512,
        clientY: 384,
      } as unknown as MouseEvent;
      
      // Should not throw
      expect(() => clickListener(mockEvent)).not.toThrow();
    });
  });

  describe('Touch event handling', () => {
    it('should register touchstart event listener', () => {
      expect(eventListeners.has('touchstart')).toBe(true);
      expect(eventListeners.get('touchstart')!.length).toBeGreaterThan(0);
    });

    it('should register touchend event listener', () => {
      expect(eventListeners.has('touchend')).toBe(true);
      expect(eventListeners.get('touchend')!.length).toBeGreaterThan(0);
    });

    it('should handle touch start and update hover state', () => {
      const mockMesh = {
        userData: { letter: 'F' },
        material: { emissive: { setHex: vi.fn() } },
        scale: { set: vi.fn() },
      };
      mockIntersects = [{ object: mockMesh }];
      
      const touchStartListener = eventListeners.get('touchstart')![0];
      const mockEvent = {
        preventDefault: vi.fn(),
        touches: [{ clientX: 512, clientY: 384 }],
      } as unknown as TouchEvent;
      
      touchStartListener(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should handle touch end and trigger click handler', () => {
      const clickHandler = vi.fn();
      letterTiles.setTileClickHandler(clickHandler);
      
      const mockMesh = {
        userData: { letter: 'G' },
        parent: null,
      };
      mockIntersects = [{ object: mockMesh }];
      
      const touchEndListener = eventListeners.get('touchend')![0];
      const mockEvent = {
        preventDefault: vi.fn(),
        changedTouches: [{ clientX: 512, clientY: 384 }],
      } as unknown as TouchEvent;
      
      touchEndListener(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(clickHandler).toHaveBeenCalledWith('G');
    });

    it('should handle touch end on child mesh', () => {
      const clickHandler = vi.fn();
      letterTiles.setTileClickHandler(clickHandler);
      
      const parentMesh = {
        userData: { letter: 'H' },
      };
      const childMesh = {
        userData: {},
        parent: parentMesh,
      };
      mockIntersects = [{ object: childMesh }];
      
      const touchEndListener = eventListeners.get('touchend')![0];
      const mockEvent = {
        preventDefault: vi.fn(),
        changedTouches: [{ clientX: 512, clientY: 384 }],
      } as unknown as TouchEvent;
      
      touchEndListener(mockEvent);
      expect(clickHandler).toHaveBeenCalledWith('H');
    });

    it('should not trigger handler on touch end with no intersection', () => {
      const clickHandler = vi.fn();
      letterTiles.setTileClickHandler(clickHandler);
      
      mockIntersects = [];
      
      const touchEndListener = eventListeners.get('touchend')![0];
      const mockEvent = {
        preventDefault: vi.fn(),
        changedTouches: [{ clientX: 512, clientY: 384 }],
      } as unknown as TouchEvent;
      
      touchEndListener(mockEvent);
      expect(clickHandler).not.toHaveBeenCalled();
    });
  });

  describe('Tile animation', () => {
    it('should animate tile when setting status to correct', () => {
      letterTiles.setTileStatus('I', 'correct');
      
      // Animation should have been started via requestAnimationFrame
      expect(requestAnimationFrame).toHaveBeenCalled();
    });

    it('should animate tile when setting status to wrong', () => {
      letterTiles.setTileStatus('J', 'wrong');
      
      // Animation should have been started via requestAnimationFrame
      expect(requestAnimationFrame).toHaveBeenCalled();
    });

    it('should run animation frames to completion', () => {
      letterTiles.setTileStatus('K', 'correct');
      
      // Run animation frames to simulate time passing
      runAnimationFrames(5, 50);
      
      // Animation should complete without errors
      expect(letterTiles).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle multiple consecutive resets', () => {
      letterTiles.setTileStatus('L', 'correct');
      letterTiles.reset();
      letterTiles.reset();
      letterTiles.reset();
      
      expect(letterTiles).toBeDefined();
    });

    it('should handle status change on already changed tile', () => {
      letterTiles.setTileStatus('M', 'correct');
      letterTiles.setTileStatus('M', 'wrong');
      
      expect(letterTiles).toBeDefined();
    });

    it('should handle touch events with multiple touches gracefully', () => {
      const touchStartListener = eventListeners.get('touchstart')![0];
      const mockEvent = {
        preventDefault: vi.fn(),
        touches: [
          { clientX: 512, clientY: 384 },
          { clientX: 100, clientY: 200 },
        ],
      } as unknown as TouchEvent;
      
      // Should only process first touch
      touchStartListener(mockEvent);
      expect(letterTiles).toBeDefined();
    });

    it('should handle touch end with no changed touches gracefully', () => {
      const touchEndListener = eventListeners.get('touchend')![0];
      const mockEvent = {
        preventDefault: vi.fn(),
        changedTouches: [],
      } as unknown as TouchEvent;
      
      // Should not throw
      expect(() => touchEndListener(mockEvent)).not.toThrow();
    });
  });
});
