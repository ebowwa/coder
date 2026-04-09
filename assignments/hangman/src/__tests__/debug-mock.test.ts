import { describe, it, expect, vi, beforeEach } from 'vitest';

const myMap = new Map<string, any[]>();

(globalThis as any).window = {
  addEventListener: vi.fn((type: string, listener: any) => {
    console.log('OUR window.addEventListener called:', type);
    if (!myMap.has(type)) myMap.set(type, []);
    myMap.get(type)!.push(listener);
  }),
  removeEventListener: vi.fn(),
  innerWidth: 1024,
  innerHeight: 768,
};
(globalThis as any).document = {
  createElement: vi.fn(() => ({
    width: 128, height: 128,
    getContext: vi.fn(() => ({ fillRect: vi.fn(), fillText: vi.fn(), measureText: vi.fn(() => ({ width: 50 })) })),
  })),
};
(globalThis as any).requestAnimationFrame = vi.fn();
(globalThis as any).performance = { now: vi.fn(() => 0) };

vi.mock('three', () => ({
  Scene: vi.fn(() => ({ add: vi.fn() })),
  PerspectiveCamera: vi.fn(() => ({ position: { set: vi.fn() } })),
  Group: vi.fn(() => ({ add: vi.fn(), position: { set: vi.fn() } })),
  Mesh: vi.fn(() => ({
    position: { set: vi.fn(), y: 0 }, rotation: { x: 0 }, scale: { set: vi.fn() },
    castShadow: false, receiveShadow: false, userData: {}, add: vi.fn(),
    material: { color: { setHex: vi.fn() }, emissive: { setHex: vi.fn() } },
  })),
  BoxGeometry: vi.fn(), PlaneGeometry: vi.fn(),
  MeshStandardMaterial: vi.fn(() => ({ color: { setHex: vi.fn() }, emissive: { setHex: vi.fn() } })),
  CanvasTexture: vi.fn(),
  Raycaster: vi.fn(() => ({ setFromCamera: vi.fn(), intersectObjects: vi.fn(() => []) })),
  Vector2: vi.fn(() => ({ x: 0, y: 0 })),
  Object3D: vi.fn(),
}));

import { LetterTiles } from '../letter-tiles';

describe('DebugMock', () => {
  it('who captures window.addEventListener?', () => {
    // Check what globalThis.window is
    console.log('globalThis.window === our mock:', (globalThis as any).window.addEventListener === (globalThis as any).window.addEventListener);
    console.log('globalThis.window.addEventListener type:', typeof (globalThis as any).window?.addEventListener);
    
    const lt = new LetterTiles({} as any);
    
    console.log('myMap keys:', [...myMap.keys()]);
    console.log('globalThis.window.addEventListener calls:', (globalThis as any).window.addEventListener?.mock?.calls?.length);
  });
});
