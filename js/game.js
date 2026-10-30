import {
  ENEMIES, PLAYER, ROOMS, TAU, WEAPONS, WORLD,
  angleDiff, angleLerp, clamp, damp, dist, formatTime, lerp,
  normalize, pickBoons, rand, randInt
} from './core.js';
import { buildArena } from './arena.js';
import { drawWorld } from './render.js';
import { Input } from './input.js';
import { Soundscape } from './audio.js';

const $ = (id) => document.getElementById(id);

function makePlayer(weaponId, x, y) {
  return {
    x, y, vx: 0, vy: 0, radius: PLAYER.radius,
    hp: PLAYER.maxHp, maxHp: PLAYER.maxHp,
    facing: -Math.PI / 2,
    weaponId,
    weapon: WEAPONS[weaponId],
    speedMul: 1, damageMul: 1, attackSpeedMul: 0, rangeMul: 1,
    special: 0, specialGain: 1, specialCostMul: 1, specialDamageMul: 1,
    damageReduction: 0, lifesteal: 0,
    dashCharges: 2, dashMax: 2, dashRecharge: 0,
    dashTimer: 0, dashDir: { x: 0, y: -1 },
    invuln: 0, attackCd: 0, combo: 0, comboTimer: 0, attackAnim: 0,
    hitFlash: 0, boons: []
  };
}

function makeEnemy(type, x, y) {
  const cfg = ENEMIES[type];
  return {
    type, x, y, vx: 0, vy: 0, kx: 0, ky: 0,
    hp: cfg.hp, maxHp: cfg.hp, radius: cfg.radius,
    speed: cfg.speed, damage: cfg.damage, color: cfg.color, accent: cfg.accent,
    souls: cfg.souls,
    state: 'chase', timer: 0, attackCd: rand(0.7, 1.5),
    facing: rand(0, TAU), bobSeed: rand(0, TAU),
    spawnTimer: 0.35, deathTimer: 0, dead: false,
    hitFlash: 0, hitDone: false, lockAngle: 0, lungeDir: { x: 0, y: 0 },
    contactCd: 0, seed: rand(0, 100),
    action: null, actionIndex: 0, enraged: false, boss: type === 'boss'
  };
}

