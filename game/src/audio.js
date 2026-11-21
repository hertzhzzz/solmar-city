// SOLMAR CITY — audio.js
// All sound is synthesised with WebAudio. No audio files, no network.
// The engine starts on the first key press, as browsers require.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenOn = false;
    this.sirenTimer = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    } catch (e) { this.ctx = null; }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.engineGain) this.engineGain.gain.value = 0;
    if (this.sirenGain) this.sirenGain.gain.value = 0;
    return this.muted;
  }

  blip(freq, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq || 660, t);
    gain.gain.setValueAtTime(vol || 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.12));
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + (dur || 0.12) + 0.02);
  }

  pickup() { this.blip(880, 0.1, 'sine', 0.14); setTimeout(() => this.blip(1320, 0.14, 'sine', 0.12), 70); }

  crash() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = 0.18;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + len);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    src.connect(filter).connect(gain).connect(this.ctx.destination);
    src.start(t);
  }

  punch() { this.blip(180, 0.08, 'square', 0.1); }

  missionComplete() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => setTimeout(() => this.blip(f, 0.22, 'triangle', 0.14), i * 110));
  }

  missionStart() {
    this.blip(392, 0.14, 'triangle', 0.12);
    setTimeout(() => this.blip(523, 0.18, 'triangle', 0.12), 120);
  }

  setEngine(speed01, driving) {
    if (!this.ctx || this.muted) return;
    if (!driving || speed01 <= 0.01) {
      if (this.engineGain) this.engineGain.gain.value = 0;
      return;
    }
    if (!this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 700;
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.connect(filter).connect(this.engineGain).connect(this.ctx.destination);
      this.engineOsc.start();
    }
    this.engineOsc.frequency.value = 55 + speed01 * 130;
    this.engineGain.gain.value = 0.03 + speed01 * 0.05;
  }

  setSiren(on, dt) {
    if (!this.ctx) return;
    if (on && !this.muted) {
      if (!this.sirenOsc) {
        this.sirenOsc = this.ctx.createOscillator();
        this.sirenGain = this.ctx.createGain();
        this.sirenOsc.type = 'square';
        this.sirenGain.gain.value = 0.02;
        this.sirenOsc.connect(this.sirenGain).connect(this.ctx.destination);
        this.sirenOsc.start();
      }
      this.sirenTimer += dt;
      const hi = Math.floor(this.sirenTimer * 2) % 2 === 0;
      this.sirenOsc.frequency.value = hi ? 780 : 590;
      this.sirenGain.gain.value = 0.02;
    } else if (this.sirenGain) {
      this.sirenGain.gain.value = 0;
    }
  }
}
