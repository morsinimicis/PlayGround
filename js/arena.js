import { TAU, WORLD, rand, randInt, rgba } from './core.js';

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildArena(room) {
  const canvas = document.createElement('canvas');
  canvas.width = WORLD.width;
  canvas.height = WORLD.height;
  const g = canvas.getContext('2d');
  const rng = mulberry32(1337 + room.id * 977);
  const tint = room.tint;

  const bg = g.createRadialGradient(WORLD.width / 2, WORLD.height / 2, 90, WORLD.width / 2, WORLD.height / 2, 900);
  bg.addColorStop(0, '#1c1429');
  bg.addColorStop(0.52, '#120d1d');
  bg.addColorStop(1, '#080610');
  g.fillStyle = bg;
  g.fillRect(0, 0, WORLD.width, WORLD.height);

  const tile = 80;
  for (let y = 0; y < WORLD.height; y += tile) {
    for (let x = 0; x < WORLD.width; x += tile) {
      const v = rng();
      const hue = 250 + rng() * 22;
      const light = 5.5 + v * 4.5;
      g.fillStyle = `hsl(${hue} ${9 + rng() * 7}% ${light}%)`;
      g.fillRect(x + 1, y + 1, tile - 2, tile - 2);
      g.strokeStyle = 'rgba(0,0,0,0.32)';
      g.lineWidth = 1;
      g.strokeRect(x + 0.5, y + 0.5, tile - 1, tile - 1);
      g.strokeStyle = 'rgba(255,255,255,0.018)';
      g.beginPath();
      g.moveTo(x + 2, y + tile - 3);
      g.lineTo(x + tile - 3, y + 2);
      g.stroke();
      if (v > 0.9) {
        g.strokeStyle = 'rgba(0,0,0,0.45)';
        g.lineWidth = 1.2;
        g.beginPath();
        let cx = x + rng() * tile;
        let cy = y + rng() * tile;
        g.moveTo(cx, cy);
        for (let s = 0; s < 3; s++) {
          cx += rand(-18, 18);
          cy += rand(-18, 18);
          g.lineTo(cx, cy);
        }
        g.stroke();
      }
      if (v < 0.06) {
        g.fillStyle = 'rgba(255,150,80,0.08)';
        g.beginPath();
        g.arc(x + rng() * tile, y + rng() * tile, 2 + rng() * 3, 0, TAU);
        g.fill();
      }
    }
  }

  const center = g.createRadialGradient(WORLD.width / 2, WORLD.height / 2, 20, WORLD.width / 2, WORLD.height / 2, 470);
  center.addColorStop(0, 'rgba(255,180,90,0.06)');
  center.addColorStop(0.5, 'rgba(130,80,180,0.035)');
  center.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = center;
  g.fillRect(0, 0, WORLD.width, WORLD.height);

  g.save();
  g.translate(WORLD.width / 2, WORLD.height / 2);
  g.strokeStyle = 'rgba(255,170,80,0.12)';
  g.lineWidth = 3;
  g.setLineDash([18, 14]);
  g.beginPath();
  g.arc(0, 0, 312, 0, TAU);
  g.stroke();
  g.setLineDash([]);
  g.strokeStyle = 'rgba(180,130,255,0.1)';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(0, 0, 246, 0, TAU);
  g.stroke();
  g.beginPath();
  g.arc(0, 0, 178, 0, TAU);
  g.stroke();
  g.strokeStyle = 'rgba(255,200,130,0.06)';
  g.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    g.beginPath();
    g.moveTo(Math.cos(a) * 70, Math.sin(a) * 70);
    g.lineTo(Math.cos(a) * 310, Math.sin(a) * 310);
    g.stroke();
  }
  g.strokeStyle = 'rgba(255,190,110,0.14)';
  g.lineWidth = 2;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    g.save();
    g.rotate(a);
    g.translate(276, 0);
    g.beginPath();
    g.moveTo(-5, -6);
    g.lineTo(5, 0);
    g.lineTo(-5, 6);
    g.stroke();
    g.restore();
  }
  g.restore();

  for (let i = 0; i < 12; i++) {
    let x = rand(250, WORLD.width - 250);
    let y = rand(220, WORLD.height - 220);
    const points = [{ x, y }];
    const segments = randInt(3, 6);
    const angle = rand(0, TAU);
    for (let s = 0; s < segments; s++) {
      x += Math.cos(angle + rand(-0.6, 0.6)) * rand(28, 64);
      y += Math.sin(angle + rand(-0.6, 0.6)) * rand(28, 64);
      points.push({ x, y });
    }
    g.save();
    g.lineCap = 'round';
    g.shadowColor = rgba(tint, 0.35);
    g.shadowBlur = 18;
    g.strokeStyle = rgba(tint, 0.13);
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) g.lineTo(point.x, point.y);
    g.stroke();
    g.shadowBlur = 8;
    g.strokeStyle = rgba('#ff9a4c', 0.28);
    g.lineWidth = 2;
    g.stroke();
    g.restore();
  }

  const m = WORLD.margin;
  g.fillStyle = '#08060e';
  g.fillRect(0, 0, WORLD.width, m);
  g.fillRect(0, WORLD.height - m, WORLD.width, m);
  g.fillRect(0, 0, m, WORLD.height);
  g.fillRect(WORLD.width - m, 0, m, WORLD.height);

  const block = 68;
  for (let x = 0; x < WORLD.width; x += block) {
    for (let row = 0; row < 2; row++) {
      const v = rng();
      g.fillStyle = `hsl(${252 + rng() * 12} ${10 + rng() * 6}% ${5 + v * 4}%)`;
      g.fillRect(x + 2, row * 38 + 3, block - 4, 34);
      g.strokeStyle = 'rgba(0,0,0,0.45)';
      g.strokeRect(x + 1.5, row * 38 + 2.5, block - 3, 35);
    }
    const v2 = rng();
    g.fillStyle = `hsl(${252 + rng() * 12} ${10 + rng() * 6}% ${5 + v2 * 4}%)`;
    g.fillRect(x + 2, WORLD.height - m + 3, block - 4, 34);
    g.fillRect(x + 2, WORLD.height - m + 40, block - 4, 34);
  }
  for (let y = 0; y < WORLD.height; y += block) {
    for (let col = 0; col < 2; col++) {
      const v = rng();
      g.fillStyle = `hsl(${252 + rng() * 12} ${10 + rng() * 6}% ${5 + v * 4}%)`;
      g.fillRect(col * 38 + 3, y + 2, 34, block - 4);
      g.fillRect(WORLD.width - m + col * 38 + 3, y + 2, 34, block - 4);
    }
  }

  g.strokeStyle = rgba(tint, 0.22);
  g.lineWidth = 2;
  g.strokeRect(m + 3, m + 3, WORLD.width - m * 2 - 6, WORLD.height - m * 2 - 6);
  g.strokeStyle = 'rgba(255,180,100,0.08)';
  g.lineWidth = 6;
  g.strokeRect(m + 7, m + 7, WORLD.width - m * 2 - 14, WORLD.height - m * 2 - 14);

  return canvas;
}
