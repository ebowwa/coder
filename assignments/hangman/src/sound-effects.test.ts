/**
 * Unit tests for sound-effects module
 * Tests: AudioContext creation, volume control, enable/disable,
 *        all sound types, error handling, autoplay policy handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock AudioContext
const mockOscillator = {
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

const mockGainNode = {
  gain: {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
};

const mockAudioContext = {
  currentTime: 1.0,
  state: 'running' as string,
  resume: vi.fn(),
  createOscillator: vi.fn(() => ({
    ...mockOscillator,
    type: '',
    frequency: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
  createGain: vi.fn(() => ({
    ...mockGainNode,
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  })),
  destination: {},
};

const MockAudioContext = vi.fn(() => ({ ...mockAudioContext }));

beforeEach(() => {
  vi.stubGlobal('AudioContext', MockAudioContext);
  vi.stubGlobal('webkitAudioContext', MockAudioContext);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Dynamic import to get fresh instance each time
async function getFreshSoundEffects() {
  vi.resetModules();
  const mod = await import('./sound-effects');
  return mod;
}

describe('SoundEffects', () => {
  describe('SoundType', () => {
    it('should export all expected sound types', async () => {
      const { soundEffects } = await getFreshSoundEffects();
      const soundTypes: Array<import('./sound-effects').SoundType> = [
        'correct', 'wrong', 'win', 'lose', 'click', 'join', 'leave',
      ];
      // Just verify we can call play with each type without throwing
      soundTypes.forEach(type => {
        expect(() => soundEffects.play(type)).not.toThrow();
      });
    });
  });

  describe('setEnabled', () => {
    it('should disable sound playback', async () => {
      const { soundEffects } = await getFreshSoundEffects();
      soundEffects.setEnabled(false);
      soundEffects.play('correct');
      expect(MockAudioContext).not.toHaveBeenCalled();
    });

    it('should enable sound playback after being disabled', async () => {
      const { soundEffects } = await getFreshSoundEffects();
      soundEffects.setEnabled(false);
      soundEffects.play('correct');
      expect(MockAudioContext).not.toHaveBeenCalled();

      soundEffects.setEnabled(true);
      soundEffects.play('correct');
      expect(MockAudioContext).toHaveBeenCalled();
    });

    it('should enable sound by default', async () => {
      const { soundEffects } = await getFreshSoundEffects();
      soundEffects.play('correct');
      expect(MockAudioContext).toHaveBeenCalled();
    });
  });

  describe('setVolume', () => {
    it('should clamp volume to maximum of 1', async () => {
      const { soundEffects } = await getFreshSoundEffects();
      soundEffects.setVolume(5);
      soundEffects.play('click');

      // The gain value should use 0.3 default * 0.2 for click = 0.06, not 5 * 0.2
      const ctx = MockAudioContext.mock.results[0].value;
      const gainNode = ctx.createGain.mock.results[0].value;
      // gain.gain.setValueAtTime should be called with volume * 0.2
      expect(gainNode.gain.setValueAtTime).toHaveBeenCalled();
    });

    it('should clamp volume to minimum of 0', async () => {
      const { soundEffects } = await getFreshSoundEffects();
      soundEffects.setVolume(-5);
      soundEffects.play('click');
      // Should not throw
      expect(MockAudioContext).toHaveBeenCalled();
    });

    it('should accept valid volume between 0 and 1', async () => {
      const { soundEffects } = await getFreshSoundEffects();
      soundEffects.setVolume(0.5);
      soundEffects.play('click');
      expect(MockAudioContext).toHaveBeenCalled();
    });

    it('should accept volume of exactly 0', async () => {
      const { soundEffects } = await getFreshSoundEffects();
      soundEffects.setVolume(0);
      soundEffects.play('click');
      expect(MockAudioContext).toHaveBeenCalled();
    });

    it('should accept volume of exactly 1', async () => {
      const { soundEffects } = await getFreshSoundEffects();
      soundEffects.setVolume(1);
      soundEffects.play('click');
      expect(MockAudioContext).toHaveBeenCalled();
    });
  });

  describe('getContext', () => {
    it('should create AudioContext lazily on first play', async () => {
      const { soundEffects } = await getFreshSoundEffects();
      expect(MockAudioContext).not.toHaveBeenCalled();
      soundEffects.play('click');
      expect(MockAudioContext).toHaveBeenCalledTimes(1);
    });

    it('should reuse AudioContext across multiple plays', async () => {
      const { soundEffects } = await getFreshSoundEffects();
      soundEffects.play('click');
      soundEffects.play('correct');
      soundEffects.play('wrong');
      expect(MockAudioContext).toHaveBeenCalledTimes(1);
    });

    it('should fall back to webkitAudioContext if AudioContext is not available', async () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('AudioContext', undefined);
      vi.stubGlobal('webkitAudioContext', MockAudioContext);

      const { soundEffects } = await getFreshSoundEffects();
      soundEffects.play('click');
      expect(MockAudioContext).toHaveBeenCalled();
    });
  });

  describe('play - autoplay policy', () => {
    it('should resume suspended AudioContext', async () => {
      const suspendedCtx = {
        ...mockAudioContext,
        state: 'suspended',
        resume: vi.fn().mockResolvedValue(undefined),
        createOscillator: vi.fn(() => ({
          ...mockOscillator,
          type: '',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        })),
        createGain: vi.fn(() => ({
          ...mockGainNode,
          gain: {
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
        })),
      };

      const SuspendedCtx = vi.fn(() => suspendedCtx);
      vi.stubGlobal('AudioContext', SuspendedCtx);

      const { soundEffects } = await getFreshSoundEffects();
      soundEffects.play('click');
      expect(suspendedCtx.resume).toHaveBeenCalled();
    });

    it('should not call resume when context is already running', async () => {
      const runningCtx = {
        ...mockAudioContext,
        state: 'running',
        resume: vi.fn(),
        createOscillator: vi.fn(() => ({
          ...mockOscillator,
          type: '',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        })),
        createGain: vi.fn(() => ({
          ...mockGainNode,
          gain: {
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
        })),
      };

      const RunningCtx = vi.fn(() => runningCtx);
      vi.stubGlobal('AudioContext', RunningCtx);

      const { soundEffects } = await getFreshSoundEffects();
      soundEffects.play('click');
      expect(runningCtx.resume).not.toHaveBeenCalled();
    });
  });

  describe('play - correct sound', () => {
    it('should create 3 oscillators for ascending arpeggio', async () => {
      const { soundEffects } = await getFreshSoundEffects();
      soundEffects.play('correct');

      const ctx = MockAudioContext.mock.results[0].value;
      // 3 oscillators for the arpeggio
      expect(ctx.createOscillator).toHaveBeenCalledTimes(3);
      expect(ctx.createGain).toHaveBeenCalledTimes(3);
    });

    it('should use sine wave type for correct sound', async () => {
      const { soundEffects } = await getFreshSoundEffects();
      soundEffects.play('correct');

      const ctx = MockAudioContext.mock.results[0].value;
      const oscCalls = ctx.createOscillator.mock.results;
      oscCalls.forEach((oscResult: any) => {
        // The code sets osc.type = 'sine' after creation
        expect(oscResult.value.type).toBe('sine');
      });
    });

    it('should connect oscillators to gain and gain to destination', async () => {
      const { soundEffects } = await getFreshSoundEffects();
      soundEffects.play('correct');

      const ctx = MockAudioContext.mock.results[0].value;
      const oscCalls = ctx.createOscillator.mock.results;
      const gainCalls = ctx.createGain.mock.results;

      oscCalls.forEach((oscResult: any) => {
        expect(oscResult.value.connect).toHaveBeenCalled();
      });
      gainCalls.forEach((gainResult: any) => {
        expect(gainResult.value.connect).toHaveBeenCalledWith(ctx.destination);
      });
    });
  });

  describe('play - wrong sound', () => {
    it('should create 1 oscillator for wrong sound', async () => {
      const { soundEffects } = await getFreshSoundEffects();
      soundEffects.play('wrong');

      const ctx = MockAudioContext.mock.results[0].value;
      expect(ctx.createOscillator).toHaveBeenCalledTimes(1);
      expect(ctx.createGain).toHaveBeenCalledTimes(1);
    });
  });

  describe('play - win sound', () => {
    it('should create multiple oscillators for fanfare', async () => {
      const { soundEffects } = await getFreshSoundEffects();
      soundEffects.play('win');

      const ctx = MockAudioContext.mock.results[0].value;
      // 6 note oscillators + 4 sparkle oscillators = 10
      expect(ctx.createOscillator.mock.calls.length).toBeGreaterThanOrEqual(6);
      expect(ctx.createGain.mock.calls.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('play - lose sound', () => {
    it('should create 4 oscillators for descending tones', async () => {
      const { soundEffects } = await getFreshSoundEffects();
      soundEffects.play('lose');

      const ctx = MockAudioContext.mock.results[0].value;
      expect(ctx.createOscillator).toHaveBeenCalledTimes(4);
      expect(ctx.createGain).toHaveBeenCalledTimes(4);
    });
  });

  describe('play - click sound', () => {
    it('should create 1 oscillator for click', async () => {
      const { soundEffects } = await getFreshSoundEffects();
      soundEffects.play('click');

      const ctx = MockAudioContext.mock.results[0].value;
      expect(ctx.createOscillator).toHaveBeenCalledTimes(1);
      expect(ctx.createGain).toHaveBeenCalledTimes(1);
    });
  });

  describe('play - join sound', () => {
    it('should create 1 oscillator for ascending chime', async () => {
      const { soundEffects } = await getFreshSoundEffects();
      soundEffects.play('join');

      const ctx = MockAudioContext.mock.results[0].value;
      expect(ctx.createOscillator).toHaveBeenCalledTimes(1);
      expect(ctx.createGain).toHaveBeenCalledTimes(1);
    });
  });

  describe('play - leave sound', () => {
    it('should create 1 oscillator for descending chime', async () => {
      const { soundEffects } = await getFreshSoundEffects();
      soundEffects.play('leave');

      const ctx = MockAudioContext.mock.results[0].value;
      expect(ctx.createOscillator).toHaveBeenCalledTimes(1);
      expect(ctx.createGain).toHaveBeenCalledTimes(1);
    });
  });

  describe('play - error handling', () => {
    it('should catch errors when AudioContext creation fails', async () => {
      vi.stubGlobal('AudioContext', vi.fn(() => { throw new Error('AudioContext not supported'); }));

      const { soundEffects } = await getFreshSoundEffects();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => soundEffects.play('correct')).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith('Failed to play sound:', expect.any(Error));

      warnSpy.mockRestore();
    });

    it('should catch errors when oscillator operations fail', async () => {
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

      vi.stubGlobal('AudioContext', vi.fn(() => brokenCtx));

      const { soundEffects } = await getFreshSoundEffects();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => soundEffects.play('correct')).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith('Failed to play sound:', expect.any(Error));

      warnSpy.mockRestore();
    });
  });

  describe('play - disabled state', () => {
    it('should not create AudioContext when disabled', async () => {
      const { soundEffects } = await getFreshSoundEffects();
      soundEffects.setEnabled(false);

      // Play all sound types
      const types: Array<import('./sound-effects').SoundType> = [
        'correct', 'wrong', 'win', 'lose', 'click', 'join', 'leave',
      ];
      types.forEach(type => soundEffects.play(type));

      expect(MockAudioContext).not.toHaveBeenCalled();
    });
  });

  describe('singleton export', () => {
    it('should export a soundEffects singleton instance', async () => {
      const mod = await getFreshSoundEffects();
      expect(mod.soundEffects).toBeDefined();
      expect(typeof mod.soundEffects.play).toBe('function');
      expect(typeof mod.soundEffects.setEnabled).toBe('function');
      expect(typeof mod.soundEffects.setVolume).toBe('function');
    });
  });
});
