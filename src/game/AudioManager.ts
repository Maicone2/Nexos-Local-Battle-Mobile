import { CombatEvent } from './types';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private muted = false;
  private volume = 0.7;

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playUiClick(): void {
    this.playTone(620, 420, 0.05, 'triangle', 0.18);
  }

  playCombatEvents(events: CombatEvent[]): void {
    if (this.muted || events.length === 0) return;
    for (const ev of events) {
      switch (ev.type) {
        case 'hit':
          this.playImpact(170, 0.09, 0.35);
          break;
        case 'heavy_hit':
          this.playImpact(105, 0.16, 0.55);
          break;
        case 'block':
          this.playTone(940, 620, 0.08, 'square', 0.25);
          break;
        case 'special':
          this.playTone(260, 780, 0.24, 'sawtooth', 0.3);
          break;
        case 'jump':
          this.playTone(210, 410, 0.09, 'sine', 0.16);
          break;
        case 'stun':
          this.playTone(540, 880, 0.22, 'triangle', 0.3);
          break;
        case 'ko':
          this.playImpact(68, 0.42, 0.65);
          break;
        case 'round_start':
          this.playTone(440, 880, 0.18, 'triangle', 0.28);
          break;
      }
    }
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    durationSec: number,
    type: OscillatorType,
    gainLevel: number
  ): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const jitter = 0.92 + Math.random() * 0.16;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart * jitter, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd * jitter), now + durationSec);

    gain.gain.setValueAtTime(gainLevel * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.01);
  }

  private playImpact(baseFreq: number, durationSec: number, gainLevel: number): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.6, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + durationSec);

    gain.gain.setValueAtTime(gainLevel * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.01);
  }
}

export const audioManager = new AudioManager();
