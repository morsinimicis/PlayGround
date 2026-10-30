import { ENEMIES, TAU, clamp, rgba } from './core.js';
import { drawEnemy, drawPlayer, drawTelegraphs } from './actors.js';

export function drawWorld(game) {
  const ctx = game.ctx;
  const { viewW, viewH, dpr } = game;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#05040a';
  ctx.fillRect(0, 0, viewW, viewH);

  const z = game.camera.zoom;
  ctx.save();
  ctx.translate(viewW / 2 + game.camera.shakeX, viewH / 2 + game.camera.shakeY);
  ctx.scale(z, z);
  ctx.translate(-game.camera.x, -game.camera.y);

  if (game.arena) ctx.drawImage(game.arena, 0, 0);
  drawFloorLife(ctx, game);
  drawBraziers(ctx, game);
  drawPendingSpawns(ctx, game);
  drawTelegraphs(ctx, game);
  drawAfterimages(ctx, game);

  const drawables = [];
  for (const enemy of game.enemies) drawables.push(enemy);
  if (game.player) drawables.push(game.player);
  drawables.sort((a, b) => (a.y || 0) - (b.y || 0));
  for (const entity of drawables) {
    if (entity === game.player) drawPlayer(ctx, game);
    else drawEnemy(ctx, game, entity);
  }

  drawSlashes(ctx, game);
  drawProjectiles(ctx, game);
  drawParticles(ctx, game);
  drawTexts(ctx, game);
  drawAim(ctx, game);
  ctx.restore();
}

