class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.noiseBuffer = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.22;
    this.master.connect(this.ctx.destination);
    const length = Math.floor(this.ctx.sampleRate * 0.7);
    this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(muted ? 0 : 0.22, this.ctx.currentTime, 0.04);
    }
  }

  tone(freq, duration = 0.16, options = {}) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + (options.delay || 0);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = options.type || "sine";
    osc.frequency.setValueAtTime(Math.max(20, freq), t);
    if (options.slide) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.slide), t + duration);
    }
    const peak = Math.max(0.0001, options.gain ?? 0.12);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.018, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    if (options.filter) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = options.filter;
      filter.frequency.value = options.cutoff || 1200;
      filter.Q.value = options.q || 1;
      osc.connect(filter).connect(gain);
    } else {
      osc.connect(gain);
    }
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.03);
  }

  noise(duration = 0.12, options = {}) {
    if (!this.ctx || this.muted || !this.noiseBuffer) return;
    const t = this.ctx.currentTime + (options.delay || 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = options.filter || "bandpass";
    filter.frequency.setValueAtTime(options.freq || 900, t);
    if (options.slide) filter.frequency.exponentialRampToValueAtTime(Math.max(60, options.slide), t + duration);
    filter.Q.value = options.q || 0.9;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, options.gain ?? 0.1), t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + duration + 0.02);
  }

  play(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case "click":
        this.tone(620, 0.06, { type: "sine", gain: 0.045, slide: 520 });
        break;
      case "step":
        this.noise(0.07, { freq: 360, gain: 0.035, filter: "lowpass", slide: 180 });
        this.tone(92, 0.07, { type: "sine", gain: 0.035, slide: 70 });
        break;
      case "hit":
        this.noise(0.13, { freq: 1200, gain: 0.11, filter: "bandpass", slide: 220, q: 0.7 });
        this.tone(150, 0.13, { type: "triangle", gain: 0.1, slide: 62 });
        break;
      case "crit":
        this.noise(0.18, { freq: 1900, gain: 0.14, slide: 240 });
        this.tone(920, 0.16, { type: "square", gain: 0.045, slide: 480 });
        this.tone(140, 0.2, { type: "triangle", gain: 0.12, slide: 50 });
        break;
      case "hurt":
        this.noise(0.18, { freq: 280, gain: 0.11, filter: "lowpass", slide: 120 });
        this.tone(110, 0.22, { type: "sawtooth", gain: 0.08, slide: 48, filter: "lowpass", cutoff: 700 });
        break;
      case "coin":
        this.tone(880, 0.09, { type: "sine", gain: 0.07 });
        this.tone(1320, 0.14, { type: "sine", gain: 0.055, delay: 0.055 });
        break;
      case "potion":
        this.tone(330, 0.12, { type: "sine", gain: 0.07, slide: 520 });
        this.tone(520, 0.18, { type: "sine", gain: 0.06, slide: 780, delay: 0.08 });
        break;
      case "chest":
        this.noise(0.1, { freq: 420, gain: 0.05, filter: "lowpass" });
        [523, 659, 784].forEach((freq, i) => this.tone(freq, 0.22, { type: "triangle", gain: 0.06, delay: i * 0.07 }));
        break;
      case "sigil":
        [392, 587, 784, 1175].forEach((freq, i) => this.tone(freq, 0.7, { type: "sine", gain: 0.055, delay: i * 0.07 }));
        this.noise(0.5, { freq: 2400, gain: 0.025, filter: "highpass" });
        break;
      case "stairs":
        this.tone(260, 0.55, { type: "sine", gain: 0.08, slide: 70 });
        this.noise(0.5, { freq: 700, gain: 0.05, slide: 120, filter: "lowpass" });
        break;
      case "level":
        [392, 494, 587, 784, 988].forEach((freq, i) => this.tone(freq, 0.4, { type: "triangle", gain: 0.07, delay: i * 0.075 }));
        break;
      case "skill":
        this.noise(0.32, { freq: 2200, gain: 0.1, slide: 280, filter: "bandpass", q: 0.6 });
        this.tone(180, 0.34, { type: "sawtooth", gain: 0.07, slide: 520, filter: "lowpass", cutoff: 1600 });
        this.tone(660, 0.3, { type: "sine", gain: 0.05, slide: 990, delay: 0.04 });
        break;
      case "deny":
        this.tone(150, 0.16, { type: "square", gain: 0.035, slide: 105, filter: "lowpass", cutoff: 700 });
        break;
      case "boss":
        this.tone(58, 1.1, { type: "sawtooth", gain: 0.1, slide: 41, filter: "lowpass", cutoff: 320 });
        this.noise(0.9, { freq: 190, gain: 0.07, filter: "lowpass", slide: 80 });
        break;
      case "win":
        [523, 659, 784, 1047, 1319].forEach((freq, i) => this.tone(freq, 0.9, { type: "triangle", gain: 0.08, delay: i * 0.13 }));
        this.tone(262, 1.6, { type: "sine", gain: 0.07, delay: 0.1 });
        break;
      case "lose":
        [392, 330, 262, 196].forEach((freq, i) => this.tone(freq, 0.8, { type: "triangle", gain: 0.075, delay: i * 0.18 }));
        this.tone(98, 1.7, { type: "sine", gain: 0.06, delay: 0.2 });
        break;
      case "descend":
        [523, 440, 349, 262].forEach((freq, i) => this.tone(freq, 0.5, { type: "sine", gain: 0.05, delay: i * 0.09 }));
        this.noise(0.7, { freq: 900, gain: 0.04, slide: 200, filter: "lowpass" });
        break;
      default:
        break;
    }
  }
}

export const audio = new SoundEngine();
