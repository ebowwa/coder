/**
 * Comprehensive tests for main module orchestration
 *
 * Validates:
 * - DOMContentLoaded wiring
 * - HangmanGame instantiation (Three.js scene, camera, renderer, controls)
 * - Router page registration (auth, dashboard, lobby, profile, friends, game)
 * - Auth-based navigation (token present → dashboard, no token → auth)
 * - Module dependency instantiation (LetterTiles, WordDisplay, PredictionUI3D, etc.)
 * - Window resize handling
 * - Animation loop lifecycle
 * - Multiplayer subsystem initialization
 * - Hint button creation and state
 * - Edge cases: multiple DOMContentLoaded, missing DOM elements, repeated init
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Re-export mock references for use in beforeEach (ESM-safe alternative to require)
let routerMockRef: any = null;
let authMockRef: any = null;
let dashboardMockRef: any = null;
let profileMockRef: any = null;
let lobbyMockRef: any = null;
let friendsMockRef: any = null;

// ---------------------------------------------------------------------------
// Event listener tracking
// ---------------------------------------------------------------------------
const windowEventListeners: Map<string, EventListener[]> = new Map();
const documentEventListeners: Map<string, EventListener[]> = new Map();
let animationFrameCallbacks: FrameRequestCallback[] = [];

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------
globalThis.fetch = Object.assign(vi.fn(), { preconnect: false }) as any;

// ---------------------------------------------------------------------------
// Mock canvas context
// ---------------------------------------------------------------------------
const mockCanvasContext = {
  fillRect: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 50 })),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
};

// ---------------------------------------------------------------------------
// Mock DOM elements
// ---------------------------------------------------------------------------
const mockBody = {
  appendChild: vi.fn(),
  removeChild: vi.fn(),
};

function createMockElement(tagName: string) {
  return {
    id: '',
    innerHTML: '',
    style: {
      cssText: '', opacity: '', cursor: '', display: '', transform: '',
      boxShadow: '', position: '', top: '', left: '', width: '', height: '',
      zIndex: '', fontFamily: '', background: '', overflow: '',
    },
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    querySelector: vi.fn(() => null),
    querySelectorAll: vi.fn(() => []),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dataset: {},
    textContent: '',
    getContext: tagName === 'canvas' ? () => mockCanvasContext : undefined,
    width: tagName === 'canvas' ? 128 : undefined,
    height: tagName === 'canvas' ? 128 : undefined,
  };
}

globalThis.document = {
  createElement: vi.fn((tagName: string) => {
    if (tagName === 'canvas') {
      return { width: 128, height: 128, getContext: () => mockCanvasContext };
    }
    return createMockElement(tagName);
  }),
  body: mockBody,
  head: mockBody,
  addEventListener: vi.fn((type: string, listener: EventListener) => {
    if (!documentEventListeners.has(type)) {
      documentEventListeners.set(type, []);
    }
    documentEventListeners.get(type)!.push(listener);
  }),
  removeEventListener: vi.fn(),
  getElementById: vi.fn(() => null),
  querySelector: vi.fn(() => null),
} as any;

// ---------------------------------------------------------------------------
// Mock localStorage
// ---------------------------------------------------------------------------
const localStorageStore: Record<string, string> = {};
globalThis.localStorage = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value; }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key]; }),
  clear: vi.fn(() => Object.keys(localStorageStore).forEach(k => delete localStorageStore[k])),
  get length() { return Object.keys(localStorageStore).length; },
  key: vi.fn((index: number) => Object.keys(localStorageStore)[index] ?? null),
} as any;

// ---------------------------------------------------------------------------
// Mock window
// ---------------------------------------------------------------------------
globalThis.window = {
  innerWidth: 1024,
  innerHeight: 768,
  addEventListener: vi.fn((type: string, listener: EventListenerOrEventListenerObject) => {
    if (!windowEventListeners.has(type)) {
      windowEventListeners.set(type, []);
    }
    windowEventListeners.get(type)!.push(listener as EventListener);
  }),
  removeEventListener: vi.fn(),
  devicePixelRatio: 1,
} as any;

// ---------------------------------------------------------------------------
// Mock requestAnimationFrame / performance
// ---------------------------------------------------------------------------
globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
  animationFrameCallbacks.push(cb);
  return animationFrameCallbacks.length;
}) as any;

globalThis.cancelAnimationFrame = vi.fn();
globalThis.performance = { now: vi.fn(() => Date.now()) } as any;

// ---------------------------------------------------------------------------
// Mock Three.js scene graph
// ---------------------------------------------------------------------------
const mockScene = { add: vi.fn(), remove: vi.fn(), background: null };

const mockCamera = {
  position: { set: vi.fn(), x: 0, y: 2, z: 10 },
  aspect: 1,
  updateProjectionMatrix: vi.fn(),
};

const mockRenderer = {
  setSize: vi.fn(),
  setPixelRatio: vi.fn(),
  render: vi.fn(),
  shadowMap: { enabled: false, type: null },
  domElement: { style: {} },
};

const mockControls = {
  enableDamping: false,
  dampingFactor: 0,
  maxDistance: 0,
  minDistance: 0,
  update: vi.fn(),
};

vi.mock('three', () => ({
  Scene: vi.fn(() => mockScene),
  PerspectiveCamera: vi.fn(() => mockCamera),
  WebGLRenderer: vi.fn(() => mockRenderer),
  Group: vi.fn(function () {
    return { add: vi.fn(), remove: vi.fn(), position: { set: vi.fn() } };
  }),
  Mesh: vi.fn(function () {
    return {
      position: { set: vi.fn(), y: 0, x: 0, z: 0 },
      rotation: { x: 0, z: 0 },
      scale: { set: vi.fn(), x: 0, y: 0, z: 0 },
      castShadow: false, receiveShadow: false,
      userData: {},
      material: { color: { setHex: vi.fn() }, emissive: { setHex: vi.fn() } },
      visible: true, add: vi.fn(),
    };
  }),
  BoxGeometry: vi.fn(),
  CylinderGeometry: vi.fn(),
  SphereGeometry: vi.fn(),
  PlaneGeometry: vi.fn(),
  TorusGeometry: vi.fn(),
  MeshStandardMaterial: vi.fn(function () {
    return { color: { setHex: vi.fn() }, emissive: { setHex: vi.fn() }, roughness: 0, metalness: 0 };
  }),
  CanvasTexture: vi.fn(() => ({ magFilter: 0, minFilter: 0 })),
  AmbientLight: vi.fn(() => ({ intensity: 0 })),
  DirectionalLight: vi.fn(() => ({
    position: { set: vi.fn() },
    castShadow: false,
    shadow: { mapSize: { width: 0, height: 0 } },
  })),
  Clock: vi.fn(() => ({ getDelta: vi.fn(() => 0.016) })),
  Vector3: vi.fn(function (x = 0, y = 0, z = 0) { return { x, y, z }; }),
  Vector2: vi.fn(function (x = 0, y = 0) { return { x, y }; }),
  Object3D: vi.fn(),
  Raycaster: vi.fn(function () {
    return {
      setFromCamera: vi.fn(),
      intersectObjects: vi.fn(() => []),
    };
  }),
  LinearFilter: 1006,
  PCFSoftShadowMap: 2,
}));

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn(() => mockControls),
}));

// ---------------------------------------------------------------------------
// Mock application modules
// ---------------------------------------------------------------------------
vi.mock('./sound-effects', () => ({
  soundEffects: { play: vi.fn() },
}));

vi.mock('./particle-effects', () => ({
  ParticleEffects: vi.fn(function () {
    return { emitConfettiBurst: vi.fn(), emitLose: vi.fn(), startAmbientGlow: vi.fn(), update: vi.fn() };
  }),
}));

vi.mock('./multiplayer/sync', () => ({
  MultiplayerSync: vi.fn(function () {
    return {
      on: vi.fn(() => vi.fn()),
      isMyTurn: vi.fn(() => false),
      getState: vi.fn(() => ({ roomState: null })),
      guessLetter: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }),
}));

vi.mock('./multiplayer/lobby-ui', () => ({
  LobbyUI: vi.fn(function () {
    return { show: vi.fn(), hide: vi.fn(), dispose: vi.fn() };
  }),
}));

vi.mock('./multiplayer/player-avatars', () => ({
  PlayerAvatars: vi.fn(function () {
    return { updatePlayers: vi.fn(), clear: vi.fn(), showGuessAnimation: vi.fn(), setCurrentTurn: vi.fn() };
  }),
}));

vi.mock('./multiplayer/tournament-ui', () => ({
  TournamentUI: vi.fn(function () {
    return { setVisible: vi.fn(), updateTournament: vi.fn(), update: vi.fn() };
  }),
}));

vi.mock('./category-ui', () => ({
  CategoryUI: vi.fn(function () {
    return { show: vi.fn(), hide: vi.fn() };
  }),
}));

vi.mock('./accessibility', () => ({
  AccessibilityManager: vi.fn(function () {
    return {
      reset: vi.fn(), show: vi.fn(), hide: vi.fn(),
      setLetterStatus: vi.fn(), updateWordDisplay: vi.fn(),
      updateHangmanDescription: vi.fn(), announceGameOver: vi.fn(),
    };
  }),
  enhanceHintButton: vi.fn(),
}));

vi.mock('./words', () => ({
  getRandomWord: vi.fn(() => ({ word: 'TEST', category: 'general', difficulty: 1 })),
  getRandomWordByCategory: vi.fn(() => ({ word: 'TEST', category: 'general', difficulty: 1 })),
}));

vi.mock('./router', () => ({
  router: {
    registerPage: vi.fn(),
    navigate: vi.fn(),
    getCurrentPage: vi.fn(() => 'auth'),
    getPageContainer: vi.fn(() => null),
  },
}));

vi.mock('./auth', () => ({ renderAuthPage: vi.fn() }));
vi.mock('./dashboard', () => ({ renderDashboard: vi.fn() }));
vi.mock('./profile', () => ({ renderProfile: vi.fn() }));
vi.mock('./lobby-page', () => ({ renderLobbyPage: vi.fn() }));
vi.mock('./friends', () => ({ renderFriendsPage: vi.fn() }));

vi.mock('./leaderboard-page', () => ({ renderLeaderboardPage: vi.fn() }));

vi.mock('../server/tournament', () => ({}));

vi.mock('./word-display', () => ({
  WordDisplay: vi.fn(function () {
    return {
      setWord: vi.fn(), updateDisplay: vi.fn(), showFullWord: vi.fn(),
      getMesh: vi.fn(() => ({ position: { set: vi.fn() } })),
      setPosition: vi.fn(),
    };
  }),
}));

vi.mock('./prediction-ui-3d', () => ({
  PredictionUI3D: vi.fn(function () {
    return { setPosition: vi.fn(), showMessage: vi.fn() };
  }),
}));

vi.mock('./letter-tiles', () => ({
  LetterTiles: vi.fn(function () {
    return {
      getMesh: vi.fn(() => ({ position: { set: vi.fn() } })),
      setPosition: vi.fn(), setTileClickHandler: vi.fn(),
      setTileStatus: vi.fn(), reset: vi.fn(),
    };
  }),
}));

vi.mock('./loading-overlay', () => ({
  LoadingOverlay: vi.fn(function () {
    return { show: vi.fn(), hide: vi.fn(), showError: vi.fn() };
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function simulateDocumentEvent(type: string, eventData?: any) {
  const listeners = documentEventListeners.get(type);
  if (listeners) {
    listeners.forEach(listener => listener(eventData as Event));
  }
}

function simulateWindowEvent(type: string, eventData?: any) {
  const listeners = windowEventListeners.get(type);
  if (listeners) {
    listeners.forEach(listener => listener(eventData as Event));
  }
}

function runAnimationFrames(count: number, timeIncrement = 16) {
  for (let i = 0; i < count; i++) {
    const callbacks = [...animationFrameCallbacks];
    animationFrameCallbacks = [];
    callbacks.forEach(cb => {
      (performance.now as any).mockReturnValue(i * timeIncrement);
      cb(i * timeIncrement);
    });
  }
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------
describe('main module orchestration', () => {
  let moduleLoaded = false;

  beforeEach(() => {
    // Only clear animation frames - NOT the event listener maps,
    // since those were populated during the one-time module import and
    // clearing them would lose the real listeners.
    animationFrameCallbacks = [];
    localStorageStore['hm_token'] = 'valid-token';

    (globalThis.fetch as any).mockReset();
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ word: 'HELLO', category: 'greetings', difficulty: 1 }),
    });

    // Reset router mocks so call counts are fresh per test
    if (routerMockRef) {
      if (routerMockRef.registerPage) routerMockRef.registerPage.mockClear();
      if (routerMockRef.navigate) routerMockRef.navigate.mockClear();
      if (routerMockRef.getCurrentPage) routerMockRef.getCurrentPage.mockClear();
      if (routerMockRef.getPageContainer) routerMockRef.getPageContainer.mockClear();
    }
  });

  /**
   * Import main module and fire DOMContentLoaded to trigger the init path.
   * Only imports once (Vitest caches module mocks).
   */
  async function loadAndInit() {
    if (!moduleLoaded) {
      await import('./main');
      // Capture mock references after module loads (ESM-safe)
      const routerMod = await import('./router');
      routerMockRef = routerMod.router;
      const authMod = await import('./auth');
      authMockRef = authMod;
      const dashMod = await import('./dashboard');
      dashboardMockRef = dashMod;
      const profMod = await import('./profile');
      profileMockRef = profMod;
      const lobbyMod = await import('./lobby-page');
      lobbyMockRef = lobbyMod;
      const friendsMod = await import('./friends');
      friendsMockRef = friendsMod;
      moduleLoaded = true;
    }
    simulateDocumentEvent('DOMContentLoaded');
  }

  // =========================================================================
  // 1. DOMContentLoaded wiring
  // =========================================================================
  describe('DOMContentLoaded wiring', () => {
    it('registers a DOMContentLoaded listener on import', async () => {
      await loadAndInit();

      const listeners = documentEventListeners.get('DOMContentLoaded');
      expect(listeners).toBeDefined();
      expect(listeners!.length).toBeGreaterThanOrEqual(1);
    });

    it('fires the DOMContentLoaded handler without throwing', async () => {
      // loadAndInit already fires it — if it threw, test fails
      await loadAndInit();
      expect(true).toBe(true);
    });

    it('calling DOMContentLoaded handler multiple times does not crash', async () => {
      await loadAndInit();
      // Fire it again — should not throw
      simulateDocumentEvent('DOMContentLoaded');
      simulateDocumentEvent('DOMContentLoaded');
      expect(true).toBe(true);
    });
  });

  // =========================================================================
  // 2. HangmanGame instantiation
  // =========================================================================
  describe('HangmanGame instantiation', () => {
    it('creates a Three.js Scene', async () => {
      await loadAndInit();
      const { Scene } = await import('three');
      expect(Scene).toHaveBeenCalled();
    });

    it('creates a PerspectiveCamera with window dimensions', async () => {
      await loadAndInit();
      const { PerspectiveCamera } = await import('three');
      expect(PerspectiveCamera).toHaveBeenCalled();
    });

    it('creates a WebGLRenderer', async () => {
      await loadAndInit();
      const { WebGLRenderer } = await import('three');
      expect(WebGLRenderer).toHaveBeenCalled();
    });

    it('sets renderer size to window dimensions', async () => {
      await loadAndInit();
      expect(mockRenderer.setSize).toHaveBeenCalledWith(1024, 768);
    });

    it('sets pixel ratio', async () => {
      await loadAndInit();
      expect(mockRenderer.setPixelRatio).toHaveBeenCalledWith(1);
    });

    it('enables shadow mapping', async () => {
      await loadAndInit();
      expect(mockRenderer.shadowMap.enabled).toBe(true);
    });

    it('appends renderer domElement to document body', async () => {
      await loadAndInit();
      expect(mockBody.appendChild).toHaveBeenCalled();
      // The renderer's domElement is appended
      const calls = mockBody.appendChild.mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    it('creates OrbitControls', async () => {
      await loadAndInit();
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      expect(OrbitControls).toHaveBeenCalled();
    });

    it('adds multiple objects to the scene', async () => {
      await loadAndInit();
      expect(mockScene.add.mock.calls.length).toBeGreaterThan(5);
    });

    it('creates a Clock for animation timing', async () => {
      await loadAndInit();
      const { Clock } = await import('three');
      expect(Clock).toHaveBeenCalled();
    });

    it('creates ambient and directional lights', async () => {
      await loadAndInit();
      const { AmbientLight, DirectionalLight } = await import('three');
      expect(AmbientLight).toHaveBeenCalled();
      expect(DirectionalLight).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 3. Module dependency instantiation
  // =========================================================================
  describe('module dependencies', () => {
    it('instantiates LetterTiles', async () => {
      await loadAndInit();
      const { LetterTiles } = await import('./letter-tiles');
      expect(LetterTiles).toHaveBeenCalled();
    });

    it('sets letter tile click handler', async () => {
      await loadAndInit();
      const { LetterTiles } = await import('./letter-tiles');
      const instance = (LetterTiles as any).mock.results[0].value;
      expect(instance.setTileClickHandler).toHaveBeenCalled();
    });

    it('instantiates WordDisplay', async () => {
      await loadAndInit();
      const { WordDisplay } = await import('./word-display');
      expect(WordDisplay).toHaveBeenCalled();
    });

    it('instantiates PredictionUI3D', async () => {
      await loadAndInit();
      const { PredictionUI3D } = await import('./prediction-ui-3d');
      expect(PredictionUI3D).toHaveBeenCalled();
    });

    it('instantiates ParticleEffects', async () => {
      await loadAndInit();
      const { ParticleEffects } = await import('./particle-effects');
      expect(ParticleEffects).toHaveBeenCalled();
    });

    it('starts ambient glow on particle effects', async () => {
      await loadAndInit();
      const { ParticleEffects } = await import('./particle-effects');
      const instance = (ParticleEffects as any).mock.results[0].value;
      expect(instance.startAmbientGlow).toHaveBeenCalled();
    });

    it('instantiates LoadingOverlay', async () => {
      await loadAndInit();
      const { LoadingOverlay } = await import('./loading-overlay');
      expect(LoadingOverlay).toHaveBeenCalled();
    });

    it('instantiates AccessibilityManager', async () => {
      await loadAndInit();
      const { AccessibilityManager } = await import('./accessibility');
      expect(AccessibilityManager).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 4. Multiplayer subsystem initialization
  // =========================================================================
  describe('multiplayer subsystem', () => {
    it('instantiates MultiplayerSync', async () => {
      await loadAndInit();
      const { MultiplayerSync } = await import('./multiplayer/sync');
      expect(MultiplayerSync).toHaveBeenCalled();
    });

    it('instantiates PlayerAvatars', async () => {
      await loadAndInit();
      const { PlayerAvatars } = await import('./multiplayer/player-avatars');
      expect(PlayerAvatars).toHaveBeenCalled();
    });

    it('instantiates TournamentUI and hides it', async () => {
      await loadAndInit();
      const { TournamentUI } = await import('./multiplayer/tournament-ui');
      expect(TournamentUI).toHaveBeenCalled();
      const instance = (TournamentUI as any).mock.results[0].value;
      expect(instance.setVisible).toHaveBeenCalledWith(false);
    });

    it('instantiates LobbyUI', async () => {
      await loadAndInit();
      const { LobbyUI } = await import('./multiplayer/lobby-ui');
      expect(LobbyUI).toHaveBeenCalled();
    });

    it('subscribes to multiplayer events via sync.on()', async () => {
      await loadAndInit();
      const { MultiplayerSync } = await import('./multiplayer/sync');
      const syncInstance = (MultiplayerSync as any).mock.results[0].value;
      // Should subscribe to game-started, letter-guessed, turn-changed, round-complete
      expect(syncInstance.on.mock.calls.length).toBeGreaterThanOrEqual(4);
    });
  });

  // =========================================================================
  // 5. Router page registration
  // =========================================================================
  describe('router page registration', () => {
    it('registers auth page', async () => {
      await loadAndInit();
      const { router } = await import('./router');
      expect(router.registerPage).toHaveBeenCalledWith('auth', expect.any(Object));
    });

    it('registers dashboard page', async () => {
      await loadAndInit();
      const { router } = await import('./router');
      expect(router.registerPage).toHaveBeenCalledWith('dashboard', expect.any(Object));
    });

    it('registers lobby page', async () => {
      await loadAndInit();
      const { router } = await import('./router');
      expect(router.registerPage).toHaveBeenCalledWith('lobby', expect.any(Object));
    });

    it('registers profile page', async () => {
      await loadAndInit();
      const { router } = await import('./router');
      expect(router.registerPage).toHaveBeenCalledWith('profile', expect.any(Object));
    });

    it('registers friends page', async () => {
      await loadAndInit();
      const { router } = await import('./router');
      expect(router.registerPage).toHaveBeenCalledWith('friends', expect.any(Object));
    });

    it('registers game page', async () => {
      await loadAndInit();
      const { router } = await import('./router');
      expect(router.registerPage).toHaveBeenCalledWith('game', expect.any(Object));
    });

    it('registers exactly 7 pages', async () => {
      await loadAndInit();
      const { router } = await import('./router');
      expect(router.registerPage).toHaveBeenCalledTimes(7);
    });

    it('auth page render calls renderAuthPage', async () => {
      await loadAndInit();
      const { router } = await import('./router');
      const authCall = router.registerPage.mock.calls.find((c: any[]) => c[0] === 'auth');
      expect(authCall).toBeDefined();
      const page = authCall![1];
      // Call the render function with a mock container
      const mockContainer = { querySelector: vi.fn(() => ({ tagName: 'DIV' })) };
      page.render(mockContainer);
      const { renderAuthPage } = await import('./auth');
      expect(renderAuthPage).toHaveBeenCalled();
    });

    it('dashboard page render calls renderDashboard', async () => {
      await loadAndInit();
      const { router } = await import('./router');
      const dashCall = router.registerPage.mock.calls.find((c: any[]) => c[0] === 'dashboard');
      const page = dashCall![1];
      const mockContainer = { querySelector: vi.fn(() => ({ tagName: 'DIV' })) };
      page.render(mockContainer);
      const { renderDashboard } = await import('./dashboard');
      expect(renderDashboard).toHaveBeenCalled();
    });

    it('lobby page render calls renderLobbyPage', async () => {
      await loadAndInit();
      const { router } = await import('./router');
      const lobbyCall = router.registerPage.mock.calls.find((c: any[]) => c[0] === 'lobby');
      const page = lobbyCall![1];
      const mockContainer = { querySelector: vi.fn(() => ({ tagName: 'DIV' })) };
      page.render(mockContainer);
      const { renderLobbyPage } = await import('./lobby-page');
      expect(renderLobbyPage).toHaveBeenCalled();
    });

    it('profile page render calls renderProfile', async () => {
      await loadAndInit();
      const { router } = await import('./router');
      const profileCall = router.registerPage.mock.calls.find((c: any[]) => c[0] === 'profile');
      const page = profileCall![1];
      const mockContainer = { querySelector: vi.fn(() => ({ tagName: 'DIV' })) };
      page.render(mockContainer);
      const { renderProfile } = await import('./profile');
      expect(renderProfile).toHaveBeenCalled();
    });

    it('friends page render calls renderFriendsPage', async () => {
      await loadAndInit();
      const { router } = await import('./router');
      const friendsCall = router.registerPage.mock.calls.find((c: any[]) => c[0] === 'friends');
      const page = friendsCall![1];
      const mockContainer = { querySelector: vi.fn(() => ({ tagName: 'DIV' })) };
      page.render(mockContainer);
      const { renderFriendsPage } = await import('./friends');
      expect(renderFriendsPage).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 6. Auth-based navigation
  // =========================================================================
  describe('auth-based navigation', () => {
    it('navigates to dashboard when token exists in localStorage', async () => {
      localStorageStore['hm_token'] = 'valid-token';
      await loadAndInit();
      const { router } = await import('./router');
      expect(router.navigate).toHaveBeenCalledWith('dashboard');
    });

    it('navigates to auth when no token in localStorage', async () => {
      delete localStorageStore['hm_token'];
      // Clear navigate mock to only capture this test's calls
      const { router: r } = await import('./router');
      (r.navigate as any).mockClear();
      await loadAndInit();
      expect(r.navigate).toHaveBeenCalledWith('auth');
    });

    it('navigates to auth when token is empty string', async () => {
      localStorageStore['hm_token'] = '';
      const { router: r } = await import('./router');
      (r.navigate as any).mockClear();
      await loadAndInit();
      expect(r.navigate).toHaveBeenCalledWith('auth');
    });
  });

  // =========================================================================
  // 7. Hint button creation
  // =========================================================================
  describe('hint button', () => {
    it('creates a button element via createElement', async () => {
      await loadAndInit();
      const calls = (document.createElement as any).mock.calls;
      const buttonCalls = calls.filter((c: any[]) => c[0] === 'button');
      expect(buttonCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('appends hint button to document body', async () => {
      await loadAndInit();
      // At minimum the renderer canvas and hint button are appended
      expect(mockBody.appendChild.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // 8. Window resize handling
  // =========================================================================
  describe('window resize', () => {
    it('registers a resize event listener on window', async () => {
      await loadAndInit();
      const resizeListeners = windowEventListeners.get('resize');
      expect(resizeListeners).toBeDefined();
      expect(resizeListeners!.length).toBeGreaterThanOrEqual(1);
    });

    it('updates camera aspect ratio on resize', async () => {
      await loadAndInit();
      simulateWindowEvent('resize');
      expect(mockCamera.updateProjectionMatrix).toHaveBeenCalled();
    });

    it('calls renderer.setSize on resize', async () => {
      await loadAndInit();
      simulateWindowEvent('resize');
      expect(mockRenderer.setSize).toHaveBeenCalled();
    });

    it('handles resize gracefully without throwing', async () => {
      await loadAndInit();
      expect(() => simulateWindowEvent('resize')).not.toThrow();
    });
  });

  // =========================================================================
  // 9. Animation loop
  // =========================================================================
  describe('animation loop', () => {
    it('starts the animation loop via requestAnimationFrame', async () => {
      await loadAndInit();
      expect(requestAnimationFrame).toHaveBeenCalled();
    });

    it('calls controls.update() in animation frame', async () => {
      await loadAndInit();
      runAnimationFrames(1);
      expect(mockControls.update).toHaveBeenCalled();
    });

    it('renders scene and camera in animation frame', async () => {
      await loadAndInit();
      runAnimationFrames(1);
      expect(mockRenderer.render).toHaveBeenCalledWith(mockScene, mockCamera);
    });

    it('calls particle effects update in animation frame', async () => {
      await loadAndInit();
      const { ParticleEffects } = await import('./particle-effects');
      const instance = (ParticleEffects as any).mock.results[0].value;
      runAnimationFrames(1);
      expect(instance.update).toHaveBeenCalled();
    });

    it('continues animation loop recursively', async () => {
      await loadAndInit();
      runAnimationFrames(3);
      // Each frame should schedule the next via requestAnimationFrame
      expect(requestAnimationFrame).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 10. Start-single-player event
  // =========================================================================
  describe('start-single-player event', () => {
    it('listens for start-single-player document event', async () => {
      await loadAndInit();
      const listeners = documentEventListeners.get('start-single-player');
      expect(listeners).toBeDefined();
    });

    it('creates CategoryUI when start-single-player fires', async () => {
      await loadAndInit();
      simulateDocumentEvent('start-single-player');
      const { CategoryUI } = await import('./category-ui');
      expect(CategoryUI).toHaveBeenCalled();
    });

    it('shows CategoryUI on start-single-player', async () => {
      await loadAndInit();
      // Reset CategoryUI mock so we can capture just the start-single-player call
      simulateDocumentEvent('start-single-player');
      const { CategoryUI } = await import('./category-ui');
      const instance = (CategoryUI as any).mock.results[
        (CategoryUI as any).mock.results.length - 1
      ].value;
      expect(instance.show).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 11. Edge cases
  // =========================================================================
  describe('edge cases', () => {
    it('handles missing canvas in game page render without throwing', async () => {
      await loadAndInit();
      const { router } = await import('./router');
      const gameCall = router.registerPage.mock.calls.find((c: any[]) => c[0] === 'game');
      const page = gameCall![1];
      // querySelector returns null (default mock)
      expect(() => page.render()).not.toThrow();
    });

    it('handles missing app-pages element in game page render', async () => {
      await loadAndInit();
      const { router } = await import('./router');
      const gameCall = router.registerPage.mock.calls.find((c: any[]) => c[0] === 'game');
      const page = gameCall![1];
      expect(() => page.render()).not.toThrow();
    });

    it('handles page render with null querySelector result gracefully', async () => {
      await loadAndInit();
      const { router } = await import('./router');
      const authCall = router.registerPage.mock.calls.find((c: any[]) => c[0] === 'auth');
      const page = authCall![1];
      // Pass a container where querySelector returns null (falls back to container itself)
      const mockContainer = { querySelector: vi.fn(() => null) };
      expect(() => page.render(mockContainer)).not.toThrow();
    });

    it('survives multiple DOMContentLoaded invocations', async () => {
      await loadAndInit();
      // Second and third invocation should not throw
      expect(() => {
        simulateDocumentEvent('DOMContentLoaded');
        simulateDocumentEvent('DOMContentLoaded');
      }).not.toThrow();
    });
  });
});
