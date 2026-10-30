import { WALL, FLOOR, lineOfSight } from "./dungeon.js";

const HERO_STYLES = {
  knight: {
    bodyLight: "#c9d8f4",
    bodyMid: "#6f89c7",
    bodyDark: "#33477d",
    rim: "#f6dfa5",
    cape: "#7d2d42",
    eye: "#141a2e",
    metal: "#dbe5f7",
    metalDark: "#7785a2",
    accent: "#ffd071"
  },
  ranger: {
    bodyLight: "#baf3d3",
    bodyMid: "#54bd8d",
    bodyDark: "#22664f",
    rim: "#f6dfa5",
    cape: "#285542",
    eye: "#10251d",
    metal: "#c6e6c8",
    metalDark: "#648b70",
    accent: "#f6d277"
  },
  mage: {
    bodyLight: "#e1d6ff",
    bodyMid: "#9275e8",
    bodyDark: "#4b338f",
    rim: "#f6dfa5",
    cape: "#422b70",
    eye: "#19122d",
    metal: "#e3d5ff",
    metalDark: "#8067b8",
    accent: "#ffd071"
  }
};

const HERO_NAMES = {
  knight: "Sir Bramble",
  ranger: "Wren Quickstep",
  mage: "Mallow the Kindled"
};

export function heroName(classId) {
  return HERO_NAMES[classId] || "Delver";
}