function loadBest() {
  try {
    const value = JSON.parse(localStorage.getItem('gate-of-embers:best') || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function saveBest(value) {
  try { localStorage.setItem('gate-of-embers:best', JSON.stringify(value)); } catch {}
}

class Game {
  constructor() {
    this.canvas = $('game');
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.input = new Input(this.canvas);
    this.audio = new Soundscape();

    this.mode = 'title';
    this.time = 0;
    this.titleTime = 0;
    this.acc = 0;
    this.last = performance.now();
    this.viewW = window.innerWidth;
    this.viewH = window.innerHeight;
    this.dpr = 1;
    this.viewZoom = 1;
    this.isTouch = false;

    this.camera = { x: WORLD.width / 2, y: WORLD.height / 2, zoom: 1, shake: 0, shakeX: 0, shakeY: 0 };
    this.braziers = [];

    this.selectedWeapon = 'blade';
    this.weaponId = 'blade';
    this.weapon = WEAPONS.blade;
    this.player = null;
    this.room = null;
    this.roomIndex = -1;
    this.waveIndex = 0;
    this.enemies = [];
    this.projectiles = [];
    this.pendingSpawns = [];
    this.particles = [];
    this.texts = [];
    this.slashes = [];
    this.afterimages = [];
    this.souls = 0;
    this.stats = { kills: 0, damage: 0, rooms: 0, start: 0 };
    this.waveActive = false;
    this.waveClearTimer = 0;
    this.clearTimer = 0;
    this.clearBonus = 0;
    this.dyingTimer = 0;
    this.hitstop = 0;
    this.emberTimer = 0;
    this.rewardChoices = [];
    this.best = loadBest();
    this.arena = null;
    this.boss = null;
    this.hurtFlashTimer = 0;
    this.toastTimer = 0;
    this.lastHud = {};
    this.dashPipEls = [];

    this.refs = {
      title: $('title-screen'),
      hud: $('hud'),
      touch: $('touch-ui'),
      hpFill: $('hp-fill'),
      hpText: $('hp-text'),
      dashPips: $('dash-pips'),
      specialFill: $('special-fill'),
      specialBtn: $('special-btn'),
      roomName: $('room-name'),
      waveText: $('wave-text'),
      souls: $('souls-value'),
      bossShell: $('boss-shell'),
      bossFill: $('boss-fill'),
      bossName: $('boss-name'),
      hudWeapon: $('hud-weapon'),
      pause: $('pause-overlay'),
      reward: $('reward-overlay'),
      rewardKicker: $('reward-kicker'),
      rewardTitle: $('reward-title'),
      rewardSub: $('reward-sub'),
      rewardSouls: $('reward-souls'),
      boonGrid: $('boon-grid'),
      end: $('end-overlay'),
      endKicker: $('end-kicker'),
      endTitle: $('end-title'),
      endSub: $('end-sub'),
      endStats: $('end-stats'),
      again: $('again-btn'),
      fade: $('fade'),
      toast: $('toast'),
      damageFlash: $('damage-flash'),
      motionStatus: $('motion-status'),
      tiltToggle: $('tilt-toggle'),
      soundToggle: $('sound-toggle'),
      bestLine: $('best-line'),
      weaponDesc: $('weapon-desc'),
      weaponSpecial: $('weapon-special'),
      startBtn: $('start-btn')
    };

    this.audio.enabled = (() => {
      try { return localStorage.getItem('gate-of-embers:sound') !== '0'; } catch { return true; }
    })();

    this.resize();
    this.prepareTitleArena();
    this.bindUI();
    this.selectWeapon('blade');
    this.updateBestLine();
    this.setSoundUI();
    this.updateChrome();
    this.input.onPause = () => this.handlePauseKey();
    this.input.onKey = (code) => this.handleKey(code);
    this.input.onTiltLost = () => {
      this.setTiltUI(false);
      this.setMotionStatus('No motion sensor detected. Touch and keys remain available.', 'warn');
      this.toast('MOTION UNAVAILABLE');
    };
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'playing') this.pause();
    });

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  prepareTitleArena() {
    this.arena = buildArena(ROOMS[0]);
    this.braziers = [
      { x: WORLD.margin + 58, y: WORLD.margin + 58 },
      { x: WORLD.width - WORLD.margin - 58, y: WORLD.margin + 58 },
      { x: WORLD.margin + 58, y: WORLD.height - WORLD.margin - 58 },
      { x: WORLD.width - WORLD.margin - 58, y: WORLD.height - WORLD.margin - 58 }
    ];
    this.camera.x = WORLD.width / 2;
    this.camera.y = WORLD.height / 2;
    this.camera.zoom = this.viewZoom * 0.94;
  }

  resize() {
    this.viewW = window.innerWidth;
    this.viewH = window.innerHeight;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.viewW * this.dpr);
    this.canvas.height = Math.round(this.viewH * this.dpr);
    this.viewZoom = clamp(Math.min(this.viewW / 980, this.viewH / 700), 0.9, 1.35);
    this.isTouch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 || Math.min(this.viewW, this.viewH) <= 820;
    document.body.classList.toggle('is-touch', this.isTouch);
    if (this.mode === 'title') this.camera.zoom = this.viewZoom * 0.94;
    this.updateChrome();
  }

  bindUI() {
    document.querySelectorAll('.weapon-card').forEach((card) => {
      card.addEventListener('click', () => {
        this.audio.ensure();
        this.audio.select();
        this.selectWeapon(card.dataset.weapon);
      });
    });

    this.refs.startBtn.addEventListener('click', () => {
      this.audio.ensure();
      this.audio.ui();
      this.startRun(this.selectedWeapon);
    });

    $('tilt-toggle').addEventListener('click', async () => {
      this.audio.ensure();
      this.audio.ui();
      if (this.input.tilt.enabled) {
        this.input.disableTilt();
        this.setTiltUI(false);
        this.setMotionStatus('Tilt controls off. Touch and keyboard remain available.');
        this.toast('TILT OFF');
        return;
      }
      this.setMotionStatus('Requesting motion access…');
      const result = await this.input.enableTilt();
      if (result.ok) {
        this.setTiltUI(true);
        this.setMotionStatus('Tilt enabled. Hold your device naturally to calibrate. Actions stay on the touch buttons.', 'ok');
        this.toast('TILT ON');
      } else {
        this.setTiltUI(false);
        if (result.reason === 'denied') {
          this.setMotionStatus('Motion permission was denied. Use touch or keyboard controls.', 'warn');
          this.toast('MOTION PERMISSION DENIED');
        } else if (result.reason === 'unsupported') {
          this.setMotionStatus('This device has no motion sensor. Touch and keyboard remain available.', 'warn');
          this.toast('MOTION UNSUPPORTED');
        } else {
          this.setMotionStatus('Motion permission was not granted. You can try again.', 'warn');
        }
      }
    });

    $('sound-toggle').addEventListener('click', () => {
      this.audio.setEnabled(!this.audio.enabled);
      this.setSoundUI();
      this.audio.ui();
    });

    $('pause-btn').addEventListener('click', () => this.togglePause());
    $('resume-btn').addEventListener('click', () => this.resume());
    $('restart-btn').addEventListener('click', () => {
      this.audio.ui();
      this.startRun(this.weaponId);
    });
    $('quit-btn').addEventListener('click', () => {
      this.audio.ui();
      this.returnToTitle();
    });
    $('again-btn').addEventListener('click', () => {
      this.audio.ui();
      this.startRun(this.weaponId);
    });
    $('end-quit-btn').addEventListener('click', () => {
      this.audio.ui();
      this.returnToTitle();
    });

    this.refs.boonGrid.addEventListener('click', (event) => {
      const card = event.target.closest('.boon-card');
      if (!card) return;
      const boon = this.rewardChoices[Number(card.dataset.index)];
      if (boon) this.chooseBoon(boon);
    });
  }

  setSoundUI() {
    this.refs.soundToggle.setAttribute('aria-checked', String(this.audio.enabled));
  }

  setTiltUI(enabled) {
    this.refs.tiltToggle.setAttribute('aria-checked', String(enabled));
  }

  setMotionStatus(text, tone = '') {
    this.refs.motionStatus.textContent = text;
    this.refs.motionStatus.classList.remove('ok', 'warn');
    if (tone) this.refs.motionStatus.classList.add(tone);
  }

  selectWeapon(id) {
    if (!WEAPONS[id]) return;
    this.selectedWeapon = id;
    const weapon = WEAPONS[id];
    document.querySelectorAll('.weapon-card').forEach((card) => {
      const selected = card.dataset.weapon === id;
      card.classList.toggle('is-selected', selected);
      card.setAttribute('aria-checked', String(selected));
    });
    this.refs.weaponDesc.textContent = weapon.desc;
    this.refs.weaponSpecial.textContent = `SPECIAL · ${weapon.specialName}`;
    this.refs.hudWeapon.querySelector('use').setAttribute('href', `#${weapon.icon}`);
  }

  handleKey(code) {
    if (this.mode === 'title') {
      if (code === 'Digit1') this.selectWeapon('blade');
      if (code === 'Digit2') this.selectWeapon('bow');
      if (code === 'Digit3') this.selectWeapon('shield');
      if (code === 'Enter' || code === 'NumpadEnter') {
        this.audio.ensure();
        this.startRun(this.selectedWeapon);
      }
      return;
    }
    if (this.mode === 'reward') {
      if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3') {
        const boon = this.rewardChoices[Number(code.slice(-1)) - 1];
        if (boon) this.chooseBoon(boon);
      }
      return;
    }
    if (this.mode === 'gameover' || this.mode === 'victory') {
      if (code === 'Enter' || code === 'NumpadEnter') this.startRun(this.weaponId);
    }
  }

  handlePauseKey() {
    if (this.mode === 'playing' || this.mode === 'paused') this.togglePause();
  }

  updateChrome() {
    const runMode = this.mode === 'playing' || this.mode === 'cleared' || this.mode === 'dying' || this.mode === 'paused';
    this.refs.title.classList.toggle('hidden', this.mode !== 'title');
    this.refs.hud.classList.toggle('hidden', !runMode);
    this.refs.touch.classList.toggle('hidden', !(this.mode === 'playing' && this.isTouch));
    this.refs.pause.classList.toggle('hidden', this.mode !== 'paused');
  }

  updateBestLine() {
    if (!this.best) {
      this.refs.bestLine.textContent = 'NO RUN RECORDED — THE GATE AWAITS';
      return;
    }
    const weapon = WEAPONS[this.best.weapon]?.name || 'UNKNOWN ARMS';
    this.refs.bestLine.textContent = `BEST RUN · ${this.best.rooms || 0}/3 CHAMBERS · ${this.best.souls || 0} SOULS · ${weapon.toUpperCase()}`;
  }

  recordBest() {
    const score = (this.stats.rooms || 0) * 10000 + this.souls;
    const oldScore = this.best ? (this.best.rooms || 0) * 10000 + (this.best.souls || 0) : -1;
    if (score > oldScore) {
      this.best = {
        rooms: this.stats.rooms || 0,
        souls: this.souls,
        kills: this.stats.kills,
        time: Math.floor(this.time - this.stats.start),
        weapon: this.weaponId
      };
      saveBest(this.best);
      this.updateBestLine();
    }
  }

  startRun(weaponId) {
    this.weaponId = WEAPONS[weaponId] ? weaponId : 'blade';
    this.weapon = WEAPONS[this.weaponId];
    this.audio.ensure();
    this.audio.select();
    this.player = makePlayer(this.weaponId, WORLD.width / 2, WORLD.height / 2);
    this.souls = 0;
    this.stats = { kills: 0, damage: 0, rooms: 0, start: this.time };
    this.roomIndex = -1;
    this.enemies = [];
    this.projectiles = [];
    this.pendingSpawns = [];
    this.particles = [];
    this.texts = [];
    this.slashes = [];
    this.afterimages = [];
    this.boss = null;
    this.hitstop = 0;
    this.dyingTimer = 0;
    this.clearTimer = 0;
    this.refs.reward.classList.add('hidden');
    this.refs.end.classList.add('hidden');
    this.refs.pause.classList.add('hidden');
    this.buildDashPips();
    this.selectWeapon(this.weaponId);
    this.mode = 'playing';
    this.enterRoom(0);
    this.updateChrome();
  }

  buildDashPips() {
    const p = this.player;
    if (!p) return;
    this.refs.dashPips.innerHTML = '';
    this.dashPipEls = [];
    for (let i = 0; i < p.dashMax; i++) {
      const pip = document.createElement('span');
      pip.className = 'dash-pip';
      this.refs.dashPips.appendChild(pip);
      this.dashPipEls.push(pip);
    }
    this.lastHud.dashMax = p.dashMax;
  }

  enterRoom(index) {
    const room = ROOMS[index];
    if (!room) {
      this.showEnd(true);
      return;
    }
    this.room = room;
    this.roomIndex = index;
    this.waveIndex = 0;
    this.waveActive = false;
    this.waveClearTimer = 0;
    this.clearTimer = 0;
    this.enemies = [];
    this.projectiles = [];
    this.pendingSpawns = [];
    this.slashes = [];
    this.afterimages = [];
    this.boss = null;
    this.arena = buildArena(room);
    this.braziers = [
      { x: WORLD.margin + 58, y: WORLD.margin + 58 },
      { x: WORLD.width - WORLD.margin - 58, y: WORLD.margin + 58 },
      { x: WORLD.margin + 58, y: WORLD.height - WORLD.margin - 58 },
      { x: WORLD.width - WORLD.margin - 58, y: WORLD.height - WORLD.margin - 58 }
    ];

    const p = this.player;
    p.x = WORLD.width / 2;
    p.y = WORLD.height / 2 + 40;
    p.vx = 0;
    p.vy = 0;
    p.invuln = 1.1;
    p.dashCharges = p.dashMax;
    p.dashRecharge = 0;
    p.dashTimer = 0;
    p.attackCd = 0;
    p.combo = 0;
    p.attackAnim = 0;
    p.special = Math.max(p.special, 15);

    this.camera.x = p.x;
    this.camera.y = p.y;
    this.camera.zoom = this.viewZoom;
    this.refs.roomName.textContent = room.name;
    this.refs.bossShell.classList.add('hidden');
    this.toast(room.subtitle.toUpperCase());
    this.startWave(0);
    this.updateHud(true);
  }

  startWave(index) {
    if (!this.room) return;
    this.waveIndex = index;
    const wave = this.room.waves[index];
    if (!wave) return;
    let order = 0;
    for (const [type, count] of wave) {
      for (let i = 0; i < count; i++) {
        const point = type === 'boss'
          ? { x: WORLD.width / 2, y: WORLD.margin + 120 }
          : this.spawnPoint();
        this.pendingSpawns.push({
          type,
          x: point.x,
          y: point.y,
          t: 0.45 + order * 0.17 + rand(0, 0.15),
          max: 0.85,
          seed: rand(0, TAU)
        });
        order++;
      }
    }
    this.waveActive = true;
    this.waveClearTimer = 0;
    this.updateWaveText();
    if (index > 0) this.toast(`WAVE ${index + 1}`);
  }

  spawnPoint() {
    const margin = WORLD.margin + 50;
    const p = this.player;
    for (let attempt = 0; attempt < 30; attempt++) {
      const side = randInt(0, 3);
      let x;
      let y;
      if (side === 0) { x = rand(margin, WORLD.width - margin); y = margin; }
      else if (side === 1) { x = rand(margin, WORLD.width - margin); y = WORLD.height - margin; }
      else if (side === 2) { x = margin; y = rand(margin, WORLD.height - margin); }
      else { x = WORLD.width - margin; y = rand(margin, WORLD.height - margin); }
      if (!p || dist(x, y, p.x, p.y) > 300) return { x, y };
    }
    return { x: rand(margin, WORLD.width - margin), y: margin };
  }

  updateWaveText() {
    if (!this.room) return;
    const remaining = this.enemies.filter((enemy) => !enemy.dead).length + this.pendingSpawns.length;
    this.refs.waveText.textContent = `WAVE ${this.waveIndex + 1} / ${this.room.waves.length} · ${remaining} FOES`;
  }

  loop(now) {
    const raw = (now - this.last) / 1000;
    this.last = now;
    this.acc += Math.min(0.1, Math.max(0, raw));
    let steps = 0;
    while (this.acc >= 1 / 60 && steps < 5) {
      this.update(1 / 60);
      this.acc -= 1 / 60;
      steps++;
    }
    drawWorld(this);
    requestAnimationFrame(this.loop);
  }

  update(dt) {
    this.time += dt;
    this.updateEffects(dt);

    if (this.mode === 'title') {
      this.titleTime += dt;
      const t = this.titleTime;
      this.camera.x = WORLD.width / 2 + Math.sin(t * 0.075) * 70;
      this.camera.y = WORLD.height / 2 + Math.cos(t * 0.052) * 36;
      this.camera.zoom = damp(this.camera.zoom, this.viewZoom * 0.94, 1.5, dt);
      this.updateAmbient(dt);
      this.updateParticles(dt);
      this.updateTexts(dt);
      return;
    }

    if (this.mode === 'paused' || this.mode === 'reward' || this.mode === 'gameover' || this.mode === 'victory' || this.mode === 'transition') {
      this.updateAmbient(dt * 0.35);
      this.updateParticles(dt);
      this.updateTexts(dt);
      this.updateCamera(dt);
      this.updateHud();
      return;
    }

    if (this.mode === 'cleared') {
      this.clearTimer -= dt;
      this.updateAmbient(dt * 0.4);
      this.updateParticles(dt);
      this.updateTexts(dt);
      this.updateCamera(dt);
      this.updateHud();
      if (this.clearTimer <= 0) {
        if (this.roomIndex >= ROOMS.length - 1) this.showEnd(true);
        else this.showReward();
      }
      return;
    }

    if (this.mode === 'dying') {
      this.dyingTimer -= dt;
      this.updateAmbient(dt * 0.5);
      this.updateParticles(dt);
      this.updateTexts(dt);
      this.updateCamera(dt);
      this.updateHud();
      if (this.dyingTimer <= 0) this.showEnd(false);
      return;
    }

    if (this.hitstop > 0) {
      this.hitstop -= dt;
      this.updateParticles(dt * 0.35);
      this.updateTexts(dt * 0.35);
      this.updateCamera(dt);
      this.updateHud();
      return;
    }

    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updatePendingSpawns(dt);
    this.updateParticles(dt);
    this.updateTexts(dt);
    this.updateAmbient(dt);
    this.updateCamera(dt);
    this.updateWave(dt);
    this.updateHud();
  }

  updateEffects(dt) {
    for (const slash of this.slashes) slash.life -= dt;
    this.slashes = this.slashes.filter((slash) => slash.life > 0);
    for (const ghost of this.afterimages) ghost.life -= dt;
    this.afterimages = this.afterimages.filter((ghost) => ghost.life > 0);
  }

  updatePlayer(dt) {
    const p = this.player;
    if (!p) return;

    p.invuln = Math.max(0, p.invuln - dt);
    p.attackCd = Math.max(0, p.attackCd - dt);
    p.attackAnim = Math.max(0, p.attackAnim - dt * 5.2);
    p.hitFlash = Math.max(0, p.hitFlash - dt);
    p.comboTimer -= dt;
    if (p.comboTimer <= 0) p.combo = 0;

    if (p.dashCharges < p.dashMax) {
      p.dashRecharge += dt;
      if (p.dashRecharge >= PLAYER.dashRecharge) {
        p.dashCharges++;
        p.dashRecharge = 0;
      }
    } else {
      p.dashRecharge = 0;
    }

    const move = this.input.getMove();
    const aim = this.getAimAngle(move);

    if (this.input.consume('dash') && p.dashTimer <= 0 && p.dashCharges > 0) {
      const dir = Math.hypot(move.x, move.y) > 0.1 ? normalize(move.x, move.y) : { x: Math.cos(p.facing), y: Math.sin(p.facing) };
      p.dashDir = dir;
      p.dashTimer = PLAYER.dashTime;
      p.invuln = Math.max(p.invuln, PLAYER.dashTime + 0.07);
      p.dashCharges--;
      if (p.dashCharges === p.dashMax - 1) p.dashRecharge = 0;
      p.attackAnim = Math.max(p.attackAnim, 0.4);
      this.audio.dash();
      this.addShake(3);
      this.afterimages.push({ x: p.x, y: p.y, facing: p.facing, life: 0.32, maxLife: 0.32, color: p.weapon.color });
      this.sparkBurst(p.x, p.y, '#9fe8ff', 8, 150);
    }

    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      p.vx = p.dashDir.x * PLAYER.dashSpeed;
      p.vy = p.dashDir.y * PLAYER.dashSpeed;
      if (Math.random() < 0.8) {
        this.afterimages.push({ x: p.x, y: p.y, facing: p.facing, life: 0.24, maxLife: 0.24, color: p.weapon.color });
        this.particles.push({ type: 'ember', x: p.x, y: p.y, vx: rand(-30, 30), vy: rand(-30, 10), life: rand(0.2, 0.45), maxLife: 0.45, size: rand(1, 2.2), color: '#9fe8ff', drag: 0.94, additive: true });
      }
    } else {
      const targetVx = move.x * PLAYER.speed * p.speedMul;
      const targetVy = move.y * PLAYER.speed * p.speedMul;
      p.vx = damp(p.vx, targetVx, 16, dt);
      p.vy = damp(p.vy, targetVy, 16, dt);
      if (Math.hypot(move.x, move.y) > 0.1) p.facing = angleLerp(p.facing, aim, 1 - Math.exp(-16 * dt));
      else p.facing = angleLerp(p.facing, aim, 1 - Math.exp(-8 * dt));
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.x = clamp(p.x, WORLD.margin + p.radius, WORLD.width - WORLD.margin - p.radius);
    p.y = clamp(p.y, WORLD.margin + p.radius, WORLD.height - WORLD.margin - p.radius);

    if (this.input.held.attack && p.attackCd <= 0 && p.dashTimer <= 0) this.attack(aim);
    if (this.input.consume('special') && p.dashTimer <= 0) this.useSpecial(aim);
  }

  getAimAngle(move) {
    const p = this.player;
    const useTouchAim = this.isTouch || this.input.touchMove.active || !this.input.mouse.inside;
    if (useTouchAim) {
      const target = this.nearestEnemy(p.x, p.y, p.weaponId === 'bow' ? 900 : 520);
      if (target) return Math.atan2(target.y - p.y, target.x - p.x);
      if (Math.hypot(move.x, move.y) > 0.1) return Math.atan2(move.y, move.x);
      return p.facing;
    }
    const world = this.screenToWorld(this.input.mouse.x, this.input.mouse.y);
    return Math.atan2(world.y - p.y, world.x - p.x);
  }

  nearestEnemy(x, y, maxDistance = 900) {
    let best = null;
    let bestD = maxDistance;
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.spawnTimer > 0) continue;
      const d = dist(x, y, enemy.x, enemy.y);
      if (d < bestD) {
        bestD = d;
        best = enemy;
      }
    }
    return best;
  }

  attack(angle) {
    const p = this.player;
    const weapon = p.weapon;
    p.attackCd = weapon.attackCd / (1 + p.attackSpeedMul);
    p.attackAnim = 1;
    p.comboTimer = 0.9;

    if (p.weaponId === 'bow') {
      const speed = weapon.projectileSpeed;
      this.projectiles.push({
        kind: 'arrow',
        x: p.x + Math.cos(angle) * 22,
        y: p.y + Math.sin(angle) * 22,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle,
        radius: 7,
        damage: weapon.damage * p.damageMul,
        pierce: weapon.pierce,
        life: 1.35,
        hit: new Set(),
        color: weapon.color
      });
      p.vx -= Math.cos(angle) * 22;
      p.vy -= Math.sin(angle) * 22;
      this.audio.shoot();
      this.addShake(1.4);
      return;
    }

    if (p.weaponId === 'blade') {
      p.combo = (p.combo % 3) + 1;
      const heavy = p.combo === 3;
      const range = weapon.range * p.rangeMul * (heavy ? 1.18 : 1);
      const damage = weapon.damage * p.damageMul * (heavy ? 1.45 : 1);
      this.slashes.push({
        x: p.x, y: p.y, angle, arc: weapon.arc * (heavy ? 1.16 : 1), radius: range,
        life: 0.24, maxLife: 0.24, color: heavy ? '#ffe4a8' : weapon.color, dir: p.combo % 2 === 0 ? -1 : 1
      });
      const hits = this.hitArc(angle, range, weapon.arc * (heavy ? 1.16 : 1), damage, 210, heavy ? 0.035 : 0.018);
      p.vx += Math.cos(angle) * (heavy ? 150 : 95);
      p.vy += Math.sin(angle) * (heavy ? 150 : 95);
      if (heavy) this.addShake(4.5);
      this.audio.slash();
      if (hits > 0) this.audio.impact();
      return;
    }

    p.combo = (p.combo % 2) + 1;
    const range = weapon.range * p.rangeMul;
    this.slashes.push({
      x: p.x, y: p.y, angle, arc: weapon.arc, radius: range,
      life: 0.2, maxLife: 0.2, color: weapon.color, dir: p.combo === 1 ? 1 : -1, heavy: true
    });
    const hits = this.hitArc(angle, range, weapon.arc, weapon.damage * p.damageMul, 300, 0.024);
    this.audio.slash();
    if (hits > 0) this.audio.impact();
  }

  hitArc(angle, radius, arc, damage, knockback, hitstop = 0) {
    const p = this.player;
    let hits = 0;
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.spawnTimer > 0) continue;
      const d = dist(p.x, p.y, enemy.x, enemy.y);
      if (d > radius + enemy.radius) continue;
      const toward = Math.atan2(enemy.y - p.y, enemy.x - p.x);
      if (Math.abs(angleDiff(angle, toward)) > arc / 2) continue;
      this.damageEnemy(enemy, damage, p.x, p.y, { knockback, special: 4 });
      hits++;
    }
    if (hits > 0 && hitstop > 0) this.hitstop = Math.max(this.hitstop, hitstop);
    return hits;
  }

  useSpecial(angle) {
    const p = this.player;
    const weapon = p.weapon;
    const cost = weapon.specialCost * p.specialCostMul;
    if (p.special < cost) {
      this.toast('SPECIAL NOT READY', 800);
      return;
    }
    p.special = Math.max(0, p.special - cost);
    p.attackAnim = 1;
    p.attackCd = Math.max(p.attackCd, 0.18);
    const power = p.specialDamageMul;

    if (p.weaponId === 'blade') {
      const radius = weapon.specialRadius * p.rangeMul;
      this.slashes.push({ x: p.x, y: p.y, angle: 0, arc: TAU, radius, life: 0.42, maxLife: 0.42, color: '#ffe4a8', dir: 1, full: true });
      this.hitArc(0, radius, TAU, weapon.specialDamage * p.damageMul * power, 380, 0.055);
      this.ringEffect(p.x, p.y, radius * 0.5, radius * 1.2, '#ffcf7a', 0.42);
      this.sparkBurst(p.x, p.y, '#ffe4a8', 26, 320);
      this.addShake(10);
      this.audio.special();
      this.audio.impact();
      p.invuln = Math.max(p.invuln, 0.22);
      return;
    }

    if (p.weaponId === 'bow') {
      const count = weapon.specialCount;
      const spread = 0.44;
      for (let i = 0; i < count; i++) {
        const a = angle + lerp(-spread, spread, count === 1 ? 0.5 : i / (count - 1));
        this.projectiles.push({
          kind: 'arrow',
          x: p.x + Math.cos(a) * 20,
          y: p.y + Math.sin(a) * 20,
          vx: Math.cos(a) * weapon.projectileSpeed * 1.06,
          vy: Math.sin(a) * weapon.projectileSpeed * 1.06,
          angle: a,
          radius: 7,
          damage: weapon.specialDamage * p.damageMul * power,
          pierce: 0,
          life: 1.2,
          hit: new Set(),
          color: '#d8f7ff',
          special: true
        });
      }
      this.sparkBurst(p.x, p.y, '#9fe8ff', 18, 240);
      this.addShake(5);
      this.audio.special();
      this.audio.shoot();
      return;
    }

    this.projectiles.push({
      kind: 'shield',
      x: p.x + Math.cos(angle) * 24,
      y: p.y + Math.sin(angle) * 24,
      vx: Math.cos(angle) * 760,
      vy: Math.sin(angle) * 760,
      angle,
      radius: 18,
      damage: weapon.specialDamage * p.damageMul * power,
      life: 2.8,
      travel: 0,
      maxTravel: weapon.specialRange * p.rangeMul,
      phase: 'out',
      spin: 0,
      hit: new Set(),
      color: '#ffb08a'
    });
    this.sparkBurst(p.x, p.y, '#ffb08a', 16, 220);
    this.addShake(6);
    this.audio.special();
  }

  damageEnemy(enemy, amount, sourceX, sourceY, options = {}) {
    if (enemy.dead || enemy.spawnTimer > 0) return;
    enemy.hp -= amount;
    enemy.hitFlash = 0.16;
    this.stats.damage += amount;
    this.addSpecial(options.special ?? 4);
    const color = enemy.type === 'boss' ? '#ffd2b0' : enemy.color;
    this.sparkBurst(enemy.x, enemy.y, color, enemy.type === 'boss' ? 5 : 3, 130);
    this.addText(enemy.x + rand(-8, 8), enemy.y - enemy.radius - 8, Math.round(amount), color, amount >= 30 ? 1.25 : 1);

    const knockback = options.knockback ?? 0;
    if (knockback > 0 && enemy.type !== 'boss') {
      const dir = normalize(enemy.x - sourceX, enemy.y - sourceY);
      enemy.kx += dir.x * knockback;
      enemy.ky += dir.y * knockback;
    }

    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  killEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    enemy.deathTimer = enemy.type === 'boss' ? 1.4 : 0.4;
    this.stats.kills++;
    this.souls += enemy.souls;
    this.addSpecial(7);
    if (this.player && this.player.lifesteal > 0) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.lifesteal);
      this.addText(this.player.x, this.player.y - 30, `+${this.player.lifesteal}`, '#6ff2d0', 0.85);
    }
    this.sparkBurst(enemy.x, enemy.y, enemy.color, enemy.type === 'boss' ? 60 : 20, enemy.type === 'boss' ? 480 : 260);
    this.ringEffect(enemy.x, enemy.y, 8, enemy.radius * (enemy.type === 'boss' ? 4.2 : 2.4), enemy.color, 0.5);
    this.addShake(enemy.type === 'boss' ? 18 : enemy.type === 'brute' ? 7 : 2.5);
    this.audio.kill();
    if (enemy.type === 'boss') {
      this.audio.boss();
      this.hitstop = Math.max(this.hitstop, 0.12);
      this.toast('THE WARDEN FALLS', 1800);
    }
  }

  hurtPlayer(amount, sourceX, sourceY, options = {}) {
    const p = this.player;
    if (!p || this.mode !== 'playing') return;
    if (p.invuln > 0 || p.dashTimer > 0) return;
    const reduced = amount * (1 - p.damageReduction);
    p.hp -= reduced;
    p.invuln = PLAYER.invulnTime;
    p.hitFlash = 0.3;
    this.addSpecial(3);
    const dir = normalize(p.x - sourceX, p.y - sourceY);
    p.vx += dir.x * (options.knockback ?? 180);
    p.vy += dir.y * (options.knockback ?? 180);
    this.addShake(9);
    this.hitstop = Math.max(this.hitstop, 0.045);
    this.sparkBurst(p.x, p.y, '#ff5c6a', 18, 250);
    this.addText(p.x, p.y - 30, `-${Math.round(reduced)}`, '#ff7b86', 1.2);
    this.audio.hurt();
    this.flashDamage();
    if (navigator.vibrate) navigator.vibrate(35);
    if (p.hp <= 0) {
      p.hp = 0;
      this.die();
    }
  }

  die() {
    this.mode = 'dying';
    this.dyingTimer = 1.35;
    this.addShake(20);
    this.audio.death();
    this.sparkBurst(this.player.x, this.player.y, '#ffcf7a', 40, 360);
    this.updateChrome();
  }

  flashDamage() {
    this.refs.damageFlash.classList.add('on');
    clearTimeout(this.hurtFlashTimer);
    this.hurtFlashTimer = setTimeout(() => this.refs.damageFlash.classList.remove('on'), 90);
  }

  addSpecial(amount) {
    const p = this.player;
    if (!p) return;
    p.special = clamp(p.special + amount * p.specialGain, 0, 100);
  }

  updateEnemies(dt) {
    const p = this.player;
    for (const enemy of this.enemies) {
      if (enemy.dead) {
        enemy.deathTimer -= dt;
        continue;
      }
      if (enemy.spawnTimer > 0) {
        enemy.spawnTimer -= dt;
        continue;
      }
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.attackCd -= dt;
      enemy.contactCd = Math.max(0, enemy.contactCd - dt);
      enemy.facing = Math.atan2(p.y - enemy.y, p.x - enemy.x);

      if (enemy.type === 'shade') this.updateShade(enemy, dt);
      else if (enemy.type === 'wisp') this.updateWisp(enemy, dt);
      else if (enemy.type === 'brute') this.updateBrute(enemy, dt);
      else if (enemy.type === 'boss') this.updateBoss(enemy, dt);

      enemy.x += (enemy.vx + enemy.kx) * dt;
      enemy.y += (enemy.vy + enemy.ky) * dt;
      enemy.kx *= Math.pow(0.0015, dt);
      enemy.ky *= Math.pow(0.0015, dt);
      enemy.x = clamp(enemy.x, WORLD.margin + enemy.radius, WORLD.width - WORLD.margin - enemy.radius);
      enemy.y = clamp(enemy.y, WORLD.margin + enemy.radius, WORLD.height - WORLD.margin - enemy.radius);
    }

    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (a.dead || a.spawnTimer > 0) continue;
      for (let j = i + 1; j < this.enemies.length; j++) {
        const b = this.enemies[j];
        if (b.dead || b.spawnTimer > 0) continue;
        const min = a.radius + b.radius;
        const d = dist(a.x, a.y, b.x, b.y);
        if (d > 0.01 && d < min) {
          const push = (min - d) * 0.5;
          const nx = (b.x - a.x) / d;
          const ny = (b.y - a.y) / d;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }

    if (p) {
      for (const enemy of this.enemies) {
        if (enemy.dead || enemy.spawnTimer > 0 || enemy.type === 'boss') continue;
        const min = enemy.radius + p.radius;
        const d = dist(enemy.x, enemy.y, p.x, p.y);
        if (d > 0.01 && d < min) {
          const push = (min - d) * 0.35;
          p.x += ((p.x - enemy.x) / d) * push;
          p.y += ((p.y - enemy.y) / d) * push;
        }
      }
    }

    this.enemies = this.enemies.filter((enemy) => !enemy.dead || enemy.deathTimer > 0);
  }

  updateShade(enemy, dt) {
    const p = this.player;
    const d = dist(enemy.x, enemy.y, p.x, p.y);
    enemy.vx = 0;
    enemy.vy = 0;
    if (enemy.state === 'chase') {
      if (d > 82) {
        const dir = normalize(p.x - enemy.x, p.y - enemy.y);
        enemy.vx = dir.x * enemy.speed;
        enemy.vy = dir.y * enemy.speed;
      }
      if (d < 108 && enemy.attackCd <= 0) {
        enemy.state = 'windup';
        enemy.timer = 0.42;
        enemy.lockAngle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
        enemy.attackCd = 1.55;
      }
    } else if (enemy.state === 'windup') {
      enemy.timer -= dt;
      enemy.lockAngle = angleLerp(enemy.lockAngle, Math.atan2(p.y - enemy.y, p.x - enemy.x), 1 - Math.exp(-4 * dt));
      if (enemy.timer <= 0) {
        enemy.state = 'lunge';
        enemy.timer = 0.23;
        enemy.lungeDir = { x: Math.cos(enemy.lockAngle), y: Math.sin(enemy.lockAngle) };
        enemy.hitDone = false;
        this.audio.dash();
      }
    } else if (enemy.state === 'lunge') {
      enemy.timer -= dt;
      enemy.vx = enemy.lungeDir.x * 560;
      enemy.vy = enemy.lungeDir.y * 560;
      if (!enemy.hitDone && d < enemy.radius + p.radius + 10) {
        enemy.hitDone = true;
        this.hurtPlayer(enemy.damage, enemy.x, enemy.y, { knockback: 210 });
      }
      if (enemy.timer <= 0) {
        enemy.state = 'recover';
        enemy.timer = 0.55;
      }
    } else if (enemy.state === 'recover') {
      enemy.timer -= dt;
      if (enemy.timer <= 0) enemy.state = 'chase';
    }
  }

  updateWisp(enemy, dt) {
    const p = this.player;
    const d = dist(enemy.x, enemy.y, p.x, p.y);
    const dir = normalize(p.x - enemy.x, p.y - enemy.y);
    const strafe = { x: -dir.y, y: dir.x };
    enemy.vx = 0;
    enemy.vy = 0;
    if (enemy.state === 'windup') {
      enemy.timer -= dt;
      enemy.lockAngle = angleLerp(enemy.lockAngle, Math.atan2(p.y - enemy.y, p.x - enemy.x), 1 - Math.exp(-7 * dt));
      if (enemy.timer <= 0) {
        this.fireEnemyOrb(enemy, enemy.lockAngle, 1);
        enemy.state = 'chase';
      }
      return;
    }

    if (d < 235) {
      enemy.vx = -dir.x * enemy.speed;
      enemy.vy = -dir.y * enemy.speed;
    } else if (d > 345) {
      enemy.vx = dir.x * enemy.speed;
      enemy.vy = dir.y * enemy.speed;
    }
    const drift = Math.sin(this.time * 1.3 + enemy.seed) * 0.55;
    enemy.vx += strafe.x * enemy.speed * drift;
    enemy.vy += strafe.y * enemy.speed * drift;

    if (enemy.attackCd <= 0 && d < 640) {
      enemy.state = 'windup';
      enemy.timer = 0.58;
      enemy.lockAngle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
      enemy.attackCd = rand(2.0, 2.8);
    }
  }

  updateBrute(enemy, dt) {
    const p = this.player;
    const d = dist(enemy.x, enemy.y, p.x, p.y);
    enemy.vx = 0;
    enemy.vy = 0;
    if (enemy.state === 'chase') {
      const dir = normalize(p.x - enemy.x, p.y - enemy.y);
      enemy.vx = dir.x * enemy.speed;
      enemy.vy = dir.y * enemy.speed;
      if (d < 430 && enemy.attackCd <= 0) {
        enemy.state = 'windup';
        enemy.timer = 0.78;
        enemy.lockAngle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
        enemy.attackCd = 2.8;
        enemy.hitDone = false;
      }
    } else if (enemy.state === 'windup') {
      enemy.timer -= dt;
      enemy.lockAngle = angleLerp(enemy.lockAngle, Math.atan2(p.y - enemy.y, p.x - enemy.x), 1 - Math.exp(-2.5 * dt));
      if (enemy.timer <= 0) {
        enemy.state = 'charge';
        enemy.timer = 0.65;
        enemy.lungeDir = { x: Math.cos(enemy.lockAngle), y: Math.sin(enemy.lockAngle) };
        this.audio.dash();
        this.addShake(3);
      }
    } else if (enemy.state === 'charge') {
      enemy.timer -= dt;
      enemy.vx = enemy.lungeDir.x * 780;
      enemy.vy = enemy.lungeDir.y * 780;
      if (!enemy.hitDone && d < enemy.radius + p.radius + 8) {
        enemy.hitDone = true;
        this.hurtPlayer(enemy.damage, enemy.x, enemy.y, { knockback: 300 });
        this.addShake(6);
      }
      if (enemy.timer <= 0) {
        enemy.state = 'recover';
        enemy.timer = 0.95;
      }
    } else if (enemy.state === 'recover') {
      enemy.timer -= dt;
      if (enemy.timer <= 0) enemy.state = 'chase';
    }
  }

  updateBoss(enemy, dt) {
    const p = this.player;
    const d = dist(enemy.x, enemy.y, p.x, p.y);
    if (!enemy.enraged && enemy.hp <= enemy.maxHp * 0.5) {
      enemy.enraged = true;
      enemy.speed *= 1.3;
      this.toast('THE WARDEN RAGES', 1700);
      this.addShake(14);
      this.audio.boss();
      for (let i = 0; i < 16; i++) this.fireEnemyOrb(enemy, (i / 16) * TAU, 1.15);
    }

    if (enemy.contactCd <= 0 && d < enemy.radius + p.radius + 4) {
      enemy.contactCd = 0.9;
      this.hurtPlayer(enemy.damage, enemy.x, enemy.y, { knockback: 320 });
    }

    if (enemy.action) {
      const action = enemy.action;
      action.t -= dt;
      enemy.vx = 0;
      enemy.vy = 0;
      if (action.t <= 0) {
        if (action.type === 'slam') {
          const radius = 132;
          const target = action.target;
          this.ringEffect(target.x, target.y, 18, radius * 1.1, '#ff7a3d', 0.55);
          this.sparkBurst(target.x, target.y, '#ff9a4c', 30, 340);
          this.addShake(12);
          if (dist(p.x, p.y, target.x, target.y) < radius + p.radius) this.hurtPlayer(26, target.x, target.y, { knockback: 420 });
        } else if (action.type === 'radial') {
          const count = enemy.enraged ? 20 : 14;
          for (let i = 0; i < count; i++) this.fireEnemyOrb(enemy, (i / count) * TAU + this.time * 0.3, 1);
          this.addShake(7);
          this.audio.special();
        } else if (action.type === 'summon') {
          const types = ['shade', 'wisp', 'shade'];
          for (let i = 0; i < types.length; i++) {
            const angle = rand(0, TAU);
            const point = {
              x: clamp(enemy.x + Math.cos(angle) * rand(140, 250), WORLD.margin + 60, WORLD.width - WORLD.margin - 60),
              y: clamp(enemy.y + Math.sin(angle) * rand(140, 250), WORLD.margin + 60, WORLD.height - WORLD.margin - 60)
            };
            this.pendingSpawns.push({ type: types[i], x: point.x, y: point.y, t: 0.35 + i * 0.15, max: 0.7, seed: rand(0, TAU) });
          }
          this.audio.spawn();
        }
        enemy.action = null;
        enemy.attackCd = enemy.enraged ? 1.55 : 2.35;
      }
      return;
    }

    enemy.attackCd -= dt;
    const dir = normalize(p.x - enemy.x, p.y - enemy.y);
    if (d > 200) {
      enemy.vx = dir.x * enemy.speed;
      enemy.vy = dir.y * enemy.speed;
    } else if (d < 150) {
      enemy.vx = -dir.x * enemy.speed * 0.5;
      enemy.vy = -dir.y * enemy.speed * 0.5;
    }

    if (enemy.attackCd <= 0) {
      const sequence = ['slam', 'radial', 'summon'];
      const type = sequence[enemy.actionIndex % sequence.length];
      enemy.actionIndex++;
      let windup = 0.9;
      if (type === 'slam') windup = 0.95;
      if (type === 'radial') windup = 0.8;
      if (type === 'summon') windup = 1.0;
      enemy.action = { type, t: windup, max: windup, target: { x: p.x, y: p.y } };
      enemy.attackCd = 2.35;
      this.audio.spawn();
    }
  }

  fireEnemyOrb(enemy, angle, speedMul = 1) {
    this.projectiles.push({
      kind: 'orb',
      x: enemy.x + Math.cos(angle) * (enemy.radius + 6),
      y: enemy.y + Math.sin(angle) * (enemy.radius + 6),
      vx: Math.cos(angle) * 235 * speedMul,
      vy: Math.sin(angle) * 235 * speedMul,
      radius: enemy.type === 'boss' ? 10 : 7,
      damage: enemy.type === 'boss' ? 12 : enemy.damage,
      life: 4.2,
      color: enemy.type === 'boss' ? '#ff7a3d' : enemy.color
    });
    this.sparkBurst(enemy.x, enemy.y, enemy.color, 2, 90);
  }

  updateProjectiles(dt) {
    const p = this.player;
    for (const proj of this.projectiles) {
      proj.life -= dt;
      if (proj.kind === 'shield') {
        proj.spin += dt * 14;
        if (proj.phase === 'out') {
          proj.travel += Math.hypot(proj.vx, proj.vy) * dt;
          if (proj.travel >= proj.maxTravel) proj.phase = 'return';
        } else {
          const dir = normalize(p.x - proj.x, p.y - proj.y);
          proj.vx = dir.x * 860;
          proj.vy = dir.y * 860;
          if (dist(proj.x, proj.y, p.x, p.y) < 34) {
            proj.life = 0;
            this.sparkBurst(proj.x, proj.y, proj.color, 8, 150);
          }
        }
      }

      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;

      if (proj.x < WORLD.margin + 8 || proj.x > WORLD.width - WORLD.margin - 8 || proj.y < WORLD.margin + 8 || proj.y > WORLD.height - WORLD.margin - 8) {
        proj.life = 0;
        this.sparkBurst(proj.x, proj.y, proj.color, 4, 80);
        continue;
      }

      if (proj.kind === 'orb') {
        if (dist(proj.x, proj.y, p.x, p.y) < proj.radius + p.radius) {
          this.hurtPlayer(proj.damage, proj.x, proj.y, { knockback: 190 });
          proj.life = 0;
          this.sparkBurst(proj.x, proj.y, proj.color, 10, 170);
        }
        continue;
      }

      for (const enemy of this.enemies) {
        if (enemy.dead || enemy.spawnTimer > 0) continue;
        if (proj.hit.has(enemy)) continue;
        if (dist(proj.x, proj.y, enemy.x, enemy.y) > proj.radius + enemy.radius) continue;
        proj.hit.add(enemy);
        this.damageEnemy(enemy, proj.damage, proj.x, proj.y, { knockback: proj.kind === 'shield' ? 260 : 90, special: 4 });
        this.sparkBurst(proj.x, proj.y, proj.color, 8, 180);
        if (proj.kind === 'arrow') {
          if (proj.pierce > 0) proj.pierce--;
          else proj.life = 0;
        }
        if (proj.kind === 'shield') this.addShake(2);
        break;
      }
    }
    this.projectiles = this.projectiles.filter((proj) => proj.life > 0);
  }

  updatePendingSpawns(dt) {
    for (let i = this.pendingSpawns.length - 1; i >= 0; i--) {
      const spawn = this.pendingSpawns[i];
      spawn.t -= dt;
      if (spawn.t <= 0) {
        const enemy = makeEnemy(spawn.type, spawn.x, spawn.y);
        if (spawn.type === 'boss') {
          enemy.spawnTimer = 1.25;
          this.boss = enemy;
          this.audio.boss();
          this.toast('THE GATE WARDEN', 2200);
          this.refs.bossShell.classList.remove('hidden');
          this.refs.bossName.textContent = ENEMIES.boss.name.toUpperCase();
        }
        this.enemies.push(enemy);
        this.pendingSpawns.splice(i, 1);
        this.sparkBurst(spawn.x, spawn.y, ENEMIES[spawn.type].color, spawn.type === 'boss' ? 34 : 14, 220);
        this.ringEffect(spawn.x, spawn.y, 10, spawn.type === 'boss' ? 100 : 42, ENEMIES[spawn.type].color, 0.55);
        this.audio.spawn();
      }
    }
  }

  updateWave(dt) {
    if (!this.room) return;
    if (!this.waveActive) {
      if (this.waveClearTimer > 0) {
        this.waveClearTimer -= dt;
        if (this.waveClearTimer <= 0) {
          if (this.waveIndex + 1 < this.room.waves.length) this.startWave(this.waveIndex + 1);
          else this.clearRoom();
        }
      }
      return;
    }

    const alive = this.enemies.some((enemy) => !enemy.dead);
    if (!alive && this.pendingSpawns.length === 0) {
      this.waveActive = false;
      this.waveClearTimer = 1.15;
      this.refs.waveText.textContent = 'WAVE CLEARED';
      this.audio.clear();
    }
  }

  clearRoom() {
    if (!this.room) return;
    this.mode = 'cleared';
    this.clearTimer = 1.55;
    this.clearBonus = 12 + this.roomIndex * 9;
    this.souls += this.clearBonus;
    this.stats.rooms = this.roomIndex + 1;
    this.audio.clear();
    this.addShake(8);
    this.toast('ROOM CLEARED');
    this.updateChrome();
  }

  showReward() {
    const p = this.player;
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.12);
    p.special = Math.min(100, p.special + 20);
    this.rewardChoices = pickBoons(3);
    this.refs.rewardKicker.textContent = `${this.room.subtitle.toUpperCase()} CLEARED`;
    this.refs.rewardTitle.textContent = 'CHOOSE A BOON';
    this.refs.rewardSub.textContent = 'The dark offers power. Take one.';
    this.refs.rewardSouls.textContent = `+${this.clearBonus} SOULS · LIFE RESTORED`;
    this.refs.boonGrid.innerHTML = '';
    this.rewardChoices.forEach((boon, index) => {
      const card = document.createElement('button');
      card.className = 'boon-card';
      card.dataset.index = String(index);
      card.style.setProperty('--boon', boon.color);
      card.innerHTML = `<span class="boon-icon"><svg><use href="#${boon.icon}"></use></svg></span><span class="boon-copy"><span class="boon-name">${boon.name}</span><span class="boon-desc">${boon.desc}</span><span class="boon-rarity">${boon.rarity}</span></span>`;
      this.refs.boonGrid.appendChild(card);
    });
    this.mode = 'reward';
    this.refs.reward.classList.remove('hidden');
    this.audio.boon();
    this.updateChrome();
  }

  chooseBoon(boon) {
    if (this.mode !== 'reward') return;
    this.applyBoon(boon);
    this.audio.boon();
    this.refs.reward.classList.add('hidden');
    this.mode = 'transition';
    this.refs.fade.classList.add('on');
    this.updateChrome();
    setTimeout(() => {
      this.enterRoom(this.roomIndex + 1);
      this.mode = 'playing';
      this.refs.fade.classList.remove('on');
      this.updateChrome();
    }, 420);
  }

  applyBoon(boon) {
    const p = this.player;
    const effect = boon.effect;
    p.boons.push(boon);
    if (effect.type === 'maxHp') {
      p.maxHp += effect.value;
      p.hp = Math.min(p.maxHp, p.hp + effect.value);
    } else if (effect.type === 'damage') {
      p.damageMul += effect.value;
    } else if (effect.type === 'speed') {
      p.speedMul += effect.value;
    } else if (effect.type === 'dashCharge') {
      p.dashMax += effect.value;
      p.dashCharges += effect.value;
      this.buildDashPips();
    } else if (effect.type === 'specialGain') {
      p.specialGain += effect.value;
    } else if (effect.type === 'lifesteal') {
      p.lifesteal += effect.value;
    } else if (effect.type === 'armor') {
      p.damageReduction = 1 - (1 - p.damageReduction) * (1 - effect.value);
    } else if (effect.type === 'attackSpeed') {
      p.attackSpeedMul += effect.value;
    } else if (effect.type === 'range') {
      p.rangeMul += effect.value;
    } else if (effect.type === 'specialPower') {
      p.specialCostMul *= 1 - effect.value;
      p.specialDamageMul += effect.value;
    }
    this.toast(`${boon.name.toUpperCase()} TAKEN`, 1500);
  }

  showEnd(victory) {
    this.mode = victory ? 'victory' : 'gameover';
    this.recordBest();
    const elapsed = Math.floor(this.time - this.stats.start);
    this.refs.endKicker.textContent = victory ? 'THE GATE IS BROKEN' : 'THE GATE CLAIMS YOU';
    this.refs.endTitle.textContent = victory ? 'VICTORY' : 'YOU FELL';
    this.refs.endSub.textContent = victory ? 'The embers part. For one breath, the dark is quiet.' : 'The embers remember every attempt. Rise again.';
    this.refs.endStats.innerHTML = `<div class="stat-box"><span class="stat-value">${this.stats.rooms}/3</span><span class="stat-label">Chambers</span></div><div class="stat-box"><span class="stat-value">${this.stats.kills}</span><span class="stat-label">Kills</span></div><div class="stat-box"><span class="stat-value">${this.souls}</span><span class="stat-label">Souls</span></div><div class="stat-box"><span class="stat-value">${formatTime(elapsed)}</span><span class="stat-label">Time</span></div>`;
    this.refs.again.textContent = victory ? 'PLAY AGAIN' : 'TRY AGAIN';
    this.refs.end.classList.remove('hidden');
    this.refs.reward.classList.add('hidden');
    this.refs.pause.classList.add('hidden');
    if (victory) this.audio.clear();
    this.updateChrome();
  }

  returnToTitle() {
    this.mode = 'title';
    this.titleTime = 0;
    this.player = null;
    this.room = null;
    this.boss = null;
    this.enemies = [];
    this.projectiles = [];
    this.pendingSpawns = [];
    this.particles = [];
    this.texts = [];
    this.slashes = [];
    this.afterimages = [];
    this.refs.pause.classList.add('hidden');
    this.refs.reward.classList.add('hidden');
    this.refs.end.classList.add('hidden');
    this.refs.bossShell.classList.add('hidden');
    this.refs.fade.classList.remove('on');
    this.prepareTitleArena();
    this.updateBestLine();
    this.updateChrome();
  }

  pause() {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    this.input.clearActions();
    this.updateChrome();
  }

  resume() {
    if (this.mode !== 'paused') return;
    this.mode = 'playing';
    this.updateChrome();
  }

  togglePause() {
    if (this.mode === 'playing') this.pause();
    else if (this.mode === 'paused') this.resume();
  }

  updateHud(force = false) {
    const p = this.player;
    if (!p) return;
    const hud = this.lastHud;
    const hp = Math.ceil(p.hp);
    const maxHp = Math.round(p.maxHp);
    if (force || hp !== hud.hp || maxHp !== hud.maxHp) {
      hud.hp = hp;
      hud.maxHp = maxHp;
      this.refs.hpFill.style.transform = `scaleX(${clamp(p.hp / p.maxHp, 0, 1)})`;
      this.refs.hpText.textContent = `${hp} / ${maxHp}`;
    }
    const special = Math.round(p.special);
    if (force || special !== hud.special) {
      hud.special = special;
      this.refs.specialFill.style.width = `${special}%`;
      const cost = p.weapon.specialCost * p.specialCostMul;
      this.refs.specialBtn.classList.toggle('ready', p.special >= cost);
    }
    if (force || p.dashMax !== hud.dashMax) this.buildDashPips();
    if (force || p.dashCharges !== hud.dashCharges || Math.round(p.dashRecharge * 20) !== hud.dashRecharge) {
      hud.dashCharges = p.dashCharges;
      hud.dashRecharge = Math.round(p.dashRecharge * 20);
      this.dashPipEls.forEach((pip, index) => {
        pip.classList.toggle('full', index < p.dashCharges);
        pip.classList.remove('partial');
        if (index === p.dashCharges && p.dashCharges < p.dashMax) {
          pip.classList.add('partial');
          pip.style.setProperty('--p', `${clamp((p.dashRecharge / PLAYER.dashRecharge) * 100, 0, 100)}%`);
        } else {
          pip.style.removeProperty('--p');
        }
      });
    }
    if (force || this.souls !== hud.souls) {
      hud.souls = this.souls;
      this.refs.souls.textContent = String(this.souls);
    }
    const boss = this.boss && !this.boss.dead ? this.boss : null;
    if (boss) {
      this.refs.bossShell.classList.remove('hidden');
      this.refs.bossFill.style.transform = `scaleX(${clamp(boss.hp / boss.maxHp, 0, 1)})`;
    } else {
      this.refs.bossShell.classList.add('hidden');
    }
    if (this.mode === 'playing') {
      const remaining = this.enemies.filter((enemy) => !enemy.dead).length + this.pendingSpawns.length;
      if (force || remaining !== hud.remaining) {
        hud.remaining = remaining;
        this.updateWaveText();
      }
    }
  }

  addShake(amount) {
    this.camera.shake = Math.max(this.camera.shake, amount);
  }

  updateCamera(dt) {
    const p = this.player;
    if (!p) return;
    const targetX = p.x + p.vx * 0.08;
    const targetY = p.y + p.vy * 0.08;
    this.camera.x = damp(this.camera.x, targetX, 6.5, dt);
    this.camera.y = damp(this.camera.y, targetY, 6.5, dt);
    const halfW = this.viewW / (2 * this.camera.zoom);
    const halfH = this.viewH / (2 * this.camera.zoom);
    if (WORLD.width < halfW * 2) this.camera.x = WORLD.width / 2;
    else this.camera.x = clamp(this.camera.x, halfW, WORLD.width - halfW);
    if (WORLD.height < halfH * 2) this.camera.y = WORLD.height / 2;
    else this.camera.y = clamp(this.camera.y, halfH, WORLD.height - halfH);
    this.camera.zoom = damp(this.camera.zoom, this.viewZoom, 3, dt);
    this.camera.shake = Math.max(0, this.camera.shake - dt * 28);
    const shake = this.camera.shake;
    this.camera.shakeX = rand(-shake, shake);
    this.camera.shakeY = rand(-shake, shake);
  }

  updateAmbient(dt) {
    this.emberTimer -= dt;
    if (this.emberTimer <= 0) {
      this.emberTimer = rand(0.06, 0.16);
      const source = this.braziers.length ? this.braziers[randInt(0, this.braziers.length - 1)] : { x: rand(0, WORLD.width), y: rand(0, WORLD.height) };
      this.particles.push({
        type: 'ember',
        x: source.x + rand(-14, 14),
        y: source.y + rand(-8, 4),
        vx: rand(-12, 12),
        vy: rand(-52, -22),
        life: rand(1.4, 3.1),
        maxLife: 3.1,
        size: rand(1, 2.4),
        color: Math.random() < 0.7 ? '#ff9a4c' : (this.room?.tint || '#b98bff'),
        drag: 0.99,
        gravity: -6,
        additive: true
      });
    }
  }

  sparkBurst(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const angle = rand(0, TAU);
      const v = rand(speed * 0.25, speed);
      this.particles.push({
        type: 'spark',
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: rand(0.18, 0.52),
        maxLife: 0.52,
        size: rand(1, 2.8),
        color,
        drag: 0.9,
        additive: true
      });
    }
  }

  ringEffect(x, y, r0, r1, color, life) {
    this.particles.push({ type: 'ring', x, y, r0, r1, life, maxLife: life, color, additive: true });
  }

  addText(x, y, text, color, scale = 1) {
    this.texts.push({ x, y, text: String(text), color, life: 0.8, maxLife: 0.8, vy: -46, scale });
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      if (p.type === 'ring') continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const drag = Math.pow(p.drag ?? 0.94, dt * 60);
      p.vx *= drag;
      p.vy *= drag;
      if (p.gravity) p.vy += p.gravity * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    if (this.particles.length > 520) this.particles.splice(0, this.particles.length - 520);
  }

  updateTexts(dt) {
    for (const text of this.texts) {
      text.life -= dt;
      text.y += text.vy * dt;
      text.vy *= Math.pow(0.9, dt * 60);
    }
    this.texts = this.texts.filter((text) => text.life > 0);
  }

  toast(message, duration = 1800) {
    this.refs.toast.textContent = message;
    this.refs.toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.refs.toast.classList.remove('show'), duration);
  }

  screenToWorld(sx, sy) {
    const z = this.camera.zoom;
    return {
      x: (sx - this.viewW / 2 - this.camera.shakeX) / z + this.camera.x,
      y: (sy - this.viewH / 2 - this.camera.shakeY) / z + this.camera.y
    };
  }
}

const game = new Game();
window.__gateGame = game;
