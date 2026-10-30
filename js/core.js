export const TAU = Math.PI * 2;

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const dist2 = (ax, ay, bx, by) => (bx - ax) ** 2 + (by - ay) ** 2;
export const rand = (min, max) => min + Math.random() * (max - min);
export const randInt = (min, max) => Math.floor(rand(min, max + 1));
export const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function angleDiff(a, b) {
  let d = (b - a + Math.PI) % TAU;
  if (d < 0) d += TAU;
  return d - Math.PI;
}

export function angleLerp(a, b, t) {
  return a + angleDiff(a, b) * t;
}

export function normalize(x, y) {
  const length = Math.hypot(x, y);
  return length > 0.0001 ? { x: x / length, y: y / length, length } : { x: 0, y: 0, length: 0 };
}

export function shuffle(list, rng = Math.random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const WEAPONS = {
  blade: {
    id: 'blade',
    name: 'Stygian Blade',
    epithet: 'The Hungering Edge',
    kind: 'Sword',
    icon: 'icon-blade',
    color: '#ffcf7a',
    accent: '#ff8a4c',
    desc: 'A cursed edge that drinks the dark. Sweeping strikes, and a whirlwind that clears the room.',
    specialName: 'WHIRLWIND',
    damage: 17,
    attackCd: 0.27,
    range: 106,
    arc: 1.85,
    specialCost: 40,
    specialDamage: 38,
    specialRadius: 132,
    stats: { power: 0.52, speed: 0.86, range: 0.38 }
  },
  bow: {
    id: 'bow',
    name: 'Heart-Seeker',
    epithet: 'The Distant Verdict',
    kind: 'Bow',
    icon: 'icon-bow',
    color: '#9fe8ff',
    accent: '#4c9bff',
    desc: 'A living bow that finds the pulse of its prey. Loose piercing arrows from safety.',
    specialName: 'RAIN OF ARROWS',
    damage: 21,
    attackCd: 0.38,
    range: 560,
    projectileSpeed: 980,
    pierce: 1,
    specialCost: 45,
    specialDamage: 16,
    specialCount: 5,
    stats: { power: 0.64, speed: 0.58, range: 0.94 }
  },
  shield: {
    id: 'shield',
    name: 'Chaos Aegis',
    epithet: 'The Returning Wall',
    kind: 'Shield',
    icon: 'icon-shield',
    color: '#ffb08a',
    accent: '#ff5c4c',
    desc: 'A bulwark forged in the first war. Bash close, then hurl it screaming through the dark.',
    specialName: 'RICHOCHET',
    damage: 15,
    attackCd: 0.3,
    range: 92,
    arc: 1.55,
    specialCost: 35,
    specialDamage: 31,
    specialRange: 380,
    stats: { power: 0.4, speed: 0.72, range: 0.56 }
  }
};

export const WEAPON_IDS = Object.keys(WEAPONS);

export const BOONS = [
  { id: 'iron-heart', name: 'Iron Heart', desc: '+25 max life and mend 25 life now.', icon: 'icon-heart', color: '#e0495a', rarity: 'COMMON', effect: { type: 'maxHp', value: 25 } },
  { id: 'razor', name: 'Razor Oath', desc: 'Deal 20% more damage with every strike.', icon: 'icon-blade', color: '#ffcf7a', rarity: 'RARE', effect: { type: 'damage', value: 0.2 } },
  { id: 'swift', name: 'Ashen Stride', desc: 'Move 12% faster through the smoke.', icon: 'icon-feather', color: '#9fe8ff', rarity: 'COMMON', effect: { type: 'speed', value: 0.12 } },
  { id: 'feather', name: 'Third Wing', desc: 'Gain one extra dash charge.', icon: 'icon-feather', color: '#b98bff', rarity: 'EPIC', effect: { type: 'dashCharge', value: 1 } },
  { id: 'fury', name: 'Ember Fury', desc: 'Build special 35% faster.', icon: 'icon-flame', color: '#ff7a3d', rarity: 'COMMON', effect: { type: 'specialGain', value: 0.35 } },
  { id: 'fang', name: 'Blood Fang', desc: 'Heal 3 life whenever you slay a foe.', icon: 'icon-fang', color: '#e0495a', rarity: 'RARE', effect: { type: 'lifesteal', value: 3 } },
  { id: 'bulwark', name: 'Grave Bulwark', desc: 'Take 18% less damage.', icon: 'icon-shield', color: '#ffb08a', rarity: 'RARE', effect: { type: 'armor', value: 0.18 } },
  { id: 'keen', name: 'Keen Instinct', desc: 'Attack 14% faster.', icon: 'icon-eye', color: '#6ff2d0', rarity: 'COMMON', effect: { type: 'attackSpeed', value: 0.14 } },
  { id: 'reach', name: 'Long Reach', desc: 'Extend the reach of your weapon by 16%.', icon: 'icon-soul', color: '#ffcf7a', rarity: 'COMMON', effect: { type: 'range', value: 0.16 } },
  { id: 'overflow', name: 'Overflow', desc: 'Specials cost 20% less and hit harder.', icon: 'icon-bolt', color: '#b98bff', rarity: 'EPIC', effect: { type: 'specialPower', value: 0.2 } }
];

export function pickBoons(count = 3, rng = Math.random) {
  return shuffle(BOONS, rng).slice(0, count);
}

export const ENEMIES = {
  shade: { name: 'Shade', hp: 42, speed: 134, radius: 19, damage: 9, souls: 3, color: '#b98bff', accent: '#7b5cff' },
  wisp: { name: 'Wisp', hp: 30, speed: 112, radius: 15, damage: 7, souls: 4, color: '#6ff2d0', accent: '#2a8f83' },
  brute: { name: 'Cinder Brute', hp: 135, speed: 80, radius: 29, damage: 17, souls: 10, color: '#ff8a4c', accent: '#b62d3b' },
  boss: { name: 'The Gate Warden', hp: 720, speed: 58, radius: 54, damage: 22, souls: 80, color: '#ff5c4c', accent: '#ffcf7a' }
};

export const ROOMS = [
  {
    id: 0,
    name: 'THE ASHEN VESTIBULE',
    subtitle: 'Chamber I',
    tint: '#b98bff',
    waves: [
      [['shade', 4]],
      [['shade', 3], ['wisp', 2]]
    ]
  },
  {
    id: 1,
    name: 'THE CINDER HALL',
    subtitle: 'Chamber II',
    tint: '#ff9a4c',
    waves: [
      [['shade', 3], ['wisp', 2]],
      [['brute', 2], ['wisp', 2], ['shade', 2]]
    ]
  },
  {
    id: 2,
    name: 'THE GATE OF EMBERS',
    subtitle: 'Chamber III',
    tint: '#ff5c4c',
    waves: [
      [['shade', 3], ['wisp', 2]],
      [['boss', 1], ['shade', 2]]
    ],
    boss: true
  }
];

export const WORLD = {
  width: 1600,
  height: 1120,
  margin: 86
};

export const PLAYER = {
  radius: 17,
  speed: 312,
  maxHp: 100,
  dashSpeed: 930,
  dashTime: 0.17,
  dashRecharge: 1.65,
  invulnTime: 0.82
};

export function tiltVector({ beta = 0, gamma = 0, orientation = 0, baseline = { beta: 0, gamma: 0 }, deadzone = 0.06, range = 17 } = {}) {
  let x = gamma - (baseline.gamma || 0);
  let y = beta - (baseline.beta || 0);
  const angle = ((orientation % 360) + 360) % 360;
  if (angle === 90) {
    [x, y] = [y, -x];
  } else if (angle === 180) {
    [x, y] = [-x, -y];
  } else if (angle === 270) {
    [x, y] = [-y, x];
  }
  x = clamp(x / range, -1, 1);
  y = clamp(y / range, -1, 1);
  const magnitude = Math.hypot(x, y);
  if (magnitude <= deadzone) return { x: 0, y: 0 };
  const scaled = Math.min(1, (magnitude - deadzone) / (1 - deadzone));
  return { x: (x / magnitude) * scaled, y: (y / magnitude) * scaled };
}

export function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function waveEnemyCount(wave) {
  return wave.reduce((total, [, count]) => total + count, 0);
}

const colorCache = new Map();

export function hexToRgb(hex) {
  if (colorCache.has(hex)) return colorCache.get(hex);
  let value = String(hex || '#ffffff').replace('#', '').trim();
  if (value.length === 3) value = value.split('').map((c) => c + c).join('');
  if (value.length !== 6) value = 'ffffff';
  const result = {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
  colorCache.set(hex, result);
  return result;
}

export function rgba(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
