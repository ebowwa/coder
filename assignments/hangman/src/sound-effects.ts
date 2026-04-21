/**
 * Sound effects using Web Audio API
 * Synthesizes tones for game events
 */

export type SoundType = 'correct' | 'wrong' | 'win' | 'lose' | 'click' | 'join' | 'leave';

class SoundEffects {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.3;

  constructor() {
    // AudioContext will be created on first user interaction
  }

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  play(type: SoundType): void {
    if (!this.enabled) return;

    try {
      const ctx = this.getContext();
      
      // Resume context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      switch (type) {
        case 'correct':
          this.playCorrect(ctx);
          break;
        case 'wrong':
          this.playWrong(ctx);
          break;
        case 'win':
          this.playWin(ctx);
          break;
        case 'lose':
          this.playLose(ctx);
          break;
        case 'click':
          this.playClick(ctx);
          break;
        case 'join':
          this.playJoin(ctx);
          break;
        case 'leave':
          this.playLeave(ctx);
          break;
      }
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }

  private playCorrect(ctx: AudioContext): void {
    const now = ctx.currentTime;
    
    // Pleasant ascending arpeggio
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
    
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(this.volume * 0.4, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.3);
    });
  }

  private playWrong(ctx: AudioContext): void {
    const now = ctx.currentTime;
    
    // Descending buzz
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
    
    gain.gain.setValueAtTime(this.volume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.3);
  }

  private playWin(ctx: AudioContext): void {
    const now = ctx.currentTime;
    
    // Triumphant fanfare
    const notes = [
      { freq: 523.25, time: 0 },      // C5
      { freq: 659.25, time: 0.1 },    // E5
      { freq: 783.99, time: 0.2 },    // G5
      { freq: 1046.50, time: 0.35 },  // C6
      { freq: 783.99, time: 0.5 },    // G5
      { freq: 1046.50, time: 0.65 },  // C6
    ];
    
    notes.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);
      
      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(this.volume * 0.4, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + time);
      osc.stop(now + time + 0.2);
    });

    // Add some sparkle
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + 0.3 + i * 0.1;
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2000 + i * 500, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(this.volume * 0.1, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 0.1);
    }
  }

  private playLose(ctx: AudioContext): void {
    const now = ctx.currentTime;
    
    // Sad descending tones
    const notes = [
      { freq: 392.00, time: 0 },    // G4
      { freq: 349.23, time: 0.25 }, // F4
      { freq: 329.63, time: 0.5 },  // E4
      { freq: 261.63, time: 0.75 }, // C4
    ];
    
    notes.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);
      
      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(this.volume * 0.35, now + time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.35);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + time);
      osc.stop(now + time + 0.35);
    });
  }

  private playClick(ctx: AudioContext): void {
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    
    gain.gain.setValueAtTime(this.volume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.05);
  }

  private playJoin(ctx: AudioContext): void {
    const now = ctx.currentTime;
    
    // Quick ascending chime
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
    
    gain.gain.setValueAtTime(this.volume * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.15);
  }

  private playLeave(ctx: AudioContext): void {
    const now = ctx.currentTime;
    
    // Quick descending chime
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
    
    gain.gain.setValueAtTime(this.volume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.15);
  }
}

export const soundEffects = new SoundEffects();
