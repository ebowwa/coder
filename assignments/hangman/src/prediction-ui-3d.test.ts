/**
 * Tests for PredictionUI3D module
 * Covers: constructor, createUI, getPrediction, hide, show, showMessage,
 *         dispose, mouse/touch events, hover detection, bound listener cleanup
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Mock canvas for text rendering ---
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => ({
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    textAlign: '',
    textBaseline: '',
    font: '',
    fillStyle: '',
  })),
};

globalThis.document = {
  createElement: vi.fn((tagName: string) => {
    if (tagName === 'canvas') return mockCanvas;
    return {};
  }),
} as any;

globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => 0);
globalThis.performance = { now: vi.fn(() => 0) };

let windowListeners: Record<string, Set<Function>> = {};

globalThis.window = {
  innerWidth: 1024,
  innerHeight: 768,
  addEventListener: vi.fn((event: string, handler: Function, _opts?: any) => {
    if (!windowListeners[event]) windowListeners[event] = new Set();
    windowListeners[event].add(handler);
  }),
  removeEventListener: vi.fn((event: string, handler: Function) => {
    if (windowListeners[event]) windowListeners[event].delete(handler);
  }),
  setTimeout: vi.fn((fn: Function) => 1),
  clearTimeout: vi.fn(),
} as any;

// --- Mock THREE.js ---
const createMockPosition = () => ({
  x: 0, y: 0, z: 0,
  set: vi.fn(function (this: any, x: number, y: number, z: number) {
    this.x = x; this.y = y; this.z = z;
  }),
});

const createMockScale = () => ({
  x: 0, y: 0, z: 0,
  set: vi.fn(function (this: any, x: number, y: number, z: number) {
    this.x = x; this.y = y; this.z = z;
  }),
});

const createMockMaterial = () => ({
  color: { setHex: vi.fn() },
  emissive: { setHex: vi.fn() },
  dispose: vi.fn(),
  map: null,
  transparent: false,
  opacity: 1,
});

vi.mock('three', () => {
  const createMockMesh = () => ({
    position: createMockPosition(),
    rotation: { x: 0, y: 0, z: 0, set: vi.fn() },
    scale: createMockScale(),
    material: createMockMaterial(),
    geometry: { dispose: vi.fn() },
    castShadow: false,
    receiveShadow: false,
    userData: {},
    visible: true,
    add: vi.fn(),
    remove: vi.fn(),
    parent: null as any,
    children: [] as any[],
  });

  return {
    Scene: vi.fn(() => ({
      add: vi.fn(),
      remove: vi.fn(),
      children: [] as any[],
    })),
    PerspectiveCamera: vi.fn(() => ({
      position: createMockPosition(),
      fov: 60,
      aspect: 1,
      near: 0.1,
      far: 1000,
    })),
    Group: vi.fn(() => {
      const children: any[] = [];
      return {
        add: vi.fn((child: any) => { children.push(child); }),
        remove: vi.fn((child: any) => {
          const idx = children.indexOf(child);
          if (idx > -1) children.splice(idx, 1);
        }),
        position: createMockPosition(),
        scale: createMockScale(),
        visible: true,
        get children() { return children; },
      };
    }),
    Mesh: vi.fn(() => createMockMesh()),
    BoxGeometry: vi.fn(() => ({ dispose: vi.fn() })),
    PlaneGeometry: vi.fn(() => ({ dispose: vi.fn() })),
    MeshStandardMaterial: vi.fn(() => createMockMaterial()),
    CanvasTexture: vi.fn(() => ({ dispose: vi.fn() })),
    Raycaster: vi.fn(() => ({
      setFromCamera: vi.fn(),
      intersectObjects: vi.fn(() => []),
    })),
    Vector2: vi.fn(() => ({ x: 0, y: 0 })),
    DoubleSide: 2,
    Object3D: vi.fn(),
  };
});

import { PredictionUI3D } from './prediction-ui-3d';
import type { Prediction } from './types';

function createMockScene() {
  return {
    add: vi.fn(),
    remove: vi.fn(),
    children: [] as any[],
  } as any;
}

function createMockCamera() {
  return {
    position: createMockPosition(),
    fov: 60,
    aspect: 1,
  } as any;
}

describe('PredictionUI3D', () => {
  let scene: ReturnType<typeof createMockScene>;
  let camera: ReturnType<typeof createMockCamera>;
  let ui: PredictionUI3D;

  beforeEach(() => {
    vi.clearAllMocks();
    windowListeners = {};
    scene = createMockScene();
    camera = createMockCamera();
    ui = new PredictionUI3D(scene, camera);
  });

  afterEach(() => {
    ui.dispose();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(ui).toBeDefined();
    });

    it('should add its group to the scene', () => {
      expect(scene.add).toHaveBeenCalled();
    });

    it('should register mousemove listener on window', () => {
      expect(windowListeners['mousemove']).toBeDefined();
      expect(windowListeners['mousemove'].size).toBe(1);
    });

    it('should register click listener on window', () => {
      expect(windowListeners['click']).toBeDefined();
      expect(windowListeners['click'].size).toBe(1);
    });

    it('should register touchstart listener on window', () => {
      expect(windowListeners['touchstart']).toBeDefined();
      expect(windowListeners['touchstart'].size).toBe(1);
    });

    it('should register touchend listener on window', () => {
      expect(windowListeners['touchend']).toBeDefined();
      expect(windowListeners['touchend'].size).toBe(1);
    });

    it('should create canvas elements for text rendering', () => {
      // Multiple text elements: question, letter, suffix, in-button, not-in-button
      expect(globalThis.document.createElement).toHaveBeenCalled();
      const canvasCalls = (globalThis.document.createElement as any).mock.calls
        .filter((c: string[]) => c[0] === 'canvas');
      expect(canvasCalls.length).toBeGreaterThan(0);
    });

    it('should initialize group as not visible', () => {
      const group = (ui as any).group;
      expect(group.visible).toBe(false);
    });

    it('should initialize selectedLetter as null', () => {
      expect((ui as any).selectedLetter).toBeNull();
    });

    it('should initialize resolvePromise as null', () => {
      expect((ui as any).resolvePromise).toBeNull();
    });

    it('should initialize isVisible as false', () => {
      expect((ui as any).isVisible).toBe(false);
    });
  });

  describe('getPrediction', () => {
    it('should return a Promise', () => {
      const result = ui.getPrediction('A');
      expect(result).toBeInstanceOf(Promise);
    });

    it('should set selectedLetter', () => {
      ui.getPrediction('Z');
      expect((ui as any).selectedLetter).toBe('Z');
    });

    it('should make the group visible', () => {
      ui.getPrediction('A');
      expect((ui as any).isVisible).toBe(true);
    });

    it('should set resolvePromise', () => {
      ui.getPrediction('A');
      expect((ui as any).resolvePromise).not.toBeNull();
    });

    it('should start show animation via requestAnimationFrame', () => {
      ui.getPrediction('A');
      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should resolve with "in" when handleSelection("in") is called', async () => {
      const promise = ui.getPrediction('A');
      (ui as any).handleSelection('in');
      const result = await promise;
      expect(result).toBe('in');
    });

    it('should resolve with "not-in" when handleSelection("not-in") is called', async () => {
      const promise = ui.getPrediction('B');
      (ui as any).handleSelection('not-in');
      const result = await promise;
      expect(result).toBe('not-in');
    });

    it('should clear resolvePromise after resolution', async () => {
      const promise = ui.getPrediction('A');
      (ui as any).handleSelection('in');
      await promise;
      expect((ui as any).resolvePromise).toBeNull();
    });

    it('should handle consecutive getPrediction calls', async () => {
      const p1 = ui.getPrediction('A');
      (ui as any).handleSelection('in');
      const r1 = await p1;
      expect(r1).toBe('in');

      const p2 = ui.getPrediction('B');
      (ui as any).handleSelection('not-in');
      const r2 = await p2;
      expect(r2).toBe('not-in');
    });
  });

  describe('hide', () => {
    it('should trigger requestAnimationFrame for hide animation', () => {
      vi.clearAllMocks();
      ui.hide();
      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should be callable before show', () => {
      expect(() => ui.hide()).not.toThrow();
    });
  });

  describe('showMessage', () => {
    it('should create a toast mesh', () => {
      ui.showMessage('Test message');
      expect((ui as any).toastMesh).not.toBeNull();
    });

    it('should add toast to the group', () => {
      const group = (ui as any).group;
      const addCallsBefore = group.add.mock.calls.length;
      ui.showMessage('Hello');
      expect(group.add.mock.calls.length).toBeGreaterThan(addCallsBefore);
    });

    it('should start animation via requestAnimationFrame', () => {
      vi.clearAllMocks();
      ui.showMessage('Toast');
      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should set up auto-hide timeout', () => {
      ui.showMessage('Auto-hide');
      expect(globalThis.window.setTimeout).toHaveBeenCalled();
    });

    it('should remove previous toast before creating new one', () => {
      ui.showMessage('First');
      const toast1 = (ui as any).toastMesh;
      ui.showMessage('Second');
      const toast2 = (ui as any).toastMesh;
      // Should be a different mesh
      expect(toast2).not.toBe(toast1);
    });

    it('should clear previous timeout when creating new toast', () => {
      const clearTimeoutSpy = vi.fn();
      (globalThis as any).clearTimeout = clearTimeoutSpy;
      ui.showMessage('First');
      ui.showMessage('Second');
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should handle default color parameter', () => {
      expect(() => ui.showMessage('No color')).not.toThrow();
      expect((ui as any).toastMesh).not.toBeNull();
    });

    it('should handle custom color parameter', () => {
      expect(() => ui.showMessage('Custom', '#ff6b6b')).not.toThrow();
      expect((ui as any).toastMesh).not.toBeNull();
    });
  });

  describe('setPosition', () => {
    it('should set group position', () => {
      const group = (ui as any).group;
      ui.setPosition(1, 2, 3);
      expect(group.position.set).toHaveBeenCalledWith(1, 2, 3);
    });

    it('should set position to origin', () => {
      const group = (ui as any).group;
      ui.setPosition(0, 0, 0);
      expect(group.position.set).toHaveBeenCalledWith(0, 0, 0);
    });

    it('should handle negative coordinates', () => {
      const group = (ui as any).group;
      ui.setPosition(-5, -3, -10);
      expect(group.position.set).toHaveBeenCalledWith(-5, -3, -10);
    });
  });

  describe('dispose', () => {
    it('should remove all window event listeners', () => {
      const ui2 = new PredictionUI3D(scene, camera);
      ui2.dispose();

      // After dispose, calling removeEventListener again should work
      // The key is that dispose() uses the same bound references
      expect(globalThis.window.removeEventListener).toHaveBeenCalledWith('mousemove', (ui2 as any).boundOnMouseMove);
      expect(globalThis.window.removeEventListener).toHaveBeenCalledWith('click', (ui2 as any).boundOnClick);
      expect(globalThis.window.removeEventListener).toHaveBeenCalledWith('touchstart', (ui2 as any).boundOnTouchStart);
      expect(globalThis.window.removeEventListener).toHaveBeenCalledWith('touchend', (ui2 as any).boundOnTouchEnd);
    });

    it('should remove group from scene', () => {
      const ui2 = new PredictionUI3D(scene, camera);
      ui2.dispose();
      expect(scene.remove).toHaveBeenCalledWith((ui2 as any).group);
    });

    it('should clear toast timeout', () => {
      const clearTimeoutSpy = vi.fn();
      (globalThis as any).clearTimeout = clearTimeoutSpy;
      ui.showMessage('Cleanup test');
      ui.dispose();
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should be safe to call dispose multiple times', () => {
      expect(() => {
        ui.dispose();
        ui.dispose();
        ui.dispose();
      }).not.toThrow();
    });
  });

  describe('bound event listener references', () => {
    it('should store bound references for all event handlers', () => {
      expect((ui as any).boundOnMouseMove).toBeDefined();
      expect((ui as any).boundOnClick).toBeDefined();
      expect((ui as any).boundOnTouchStart).toBeDefined();
      expect((ui as any).boundOnTouchEnd).toBeDefined();
    });

    it('should use same bound reference for add and remove', () => {
      // The bound references are stored on the instance — verify they are
      // the exact same objects passed to both add and remove
      const freshScene = createMockScene();
      const freshCamera = createMockCamera();

      // Spy on addEventListener to capture the exact handler references
      const addSpy = vi.spyOn(globalThis.window, 'addEventListener');
      const freshUI = new PredictionUI3D(freshScene, freshCamera);

      const mousemoveHandler = addSpy.mock.calls.find((c: any[]) => c[0] === 'mousemove')?.[1];
      const clickHandler = addSpy.mock.calls.find((c: any[]) => c[0] === 'click')?.[1];

      // These should be the bound references stored on the instance
      expect(mousemoveHandler).toBe((freshUI as any).boundOnMouseMove);
      expect(clickHandler).toBe((freshUI as any).boundOnClick);

      // Now verify dispose removes those exact same references
      const removeSpy = vi.spyOn(globalThis.window, 'removeEventListener');
      freshUI.dispose();

      const removeMousemove = removeSpy.mock.calls.find((c: any[]) => c[0] === 'mousemove')?.[1];
      const removeClick = removeSpy.mock.calls.find((c: any[]) => c[0] === 'click')?.[1];

      expect(mousemoveHandler).toBe(removeMousemove);
      expect(clickHandler).toBe(removeClick);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });

  describe('mouse/touch interaction', () => {
    it('should handle mousemove without error when visible', () => {
      (ui as any).isVisible = true;
      const handler = (ui as any).boundOnMouseMove;
      expect(() => handler({ clientX: 512, clientY: 384 })).not.toThrow();
    });

    it('should ignore mousemove when not visible', () => {
      (ui as any).isVisible = false;
      const raycaster = (ui as any).raycaster;
      const handler = (ui as any).boundOnMouseMove;
      handler({ clientX: 512, clientY: 384 });
      expect(raycaster.setFromCamera).not.toHaveBeenCalled();
    });

    it('should handle click without error when visible', () => {
      (ui as any).isVisible = true;
      const handler = (ui as any).boundOnClick;
      expect(() => handler({ clientX: 512, clientY: 384 })).not.toThrow();
    });

    it('should ignore click when not visible', () => {
      (ui as any).isVisible = false;
      const handler = (ui as any).boundOnClick;
      expect(() => handler({ clientX: 512, clientY: 384 })).not.toThrow();
    });

    it('should handle touchstart without error when visible', () => {
      (ui as any).isVisible = true;
      const handler = (ui as any).boundOnTouchStart;
      expect(() => handler({
        touches: [{ clientX: 512, clientY: 384 }],
        preventDefault: vi.fn(),
      })).not.toThrow();
    });

    it('should ignore touchstart when not visible', () => {
      (ui as any).isVisible = false;
      const raycaster = (ui as any).raycaster;
      const handler = (ui as any).boundOnTouchStart;
      handler({
        touches: [{ clientX: 512, clientY: 384 }],
        preventDefault: vi.fn(),
      });
      expect(raycaster.setFromCamera).not.toHaveBeenCalled();
    });

    it('should handle touchend without error when visible', () => {
      (ui as any).isVisible = true;
      const handler = (ui as any).boundOnTouchEnd;
      expect(() => handler({
        changedTouches: [{ clientX: 512, clientY: 384 }],
        preventDefault: vi.fn(),
      })).not.toThrow();
    });

    it('should ignore touchend when not visible', () => {
      (ui as any).isVisible = false;
      const raycaster = (ui as any).raycaster;
      const handler = (ui as any).boundOnTouchEnd;
      handler({
        changedTouches: [{ clientX: 512, clientY: 384 }],
        preventDefault: vi.fn(),
      });
      expect(raycaster.setFromCamera).not.toHaveBeenCalled();
    });
  });

  describe('hover detection', () => {
    it('should reset previous hover state on mouse move', () => {
      (ui as any).isVisible = true;
      // Simulate a previous hover with emissive tracking
      const mockMaterial = createMockMaterial();
      const mockScale = createMockScale();
      (ui as any).hoveredButton = {
        material: mockMaterial,
        scale: mockScale,
      };

      const handler = (ui as any).boundOnMouseMove;
      handler({ clientX: 512, clientY: 384 });

      // Emissive should be reset to 0x000000 (check the stored material, not hoveredButton)
      expect(mockMaterial.emissive.setHex).toHaveBeenCalledWith(0x000000);
    });

    it('should clear hoveredButton when nothing is intersected', () => {
      (ui as any).isVisible = true;
      (ui as any).hoveredButton = {
        material: createMockMaterial(),
        scale: createMockScale(),
      };

      const handler = (ui as any).boundOnMouseMove;
      handler({ clientX: 512, clientY: 384 });

      // Raycaster returns no intersections by default
      expect((ui as any).hoveredButton).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle rapid getPrediction calls', () => {
      const p1 = ui.getPrediction('A');
      const p2 = ui.getPrediction('B');
      // The first promise's resolver gets orphaned
      expect((ui as any).selectedLetter).toBe('B');
    });

    it('should handle showMessage with empty string', () => {
      expect(() => ui.showMessage('')).not.toThrow();
    });

    it('should handle setPosition called multiple times', () => {
      ui.setPosition(1, 2, 3);
      ui.setPosition(4, 5, 6);
      ui.setPosition(7, 8, 9);
      const group = (ui as any).group;
      expect(group.position.set).toHaveBeenCalledTimes(3);
    });

    it('should handle getPrediction with different letter cases', () => {
      ui.getPrediction('a');
      expect((ui as any).selectedLetter).toBe('a');
    });

    it('should handle showMessage with special characters', () => {
      expect(() => ui.showMessage('Test 🎮 éñ')).not.toThrow();
    });
  });
});
