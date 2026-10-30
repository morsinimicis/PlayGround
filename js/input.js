import { clamp, lerp, normalize, tiltVector } from './core.js';

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyJ', 'KeyK', 'KeyL', 'KeyZ', 'KeyX', 'KeyC', 'KeyE', 'Space', 'ShiftLeft', 'ShiftRight'
]);

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, inside: false };
    this.held = { attack: false };
    this.pressed = { attack: false, dash: false, special: false };
    this.touchMove = { x: 0, y: 0, active: false };
    this.tilt = {
      enabled: false,
      x: 0,
      y: 0,
      sx: 0,
      sy: 0,
      baseline: null,
      hasData: false,
      permission: 'unknown',
      orientation: 0,
      bound: false,
      watchdog: 0
    };
    this.stickPointer = null;
    this.stickOrigin = { x: 0, y: 0 };
    this.onPause = null;
    this.onKey = null;
    this.onTiltLost = null;
    this.onTiltChange = null;
    this.bindKeyboard();
    this.bindMouse();
    this.bindTouch();
  }

  bindKeyboard() {
    window.addEventListener('keydown', (event) => {
      if (GAME_KEYS.has(event.code)) event.preventDefault();
      if (event.repeat) return;
      this.keys.add(event.code);
      if (event.code === 'KeyJ' || event.code === 'KeyZ') {
        this.held.attack = true;
        this.pressed.attack = true;
      }
      if (event.code === 'KeyK' || event.code === 'KeyX' || event.code === 'Space' || event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        this.pressed.dash = true;
      }
      if (event.code === 'KeyL' || event.code === 'KeyC' || event.code === 'KeyE') {
        this.pressed.special = true;
      }
      if (event.code === 'Escape' || event.code === 'KeyP') this.onPause?.();
      this.onKey?.(event.code, event);
    }, { passive: false });

    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
      if (event.code === 'KeyJ' || event.code === 'KeyZ') this.held.attack = false;
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.held.attack = false;
    });
  }

  bindMouse() {
    window.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      this.mouse.x = event.clientX;
      this.mouse.y = event.clientY;
      this.mouse.inside = true;
    });

    this.canvas.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch') return;
      this.mouse.x = event.clientX;
      this.mouse.y = event.clientY;
      if (event.button === 0) {
        this.held.attack = true;
        this.pressed.attack = true;
      }
      if (event.button === 2) this.pressed.special = true;
    });

    window.addEventListener('pointerup', (event) => {
      if (event.pointerType === 'touch') return;
      if (event.button === 0) this.held.attack = false;
    });

    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  bindTouch() {
    const zone = document.getElementById('stick-zone');
    const base = document.getElementById('stick-base');
    const knob = document.getElementById('stick-knob');
    if (!zone || !base || !knob) return;

    const placeBase = (x, y) => {
      const radius = 64;
      const px = clamp(x, radius + 8, window.innerWidth - radius - 8);
      const py = clamp(y, radius + 8, window.innerHeight - radius - 8);
      this.stickOrigin = { x: px, y: py };
      base.style.left = `${px - radius}px`;
      base.style.top = `${py - radius}px`;
      base.style.bottom = 'auto';
      base.classList.add('active');
    };

    const resetStick = () => {
      this.stickPointer = null;
      this.touchMove.x = 0;
      this.touchMove.y = 0;
      this.touchMove.active = false;
      base.classList.remove('active');
      base.style.left = '';
      base.style.top = '';
      base.style.bottom = '';
      knob.style.transform = 'translate(-50%, -50%)';
    };

    const updateStick = (event) => {
      const dx = event.clientX - this.stickOrigin.x;
      const dy = event.clientY - this.stickOrigin.y;
      const max = 46;
      const length = Math.hypot(dx, dy);
      const scale = length > max ? max / length : 1;
      const x = dx * scale;
      const y = dy * scale;
      this.touchMove.x = x / max;
      this.touchMove.y = y / max;
      this.touchMove.active = true;
      knob.style.transform = `translate(calc(-50% + ${x * 0.78}px), calc(-50% + ${y * 0.78}px))`;
    };

    zone.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (this.stickPointer !== null) return;
      this.stickPointer = event.pointerId;
      zone.setPointerCapture(event.pointerId);
      placeBase(event.clientX, event.clientY);
      updateStick(event);
    }, { passive: false });

    zone.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.stickPointer) return;
      event.preventDefault();
      updateStick(event);
    }, { passive: false });

    const end = (event) => {
      if (event.pointerId !== this.stickPointer) return;
      resetStick();
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    zone.addEventListener('lostpointercapture', (event) => {
      if (event.pointerId === this.stickPointer) resetStick();
    });

    const bindButton = (id, onDown, onUp) => {
      const button = document.getElementById(id);
      if (!button) return;
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        button.classList.add('pressed');
        try { button.setPointerCapture(event.pointerId); } catch {}
        onDown?.();
      }, { passive: false });
      const release = (event) => {
        event.preventDefault();
        button.classList.remove('pressed');
        onUp?.();
      };
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', () => {
        button.classList.remove('pressed');
        onUp?.();
      });
    };

    bindButton('attack-btn', () => {
      this.held.attack = true;
      this.pressed.attack = true;
    }, () => {
      this.held.attack = false;
    });

    bindButton('dash-btn', () => {
      this.pressed.dash = true;
    });

    bindButton('special-btn', () => {
      this.pressed.special = true;
    });
  }

  getOrientation() {
    if (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.angle === 'number') {
      return screen.orientation.angle;
    }
    return typeof window.orientation === 'number' ? window.orientation : 0;
  }

  async enableTilt() {
    const MotionEvent = window.DeviceOrientationEvent;
    if (!MotionEvent) {
      this.tilt.permission = 'unsupported';
      return { ok: false, reason: 'unsupported' };
    }

    if (typeof MotionEvent.requestPermission === 'function') {
      this.tilt.permission = 'prompt';
      try {
        const state = await MotionEvent.requestPermission();
        this.tilt.permission = state;
        if (state !== 'granted') return { ok: false, reason: state === 'denied' ? 'denied' : 'prompt' };
      } catch (error) {
        this.tilt.permission = 'denied';
        return { ok: false, reason: 'denied' };
      }
    }

    this.tilt.enabled = true;
    this.tilt.baseline = null;
    this.tilt.hasData = false;
    this.tilt.orientation = this.getOrientation();

    if (!this.tilt.bound) {
      this.tilt.bound = true;
      window.addEventListener('deviceorientation', (event) => this.handleMotion(event), true);
      window.addEventListener('orientationchange', () => {
        this.tilt.orientation = this.getOrientation();
        this.tilt.baseline = null;
        this.tilt.hasData = false;
      });
      if (screen.orientation?.addEventListener) {
        screen.orientation.addEventListener('change', () => {
          this.tilt.orientation = this.getOrientation();
          this.tilt.baseline = null;
          this.tilt.hasData = false;
        });
      }
    }

    clearTimeout(this.tilt.watchdog);
    this.tilt.watchdog = window.setTimeout(() => {
      if (this.tilt.enabled && !this.tilt.hasData) {
        this.tilt.enabled = false;
        this.tilt.permission = 'unavailable';
        this.onTiltLost?.();
      }
    }, 2400);

    return { ok: true };
  }

  handleMotion(event) {
    if (!this.tilt.enabled) return;
    if (event.beta == null || event.gamma == null) return;
    this.tilt.hasData = true;
    this.tilt.permission = 'granted';
    if (!this.tilt.baseline) {
      this.tilt.baseline = { beta: event.beta, gamma: event.gamma };
      this.tilt.x = 0;
      this.tilt.y = 0;
      this.tilt.sx = 0;
      this.tilt.sy = 0;
      return;
    }
    const vector = tiltVector({
      beta: event.beta,
      gamma: event.gamma,
      orientation: this.tilt.orientation,
      baseline: this.tilt.baseline,
      deadzone: 0.055,
      range: 16
    });
    this.tilt.x = lerp(this.tilt.x, vector.x, 0.38);
    this.tilt.y = lerp(this.tilt.y, vector.y, 0.38);
    this.tilt.sx = vector.x;
    this.tilt.sy = vector.y;
    this.onTiltChange?.(this.tilt.x, this.tilt.y);
  }

  disableTilt() {
    this.tilt.enabled = false;
    this.tilt.x = 0;
    this.tilt.y = 0;
    this.tilt.sx = 0;
    this.tilt.sy = 0;
    this.tilt.baseline = null;
    clearTimeout(this.tilt.watchdog);
  }

  recalibrateTilt() {
    this.tilt.baseline = null;
    this.tilt.hasData = false;
  }

  getMove() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (x !== 0 || y !== 0) {
      const n = normalize(x, y);
      return { x: n.x, y: n.y, source: 'key' };
    }

    const touchLength = Math.hypot(this.touchMove.x, this.touchMove.y);
    if (touchLength > 0.08) {
      const n = normalize(this.touchMove.x, this.touchMove.y);
      const magnitude = Math.min(1, touchLength);
      return { x: n.x * magnitude, y: n.y * magnitude, source: 'touch' };
    }

    if (this.tilt.enabled) {
      const tiltLength = Math.hypot(this.tilt.x, this.tilt.y);
      if (tiltLength > 0.06) {
        return { x: this.tilt.x, y: this.tilt.y, source: 'tilt' };
      }
    }

    return { x: 0, y: 0, source: 'none' };
  }

  consume(action) {
    if (!this.pressed[action]) return false;
    this.pressed[action] = false;
    return true;
  }

  clearActions() {
    this.pressed.attack = false;
    this.pressed.dash = false;
    this.pressed.special = false;
    this.held.attack = false;
    this.keys.clear();
    this.touchMove.x = 0;
    this.touchMove.y = 0;
    this.touchMove.active = false;
    const base = document.getElementById('stick-base');
    const knob = document.getElementById('stick-knob');
    if (base) {
      base.classList.remove('active');
      base.style.left = '';
      base.style.top = '';
      base.style.bottom = '';
    }
    if (knob) knob.style.transform = 'translate(-50%, -50%)';
  }

  resetPulses() {
    this.clearActions();
    this.disableTilt();
  }
}
