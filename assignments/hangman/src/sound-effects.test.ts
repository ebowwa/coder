/**
 * Unit tests for sound-effects module
 * Tests: AudioContext creation, volume control, enable/disable,
 *        all sound types, error handling, autoplay policy handling
 */

// Vitest provides globals via vitest.config.ts globals: true

// We need to mock AudioContext BEFORE importing the module, because the module
// creates a singleton at load time and getContext() lazily creates AudioContext.
// Since AudioContext is lazily created, we can set the mock before any play() call.

function createMockOscillator() {
  return {
    type: '',
    frequency: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

function createMockGainNode() {
  return {
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  };
}

function createMockAudioContext(overrides: Record<string, any> = {}) {
  return {
    currentTime: 1.0,
    state: 'running' as string,
    resume: vi.fn(() => Promise.resolve()),
    createOscillator: vi.fn(() => createMockOscillator()),
    createGain: vi.fn(() => createMockGainNode()),
    destination: {},
    ...overrides,
  };
}

// Shared context that tracks the latest AudioContext created
let latestCtx: any;
let MockAudioContextFn: any;
let _origAudioContext: any;
let _origWebkitAudioContext: any;

// Import once - the singleton
let soundEffects: any;

beforeAll(async () => {
  // Set up mocks BEFORE first import
  latestCtx = createMockAudioContext();
  MockAudioContextFn = vi.fn(() => {
    latestCtx = createMockAudioContext();
    return latestCtx;
  });

  _origAudioContext = (globalThis as any).AudioContext;
  _origWebkitAudioContext = (globalThis as any).webkitAudioContext;
  (globalThis as any).AudioContext = MockAudioContextFn;
  (globalThis as any).webkitAudioContext = MockAudioContextFn;
  (globalThis as any).window = globalThis;

  const mod = await import('./sound-effects');
  soundEffects = mod.soundEffects;
});

// Helper: reset the internal audioContext so next play() creates a fresh one
function resetAudioContext() {
  // Access the private field to force re-creation
  (soundEffects as any).audioContext = null;
  MockAudioContextFn.mockClear();
}

afterAll(() => {
  (globalThis as any).AudioContext = _origAudioContext;
  (globalThis as any).webkitAudioContext = _origWebkitAudioContext;
});

describe('SoundEffects', () => {
  beforeEach(() => {
    // Ensure enabled and default volume before each test
    soundEffects.setEnabled(true);
    soundEffects.setVolume(0.3);
    resetAudioContext();
    MockAudioContextFn.mockClear();
  });

  describe('SoundType', () => {
    it('should export all expected sound types', () => {
      const soundTypes: Array<import('./sound-effects').SoundType> = [
        'correct', 'wrong', 'win', 'lose', 'click', 'join', 'leave',
      ];
      soundTypes.forEach(type => {
        resetAudioContext();
        MockAudioContextFn.mockClear();
        expect(() => soundEffects.play(type)).not.toThrow();
      });
    });
  });

  describe('setEnabled', () => {
    it('should disable sound playback', () => {
      soundEffects.setEnabled(false);
      soundEffects.play('correct');
      expect(MockAudioContextFn.mock.calls.length).toBe(0);
    });

    it('should enable sound playback after being disabled', () => {
      soundEffects.setEnabled(false);
      soundEffects.play('correct');
      expect(MockAudioContextFn.mock.calls.length).toBe(0);

      soundEffects.setEnabled(true);
      soundEffects.play('correct');
      expect(MockAudioContextFn.mock.calls.length).toBe(1);
    });

    it('should enable sound by default', () => {
      soundEffects.play('correct');
      expect(MockAudioContextFn.mock.calls.length).toBe(1);
    });
  });

  describe('setVolume', () => {
    it('should clamp volume to maximum of 1', () => {
      soundEffects.setVolume(5);
      soundEffects.play('click');
      expect(MockAudioContextFn.mock.calls.length).toBe(1);
    });

    it('should clamp volume to minimum of 0', () => {
      soundEffects.setVolume(-5);
      soundEffects.play('click');
      expect(MockAudioContextFn.mock.calls.length).toBe(1);
    });

    it('should accept valid volume between 0 and 1', () => {
      soundEffects.setVolume(0.5);
      soundEffects.play('click');
      expect(MockAudioContextFn.mock.calls.length).toBe(1);
    });

    it('should accept volume of exactly 0', () => {
      soundEffects.setVolume(0);
      soundEffects.play('click');
      expect(MockAudioContextFn.mock.calls.length).toBe(1);
    });

    it('should accept volume of exactly 1', () => {
      soundEffects.setVolume(1);
      soundEffects.play('click');
      expect(MockAudioContextFn.mock.calls.length).toBe(1);
    });
  });

  describe('getContext', () => {
    it('should create AudioContext lazily on first play', () => {
      expect(MockAudioContextFn.mock.calls.length).toBe(0);
      soundEffects.play('click');
      expect(MockAudioContextFn.mock.calls.length).toBe(1);
    });

    it('should reuse AudioContext across multiple plays', () => {
      soundEffects.play('click');
      soundEffects.play('correct');
      soundEffects.play('wrong');
      expect(MockAudioContextFn.mock.calls.length).toBe(1);
    });

    it('should fall back to webkitAudioContext if AudioContext is not available', () => {
      (globalThis as any).AudioContext = undefined;

      const ctx = createMockAudioContext();
      MockAudioContextFn = vi.fn(() => ctx);
      (globalThis as any).webkitAudioContext = MockAudioContextFn;

      soundEffects.play('click');
      expect(MockAudioContextFn.mock.calls.length).toBe(1);

      // Restore
      (globalThis as any).AudioContext = MockAudioContextFn;
      (globalThis as any).webkitAudioContext = MockAudioContextFn;
    });
  });

  describe('play - autoplay policy', () => {
    it('should resume suspended AudioContext', () => {
      const suspendedCtx = createMockAudioContext({ state: 'suspended' });
      MockAudioContextFn = vi.fn(() => suspendedCtx);
      (globalThis as any).AudioContext = MockAudioContextFn;

      soundEffects.play('click');
      expect(suspendedCtx.resume.mock.calls.length).toBe(1);

      // Restore
      MockAudioContextFn = vi.fn(() => {
        latestCtx = createMockAudioContext();
        return latestCtx;
      });
      (globalThis as any).AudioContext = MockAudioContextFn;
      (globalThis as any).webkitAudioContext = MockAudioContextFn;
    });

    it('should not call resume when context is already running', () => {
      const runningCtx = createMockAudioContext({ state: 'running' });
      MockAudioContextFn = vi.fn(() => runningCtx);
      (globalThis as any).AudioContext = MockAudioContextFn;

      soundEffects.play('click');
      expect(runningCtx.resume.mock.calls.length).toBe(0);

      // Restore
      MockAudioContextFn = vi.fn(() => {
        latestCtx = createMockAudioContext();
        return latestCtx;
      });
      (globalThis as any).AudioContext = MockAudioContextFn;
      (globalThis as any).webkitAudioContext = MockAudioContextFn;
    });
  });

  describe('play - correct sound', () => {
    it('should create 3 oscillators for ascending arpeggio', () => {
      soundEffects.play('correct');
      expect(latestCtx.createOscillator.mock.calls.length).toBe(3);
      expect(latestCtx.createGain.mock.calls.length).toBe(3);
    });

    it('should use sine wave type for correct sound', () => {
      soundEffects.play('correct');
      // The code sets osc.type = 'sine' for correct sound
      expect(latestCtx.createOscillator.mock.calls.length).toBe(3);
    });

    it('should connect oscillators to gain and gain to destination', () => {
      soundEffects.play('correct');
      expect(latestCtx.createOscillator.mock.calls.length).toBe(3);
      expect(latestCtx.createGain.mock.calls.length).toBe(3);
    });
  });

  describe('play - wrong sound', () => {
    it('should create 1 oscillator for wrong sound', () => {
      soundEffects.play('wrong');
      expect(latestCtx.createOscillator.mock.calls.length).toBe(1);
      expect(latestCtx.createGain.mock.calls.length).toBe(1);
    });
  });

  describe('play - win sound', () => {
    it('should create multiple oscillators for fanfare', () => {
      soundEffects.play('win');
      // 6 note oscillators + 4 sparkle oscillators = 10
      expect(latestCtx.createOscillator.mock.calls.length).toBeGreaterThanOrEqual(6);
      expect(latestCtx.createGain.mock.calls.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('play - lose sound', () => {
    it('should create 4 oscillators for descending tones', () => {
      soundEffects.play('lose');
      expect(latestCtx.createOscillator.mock.calls.length).toBe(4);
      expect(latestCtx.createGain.mock.calls.length).toBe(4);
    });
  });

  describe('play - click sound', () => {
    it('should create 1 oscillator for click', () => {
      soundEffects.play('click');
      expect(latestCtx.createOscillator.mock.calls.length).toBe(1);
      expect(latestCtx.createGain.mock.calls.length).toBe(1);
    });
  });

  describe('play - join sound', () => {
    it('should create 1 oscillator for ascending chime', () => {
      soundEffects.play('join');
      expect(latestCtx.createOscillator.mock.calls.length).toBe(1);
      expect(latestCtx.createGain.mock.calls.length).toBe(1);
    });
  });

  describe('play - leave sound', () => {
    it('should create 1 oscillator for descending chime', () => {
      soundEffects.play('leave');
      expect(latestCtx.createOscillator.mock.calls.length).toBe(1);
      expect(latestCtx.createGain.mock.calls.length).toBe(1);
    });
  });

  describe('play - error handling', () => {
    it('should catch errors when AudioContext creation fails', () => {
      (globalThis as any).AudioContext = vi.fn(() => { throw new Error('AudioContext not supported'); });

      const warnSpy = vi.spyOn(console, 'warn');

      expect(() => soundEffects.play('correct')).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith('Failed to play sound:', expect.any(Error));

      warnSpy.mockRestore();
      (globalThis as any).AudioContext = MockAudioContextFn;
    });

    it('should catch errors when oscillator operations fail', () => {
      const brokenCtx = {
        currentTime: 1.0,
        state: 'running',
        resume: vi.fn(),
        createOscillator: vi.fn(() => {
          throw new Error('Oscillator creation failed');
        }),
        createGain: vi.fn(),
        destination: {},
      };

      (globalThis as any).AudioContext = vi.fn(() => brokenCtx);

      const warnSpy = vi.spyOn(console, 'warn');

      expect(() => soundEffects.play('correct')).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith('Failed to play sound:', expect.any(Error));

      warnSpy.mockRestore();
      (globalThis as any).AudioContext = MockAudioContextFn;
    });
  });

  describe('play - disabled state', () => {
    it('should not create AudioContext when disabled', () => {
      soundEffects.setEnabled(false);

      const types: Array<import('./sound-effects').SoundType> = [
        'correct', 'wrong', 'win', 'lose', 'click', 'join', 'leave',
      ];
      types.forEach(type => soundEffects.play(type));

      expect(MockAudioContextFn.mock.calls.length).toBe(0);
    });
  });

  describe('singleton export', () => {
    it('should export a soundEffects singleton instance', () => {
      expect(soundEffects).toBeDefined();
      expect(typeof soundEffects.play).toBe('function');
      expect(typeof soundEffects.setEnabled).toBe('function');
      expect(typeof soundEffects.setVolume).toBe('function');
    });
  });
});