function rr(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function hash2(x, y, seed = 0) {
  const v = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function drawShadow(ctx, cx, cy, rx, ry, alpha = 0.3) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#02040a";
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function glowCircle(ctx, x, y, radius, color, alpha = 0.5) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Heroes                                                              */
/* ------------------------------------------------------------------ */

export function drawHero(ctx, cx, cy, size, classId, time = 0, options = {}) {
  const style = HERO_STYLES[classId] || HERO_STYLES.knight;
  const s = size;
  const bob = Math.sin(time * 2.4) * s * 0.018;
  const blinkPhase = (time * 0.72 + (classId === "ranger" ? 0.31 : classId === "mage" ? 0.63 : 0)) % 5.7;
  const blink = blinkPhase > 5.45 ? 0.12 : 1;
  const breathe = 1 + Math.sin(time * 2.1) * 0.012;
  const bodyR = s * 0.3;

  ctx.save();
  ctx.translate(cx, cy + bob);
  if (options.flip) ctx.scale(-1, 1);

  drawShadow(ctx, 0, s * 0.45, s * 0.31, s * 0.085, options.avatar ? 0.18 : 0.34);

  if (!options.avatar) {
    const aura = ctx.createRadialGradient(0, 0, s * 0.05, 0, 0, s * 0.66);
    aura.addColorStop(0, classId === "mage" ? "rgba(157,124,255,.13)" : classId === "ranger" ? "rgba(104,224,168,.1)" : "rgba(130,170,255,.12)");
    aura.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.66, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cape
  ctx.save();
  ctx.translate(-s * 0.03, s * 0.04);
  const capeGrad = ctx.createLinearGradient(0, -s * 0.2, 0, s * 0.42);
  capeGrad.addColorStop(0, style.cape);
  capeGrad.addColorStop(1, "rgba(10,12,24,.25)");
  ctx.fillStyle = capeGrad;
  ctx.beginPath();
  ctx.moveTo(-bodyR * 0.85, -bodyR * 0.4);
  ctx.quadraticCurveTo(-bodyR * 1.38, bodyR * 0.4, -bodyR * 0.82, bodyR * 0.94);
  ctx.quadraticCurveTo(0, bodyR * 1.1, bodyR * 0.82, bodyR * 0.94);
  ctx.quadraticCurveTo(bodyR * 1.38, bodyR * 0.4, bodyR * 0.85, -bodyR * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Weapon behind body
  ctx.save();
  if (classId === "knight") {
    ctx.translate(bodyR * 0.92, -bodyR * 0.1);
    ctx.rotate(-0.36);
    ctx.fillStyle = style.metalDark;
    rr(ctx, -s * 0.026, -s * 0.35, s * 0.052, s * 0.42, s * 0.02);
    ctx.fill();
    const blade = ctx.createLinearGradient(-s * 0.02, 0, s * 0.03, 0);
    blade.addColorStop(0, "#f5f9ff");
    blade.addColorStop(0.5, "#a9bbd8");
    blade.addColorStop(1, "#637391");
    ctx.fillStyle = blade;
    ctx.beginPath();
    ctx.moveTo(-s * 0.023, -s * 0.3);
    ctx.lineTo(0, -s * 0.4);
    ctx.lineTo(s * 0.023, -s * 0.3);
    ctx.lineTo(s * 0.018, s * 0.02);
    ctx.lineTo(-s * 0.018, s * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = style.accent;
    rr(ctx, -s * 0.09, s * 0.015, s * 0.18, s * 0.035, s * 0.018);
    ctx.fill();
    ctx.fillStyle = "#3c2a1e";
    rr(ctx, -s * 0.018, s * 0.04, s * 0.036, s * 0.11, s * 0.018);
    ctx.fill();
  } else if (classId === "ranger") {
    ctx.translate(-bodyR * 0.9, 0);
    ctx.rotate(-0.22);
    ctx.strokeStyle = "#9f713d";
    ctx.lineWidth = s * 0.022;
    ctx.beginPath();
    ctx.arc(s * 0.05, 0, s * 0.32, -1.12, 1.12);
    ctx.stroke();
    ctx.strokeStyle = "rgba(240,224,184,.72)";
    ctx.lineWidth = s * 0.008;
    ctx.beginPath();
    ctx.moveTo(s * 0.05 + Math.cos(-1.12) * s * 0.32, Math.sin(-1.12) * s * 0.32);
    ctx.lineTo(s * 0.05 + Math.cos(1.12) * s * 0.32, Math.sin(1.12) * s * 0.32);
    ctx.stroke();
  } else {
    ctx.translate(bodyR * 1.02, bodyR * 0.1);
    ctx.rotate(0.16);
    ctx.strokeStyle = "#82603d";
    ctx.lineWidth = s * 0.026;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.38);
    ctx.lineTo(0, s * 0.27);
    ctx.stroke();
    glowCircle(ctx, 0, -s * 0.39, s * 0.16, "rgba(184,146,255,.8)", 0.7);
    const orb = ctx.createRadialGradient(-s * 0.015, -s * 0.405, 0, 0, -s * 0.39, s * 0.07);
    orb.addColorStop(0, "#fff6e0");
    orb.addColorStop(0.45, "#c7a7ff");
    orb.addColorStop(1, "#6642c6");
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.arc(0, -s * 0.39, s * 0.065, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = style.accent;
    ctx.lineWidth = s * 0.012;
    ctx.beginPath();
    ctx.arc(0, -s * 0.39, s * 0.1, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Body
  ctx.save();
  ctx.scale(breathe, 1 / breathe);
  const bodyGrad = ctx.createRadialGradient(-bodyR * 0.36, -bodyR * 0.46, bodyR * 0.08, 0, 0, bodyR * 1.16);
  bodyGrad.addColorStop(0, style.bodyLight);
  bodyGrad.addColorStop(0.38, style.bodyMid);
  bodyGrad.addColorStop(0.82, style.bodyDark);
  bodyGrad.addColorStop(1, "#101629");
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyR * 1.03, bodyR * 1.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rim light
  ctx.strokeStyle = "rgba(255,244,207,.34)";
  ctx.lineWidth = s * 0.012;
  ctx.beginPath();
  ctx.arc(0, 0, bodyR * 1.02, Math.PI * 1.05, Math.PI * 1.62);
  ctx.stroke();

  // Top sheen
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(-bodyR * 0.32, -bodyR * 0.48, bodyR * 0.34, bodyR * 0.2, -0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Face plate (soft)
  ctx.fillStyle = "rgba(8,12,26,.16)";
  ctx.beginPath();
  ctx.ellipse(0, bodyR * 0.12, bodyR * 0.63, bodyR * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  const eyeY = -bodyR * 0.06;
  const eyeX = bodyR * 0.33;
  ctx.save();
  ctx.scale(1, blink);
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#fdf7e8";
    ctx.beginPath();
    ctx.ellipse(side * eyeX, eyeY, bodyR * 0.17, bodyR * 0.22, side * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = style.eye;
    ctx.beginPath();
    ctx.ellipse(side * eyeX + bodyR * 0.02, eyeY + bodyR * 0.025, bodyR * 0.09, bodyR * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.beginPath();
    ctx.arc(side * eyeX - bodyR * 0.01, eyeY - bodyR * 0.045, bodyR * 0.038, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Cheeks and mouth
  ctx.fillStyle = classId === "mage" ? "rgba(255,150,190,.32)" : "rgba(255,145,145,.22)";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * bodyR * 0.55, bodyR * 0.27, bodyR * 0.11, bodyR * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(25,20,30,.62)";
  ctx.lineWidth = s * 0.012;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, bodyR * 0.2, bodyR * 0.14, 0.18, Math.PI - 0.18);
  ctx.stroke();

  // Class headgear
  if (classId === "knight") {
    ctx.save();
    const helm = ctx.createLinearGradient(0, -bodyR * 0.95, 0, -bodyR * 0.28);
    helm.addColorStop(0, "#f0f6ff");
    helm.addColorStop(0.42, style.metal);
    helm.addColorStop(1, style.metalDark);
    ctx.fillStyle = helm;
    ctx.beginPath();
    ctx.arc(0, -bodyR * 0.3, bodyR * 0.93, Math.PI * 1.06, Math.PI * 1.94);
    ctx.lineTo(bodyR * 0.82, -bodyR * 0.22);
    ctx.quadraticCurveTo(0, -bodyR * 0.46, -bodyR * 0.82, -bodyR * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,240,190,.38)";
    ctx.lineWidth = s * 0.012;
    ctx.beginPath();
    ctx.arc(0, -bodyR * 0.3, bodyR * 0.88, Math.PI * 1.1, Math.PI * 1.62);
    ctx.stroke();
    ctx.fillStyle = style.accent;
    rr(ctx, -bodyR * 0.09, -bodyR * 1.1, bodyR * 0.18, bodyR * 0.4, bodyR * 0.08);
    ctx.fill();
    ctx.fillStyle = "#b64b58";
    ctx.beginPath();
    ctx.moveTo(0, -bodyR * 1.12);
    ctx.quadraticCurveTo(bodyR * 0.34, -bodyR * 1.52, bodyR * 0.18, -bodyR * 1.78);
    ctx.quadraticCurveTo(bodyR * 0.02, -bodyR * 1.46, -bodyR * 0.2, -bodyR * 1.36);
    ctx.closePath();
    ctx.fill();
    // nose guard
    ctx.fillStyle = style.metal;
    ctx.beginPath();
    ctx.moveTo(-bodyR * 0.07, -bodyR * 0.32);
    ctx.lineTo(bodyR * 0.07, -bodyR * 0.32);
    ctx.lineTo(0, bodyR * 0.04);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (classId === "ranger") {
    ctx.save();
    const hood = ctx.createLinearGradient(0, -bodyR * 1.05, 0, bodyR * 0.2);
    hood.addColorStop(0, "#8fdbac");
    hood.addColorStop(0.45, "#3f9d74");
    hood.addColorStop(1, "#1e5847");
    ctx.fillStyle = hood;
    ctx.beginPath();
    ctx.moveTo(-bodyR * 0.9, -bodyR * 0.2);
    ctx.quadraticCurveTo(-bodyR * 1.15, -bodyR * 1.12, 0, -bodyR * 1.1);
    ctx.quadraticCurveTo(bodyR * 1.15, -bodyR * 1.12, bodyR * 0.9, -bodyR * 0.2);
    ctx.quadraticCurveTo(bodyR * 0.7, -bodyR * 0.5, 0, -bodyR * 0.54);
    ctx.quadraticCurveTo(-bodyR * 0.7, -bodyR * 0.5, -bodyR * 0.9, -bodyR * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(205,255,224,.26)";
    ctx.lineWidth = s * 0.01;
    ctx.beginPath();
    ctx.arc(0, -bodyR * 0.33, bodyR * 0.92, Math.PI * 1.1, Math.PI * 1.55);
    ctx.stroke();
    // feather
    ctx.fillStyle = "#f0cf79";
    ctx.beginPath();
    ctx.moveTo(bodyR * 0.64, -bodyR * 0.82);
    ctx.quadraticCurveTo(bodyR * 1.12, -bodyR * 1.38, bodyR * 0.92, -bodyR * 1.5);
    ctx.quadraticCurveTo(bodyR * 0.52, -bodyR * 1.15, bodyR * 0.64, -bodyR * 0.82);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.save();
    const hat = ctx.createLinearGradient(0, -bodyR * 2.1, 0, -bodyR * 0.25);
    hat.addColorStop(0, "#b29aff");
    hat.addColorStop(0.55, "#7152c9");
    hat.addColorStop(1, "#3b2877");
    ctx.fillStyle = hat;
    ctx.beginPath();
    ctx.ellipse(0, -bodyR * 0.62, bodyR * 1.12, bodyR * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-bodyR * 0.72, -bodyR * 0.67);
    ctx.quadraticCurveTo(-bodyR * 0.58, -bodyR * 1.62, bodyR * 0.24, -bodyR * 1.92);
    ctx.quadraticCurveTo(bodyR * 0.58, -bodyR * 1.9, bodyR * 0.18, -bodyR * 1.46);
    ctx.quadraticCurveTo(bodyR * 0.5, -bodyR * 1.12, bodyR * 0.72, -bodyR * 0.67);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = style.accent;
    ctx.lineWidth = s * 0.012;
    ctx.beginPath();
    ctx.moveTo(-bodyR * 0.62, -bodyR * 0.72);
    ctx.quadraticCurveTo(0, -bodyR * 0.9, bodyR * 0.62, -bodyR * 0.72);
    ctx.stroke();
    // star charm
    ctx.fillStyle = "#ffe6a3";
    ctx.save();
    ctx.translate(bodyR * 0.35, -bodyR * 0.78);
    ctx.rotate(time * 0.3);
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const r = i % 2 === 0 ? bodyR * 0.12 : bodyR * 0.045;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  // Feet
  ctx.fillStyle = style.bodyDark;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * bodyR * 0.46, bodyR * 0.99, bodyR * 0.25, bodyR * 0.13, side * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Knight pauldrons
  if (classId === "knight") {
    for (const side of [-1, 1]) {
      const pg = ctx.createRadialGradient(side * bodyR * 0.9, -bodyR * 0.12, 0, side * bodyR * 0.9, -bodyR * 0.12, bodyR * 0.3);
      pg.addColorStop(0, "#eef4ff");
      pg.addColorStop(0.55, "#9caecb");
      pg.addColorStop(1, "#4f5e7c");
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(side * bodyR * 0.9, -bodyR * 0.12, bodyR * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,235,183,.4)";
      ctx.lineWidth = s * 0.009;
      ctx.beginPath();
      ctx.arc(side * bodyR * 0.9, -bodyR * 0.12, bodyR * 0.24, Math.PI * 1.05, Math.PI * 1.6);
      ctx.stroke();
    }
  }

  ctx.restore();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Enemies                                                             */
/* ------------------------------------------------------------------ */

export function drawEnemy(ctx, cx, cy, size, enemy, time, theme) {
  const s = size;
  const t = time + (hash2(enemy.x, enemy.y) * 4);
  const bob = Math.sin(t * (enemy.kind === "bat" ? 7 : 2.8)) * s * 0.022;
  const bossScale = enemy.boss ? 1.48 : 1;
  const scale = s * bossScale;

  ctx.save();
  ctx.translate(cx, cy + bob);
  drawShadow(ctx, 0, s * 0.4, s * (enemy.boss ? 0.44 : 0.29), s * 0.075, enemy.boss ? 0.45 : 0.3);

  if (enemy.boss) {
    glowCircle(ctx, 0, 0, s * 0.95, "rgba(255,91,68,.55)", 0.5 + Math.sin(t * 2) * 0.08);
    ctx.save();
    ctx.rotate(t * 0.14);
    ctx.strokeStyle = "rgba(255,130,95,.25)";
    ctx.lineWidth = s * 0.018;
    ctx.setLineDash([s * 0.08, s * 0.12]);
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.67, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (enemy.kind === "slime") drawSlime(ctx, scale, t, theme);
  else if (enemy.kind === "bat") drawBat(ctx, scale, t, theme);
  else if (enemy.kind === "goblin") drawGoblin(ctx, scale, t, theme);
  else if (enemy.kind === "skeleton") drawSkeleton(ctx, scale, t, theme);
  else if (enemy.kind === "wraith") drawWraith(ctx, scale, t, theme);
  else if (enemy.kind === "warden") drawWarden(ctx, scale, t, theme);

  if (enemy.stun > 0) {
    ctx.save();
    ctx.translate(0, -scale * 0.56);
    ctx.fillStyle = "#ffe6a3";
    for (let i = 0; i < 3; i += 1) {
      const a = t * 2.4 + (i / 3) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * scale * 0.18, Math.sin(a) * scale * 0.06, scale * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

function drawSlime(ctx, s, t, theme) {
  const wobble = Math.sin(t * 3.1) * s * 0.018;
  const g = ctx.createRadialGradient(-s * 0.1, -s * 0.14, s * 0.02, 0, s * 0.05, s * 0.36);
  g.addColorStop(0, "#d9ffd6");
  g.addColorStop(0.25, "#78d98b");
  g.addColorStop(0.7, "#2d8459");
  g.addColorStop(1, "#123f36");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-s * 0.31, s * 0.25);
  ctx.bezierCurveTo(-s * 0.38, -s * 0.05 + wobble, -s * 0.16, -s * 0.34, 0, -s * 0.33 + wobble);
  ctx.bezierCurveTo(s * 0.17, -s * 0.34, s * 0.38, -s * 0.05 - wobble, s * 0.31, s * 0.25);
  ctx.bezierCurveTo(s * 0.18, s * 0.37, -s * 0.18, s * 0.37, -s * 0.31, s * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(210,255,220,.28)";
  ctx.lineWidth = s * 0.012;
  ctx.stroke();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#f3ffe9";
  ctx.beginPath();
  ctx.ellipse(-s * 0.1, -s * 0.2, s * 0.09, s * 0.05, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#f8ffe9";
    ctx.beginPath();
    ctx.ellipse(side * s * 0.105, -s * 0.06, s * 0.045, s * 0.058, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#162b21";
    ctx.beginPath();
    ctx.arc(side * s * 0.11, -s * 0.052, s * 0.021, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#1b3e2d";
  ctx.lineWidth = s * 0.012;
  ctx.beginPath();
  ctx.arc(0, s * 0.07, s * 0.055, 0.2, Math.PI - 0.2);
  ctx.stroke();
}

function drawBat(ctx, s, t, theme) {
  const flap = Math.sin(t * 10) * 0.55;
  ctx.fillStyle = "#3d2a52";
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.beginPath();
    ctx.moveTo(s * 0.1, -s * 0.02);
    ctx.quadraticCurveTo(s * 0.3, -s * 0.28 - flap * s * 0.18, s * 0.47, -s * 0.08);
    ctx.quadraticCurveTo(s * 0.34, -s * 0.06, s * 0.35, s * 0.1);
    ctx.quadraticCurveTo(s * 0.24, s * 0.02, s * 0.1, s * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(170,130,220,.18)";
    ctx.lineWidth = s * 0.01;
    ctx.stroke();
    ctx.restore();
  }
  const g = ctx.createRadialGradient(-s * 0.05, -s * 0.1, 0, 0, 0, s * 0.24);
  g.addColorStop(0, "#8e6bb3");
  g.addColorStop(0.55, "#50356d");
  g.addColorStop(1, "#241632");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.16, s * 0.21, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3d2a52";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * s * 0.08, -s * 0.17);
    ctx.lineTo(side * s * 0.13, -s * 0.31);
    ctx.lineTo(side * s * 0.19, -s * 0.14);
    ctx.closePath();
    ctx.fill();
  }
  for (const side of [-1, 1]) {
    glowCircle(ctx, side * s * 0.065, -s * 0.03, s * 0.055, "rgba(255,116,150,.9)", 0.7);
    ctx.fillStyle = "#ffe3ed";
    ctx.beginPath();
    ctx.ellipse(side * s * 0.065, -s * 0.03, s * 0.035, s * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3b0b1b";
    ctx.beginPath();
    ctx.arc(side * s * 0.065, -s * 0.028, s * 0.014, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#f4e6dd";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * s * 0.04, s * 0.09);
    ctx.lineTo(side * s * 0.065, s * 0.15);
    ctx.lineTo(side * s * 0.085, s * 0.09);
    ctx.closePath();
    ctx.fill();
  }
}

function drawGoblin(ctx, s, t, theme) {
  const g = ctx.createRadialGradient(-s * 0.08, -s * 0.12, 0, 0, 0, s * 0.34);
  g.addColorStop(0, "#c7e77f");
  g.addColorStop(0.45, "#79a84f");
  g.addColorStop(1, "#31502f");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, s * 0.02, s * 0.28, s * 0.29, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(225,255,190,.22)";
  ctx.lineWidth = s * 0.01;
  ctx.stroke();
  ctx.fillStyle = "#6d9447";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * s * 0.23, -s * 0.06);
    ctx.lineTo(side * s * 0.47, -s * 0.2);
    ctx.lineTo(side * s * 0.3, s * 0.07);
    ctx.closePath();
    ctx.fill();
  }
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#f8e79b";
    ctx.beginPath();
    ctx.ellipse(side * s * 0.105, -s * 0.05, s * 0.05, s * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#221c10";
    ctx.beginPath();
    ctx.arc(side * s * 0.11, -s * 0.045, s * 0.02, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#27361f";
  ctx.lineWidth = s * 0.015;
  ctx.beginPath();
  ctx.arc(0, s * 0.08, s * 0.1, 0.12, Math.PI - 0.12);
  ctx.stroke();
  ctx.fillStyle = "#f2e6c9";
  ctx.beginPath();
  ctx.moveTo(-s * 0.04, s * 0.1);
  ctx.lineTo(-s * 0.02, s * 0.15);
  ctx.lineTo(0, s * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.translate(s * 0.24, s * 0.04);
  ctx.rotate(-0.5);
  ctx.fillStyle = "#b9c4d1";
  ctx.beginPath();
  ctx.moveTo(-s * 0.025, 0);
  ctx.lineTo(s * 0.02, -s * 0.28);
  ctx.lineTo(s * 0.04, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#6d4b2a";
  rr(ctx, -s * 0.06, -s * 0.01, s * 0.13, s * 0.035, s * 0.015);
  ctx.fill();
  ctx.restore();
}

function drawSkeleton(ctx, s, t, theme) {
  const g = ctx.createRadialGradient(-s * 0.08, -s * 0.14, 0, 0, 0, s * 0.33);
  g.addColorStop(0, "#fff4d5");
  g.addColorStop(0.55, "#c7b58e");
  g.addColorStop(1, "#6c5c44");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.03, s * 0.24, s * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1b1712";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * s * 0.09, -s * 0.07, s * 0.06, s * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();
    glowCircle(ctx, side * s * 0.09, -s * 0.07, s * 0.045, "rgba(115,216,239,.9)", 0.8);
  }
  ctx.fillStyle = "#3d3529";
  ctx.beginPath();
  ctx.moveTo(-s * 0.04, s * 0.08);
  ctx.lineTo(s * 0.04, s * 0.08);
  ctx.lineTo(0, s * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#b7a77f";
  for (let i = -2; i <= 2; i += 1) {
    rr(ctx, i * s * 0.07 - s * 0.018, s * 0.17, s * 0.036, s * 0.16, s * 0.012);
    ctx.fill();
  }
  ctx.fillStyle = "#a99771";
  ctx.beginPath();
  ctx.ellipse(0, s * 0.36, s * 0.16, s * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8b7c5e";
  ctx.lineWidth = s * 0.012;
  ctx.beginPath();
  ctx.moveTo(-s * 0.2, s * 0.02);
  ctx.lineTo(-s * 0.31, s * 0.18);
  ctx.moveTo(s * 0.2, s * 0.02);
  ctx.lineTo(s * 0.31, s * 0.18);
  ctx.stroke();
  ctx.save();
  ctx.translate(s * 0.3, -s * 0.01);
  ctx.rotate(-0.34);
  ctx.fillStyle = "#ccd6e3";
  ctx.beginPath();
  ctx.moveTo(-s * 0.025, -s * 0.24);
  ctx.lineTo(s * 0.02, s * 0.16);
  ctx.lineTo(s * 0.045, -s * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawWraith(ctx, s, t, theme) {
  const sway = Math.sin(t * 1.8) * s * 0.02;
  const g = ctx.createLinearGradient(0, -s * 0.4, 0, s * 0.4);
  g.addColorStop(0, "#7a68a4");
  g.addColorStop(0.4, "#43355e");
  g.addColorStop(1, "rgba(20,16,34,.16)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-s * 0.26, -s * 0.08);
  ctx.quadraticCurveTo(-s * 0.3, -s * 0.38, 0, -s * 0.42);
  ctx.quadraticCurveTo(s * 0.3, -s * 0.38, s * 0.26, -s * 0.08);
  ctx.quadraticCurveTo(s * 0.36, s * 0.14 + sway, s * 0.2, s * 0.34);
  ctx.quadraticCurveTo(s * 0.1, s * 0.25, 0, s * 0.38);
  ctx.quadraticCurveTo(-s * 0.1, s * 0.25, -s * 0.2, s * 0.34);
  ctx.quadraticCurveTo(-s * 0.36, s * 0.14 - sway, -s * 0.26, -s * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(190,165,255,.18)";
  ctx.lineWidth = s * 0.012;
  ctx.stroke();
  ctx.fillStyle = "#1d1328";
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.12, s * 0.17, s * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const side of [-1, 1]) {
    glowCircle(ctx, side * s * 0.075, -s * 0.13, s * 0.07, "rgba(255,116,150,.85)", 0.8);
    ctx.fillStyle = "#ffe6f0";
    ctx.beginPath();
    ctx.ellipse(side * s * 0.075, -s * 0.13, s * 0.026, s * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 3; i += 1) {
    const a = t * 1.4 + i * 2.1;
    ctx.fillStyle = "#b8a3ff";
    ctx.beginPath();
    ctx.arc(Math.cos(a) * s * 0.32, Math.sin(a * 1.3) * s * 0.28, s * 0.018, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawWarden(ctx, s, t, theme) {
  const pulse = 0.82 + Math.sin(t * 2.2) * 0.08;
  // Cloak
  const cloak = ctx.createLinearGradient(0, -s * 0.5, 0, s * 0.48);
  cloak.addColorStop(0, "#6f2d38");
  cloak.addColorStop(0.5, "#3c1824");
  cloak.addColorStop(1, "rgba(15,5,12,.4)");
  ctx.fillStyle = cloak;
  ctx.beginPath();
  ctx.moveTo(-s * 0.38, -s * 0.12);
  ctx.quadraticCurveTo(-s * 0.48, s * 0.18, -s * 0.34, s * 0.46);
  ctx.quadraticCurveTo(-s * 0.18, s * 0.35, 0, s * 0.5);
  ctx.quadraticCurveTo(s * 0.18, s * 0.35, s * 0.34, s * 0.46);
  ctx.quadraticCurveTo(s * 0.48, s * 0.18, s * 0.38, -s * 0.12);
  ctx.closePath();
  ctx.fill();

  // Body
  const body = ctx.createRadialGradient(-s * 0.1, -s * 0.2, 0, 0, 0, s * 0.4);
  body.addColorStop(0, "#d97766");
  body.addColorStop(0.32, "#8f3b43");
  body.addColorStop(0.72, "#4a1b29");
  body.addColorStop(1, "#1c0a13");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.33, s * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Lava cracks
  ctx.save();
  ctx.strokeStyle = `rgba(255,140,80,${pulse})`;
  ctx.lineWidth = s * 0.015;
  ctx.shadowColor = "#ff6b4f";
  ctx.shadowBlur = s * 0.16;
  ctx.beginPath();
  ctx.moveTo(-s * 0.18, -s * 0.12);
  ctx.lineTo(-s * 0.06, s * 0.03);
  ctx.lineTo(-s * 0.12, s * 0.17);
  ctx.moveTo(s * 0.19, -s * 0.16);
  ctx.lineTo(s * 0.1, s * 0.01);
  ctx.lineTo(s * 0.17, s * 0.2);
  ctx.stroke();
  ctx.restore();

  // Horns
  ctx.fillStyle = "#e0c6a1";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * s * 0.16, -s * 0.26);
    ctx.quadraticCurveTo(side * s * 0.33, -s * 0.55, side * s * 0.24, -s * 0.65);
    ctx.quadraticCurveTo(side * s * 0.29, -s * 0.43, side * s * 0.28, -s * 0.22);
    ctx.closePath();
    ctx.fill();
  }

  // Crown
  ctx.fillStyle = "#ffce72";
  ctx.shadowColor = "rgba(255,190,90,.7)";
  ctx.shadowBlur = s * 0.1;
  ctx.beginPath();
  ctx.moveTo(-s * 0.22, -s * 0.34);
  ctx.lineTo(-s * 0.16, -s * 0.52);
  ctx.lineTo(-s * 0.06, -s * 0.4);
  ctx.lineTo(0, -s * 0.56);
  ctx.lineTo(s * 0.06, -s * 0.4);
  ctx.lineTo(s * 0.16, -s * 0.52);
  ctx.lineTo(s * 0.22, -s * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Face
  ctx.fillStyle = "#17070d";
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.13, s * 0.17, s * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const side of [-1, 1]) {
    glowCircle(ctx, side * s * 0.075, -s * 0.14, s * 0.085, "rgba(255,104,74,.95)", 0.9);
    ctx.fillStyle = "#ffe4b0";
    ctx.beginPath();
    ctx.ellipse(side * s * 0.075, -s * 0.14, s * 0.035, s * 0.026, side * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4b0b0b";
    ctx.beginPath();
    ctx.ellipse(side * s * 0.075, -s * 0.14, s * 0.012, s * 0.02, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Grin
  ctx.strokeStyle = "#ffb07a";
  ctx.lineWidth = s * 0.014;
  ctx.beginPath();
  ctx.arc(0, -s * 0.04, s * 0.1, 0.18, Math.PI - 0.18);
  ctx.stroke();

  // Arms and claws
  ctx.strokeStyle = "#5b202c";
  ctx.lineWidth = s * 0.055;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-s * 0.26, -s * 0.02);
  ctx.lineTo(-s * 0.43, s * 0.16);
  ctx.moveTo(s * 0.26, -s * 0.02);
  ctx.lineTo(s * 0.43, s * 0.16);
  ctx.stroke();
  ctx.fillStyle = "#e6c9a4";
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(side * s * 0.43, s * 0.16);
      ctx.lineTo(side * (s * 0.49 + i * s * 0.01), s * (0.12 + i * 0.045));
      ctx.lineTo(side * (s * 0.46 + i * s * 0.012), s * (0.2 + i * 0.04));
      ctx.closePath();
      ctx.fill();
    }
  }

  // Embers
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 7; i += 1) {
    const a = t * (0.5 + i * 0.07) + i * 1.7;
    const rad = s * (0.34 + 0.1 * Math.sin(t + i));
    const x = Math.cos(a) * rad;
    const y = Math.sin(a * 1.4) * s * 0.3;
    const alpha = 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(t * 3 + i));
    ctx.fillStyle = `rgba(255,${110 + i * 8},70,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.018, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

/* ------------------------------------------------------------------ */
/* Portraits                                                           */
/* ------------------------------------------------------------------ */

export function drawPortrait(canvas, classId) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.55, w * 0.62);
  if (classId === "ranger") {
    bg.addColorStop(0, "rgba(91,214,160,.2)");
    bg.addColorStop(0.55, "rgba(20,50,42,.08)");
  } else if (classId === "mage") {
    bg.addColorStop(0, "rgba(160,132,255,.22)");
    bg.addColorStop(0.55, "rgba(48,30,90,.08)");
  } else {
    bg.addColorStop(0, "rgba(126,166,255,.22)");
    bg.addColorStop(0.55, "rgba(34,48,90,.08)");
  }
  bg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = "rgba(255,224,170,.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.5, w * 0.32, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([3, 9]);
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.5, w * 0.39, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  drawHero(ctx, w * 0.5, h * 0.51, w * 0.72, classId, 0.6, { avatar: false });
}

export function drawAvatar(canvas, classId) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.3, 0, w * 0.5, h * 0.6, w * 0.6);
  bg.addColorStop(0, classId === "ranger" ? "#1c4e3d" : classId === "mage" ? "#3c2a68" : "#2c3b62");
  bg.addColorStop(1, "#0b1020");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  drawHero(ctx, w * 0.5, h * 0.54, w * 0.78, classId, 0.4, { avatar: true });
}

/* ------------------------------------------------------------------ */
/* Ambient scene                                                       */
/* ------------------------------------------------------------------ */

export class AmbientScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.pointer = { x: 0.5, y: 0.5 };
    this.embers = [];
    this.time = 0;
    this.resize();
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.dpr = dpr;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.embers = Array.from({ length: Math.min(90, Math.floor(this.w / 14)) }, () => this.makeEmber(true));
  }

  makeEmber(initial = false) {
    return {
      x: Math.random() * this.w,
      y: initial ? Math.random() * this.h : this.h + 20,
      r: 0.5 + Math.random() * 1.8,
      speed: 6 + Math.random() * 20,
      drift: (Math.random() - 0.5) * 10,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.12 + Math.random() * 0.5,
      hue: Math.random() < 0.24 ? "teal" : "gold"
    };
  }

  update(dt) {
    this.time += dt;
    for (let i = 0; i < this.embers.length; i += 1) {
      const e = this.embers[i];
      e.y -= e.speed * dt;
      e.x += Math.sin(this.time * 0.7 + e.phase) * e.drift * dt;
      if (e.y < -20) this.embers[i] = this.makeEmber(false);
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    const t = this.time;
    const px = (this.pointer.x - 0.5) * 16;
    const py = (this.pointer.y - 0.5) * 10;

    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#060913");
    bg.addColorStop(0.42, "#0a1022");
    bg.addColorStop(0.7, "#10132a");
    bg.addColorStop(1, "#080a14");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const moonX = w * 0.5 + px * 0.4;
    const moonY = h * 0.36 + py * 0.3;
    const moonR = Math.min(w, h) * 0.16;
    glowCircle(ctx, moonX, moonY, moonR * 3.2, "rgba(94,75,160,.16)", 0.55);
    const moon = ctx.createRadialGradient(moonX - moonR * 0.2, moonY - moonR * 0.2, 0, moonX, moonY, moonR);
    moon.addColorStop(0, "rgba(255,230,178,.16)");
    moon.addColorStop(0.5, "rgba(196,161,236,.08)");
    moon.addColorStop(1, "rgba(120,90,190,0)");
    ctx.fillStyle = moon;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(230,203,151,.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([2, 12]);
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR * 0.93, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Distant arch
    const archW = Math.min(w * 0.52, 560);
    const archH = archW * 0.92;
    const ax = w * 0.5 + px * 0.8;
    const ay = h * 0.6 + py * 0.5;
    ctx.save();
    ctx.globalAlpha = 0.62;
    const archGrad = ctx.createLinearGradient(ax, ay - archH, ax, ay);
    archGrad.addColorStop(0, "rgba(37,45,78,.5)");
    archGrad.addColorStop(1, "rgba(10,13,26,.08)");
    ctx.fillStyle = archGrad;
    ctx.beginPath();
    ctx.moveTo(ax - archW * 0.5, ay);
    ctx.lineTo(ax - archW * 0.5, ay - archH * 0.42);
    ctx.quadraticCurveTo(ax - archW * 0.46, ay - archH * 0.92, ax, ay - archH * 0.95);
    ctx.quadraticCurveTo(ax + archW * 0.46, ay - archH * 0.92, ax + archW * 0.5, ay - archH * 0.42);
    ctx.lineTo(ax + archW * 0.5, ay);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(190,160,110,.12)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Pillars
    for (const side of [-1, 1]) {
      const bx = w * 0.5 + side * Math.min(w * 0.36, 430) + px * side * 1.5;
      const bw = Math.max(30, Math.min(w * 0.07, 92));
      const top = h * 0.16;
      const bottom = h * 1.04;
      const grad = ctx.createLinearGradient(bx - bw / 2, 0, bx + bw / 2, 0);
      grad.addColorStop(0, "rgba(3,5,12,.9)");
      grad.addColorStop(0.35, "rgba(22,27,48,.92)");
      grad.addColorStop(0.62, "rgba(38,43,70,.72)");
      grad.addColorStop(1, "rgba(3,5,12,.92)");
      ctx.fillStyle = grad;
      ctx.fillRect(bx - bw / 2, top, bw, bottom - top);
      ctx.fillStyle = "rgba(7,9,18,.95)";
      ctx.fillRect(bx - bw * 0.66, top - 12, bw * 1.32, 16);
      ctx.fillRect(bx - bw * 0.58, top + 6, bw * 1.16, 9);
      for (let i = 0; i < 5; i += 1) {
        ctx.strokeStyle = "rgba(0,0,0,.25)";
        ctx.lineWidth = 1;
        const yy = top + ((bottom - top) / 5) * i + 24;
        ctx.beginPath();
        ctx.moveTo(bx - bw / 2, yy);
        ctx.lineTo(bx + bw / 2, yy + 6);
        ctx.stroke();
      }
      // torch
      const tx = bx + side * bw * 0.52;
      const ty = h * 0.31;
      const flicker = 0.8 + Math.sin(t * 8 + side) * 0.1 + Math.sin(t * 19 + side * 3) * 0.06;
      glowCircle(ctx, tx, ty, 90 * flicker, side > 0 ? "rgba(255,164,82,.22)" : "rgba(120,214,230,.16)", 0.6);
      ctx.fillStyle = "#47341f";
      ctx.fillRect(tx - 2, ty, 4, 18);
      const flame = ctx.createRadialGradient(tx, ty - 5, 0, tx, ty - 5, 14);
      flame.addColorStop(0, "#fff4cc");
      flame.addColorStop(0.35, "#ffc46b");
      flame.addColorStop(0.7, "rgba(255,112,54,.8)");
      flame.addColorStop(1, "rgba(255,80,30,0)");
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.ellipse(tx, ty - 8, 7 * flicker, 15 * flicker, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Floor fog
    for (let layer = 0; layer < 3; layer += 1) {
      const y = h * (0.62 + layer * 0.1);
      const grad = ctx.createLinearGradient(0, y - 80, 0, y + 100);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(0.5, `rgba(40,52,88,${0.05 + layer * 0.015})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, y - 80, w, 180);
    }

    // Embers
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const e of this.embers) {
      const alpha = e.alpha * (0.55 + 0.45 * Math.sin(t * 1.8 + e.phase));
      ctx.fillStyle = e.hue === "teal" ? `rgba(130,225,220,${alpha})` : `rgba(255,190,105,${alpha})`;
      ctx.beginPath();
      ctx.arc(e.x + Math.sin(t * 0.3 + e.phase) * 8, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Bottom fade
    const fade = ctx.createLinearGradient(0, h * 0.74, 0, h);
    fade.addColorStop(0, "rgba(5,7,14,0)");
    fade.addColorStop(1, "rgba(5,7,14,.82)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, h * 0.74, w, h * 0.26);
  }
}

/* ------------------------------------------------------------------ */
/* Dungeon renderer                                                    */
/* ------------------------------------------------------------------ */

export class DungeonRenderer {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.state = state;
    this.cssW = 0;
    this.cssH = 0;
    this.dpr = 1;
    this.layout = { tile: 30, ox: 0, oy: 0 };
    this.anims = new Map();
    this.particles = [];
    this.floats = [];
    this.rings = [];
    this.shakeAmount = 0;
    this.shakeTime = 0;
    this.pointer = null;
    this.hintAlpha = 1;
    this.lastTime = 0;
    this.ambientSpawn = 0;
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cssW = Math.max(1, rect.width);
    this.cssH = Math.max(1, rect.height);
    this.dpr = dpr;
    this.canvas.width = Math.round(this.cssW * dpr);
    this.canvas.height = Math.round(this.cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.computeLayout();
  }

  computeLayout() {
    const { cols, rows } = this.state;
    const pad = Math.max(8, Math.min(this.cssW, this.cssH) * 0.035);
    const tile = Math.max(12, Math.min((this.cssW - pad * 2) / cols, (this.cssH - pad * 2) / rows));
    const boardW = tile * cols;
    const boardH = tile * rows;
    this.layout = {
      tile,
      ox: (this.cssW - boardW) / 2,
      oy: (this.cssH - boardH) / 2,
      pad,
      boardW,
      boardH
    };
  }

  setState(state) {
    this.state = state;
    this.anims.clear();
    this.particles.length = 0;
    this.floats.length = 0;
    this.rings.length = 0;
    this.pointer = null;
    this.computeLayout();
  }

  worldToScreen(x, y) {
    const { tile, ox, oy } = this.layout;
    return { x: ox + (x + 0.5) * tile, y: oy + (y + 0.5) * tile };
  }

  tileFromClient(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const { tile, ox, oy } = this.layout;
    const tx = Math.floor((x - ox) / tile);
    const ty = Math.floor((y - oy) / tile);
    if (tx < 0 || ty < 0 || tx >= this.state.cols || ty >= this.state.rows) return null;
    return { x: tx, y: ty };
  }

  setPointer(tile) {
    this.pointer = tile;
  }

  animateMove(entity, from, to, duration = 150) {
    this.anims.set(entity.id || "player", {
      type: "move",
      fx: from.x,
      fy: from.y,
      tx: to.x,
      ty: to.y,
      start: performance.now(),
      duration
    });
  }

  animateLunge(entity, dx, dy, duration = 230) {
    this.anims.set(entity.id || "player", {
      type: "lunge",
      dx,
      dy,
      start: performance.now(),
      duration
    });
  }

  shake(amount = 5) {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
    this.shakeTime = performance.now();
  }

  burst(x, y, color, count = 12, options = {}) {
    const tile = this.layout.tile;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.5 + Math.random() * 2.2) * (options.speed || 1);
      this.particles.push({
        x: x + (Math.random() - 0.5) * 0.2,
        y: y + (Math.random() - 0.5) * 0.2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (options.lift || 0.5),
        life: 0,
        maxLife: 0.45 + Math.random() * 0.55,
        size: tile * (options.size || 0.045) * (0.5 + Math.random()),
        color,
        gravity: options.gravity ?? 2.4,
        drag: options.drag ?? 1.6,
        glow: options.glow !== false,
        shape: options.shape || "circle"
      });
    }
  }

  floatText(text, x, y, color = "#fff1c9", options = {}) {
    this.floats.push({
      text,
      x,
      y,
      color,
      life: 0,
      maxLife: options.life || 0.95,
      size: options.size || 1,
      vy: options.vy || -1.15,
      glow: options.glow || color
    });
  }

  ring(x, y, color, options = {}) {
    this.rings.push({
      x,
      y,
      color,
      life: 0,
      maxLife: options.life || 0.55,
      radius: options.radius || 0.7,
      width: options.width || 0.045
    });
  }

  entityPos(entity, now) {
    let px = entity.x;
    let py = entity.y;
    const anim = this.anims.get(entity.id || "player");
    if (!anim) return { x: px, y: py, ox: 0, oy: 0 };
    const p = Math.min(1, (now - anim.start) / anim.duration);
    if (anim.type === "move") {
      const e = easeInOutCubic(p);
      px = anim.fx + (anim.tx - anim.fx) * e;
      py = anim.fy + (anim.ty - anim.fy) * e;
      if (p >= 1) this.anims.delete(entity.id || "player");
    } else if (anim.type === "lunge") {
      const e = Math.sin(p * Math.PI);
      px += anim.dx * e * 0.3;
      py += anim.dy * e * 0.3;
      if (p >= 1) this.anims.delete(entity.id || "player");
    }
    return { x: px, y: py };
  }

  update(dt, now) {
    this.hintAlpha = Math.max(0, this.hintAlpha - dt * 0.07);
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.vx *= Math.max(0, 1 - p.drag * dt);
      p.vy *= Math.max(0, 1 - p.drag * 0.25 * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = this.floats.length - 1; i >= 0; i -= 1) {
      const f = this.floats[i];
      f.life += dt;
      f.y += f.vy * dt;
      f.vy *= 1 - dt * 0.9;
      if (f.life >= f.maxLife) this.floats.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i -= 1) {
      const r = this.rings[i];
      r.life += dt;
      if (r.life >= r.maxLife) this.rings.splice(i, 1);
    }
    if (this.shakeAmount > 0) {
      this.shakeAmount = Math.max(0, this.shakeAmount - dt * 30);
    }

    this.ambientSpawn += dt;
    if (this.ambientSpawn > 0.12 && this.state.visible?.size) {
      this.ambientSpawn = 0;
      const visible = [...this.state.visible];
      const key = visible[Math.floor(Math.random() * visible.length)];
      const [x, y] = key.split(",").map(Number);
      if (this.state.map[y]?.[x] === FLOOR) {
        this.particles.push({
          x: x + Math.random(),
          y: y + Math.random(),
          vx: (Math.random() - 0.5) * 0.1,
          vy: -0.12 - Math.random() * 0.16,
          life: 0,
          maxLife: 1.8 + Math.random() * 1.8,
          size: this.layout.tile * 0.012 * (0.5 + Math.random()),
          color: this.state.theme.dust,
          gravity: -0.03,
          drag: 0.2,
          glow: true,
          shape: "circle"
        });
      }
    }

    if (this.state.boss?.alive && this.state.boss.visible) {
      if (Math.random() < dt * 2.4) {
        this.burst(this.state.boss.x + (Math.random() - 0.5), this.state.boss.y + (Math.random() - 0.5), "#ff7d55", 1, { lift: 0.4, size: 0.03, gravity: -0.8 });
      }
    }
  }

  render(now = performance.now()) {
    const ctx = this.ctx;
    const dt = this.lastTime ? Math.min(0.05, (now - this.lastTime) / 1000) : 0.016;
    this.lastTime = now;
    this.update(dt, now);

    const { tile, ox, oy, boardW, boardH } = this.layout;
    const theme = this.state.theme;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssW, this.cssH);

    // Board backdrop
    const boardGrad = ctx.createRadialGradient(this.cssW * 0.5, this.cssH * 0.42, 0, this.cssW * 0.5, this.cssH * 0.5, Math.max(this.cssW, this.cssH) * 0.72);
    boardGrad.addColorStop(0, theme.ambient);
    boardGrad.addColorStop(0.48, "rgba(8,12,23,.68)");
    boardGrad.addColorStop(1, theme.fog);
    ctx.fillStyle = boardGrad;
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    ctx.save();
    if (this.shakeAmount > 0) {
      const strength = this.shakeAmount;
      ctx.translate((Math.random() - 0.5) * strength, (Math.random() - 0.5) * strength);
    }

    // Board frame glow
    ctx.save();
    ctx.strokeStyle = theme.accentSoft;
    ctx.lineWidth = 1;
    ctx.shadowColor = theme.accent;
    ctx.shadowBlur = 22;
    rr(ctx, ox - 6, oy - 6, boardW + 12, boardH + 12, 14);
    ctx.stroke();
    ctx.restore();

    this.drawTiles(ctx, now);
    this.drawTorches(ctx, now);
    this.drawObjects(ctx, now);
    this.drawHints(ctx, now);
    this.drawEntities(ctx, now);
    this.drawEffects(ctx, now);
    this.drawVignette(ctx);
    ctx.restore();
  }

  drawTiles(ctx, now) {
    const { tile, ox, oy } = this.layout;
    const { map, cols, rows, theme, discovered, visible } = this.state;

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const px = ox + x * tile;
        const py = oy + y * tile;
        const key = `${x},${y}`;
        const isDiscovered = discovered.has(key);
        const isVisible = visible.has(key);
        const isWall = map[y][x] === WALL;

        if (!isDiscovered) {
          ctx.fillStyle = "#060a13";
          ctx.fillRect(px, py, tile + 0.4, tile + 0.4);
          ctx.strokeStyle = "rgba(255,255,255,.022)";
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, tile - 1, tile - 1);
          if (hash2(x, y, 2) > 0.84) {
            ctx.fillStyle = "rgba(140,160,210,.05)";
            ctx.beginPath();
            ctx.arc(px + tile * hash2(x, y, 4), py + tile * hash2(x, y, 5), tile * 0.018, 0, Math.PI * 2);
            ctx.fill();
          }
          continue;
        }

        if (isWall) this.drawWall(ctx, px, py, tile, x, y, theme, isVisible);
        else this.drawFloor(ctx, px, py, tile, x, y, theme, isVisible);

        if (!isVisible) {
          ctx.fillStyle = "rgba(4,7,15,.56)";
          ctx.fillRect(px, py, tile + 0.4, tile + 0.4);
        }
      }
    }
  }

  drawFloor(ctx, px, py, tile, x, y, theme, visible) {
    const variant = hash2(x, y, 1);
    const base = variant > 0.52 ? theme.floorAlt : theme.floor;
    ctx.fillStyle = base;
    ctx.fillRect(px, py, tile + 0.4, tile + 0.4);

    const inner = ctx.createLinearGradient(px, py, px + tile, py + tile);
    inner.addColorStop(0, "rgba(255,255,255,.035)");
    inner.addColorStop(0.45, "rgba(255,255,255,.008)");
    inner.addColorStop(1, "rgba(0,0,0,.12)");
    ctx.fillStyle = inner;
    ctx.fillRect(px + 1, py + 1, tile - 2, tile - 2);

    ctx.strokeStyle = "rgba(255,255,255,.028)";
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, tile - 1, tile - 1);

    // Tile seam
    ctx.strokeStyle = "rgba(0,0,0,.26)";
    ctx.beginPath();
    ctx.moveTo(px, py + tile - 1.5);
    ctx.lineTo(px + tile, py + tile - 1.5);
    ctx.moveTo(px + tile - 1.5, py);
    ctx.lineTo(px + tile - 1.5, py + tile);
    ctx.stroke();

    // Cracks
    if (variant > 0.45) {
      const hx = hash2(x, y, 7);
      const hy = hash2(x, y, 8);
      ctx.strokeStyle = theme.crack;
      ctx.lineWidth = Math.max(0.7, tile * 0.018);
      ctx.beginPath();
      ctx.moveTo(px + tile * (0.2 + hx * 0.2), py + tile * (0.15 + hy * 0.2));
      ctx.lineTo(px + tile * (0.48 + hx * 0.16), py + tile * (0.42 + hy * 0.2));
      ctx.lineTo(px + tile * (0.62 + hx * 0.2), py + tile * (0.38 + hy * 0.24));
      ctx.stroke();
      if (variant > 0.78) {
        ctx.beginPath();
        ctx.moveTo(px + tile * (0.48 + hx * 0.16), py + tile * (0.42 + hy * 0.2));
        ctx.lineTo(px + tile * (0.42 + hx * 0.1), py + tile * (0.7 + hy * 0.16));
        ctx.stroke();
      }
    }

    // Moss / rubble
    if (variant > 0.68) {
      const mx = px + tile * (0.12 + hash2(x, y, 10) * 0.6);
      const my = py + tile * (0.12 + hash2(x, y, 11) * 0.6);
      const grad = ctx.createRadialGradient(mx, my, 0, mx, my, tile * 0.16);
      grad.addColorStop(0, theme.moss);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(mx, my, tile * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (visible && variant > 0.86) {
      ctx.fillStyle = "rgba(255,255,255,.1)";
      ctx.beginPath();
      ctx.arc(px + tile * hash2(x, y, 12), py + tile * hash2(x, y, 13), tile * 0.012, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawWall(ctx, px, py, tile, x, y, theme, visible) {
    const variant = hash2(x, y, 3);
    const grad = ctx.createLinearGradient(px, py, px, py + tile);
    grad.addColorStop(0, theme.wallTop);
    grad.addColorStop(0.5, theme.wall);
    grad.addColorStop(1, "#111622");
    ctx.fillStyle = grad;
    ctx.fillRect(px, py, tile + 0.4, tile + 0.4);

    // Bevel
    ctx.strokeStyle = "rgba(255,255,255,.055)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 1, py + tile - 2);
    ctx.lineTo(px + 1, py + 1);
    ctx.lineTo(px + tile - 2, py + 1);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,.38)";
    ctx.beginPath();
    ctx.moveTo(px + tile - 1, py + 2);
    ctx.lineTo(px + tile - 1, py + tile - 1);
    ctx.lineTo(px + 2, py + tile - 1);
    ctx.stroke();

    // Brick seams
    ctx.strokeStyle = "rgba(0,0,0,.28)";
    ctx.lineWidth = Math.max(0.7, tile * 0.014);
    const rowH = tile / 2.3;
    for (let i = 1; i <= 2; i += 1) {
      const yy = py + rowH * i;
      ctx.beginPath();
      ctx.moveTo(px + 1, yy);
      ctx.lineTo(px + tile - 1, yy);
      ctx.stroke();
    }
    const offset = variant > 0.5 ? tile * 0.34 : tile * 0.64;
    ctx.beginPath();
    ctx.moveTo(px + offset, py + 1);
    ctx.lineTo(px + offset, py + rowH);
    ctx.moveTo(px + tile - offset, py + rowH);
    ctx.lineTo(px + tile - offset, py + rowH * 2);
    ctx.stroke();

    // Highlight chips
    if (variant > 0.6) {
      ctx.fillStyle = "rgba(255,255,255,.045)";
      ctx.fillRect(px + tile * 0.12, py + tile * 0.18, tile * 0.18, Math.max(1, tile * 0.025));
    }
    if (visible && variant > 0.72) {
      ctx.fillStyle = theme.moss;
      ctx.globalAlpha = 0.16;
      ctx.beginPath();
      ctx.arc(px + tile * hash2(x, y, 20), py + tile * 0.72, tile * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  drawTorches(ctx, now) {
    const { tile, ox, oy } = this.layout;
    const { map, cols, rows, theme, discovered, visible } = this.state;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (map[y][x] !== WALL) continue;
        if (!discovered.has(`${x},${y}`)) continue;
        if (hash2(x, y, 30) < 0.78) continue;
        const nearFloor =
          (map[y + 1]?.[x] === FLOOR) ||
          (map[y - 1]?.[x] === FLOOR) ||
          (map[y]?.[x + 1] === FLOOR) ||
          (map[y]?.[x - 1] === FLOOR);
        if (!nearFloor) continue;
        const px = ox + (x + 0.5) * tile;
        const py = oy + (y + 0.5) * tile;
        const flicker = 0.78 + Math.sin(now * 0.008 + x * 2.4 + y) * 0.12 + Math.sin(now * 0.021 + y * 1.3) * 0.06;
        const isVisible = visible.has(`${x},${y}`);
        const alpha = isVisible ? 1 : 0.42;
        ctx.save();
        ctx.globalAlpha = alpha;
        glowCircle(ctx, px, py, tile * (isVisible ? 1.7 : 0.9), theme.torch, isVisible ? 0.34 : 0.14);
        ctx.fillStyle = "#4a3825";
        ctx.fillRect(px - tile * 0.015, py + tile * 0.04, tile * 0.03, tile * 0.16);
        const flame = ctx.createRadialGradient(px, py - tile * 0.08, 0, px, py - tile * 0.08, tile * 0.19);
        flame.addColorStop(0, "#fff8dc");
        flame.addColorStop(0.28, theme.torch);
        flame.addColorStop(0.7, "rgba(255,92,48,.65)");
        flame.addColorStop(1, "rgba(255,60,20,0)");
        ctx.fillStyle = flame;
        ctx.beginPath();
        ctx.ellipse(px, py - tile * 0.1, tile * 0.075 * flicker, tile * 0.17 * flicker, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  drawObjects(ctx, now) {
    const { tile } = this.layout;
    const { objects, discovered, visible, stairsOpen } = this.state;
    for (const object of objects) {
      const key = `${object.x},${object.y}`;
      if (!discovered.has(key)) continue;
      const pos = this.worldToScreen(object.x, object.y);
      const alpha = visible.has(key) ? 1 : 0.4;
      ctx.save();
      ctx.globalAlpha = alpha;
      if (object.type === "stairs") this.drawStairs(ctx, pos.x, pos.y, tile, now, stairsOpen);
      else if (object.type === "sigil") this.drawSigil(ctx, pos.x, pos.y, tile, now);
      else if (object.type === "chest") this.drawChest(ctx, pos.x, pos.y, tile, now);
      else if (object.type === "potion") this.drawPotion(ctx, pos.x, pos.y, tile, now);
      else if (object.type === "gold") this.drawGold(ctx, pos.x, pos.y, tile, now);
      ctx.restore();
    }
  }

  drawStairs(ctx, x, y, tile, now, open) {
    ctx.save();
    const color = open ? "rgba(255,210,120," : "rgba(120,130,165,";
    const pulse = 0.6 + Math.sin(now * 0.003) * 0.2;
    glowCircle(ctx, x, y, tile * (open ? 0.9 : 0.45), open ? "rgba(255,196,100,.6)" : "rgba(120,140,190,.3)", open ? 0.28 : 0.14);
    ctx.fillStyle = "#05070d";
    ctx.beginPath();
    ctx.ellipse(x, y + tile * 0.04, tile * 0.33, tile * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 3; i += 1) {
      const rr2 = tile * (0.1 + i * 0.07);
      ctx.strokeStyle = `${color}${(open ? 0.62 - i * 0.12 : 0.28 - i * 0.06)})`;
      ctx.lineWidth = Math.max(1, tile * 0.014);
      ctx.beginPath();
      ctx.ellipse(x, y + tile * 0.04, rr2, rr2 * 0.76, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (open) {
      ctx.save();
      ctx.translate(x, y - tile * 0.03);
      ctx.rotate(now * 0.0008);
      ctx.strokeStyle = `rgba(255,219,140,${pulse})`;
      ctx.lineWidth = Math.max(1, tile * 0.018);
      ctx.setLineDash([tile * 0.05, tile * 0.07]);
      ctx.beginPath();
      ctx.arc(0, 0, tile * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = `rgba(255,230,166,${pulse})`;
      ctx.beginPath();
      ctx.moveTo(x - tile * 0.09, y - tile * 0.05);
      ctx.lineTo(x + tile * 0.09, y - tile * 0.05);
      ctx.lineTo(x, y + tile * 0.1);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 4; i += 1) {
        const a = now * 0.001 + i * 1.7;
        ctx.fillStyle = "rgba(255,220,150,.55)";
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * tile * 0.24, y + Math.sin(a) * tile * 0.18, tile * 0.012, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.strokeStyle = "rgba(180,190,220,.3)";
      ctx.lineWidth = Math.max(1, tile * 0.02);
      ctx.beginPath();
      ctx.moveTo(x - tile * 0.12, y - tile * 0.11);
      ctx.lineTo(x + tile * 0.12, y + tile * 0.11);
      ctx.moveTo(x + tile * 0.12, y - tile * 0.11);
      ctx.lineTo(x - tile * 0.12, y + tile * 0.11);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawSigil(ctx, x, y, tile, now) {
    const bob = Math.sin(now * 0.0028) * tile * 0.045;
    const pulse = 0.75 + Math.sin(now * 0.004) * 0.2;
    glowCircle(ctx, x, y - tile * 0.05, tile * 0.7, "rgba(111,227,193,.7)", 0.34);
    ctx.save();
    ctx.translate(x, y - tile * 0.1 + bob);
    ctx.rotate(now * 0.0012);
    ctx.strokeStyle = `rgba(111,227,193,${0.5 * pulse})`;
    ctx.lineWidth = Math.max(1, tile * 0.015);
    ctx.setLineDash([tile * 0.04, tile * 0.06]);
    ctx.beginPath();
    ctx.arc(0, 0, tile * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.rotate(-now * 0.0021);
    const grad = ctx.createLinearGradient(0, -tile * 0.22, 0, tile * 0.22);
    grad.addColorStop(0, "#e8fff7");
    grad.addColorStop(0.45, "#6fe3c1");
    grad.addColorStop(1, "#1c7b67");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -tile * 0.22);
    ctx.lineTo(tile * 0.15, 0);
    ctx.lineTo(0, tile * 0.22);
    ctx.lineTo(-tile * 0.15, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(230,255,246,.6)";
    ctx.lineWidth = Math.max(0.8, tile * 0.01);
    ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 3; i += 1) {
      const a = now * 0.0016 + i * 2.1;
      ctx.fillStyle = "rgba(160,255,225,.55)";
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * tile * 0.28, y - tile * 0.1 + Math.sin(a) * tile * 0.16 + bob, tile * 0.012, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawChest(ctx, x, y, tile, now) {
    const bob = Math.sin(now * 0.002 + x) * tile * 0.006;
    glowCircle(ctx, x, y, tile * 0.44, "rgba(255,196,90,.45)", 0.2);
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = "#4b2d1b";
    rr(ctx, -tile * 0.22, -tile * 0.12, tile * 0.44, tile * 0.28, tile * 0.035);
    ctx.fill();
    ctx.fillStyle = "#744327";
    rr(ctx, -tile * 0.22, -tile * 0.12, tile * 0.44, tile * 0.11, tile * 0.03);
    ctx.fill();
    ctx.strokeStyle = "#d3a352";
    ctx.lineWidth = Math.max(1, tile * 0.022);
    ctx.beginPath();
    ctx.moveTo(-tile * 0.22, -tile * 0.01);
    ctx.lineTo(tile * 0.22, -tile * 0.01);
    ctx.stroke();
    ctx.fillStyle = "#d3a352";
    rr(ctx, -tile * 0.045, -tile * 0.05, tile * 0.09, tile * 0.1, tile * 0.015);
    ctx.fill();
    ctx.fillStyle = "#3a2414";
    ctx.beginPath();
    ctx.arc(0, 0, tile * 0.015, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,230,160,.36)";
    ctx.lineWidth = Math.max(0.8, tile * 0.008);
    rr(ctx, -tile * 0.21, -tile * 0.11, tile * 0.42, tile * 0.26, tile * 0.03);
    ctx.stroke();
    ctx.restore();
    if (Math.sin(now * 0.004 + x) > 0.7) {
      const sx = x + tile * 0.12;
      const sy = y - tile * 0.18;
      ctx.fillStyle = "rgba(255,247,205,.9)";
      ctx.beginPath();
      ctx.moveTo(sx, sy - tile * 0.035);
      ctx.lineTo(sx + tile * 0.01, sy);
      ctx.lineTo(sx, sy + tile * 0.035);
      ctx.lineTo(sx - tile * 0.01, sy);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawPotion(ctx, x, y, tile, now) {
    const bob = Math.sin(now * 0.003 + y) * tile * 0.02;
    glowCircle(ctx, x, y, tile * 0.3, "rgba(255,110,160,.4)", 0.18);
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = "rgba(230,240,255,.35)";
    rr(ctx, -tile * 0.07, -tile * 0.14, tile * 0.14, tile * 0.07, tile * 0.02);
    ctx.fill();
    const liquid = ctx.createLinearGradient(0, -tile * 0.05, 0, tile * 0.17);
    liquid.addColorStop(0, "#ffb5c8");
    liquid.addColorStop(1, "#b21e58");
    ctx.fillStyle = liquid;
    ctx.beginPath();
    ctx.moveTo(-tile * 0.05, -tile * 0.08);
    ctx.quadraticCurveTo(-tile * 0.14, tile * 0.02, -tile * 0.1, tile * 0.14);
    ctx.quadraticCurveTo(0, tile * 0.22, tile * 0.1, tile * 0.14);
    ctx.quadraticCurveTo(tile * 0.14, tile * 0.02, tile * 0.05, -tile * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,220,235,.55)";
    ctx.lineWidth = Math.max(0.8, tile * 0.01);
    ctx.stroke();
    ctx.fillStyle = "#f7dfb0";
    rr(ctx, -tile * 0.06, -tile * 0.18, tile * 0.12, tile * 0.05, tile * 0.015);
    ctx.fill();
    ctx.restore();
  }

  drawGold(ctx, x, y, tile, now) {
    glowCircle(ctx, x, y, tile * 0.28, "rgba(255,210,100,.45)", 0.16);
    const coins = [
      [-tile * 0.07, tile * 0.05, 1],
      [tile * 0.06, tile * 0.055, 0.9],
      [0, tile * 0.0, 1.1]
    ];
    for (const [dx, dy, scale] of coins) {
      ctx.save();
      ctx.translate(x + dx, y + dy + Math.sin(now * 0.003 + dx) * tile * 0.01);
      ctx.scale(scale, scale * 0.8);
      const g = ctx.createRadialGradient(-tile * 0.01, -tile * 0.01, 0, 0, 0, tile * 0.07);
      g.addColorStop(0, "#fff3b8");
      g.addColorStop(0.45, "#f1c35e");
      g.addColorStop(1, "#9a5e20");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, tile * 0.065, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(110,60,15,.55)";
      ctx.lineWidth = Math.max(0.7, tile * 0.008);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawHints(ctx, now) {
    if (!this.state.playing || this.state.busy) return;
    const { tile } = this.layout;
    const { player, map, enemies, visible, discovered } = this.state;
    const alpha = this.hintAlpha > 0 ? 0.2 + this.hintAlpha * 0.35 : 0.16;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of dirs) {
      const x = player.x + dx;
      const y = player.y + dy;
      if (x < 0 || y < 0 || x >= this.state.cols || y >= this.state.rows) continue;
      const key = `${x},${y}`;
      if (!discovered.has(key)) continue;
      const enemy = enemies.find(e => e.x === x && e.y === y && !e.dead);
      if (!enemy && map[y][x] === WALL) continue;
      const pos = this.worldToScreen(x, y);
      const pulse = 0.5 + Math.sin(now * 0.004 + dx + dy) * 0.5;
      ctx.save();
      ctx.globalAlpha = alpha * (0.5 + pulse * 0.5);
      ctx.strokeStyle = enemy ? "rgba(255,127,145,.95)" : "rgba(243,195,108,.9)";
      ctx.lineWidth = Math.max(1, tile * 0.022);
      const inset = tile * 0.16;
      const len = tile * 0.18;
      const corners = [
        [pos.x - tile / 2 + inset, pos.y - tile / 2 + inset, 1, 1],
        [pos.x + tile / 2 - inset, pos.y - tile / 2 + inset, -1, 1],
        [pos.x - tile / 2 + inset, pos.y + tile / 2 - inset, 1, -1],
        [pos.x + tile / 2 - inset, pos.y + tile / 2 - inset, -1, -1]
      ];
      for (const [cx, cy, sx, sy] of corners) {
        ctx.beginPath();
        ctx.moveTo(cx + sx * len, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + sy * len);
        ctx.stroke();
      }
      if (enemy) {
        ctx.globalAlpha = 0.16 + pulse * 0.16;
        ctx.fillStyle = "rgba(255,80,105,.5)";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, tile * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (this.pointer) {
      const key = `${this.pointer.x},${this.pointer.y}`;
      if (discovered.has(key)) {
        const pos = this.worldToScreen(this.pointer.x, this.pointer.y);
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = "rgba(255,255,255,.7)";
        ctx.lineWidth = 1;
        rr(ctx, pos.x - tile * 0.46, pos.y - tile * 0.46, tile * 0.92, tile * 0.92, tile * 0.08);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  drawEntities(ctx, now) {
    const { tile } = this.layout;
    const { player, enemies, visible, theme, playerClass } = this.state;
    const drawList = [];

    for (const enemy of enemies) {
      if (enemy.dead) continue;
      if (!visible.has(`${enemy.x},${enemy.y}`)) continue;
      drawList.push({ kind: "enemy", entity: enemy, y: enemy.y });
    }
    drawList.push({ kind: "player", entity: player, y: player.y });
    drawList.sort((a, b) => a.y - b.y || (a.kind === "player" ? 1 : -1));

    for (const item of drawList) {
      const pos = this.entityPos(item.entity, now);
      const screen = this.worldToScreen(pos.x, pos.y);
      if (item.kind === "player") {
        const size = tile * 1.42;
        drawHero(ctx, screen.x, screen.y - tile * 0.03, size, playerClass, now / 1000, { flip: player.facing < 0 });
        if (player.hp <= player.maxHp * 0.25) {
          ctx.save();
          ctx.globalAlpha = 0.14 + Math.sin(now * 0.008) * 0.06;
          ctx.fillStyle = "#ff6376";
          ctx.beginPath();
          ctx.arc(screen.x, screen.y, tile * 0.38, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      } else {
        const enemy = item.entity;
        const size = tile * (enemy.boss ? 1.08 : 1.14);
        drawEnemy(ctx, screen.x, screen.y - tile * 0.03, size, enemy, now / 1000, theme);
        if (!enemy.boss && enemy.hp < enemy.maxHp) {
          const bw = tile * 0.54;
          const bh = Math.max(2, tile * 0.045);
          const bx = screen.x - bw / 2;
          const by = screen.y - tile * 0.57;
          ctx.fillStyle = "rgba(4,7,13,.75)";
          rr(ctx, bx, by, bw, bh, bh);
          ctx.fill();
          const pct = Math.max(0, enemy.hp / enemy.maxHp);
          const hpGrad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
          hpGrad.addColorStop(0, "#9c2f44");
          hpGrad.addColorStop(1, "#ff7f91");
          ctx.fillStyle = hpGrad;
          rr(ctx, bx, by, bw * pct, bh, bh);
          ctx.fill();
        }
      }
    }
  }

  drawEffects(ctx, now) {
    const { tile } = this.layout;
    // rings
    for (const ring of this.rings) {
      const p = ring.life / ring.maxLife;
      const pos = this.worldToScreen(ring.x, ring.y);
      ctx.save();
      ctx.globalAlpha = (1 - p) * 0.8;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = Math.max(1, tile * ring.width * (1 - p * 0.5));
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, tile * ring.radius * easeOutCubic(p), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // particles
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.particles) {
      const pos = this.worldToScreen(p.x, p.y);
      const life = 1 - p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, life) * (p.glow ? 0.9 : 0.5);
      ctx.fillStyle = p.color;
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = tile * 0.16;
      }
      if (p.shape === "square") {
        ctx.fillRect(pos.x - p.size / 2, pos.y - p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, p.size * (0.5 + life * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // floating text
    for (const f of this.floats) {
      const pos = this.worldToScreen(f.x, f.y);
      const p = f.life / f.maxLife;
      const alpha = p < 0.15 ? p / 0.15 : 1 - Math.max(0, (p - 0.55) / 0.45);
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = `700 ${Math.max(10, tile * 0.3 * f.size)}px "Avenir Next", "Segoe UI", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = Math.max(2, tile * 0.045);
      ctx.strokeStyle = "rgba(3,6,12,.8)";
      ctx.strokeText(f.text, pos.x, pos.y);
      ctx.fillStyle = f.color;
      if (f.glow) {
        ctx.shadowColor = f.glow;
        ctx.shadowBlur = tile * 0.16;
      }
      ctx.fillText(f.text, pos.x, pos.y);
      ctx.restore();
    }
  }

  drawVignette(ctx) {
    const { ox, oy, boardW, boardH } = this.layout;
    const grad = ctx.createRadialGradient(
      ox + boardW * 0.5, oy + boardH * 0.5, boardW * 0.25,
      ox + boardW * 0.5, oy + boardH * 0.5, Math.max(boardW, boardH) * 0.68
    );
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.72, "rgba(2,4,10,.12)");
    grad.addColorStop(1, "rgba(2,4,10,.58)");
    ctx.fillStyle = grad;
    ctx.fillRect(ox, oy, boardW, boardH);
  }
}