function drawFloorLife(ctx, game) {
  const tint = game.room?.tint || '#b98bff';
  const pulse = 0.03 + Math.sin(game.time * 1.4) * 0.012;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(800, 560, 30, 800, 560, 360);
  g.addColorStop(0, rgba(tint, pulse * 1.6));
  g.addColorStop(0.6, rgba(tint, pulse * 0.5));
  g.addColorStop(1, rgba(tint, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(800, 560, 360, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawBraziers(ctx, game) {
  const t = game.time;
  for (let i = 0; i < game.braziers.length; i++) {
    const b = game.braziers[i];
    const flicker = 0.8 + Math.sin(t * 8 + i * 2.7) * 0.12 + Math.sin(t * 13.3 + i) * 0.08;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pool = ctx.createRadialGradient(b.x, b.y + 10, 4, b.x, b.y + 10, 130);
    pool.addColorStop(0, `rgba(255,140,60,${0.16 * flicker})`);
    pool.addColorStop(0.55, `rgba(255,100,40,${0.06 * flicker})`);
    pool.addColorStop(1, 'rgba(255,80,30,0)');
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.arc(b.x, b.y + 10, 130, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = '#17121c';
    ctx.beginPath();
    ctx.ellipse(0, 12, 27, 11, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232,195,122,0.24)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#221a2a';
    ctx.beginPath();
    ctx.ellipse(0, 8, 18, 7, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const flameHeight = 40 * flicker;
    const fg = ctx.createRadialGradient(b.x, b.y - 12, 2, b.x, b.y - 10, flameHeight);
    fg.addColorStop(0, 'rgba(255,245,200,0.95)');
    fg.addColorStop(0.28, 'rgba(255,190,90,0.7)');
    fg.addColorStop(0.62, 'rgba(255,100,45,0.28)');
    fg.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(b.x - 14, b.y + 3);
    ctx.quadraticCurveTo(b.x - 16, b.y - 18 * flicker, b.x - 4, b.y - 30 * flicker);
    ctx.quadraticCurveTo(b.x + 2, b.y - 44 * flicker, b.x + 9, b.y - 26 * flicker);
    ctx.quadraticCurveTo(b.x + 18, b.y - 12 * flicker, b.x + 14, b.y + 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawPendingSpawns(ctx, game) {
  const t = game.time;
  for (const spawn of game.pendingSpawns) {
    const color = ENEMIES[spawn.type].color;
    const progress = clamp(1 - spawn.t / spawn.max, 0, 1);
    const radius = spawn.type === 'boss' ? 78 : 36;
    ctx.save();
    ctx.translate(spawn.x, spawn.y);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, radius * 1.8);
    g.addColorStop(0, rgba(color, 0.2 * progress));
    g.addColorStop(0.5, rgba(color, 0.08 * progress));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.8, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(color, 0.5 + progress * 0.35);
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.rotate(t * 1.4 + spawn.seed);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.rotate(-(t * 1.4 + spawn.seed) * 2);
    ctx.strokeStyle = rgba(color, 0.35);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.62, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

function drawAfterimages(ctx, game) {
  for (const ghost of game.afterimages) {
    const alpha = (ghost.life / ghost.maxLife) * 0.22;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(ghost.x, ghost.y);
    ctx.rotate(ghost.facing + Math.PI / 2);
    ctx.fillStyle = ghost.color || '#9fe8ff';
    ctx.beginPath();
    ctx.ellipse(0, 8, 11, 20, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawSlashes(ctx, game) {
  for (const slash of game.slashes) {
    const progress = 1 - slash.life / slash.maxLife;
    const alpha = clamp(slash.life / slash.maxLife, 0, 1);
    const radius = slash.radius * (0.5 + progress * 0.55);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(slash.x, slash.y);
    ctx.strokeStyle = rgba(slash.color, alpha * 0.75);
    ctx.shadowColor = slash.color;
    ctx.shadowBlur = 18;
    ctx.lineWidth = (slash.full ? 12 : 9) * (1 - progress * 0.7) + 1;
    ctx.beginPath();
    if (slash.full) {
      ctx.arc(0, 0, radius, 0, TAU);
    } else {
      const start = slash.angle - slash.arc / 2;
      ctx.arc(0, 0, radius, start, start + slash.arc);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(255,245,215,${alpha * 0.75})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (slash.full) {
      ctx.arc(0, 0, radius * 0.92, 0, TAU);
    } else {
      const start = slash.angle - slash.arc / 2 + 0.05;
      ctx.arc(0, 0, radius * 0.92, start, start + slash.arc - 0.1);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function drawProjectiles(ctx, game) {
  for (const proj of game.projectiles) {
    if (proj.kind === 'arrow') {
      ctx.save();
      ctx.translate(proj.x, proj.y);
      ctx.rotate(proj.angle);
      ctx.globalCompositeOperation = 'lighter';
      const trail = ctx.createLinearGradient(-52, 0, 8, 0);
      trail.addColorStop(0, rgba(proj.color, 0));
      trail.addColorStop(0.7, rgba(proj.color, 0.25));
      trail.addColorStop(1, rgba(proj.color, 0.85));
      ctx.strokeStyle = trail;
      ctx.lineWidth = proj.special ? 3.5 : 2.5;
      ctx.beginPath();
      ctx.moveTo(-52, 0);
      ctx.lineTo(8, 0);
      ctx.stroke();
      ctx.fillStyle = '#fff7de';
      ctx.shadowColor = proj.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(1, -4);
      ctx.lineTo(3, 0);
      ctx.lineTo(1, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (proj.kind === 'shield') {
      ctx.save();
      ctx.translate(proj.x, proj.y);
      ctx.rotate(proj.spin);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 30);
      g.addColorStop(0, rgba(proj.color, 0.55));
      g.addColorStop(1, rgba(proj.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2a1c24';
      ctx.strokeStyle = proj.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,230,190,0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(0, 10);
      ctx.moveTo(-8, 0);
      ctx.lineTo(8, 0);
      ctx.stroke();
      ctx.restore();
    } else if (proj.kind === 'orb') {
      ctx.save();
      ctx.translate(proj.x, proj.y);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, proj.radius * 3.4);
      g.addColorStop(0, '#fff2dc');
      g.addColorStop(0.25, rgba(proj.color, 0.9));
      g.addColorStop(0.6, rgba(proj.color, 0.28));
      g.addColorStop(1, rgba(proj.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius * 3.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff8ec';
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius * 0.55, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawParticles(ctx, game) {
  for (const p of game.particles) {
    if (p.type !== 'smoke' && p.additive) continue;
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    if (p.type === 'smoke') {
      ctx.save();
      ctx.globalAlpha = alpha * 0.4;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      g.addColorStop(0, rgba(p.color, 0.5));
      g.addColorStop(1, rgba(p.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of game.particles) {
    if (!p.additive) continue;
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    if (p.type === 'spark') {
      const speed = Math.hypot(p.vx, p.vy);
      const len = clamp(speed * 0.022, 2, 16);
      const nx = speed > 0 ? p.vx / speed : 0;
      const ny = speed > 0 ? p.vy / speed : 0;
      ctx.strokeStyle = rgba(p.color, alpha);
      ctx.lineWidth = p.size;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - nx * len, p.y - ny * len);
      ctx.stroke();
    } else if (p.type === 'ember') {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 5);
      g.addColorStop(0, rgba(p.color, alpha));
      g.addColorStop(0.35, rgba(p.color, alpha * 0.4));
      g.addColorStop(1, rgba(p.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 5, 0, TAU);
      ctx.fill();
    } else if (p.type === 'ring') {
      const progress = 1 - p.life / p.maxLife;
      const radius = p.r0 + (p.r1 - p.r0) * progress;
      ctx.strokeStyle = rgba(p.color, alpha * 0.8);
      ctx.lineWidth = 2 + (1 - progress) * 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawTexts(ctx, game) {
  for (const text of game.texts) {
    const alpha = clamp(text.life / text.maxLife, 0, 1);
    const pop = text.life > text.maxLife * 0.7 ? 1.25 : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(text.x, text.y);
    ctx.scale(pop * text.scale, pop * text.scale);
    ctx.font = '700 16px "Palatino Linotype", Palatino, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(text.text, 0, 0);
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, 0, 0);
    ctx.restore();
  }
}

function drawAim(ctx, game) {
  if (game.mode !== 'playing' || !game.player) return;
  const p = game.player;
  const color = p.weapon.color;
  if (game.isTouch) {
    const target = game.nearestEnemy(p.x, p.y, 760);
    if (target) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.translate(target.x, target.y - target.radius - 26);
      const bob = Math.sin(game.time * 6) * 2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 6 + bob);
      ctx.lineTo(-5, -2 + bob);
      ctx.lineTo(5, -2 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    return;
  }
  if (!game.input.mouse.inside) return;
  const world = game.screenToWorld(game.input.mouse.x, game.input.mouse.y);
  const pulse = 1 + Math.sin(game.time * 5) * 0.06;
  ctx.save();
  ctx.translate(world.x, world.y);
  ctx.rotate(game.time * 0.8);
  ctx.strokeStyle = rgba(color, 0.72);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 11 * pulse, 0.4, 1.1);
  ctx.arc(0, 0, 11 * pulse, 0.4 + Math.PI, 1.1 + Math.PI);
  ctx.stroke();
  ctx.fillStyle = rgba(color, 0.9);
  ctx.beginPath();
  ctx.arc(0, 0, 1.6, 0, TAU);
  ctx.fill();
  ctx.restore();
}
