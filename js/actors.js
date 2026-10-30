import { TAU, WEAPONS, clamp, rgba } from './core.js';

export function drawShadow(ctx, x, y, rx, ry, alpha = 0.4) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgba(0,0,0,${alpha})`);
  g.addColorStop(0.65, `rgba(0,0,0,${alpha * 0.55})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

export function drawPlayer(ctx, game) {
  const p = game.player;
  if (!p) return;
  const bob = Math.sin(game.time * 4.2 + p.x * 0.01) * 1.4;
  const flicker = p.invuln > 0 && Math.floor(game.time * 22) % 2 === 0;
  const weapon = p.weapon;

  ctx.save();
  ctx.globalAlpha = flicker ? 0.42 : 1;
  drawShadow(ctx, p.x, p.y + 14, 24, 10, 0.45);
  ctx.translate(p.x, p.y + bob);
  ctx.rotate(p.facing + Math.PI / 2);

  const swing = Math.sin(p.attackAnim * Math.PI);
  const lean = Math.sin(game.time * 3 + p.x * 0.01) * 0.02;

  ctx.save();
  ctx.rotate(lean);
  const cloak = ctx.createLinearGradient(0, -18, 0, 32);
  cloak.addColorStop(0, '#332145');
  cloak.addColorStop(0.45, '#1b1228');
  cloak.addColorStop(1, '#0a0710');
  ctx.fillStyle = cloak;
  ctx.beginPath();
  ctx.moveTo(-10, 2);
  ctx.bezierCurveTo(-19, 8, -21, 23, -14, 29);
  ctx.lineTo(-7, 26);
  ctx.lineTo(0, 34);
  ctx.lineTo(7, 26);
  ctx.lineTo(14, 29);
  ctx.bezierCurveTo(21, 23, 19, 8, 10, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(weapon.color, 0.55);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.strokeStyle = rgba(weapon.color, 0.18);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-8, 10);
  ctx.quadraticCurveTo(0, 17, 8, 10);
  ctx.stroke();

  ctx.fillStyle = '#171022';
  ctx.beginPath();
  ctx.arc(0, -8, 10, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = rgba(weapon.color, 0.3);
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#08050d';
  ctx.beginPath();
  ctx.ellipse(0, -6, 7.5, 8.5, 0, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = weapon.color;
  ctx.shadowColor = weapon.color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.ellipse(-3.3, -9.5, 1.5, 2.2, -0.2, 0, TAU);
  ctx.ellipse(3.3, -9.5, 1.5, 2.2, 0.2, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(11, 2);
  if (p.weaponId === 'blade') {
    ctx.rotate(-0.9 + swing * 2.2);
    ctx.strokeStyle = '#2c2034';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(0, 0);
    ctx.stroke();
    ctx.strokeStyle = rgba(weapon.color, 0.9);
    ctx.lineWidth = 2.6;
    ctx.shadowColor = weapon.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.lineTo(0, -36);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffe4a8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(0, -32);
    ctx.stroke();
    ctx.strokeStyle = rgba(weapon.color, 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5, 1);
    ctx.lineTo(5, 1);
    ctx.stroke();
  } else if (p.weaponId === 'bow') {
    ctx.rotate(-0.35 + swing * 0.3);
    ctx.strokeStyle = rgba(weapon.color, 0.9);
    ctx.lineWidth = 2.2;
    ctx.shadowColor = weapon.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 15, -1.25, 1.25);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(220,240,255,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4.6, -14.2);
    ctx.lineTo(4.6, 14.2);
    ctx.stroke();
    ctx.strokeStyle = rgba(weapon.color, 0.8);
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(13, 0);
    ctx.stroke();
  } else {
    ctx.rotate(-0.2 + swing * 0.55);
    ctx.fillStyle = '#2a1c24';
    ctx.strokeStyle = rgba(weapon.color, 0.9);
    ctx.lineWidth = 2;
    ctx.shadowColor = weapon.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,230,190,0.7)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(0, 7);
    ctx.moveTo(-6, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
  ctx.restore();
}

export function drawEnemy(ctx, game, enemy) {
  if (enemy.spawnTimer > 0) {
    const duration = enemy.type === 'boss' ? 1.25 : 0.35;
    const progress = clamp(1 - enemy.spawnTimer / duration, 0, 1);
    ctx.save();
    ctx.globalAlpha = progress;
    ctx.translate(enemy.x, enemy.y + (1 - progress) * 22);
    ctx.scale(0.4 + progress * 0.6, 0.4 + progress * 0.6);
    drawEnemyBody(ctx, game, enemy);
    ctx.restore();
    return;
  }
  if (enemy.dead) {
    const duration = enemy.type === 'boss' ? 1.4 : 0.4;
    const progress = clamp(enemy.deathTimer / duration, 0, 1);
    ctx.save();
    ctx.globalAlpha = progress;
    ctx.translate(enemy.x, enemy.y);
    const scale = 1 - (1 - progress) * 0.35;
    ctx.scale(scale, scale);
    drawEnemyBody(ctx, game, enemy);
    ctx.restore();
    return;
  }
  drawShadow(ctx, enemy.x, enemy.y + enemy.radius * 0.62, enemy.radius * 1.2, enemy.radius * 0.5, 0.42);
  drawEnemyBody(ctx, game, enemy);
  if (enemy.type !== 'boss' && enemy.hp < enemy.maxHp) {
    const width = enemy.type === 'brute' ? 62 : 38;
    const ratio = clamp(enemy.hp / enemy.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 16, width, 4);
    ctx.fillStyle = enemy.color;
    ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 16, width * ratio, 4);
  }
}

function drawEnemyBody(ctx, game, enemy) {
  const t = game.time;
  const bob = Math.sin(t * (enemy.type === 'boss' ? 1.8 : 3.4) + enemy.bobSeed) * (enemy.type === 'boss' ? 3 : 2);
  const windup = enemy.state === 'windup' || (enemy.type === 'boss' && enemy.action);
  const pulse = windup ? 1 + Math.sin(t * 22) * 0.045 : 1;

  ctx.save();
  ctx.translate(enemy.x, enemy.y + bob);

  if (enemy.type === 'shade') {
    ctx.save();
    ctx.rotate(enemy.facing + Math.PI / 2);
    ctx.scale(pulse, pulse);

    ctx.strokeStyle = rgba(enemy.color, 0.16);
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-9 + i * 9, 12);
      ctx.quadraticCurveTo(-16 + i * 16, 25, -11 + i * 11, 34);
      ctx.stroke();
    }

    const body = ctx.createLinearGradient(0, -18, 0, 32);
    body.addColorStop(0, '#2b1b3d');
    body.addColorStop(0.5, '#170f23');
    body.addColorStop(1, '#08050d');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.bezierCurveTo(12, -13, 16, 2, 13, 18);
    ctx.lineTo(17, 25);
    ctx.lineTo(8, 22);
    ctx.lineTo(3, 32);
    ctx.lineTo(-3, 22);
    ctx.lineTo(-12, 26);
    ctx.lineTo(-13, 18);
    ctx.bezierCurveTo(-16, 2, -12, -13, 0, -17);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(enemy.color, 0.58);
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = '#07040b';
    ctx.beginPath();
    ctx.ellipse(0, -7, 8.5, 10.5, 0, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = enemy.state === 'windup' ? '#ff8b7a' : enemy.color;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(-3.2, -10, 1.6, 2.5, -0.25, 0, TAU);
    ctx.ellipse(3.2, -10, 1.6, 2.5, 0.25, 0, TAU);
    ctx.fill();
    ctx.restore();

    if (enemy.state === 'windup' || enemy.state === 'lunge') {
      ctx.strokeStyle = rgba('#ff8b7a', 0.75);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-12, -2);
      ctx.quadraticCurveTo(-22, 8, -18, 20);
      ctx.moveTo(12, -2);
      ctx.quadraticCurveTo(22, 8, 18, 20);
      ctx.stroke();
    }
    ctx.restore();
  } else if (enemy.type === 'wisp') {
    const flicker = 0.85 + Math.sin(t * 9 + enemy.seed) * 0.15;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, 36 * flicker);
    aura.addColorStop(0, rgba(enemy.color, 0.5));
    aura.addColorStop(0.45, rgba(enemy.color, 0.14));
    aura.addColorStop(1, rgba(enemy.color, 0));
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, 36 * flicker, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.rotate(t * 0.9 + enemy.seed);
    ctx.strokeStyle = rgba(enemy.color, 0.5);
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 3; i++) {
      ctx.rotate(TAU / 3);
      ctx.fillStyle = rgba(enemy.color, 0.7);
      ctx.beginPath();
      ctx.moveTo(26, -4);
      ctx.lineTo(33, 0);
      ctx.lineTo(26, 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    const core = ctx.createRadialGradient(-2, -3, 1, 0, 0, 10);
    core.addColorStop(0, '#f2fffb');
    core.addColorStop(0.45, enemy.color);
    core.addColorStop(1, '#0b3a35');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#04110f';
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.2, 4.5, 0, 0, TAU);
    ctx.fill();
  } else if (enemy.type === 'brute') {
    ctx.save();
    ctx.rotate(enemy.facing + Math.PI / 2);
    ctx.scale(pulse, pulse);

    const body = ctx.createLinearGradient(0, -30, 0, 32);
    body.addColorStop(0, '#4a2430');
    body.addColorStop(0.5, '#25131d');
    body.addColorStop(1, '#0b060c');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.bezierCurveTo(20, -27, 27, -6, 24, 20);
    ctx.lineTo(30, 30);
    ctx.lineTo(12, 25);
    ctx.lineTo(0, 35);
    ctx.lineTo(-12, 25);
    ctx.lineTo(-30, 30);
    ctx.lineTo(-24, 20);
    ctx.bezierCurveTo(-27, -6, -20, -27, 0, -30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(enemy.color, 0.6);
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = rgba(enemy.color, 0.35);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, -6);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-13, 10);
    ctx.moveTo(18, -6);
    ctx.lineTo(7, 0);
    ctx.lineTo(13, 10);
    ctx.stroke();

    ctx.fillStyle = '#120a12';
    ctx.beginPath();
    ctx.arc(0, -18, 13, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = rgba(enemy.color, 0.65);
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = enemy.accent;
    ctx.beginPath();
    ctx.moveTo(-12, -30);
    ctx.quadraticCurveTo(-22, -40, -26, -26);
    ctx.quadraticCurveTo(-18, -28, -14, -20);
    ctx.closePath();
    ctx.moveTo(12, -30);
    ctx.quadraticCurveTo(22, -40, 26, -26);
    ctx.quadraticCurveTo(18, -28, 14, -20);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = enemy.state === 'windup' || enemy.state === 'charge' ? '#ffd08a' : enemy.color;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.ellipse(-4.5, -19, 2, 3, -0.2, 0, TAU);
    ctx.ellipse(4.5, -19, 2, 3, 0.2, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  } else if (enemy.type === 'boss') {
    const aura = ctx.createRadialGradient(0, 0, 10, 0, 0, 104);
    aura.addColorStop(0, rgba(enemy.color, 0.2));
    aura.addColorStop(0.5, rgba(enemy.color, 0.07));
    aura.addColorStop(1, rgba(enemy.color, 0));
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, 104, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.rotate(-t * 0.35);
    ctx.strokeStyle = rgba(enemy.color, 0.32);
    ctx.lineWidth = 2;
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    ctx.arc(0, 0, 76, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = rgba('#ffcf7a', 0.18);
    ctx.beginPath();
    ctx.arc(0, 0, 62, 0, TAU);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(t * 0.5);
    for (let i = 0; i < 6; i++) {
      ctx.rotate(TAU / 6);
      ctx.fillStyle = rgba(enemy.color, 0.55);
      ctx.beginPath();
      ctx.moveTo(64, -4);
      ctx.lineTo(82, 0);
      ctx.lineTo(64, 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    const body = ctx.createRadialGradient(-10, -16, 6, 0, 0, 64);
    body.addColorStop(0, '#5c2430');
    body.addColorStop(0.42, '#2a101b');
    body.addColorStop(1, '#08050c');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -54);
    ctx.bezierCurveTo(26, -52, 44, -30, 45, 0);
    ctx.bezierCurveTo(45, 24, 27, 42, 0, 52);
    ctx.bezierCurveTo(-27, 42, -45, 24, -45, 0);
    ctx.bezierCurveTo(-44, -30, -26, -52, 0, -54);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(enemy.color, 0.55);
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#0d060d';
    ctx.beginPath();
    ctx.moveTo(-30, -36);
    ctx.quadraticCurveTo(-60, -60, -62, -24);
    ctx.quadraticCurveTo(-48, -34, -34, -16);
    ctx.closePath();
    ctx.moveTo(30, -36);
    ctx.quadraticCurveTo(60, -60, 62, -24);
    ctx.quadraticCurveTo(48, -34, 34, -16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba('#ffcf7a', 0.3);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glowColor = enemy.enraged ? '#ff5c4c' : '#ffb36a';
    ctx.fillStyle = glowColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(0, -16, 6.5, 9, 0, 0, TAU);
    ctx.ellipse(-19, -10, 3.4, 5, -0.3, 0, TAU);
    ctx.ellipse(19, -10, 3.4, 5, 0.3, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = rgba(enemy.color, 0.28);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-24 + i * 12, 12);
      ctx.quadraticCurveTo(-30 + i * 14, 32, -20 + i * 10, 46);
      ctx.stroke();
    }
  }

  if (enemy.hitFlash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const flash = ctx.createRadialGradient(0, 0, 2, 0, 0, enemy.radius * 1.4);
    flash.addColorStop(0, `rgba(255,255,255,${enemy.hitFlash * 2.2})`);
    flash.addColorStop(0.5, `rgba(255,210,180,${enemy.hitFlash * 0.8})`);
    flash.addColorStop(1, 'rgba(255,210,180,0)');
    ctx.fillStyle = flash;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 1.4, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

export function drawTelegraphs(ctx, game) {
  const p = game.player;
  if (!p) return;
  for (const enemy of game.enemies) {
    if (enemy.dead || enemy.spawnTimer > 0) continue;
    if (enemy.type === 'shade' && enemy.state === 'windup') {
      const a = enemy.lockAngle;
      const progress = clamp(1 - enemy.timer / 0.42, 0, 1);
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(a);
      const g = ctx.createLinearGradient(0, 0, 150, 0);
      g.addColorStop(0, `rgba(255,90,90,${0.1 + progress * 0.16})`);
      g.addColorStop(1, 'rgba(255,90,90,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.lineTo(150, -44);
      ctx.lineTo(150, 44);
      ctx.lineTo(0, 26);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(255,120,110,${0.25 + progress * 0.35})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    } else if (enemy.type === 'wisp' && enemy.state === 'windup') {
      const progress = clamp(1 - enemy.timer / 0.58, 0, 1);
      ctx.save();
      ctx.strokeStyle = `rgba(255,100,110,${0.18 + progress * 0.35})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([7, 9]);
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      drawChargeGlow(ctx, enemy.x, enemy.y, enemy.color, progress);
    } else if (enemy.type === 'brute' && enemy.state === 'windup') {
      const a = enemy.lockAngle;
      const progress = clamp(1 - enemy.timer / 0.78, 0, 1);
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(a);
      const g = ctx.createLinearGradient(0, 0, 540, 0);
      g.addColorStop(0, `rgba(255,110,70,${0.08 + progress * 0.16})`);
      g.addColorStop(0.8, `rgba(255,110,70,${0.03 + progress * 0.06})`);
      g.addColorStop(1, 'rgba(255,110,70,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(540, -54);
      ctx.lineTo(540, 54);
      ctx.lineTo(0, 34);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(255,130,80,${0.25 + progress * 0.35})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    } else if (enemy.type === 'boss' && enemy.action) {
      const action = enemy.action;
      const progress = clamp(1 - action.t / action.max, 0, 1);
      if (action.type === 'slam') {
        const radius = 132;
        ctx.save();
        ctx.translate(action.target.x, action.target.y);
        ctx.fillStyle = `rgba(255,90,50,${0.06 + progress * 0.16})`;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = `rgba(255,130,70,${0.4 + progress * 0.4})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([14, 10]);
        ctx.rotate(game.time * 1.2);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = `rgba(255,170,100,${0.25 + progress * 0.4})`;
        ctx.beginPath();
        ctx.arc(0, 0, radius * progress, 0, TAU);
        ctx.stroke();
        ctx.restore();
      } else if (action.type === 'radial') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255,120,80,${0.25 + progress * 0.45})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 14]);
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + 30 + progress * 26, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      } else if (action.type === 'summon') {
        drawChargeGlow(ctx, enemy.x, enemy.y, '#b98bff', progress);
      }
    }
  }
}

export function drawChargeGlow(ctx, x, y, color, progress) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const r = 22 + progress * 18;
  const g = ctx.createRadialGradient(x, y, 2, x, y, r);
  g.addColorStop(0, rgba(color, 0.55));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}
