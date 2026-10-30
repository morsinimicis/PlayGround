export class Soundscape {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.ambient = null;
    this.last = new Map();
  }

  init() {
    if (this.ctx) return;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    const master = ctx.createGain();
    master.gain.value = this.enabled ? 0.55 : 0;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.24;
    master.connect(compressor);
    compressor.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;

    const length = Math.floor(ctx.sampleRate * 2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
    this.startAmbient();
  }

  ensure() {
    if (!this.enabled) return;
    this.init();
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
    try { localStorage.setItem('gate-of-embers:sound', this.enabled ? '1' : '0'); } catch {}
    if (this.ctx && this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(this.enabled ? 0.55 : 0, t, 0.08);
    }
    if (this.enabled) this.ensure();
  }

  startAmbient() {
    if (!this.ctx || this.ambient) return;
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.028;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 260;
    filter.Q.value = 2.2;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 70;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    const a = ctx.createOscillator();
    a.type = 'sawtooth';
    a.frequency.value = 55;
    const b = ctx.createOscillator();
    b.type = 'sine';
    b.frequency.value = 82.4;
    b.detune.value = -7;
    const c = ctx.createOscillator();
    c.type = 'triangle';
    c.frequency.value = 110;
    c.detune.value = 6;
    const cGain = ctx.createGain();
    cGain.gain.value = 0.35;
    a.connect(filter);
    b.connect(filter);
    c.connect(cGain);
    cGain.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    a.start();
    b.start();
    c.start();
    lfo.start();
    this.ambient = { a, b, c, lfo, gain, filter };
  }

  now() {
    this.ensure();
    return this.ctx ? this.ctx.currentTime : 0;
  }

  throttle(key, ms) {
    const t = performance.now();
    if ((this.last.get(key) || 0) + ms > t) return false;
    this.last.set(key, t);
    return true;
  }

  tone({ freq = 440, end = null, dur = 0.16, type = 'sine', gain = 0.1, attack = 0.005, filter = 0, q = 1 }) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (end != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + dur);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (filter) {
      const biq = ctx.createBiquadFilter();
      biq.type = 'lowpass';
      biq.frequency.value = filter;
      biq.Q.value = q;
      node.connect(biq);
      node = biq;
    }
    node.connect(amp);
    amp.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise({ dur = 0.14, gain = 0.08, freq = 900, end = 300, q = 0.8, type = 'bandpass' }) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, end), t + dur);
    filter.Q.value = q;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(Math.max(0.0001, gain), t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  ui() {
    this.tone({ freq: 640, end: 860, dur: 0.09, type: 'triangle', gain: 0.05 });
  }

  select() {
    this.tone({ freq: 320, end: 480, dur: 0.13, type: 'triangle', gain: 0.05 });
    this.tone({ freq: 640, dur: 0.18, type: 'sine', gain: 0.025, attack: 0.02 });
  }

  slash() {
    this.noise({ dur: 0.17, gain: 0.075, freq: 2600, end: 420, q: 1.4 });
    this.tone({ freq: 300, end: 140, dur: 0.12, type: 'sawtooth', gain: 0.025, filter: 1200 });
  }

  shoot() {
    this.tone({ freq: 980, end: 340, dur: 0.16, type: 'triangle', gain: 0.055 });
    this.noise({ dur: 0.07, gain: 0.03, freq: 3200, end: 1200, q: 0.7 });
  }

  impact() {
    if (!this.throttle('impact', 35)) return;
    this.tone({ freq: 180, end: 62, dur: 0.14, type: 'square', gain: 0.045, filter: 900 });
    this.noise({ dur: 0.1, gain: 0.06, freq: 1800, end: 300, q: 0.9 });
  }

  kill() {
    this.noise({ dur: 0.32, gain: 0.08, freq: 1400, end: 90, q: 0.6 });
    this.tone({ freq: 220, end: 70, dur: 0.3, type: 'sawtooth', gain: 0.03, filter: 700 });
  }

  dash() {
    this.noise({ dur: 0.2, gain: 0.07, freq: 700, end: 2400, q: 0.5, type: 'highpass' });
  }

  hurt() {
    this.tone({ freq: 170, end: 55, dur: 0.34, type: 'sawtooth', gain: 0.075, filter: 800 });
    this.noise({ dur: 0.24, gain: 0.06, freq: 700, end: 120, q: 0.7 });
  }

  special() {
    this.tone({ freq: 160, end: 420, dur: 0.26, type: 'sawtooth', gain: 0.055, filter: 1800 });
    this.tone({ freq: 640, end: 960, dur: 0.3, type: 'triangle', gain: 0.04, attack: 0.02 });
    this.noise({ dur: 0.35, gain: 0.06, freq: 900, end: 3200, q: 0.6, type: 'highpass' });
  }

  clear() {
    [392, 493.88, 587.33, 783.99].forEach((freq, index) => {
      setTimeout(() => this.tone({ freq, dur: 0.7, type: 'triangle', gain: 0.045, attack: 0.02 }), index * 110);
    });
    this.noise({ dur: 0.7, gain: 0.025, freq: 5000, end: 1200, q: 0.4, type: 'highpass' });
  }

  boon() {
    [523.25, 659.25, 783.99].forEach((freq, index) => {
      setTimeout(() => this.tone({ freq, dur: 0.45, type: 'sine', gain: 0.05, attack: 0.01 }), index * 70);
    });
  }

  spawn() {
    this.tone({ freq: 120, end: 340, dur: 0.24, type: 'triangle', gain: 0.025, filter: 900 });
  }

  boss() {
    this.tone({ freq: 70, end: 42, dur: 1.1, type: 'sawtooth', gain: 0.09, filter: 260 });
    this.noise({ dur: 1.0, gain: 0.05, freq: 340, end: 60, q: 0.5 });
  }

  death() {
    [220, 174.61, 130.81].forEach((freq, index) => {
      setTimeout(() => this.tone({ freq, dur: 0.9, type: 'sawtooth', gain: 0.05, filter: 600 }), index * 190);
    });
  }
}
