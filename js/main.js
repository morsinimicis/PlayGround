import { audio } from "./audio.js";
import {
  generateFloor,
  roomAtTile,
  lineOfSight,
  findPath,
  WALL,
  FLOOR_THEMES
} from "./dungeon.js";
import {
  AmbientScene,
  DungeonRenderer,
  drawPortrait,
  drawAvatar,
  heroName
} from "./art.js";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const keyOf = (x, y) => `${x},${y}`;

const CLASSES = {
  knight: {
    hp: 68,
    atk: 10,
    def: 4,
    crit: 0.07,
    potions: 2,
    skill: { name: "Shield Bash", cd: 4 }
  },
  ranger: {
    hp: 54,
    atk: 11,
    def: 2,
    crit: 0.17,
    potions: 2,
    skill: { name: "Rain of Arrows", cd: 5 }
  },
  mage: {
    hp: 46,
    atk: 13,
    def: 1,
    crit: 0.12,
    potions: 3,
    skill: { name: "Arcane Nova", cd: 5 }
  }
};

const SAVE_KEY = "emberdeep.save.v1";
const SETTINGS_KEY = "emberdeep.settings.v1";

const state = {
  screen: "title",
  playing: false,
  busy: false,
  paused: false,
  resultOpen: false,
  floor: 1,
  theme: FLOOR_THEMES[0],
  cols: 9,
  rows: 9,
  map: Array.from({ length: 9 }, () => Array(9).fill(WALL)),
  rooms: [],
  playerClass: "knight",
  player: {
    id: "player",
    x: 4,
    y: 4,
    hp: 68,
    maxHp: 68,
    atk: 10,
    def: 4,
    crit: 0.07,
    potions: 2,
    level: 1,
    xp: 0,
    xpNext: 30,
    skillCd: 0,
    gold: 0,
    facing: 1
  },
  enemies: [],
  objects: [],
  visible: new Set(),
  discovered: new Set(),
  hasSigil: false,
  stairsOpen: false,
  boss: null,
  bossAnnounced: false,
  turn: 0,
  kills: 0,
  lastClass: "knight"
};

let save = loadSave();
let settings = loadSettings();
const tilt = {
  active: false,
  baseline: null,
  locked: false,
  last: 0,
  gotEvent: false,
  status: "Motion access has not been requested."
};
let modalReturn = null;
let pauseChain = false;
let toastTimer = 0;
let bannerTimer = 0;
let hintTimer = 0;
let lastPointer = null;

const canvas = $("#dungeon");
const ambient = new AmbientScene($("#ambient"));
const renderer = new DungeonRenderer(canvas, state);
const modalLayer = $("#modal-layer");
const liveRegion = $("#live-region");
const toast = $("#toast");
const toastText = $("#toast-text");
const toastIcon = $("#toast-icon");
const floorBanner = $("#floor-banner");
const tapHint = $("#tap-hint");
const tiltPill = $("#tilt-pill");
const bossHud = $("#boss-hud");
const eventTicker = $("#event-ticker");
const eventText = $("#event-text");

/* ------------------------------------------------------------------ */
/* Setup                                                               */
/* ------------------------------------------------------------------ */

function loadSave() {
  try {
    const value = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
    return { bestFloor: Number(value.bestFloor) || 0, wins: Number(value.wins) || 0 };
  } catch {
    return { bestFloor: 0, wins: 0 };
  }
}

function writeSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    /* storage can be unavailable in private modes */
  }
}

function loadSettings() {
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return { muted: Boolean(value.muted), tilt: Boolean(value.tilt) };
  } catch {
    return { muted: false, tilt: false };
  }
}

function writeSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* noop */
  }
}

function updateBestUI() {
  const best = $("#best-run");
  const text = $("#best-run-text");
  if (!best || !text) return;
  if (save.bestFloor <= 0) {
    best.hidden = true;
    return;
  }
  best.hidden = false;
  text.textContent = save.wins > 0
    ? `Floor ${save.bestFloor} · ${save.wins} ${save.wins === 1 ? "win" : "wins"}`
    : `Floor ${save.bestFloor}`;
}

function updateSoundUI() {
  document.body.classList.toggle("is-muted", settings.muted);
  const toggle = $("#toggle-sound");
  if (toggle) toggle.setAttribute("aria-checked", String(!settings.muted));
  const button = $("#btn-sound");
  if (button) button.setAttribute("aria-label", settings.muted ? "Enable sound" : "Mute sound");
}

function drawClassArt() {
  for (const portrait of $$("[data-portrait]")) {
    drawPortrait(portrait, portrait.dataset.portrait);
  }
}

function updateAvatar() {
  const host = $("#hud-avatar");
  if (!host) return;
  let avatar = host.querySelector("canvas");
  if (!avatar) {
    avatar = document.createElement("canvas");
    avatar.width = 96;
    avatar.height = 96;
    host.innerHTML = "";
    host.appendChild(avatar);
  }
  drawAvatar(avatar, state.playerClass);
}

function announce(text) {
  if (liveRegion) liveRegion.textContent = text;
}

/* ------------------------------------------------------------------ */
/* Screens and modals                                                  */
/* ------------------------------------------------------------------ */

function showScreen(name) {
  state.screen = name;
  const target = $(`#${name}-screen`);
  for (const screen of $$(".screen")) screen.classList.toggle("is-active", screen === target);
  document.body.dataset.screen = name;
  if (name === "game") {
    requestAnimationFrame(() => renderer.resize());
  }
  updateTiltPill();
}

function isModalOpen() {
  return !modalLayer.hidden;
}

function openModal(id, returnTo = null) {
  if (state.resultOpen && id !== "modal-result") return;
  if (id === "modal-pause" || returnTo === "modal-pause") pauseChain = true;
  modalReturn = returnTo;
  modalLayer.hidden = false;
  for (const modal of $$(".modal")) modal.hidden = modal.id !== id;
  const target = $(`#${id}`);
  if (target) {
    target.scrollTop = 0;
    const focusable = target.querySelector("button");
    if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), 60);
  }
  updateTiltUI();
  updateTiltPill();
}

function closeModal() {
  if (state.resultOpen) return;
  if (modalReturn) {
    const next = modalReturn;
    modalReturn = null;
    openModal(next);
    return;
  }
  modalLayer.hidden = true;
  if (pauseChain) {
    pauseChain = false;
    state.paused = false;
  }
  updateTiltPill();
}

function openPause() {
  if (!state.playing || state.busy || state.resultOpen) return;
  state.paused = true;
  openModal("modal-pause");
}

/* ------------------------------------------------------------------ */
/* HUD                                                                 */
/* ------------------------------------------------------------------ */

function updateHUD() {
  const p = state.player;
  const hpPct = clamp((p.hp / p.maxHp) * 100, 0, 100);
  const xpPct = clamp((p.xp / p.xpNext) * 100, 0, 100);

  $("#hud-floor").textContent = String(state.floor);
  $("#hud-gold").textContent = String(p.gold);
  $("#hud-sigil").textContent = state.hasSigil ? "1" : "0";
  $(".resource-chip--sigil").classList.toggle("is-lit", state.hasSigil);
  $(".resource-chip--sigil").hidden = state.floor === 5;

  $("#hud-name").textContent = heroName(state.playerClass);
  $("#hud-level").textContent = String(p.level);
  $("#hud-hp").textContent = String(Math.max(0, p.hp));
  $("#hud-maxhp").textContent = String(p.maxHp);
  $("#hud-hp-bar").style.width = `${hpPct}%`;
  $(".bar--hp").classList.toggle("is-low", hpPct <= 28);
  $("#hud-xp-bar").style.width = `${xpPct}%`;

  const potionCount = $("#potion-count");
  const potionBadge = $("#potion-badge");
  potionCount.textContent = `×${p.potions}`;
  potionBadge.textContent = String(p.potions);
  potionBadge.hidden = p.potions <= 0;
  $("#btn-potion").disabled = !state.playing || state.busy || p.potions <= 0 || p.hp >= p.maxHp;

  const skill = CLASSES[state.playerClass].skill;
  $("#skill-name").textContent = skill.name;
  const skillState = $("#skill-state");
  const skillBadge = $("#skill-badge");
  if (p.skillCd > 0) {
    skillState.textContent = `${p.skillCd} ${p.skillCd === 1 ? "turn" : "turns"}`;
    skillBadge.hidden = false;
    skillBadge.textContent = String(p.skillCd);
  } else {
    skillState.textContent = "Ready";
    skillBadge.hidden = true;
  }
  $("#btn-skill").disabled = !state.playing || state.busy || p.skillCd > 0;
  $("#btn-wait").disabled = !state.playing || state.busy;

  const bossAlive = state.boss && !state.boss.dead && state.boss.alive !== false;
  const showBoss = Boolean(bossAlive && state.boss.visible && state.playing);
  bossHud.hidden = !showBoss;
  if (showBoss) {
    $("#boss-name").textContent = state.boss.name;
    $("#boss-bar").style.width = `${clamp((state.boss.hp / state.boss.maxHp) * 100, 0, 100)}%`;
  }

  updateTiltPill();
}

function setEvent(text) {
  if (!eventText) return;
  eventText.textContent = text;
  eventTicker.classList.remove("is-flash");
  void eventTicker.offsetWidth;
  eventTicker.classList.add("is-flash");
}

function showToast(text, type = "", duration = 2400) {
  if (!toast) return;
  toastText.textContent = text;
  toast.className = `toast is-visible${type ? ` is-${type}` : ""}`;
  toastIcon.setAttribute("aria-hidden", "true");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), duration);
  announce(text);
}

function showFloorBanner(custom = null) {
  const theme = FLOOR_THEMES[state.floor - 1];
  $("#floor-banner-kicker").textContent = custom?.kicker ?? theme.kicker;
  $("#floor-banner-title").textContent = custom?.title ?? theme.name;
  $("#floor-banner-sub").textContent = custom?.sub ?? (state.floor === 5 ? "Defeat the Ember Warden" : theme.sub);
  floorBanner.classList.add("is-visible");
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => floorBanner.classList.remove("is-visible"), custom?.duration || 2100);
  announce(`${custom?.kicker ?? theme.kicker}. ${custom?.title ?? theme.name}. ${custom?.sub ?? theme.sub}`);
}

function showTapHint() {
  tapHint.classList.remove("is-hidden");
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => tapHint.classList.add("is-hidden"), 7200);
}

function hideTapHint() {
  tapHint.classList.add("is-hidden");
  clearTimeout(hintTimer);
}

/* ------------------------------------------------------------------ */
/* Visibility and floor loading                                        */
/* ------------------------------------------------------------------ */

function computeVisibility() {
  const { map, cols, rows, player, rooms } = state;
  state.visible.clear();
  const radius = 4.65;

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const dist = Math.abs(x - player.x) + Math.abs(y - player.y);
      if (dist > radius + 1.2) continue;
      if (lineOfSight(map, player.x, player.y, x, y)) {
        state.visible.add(keyOf(x, y));
      }
    }
  }

  const room = roomAtTile(rooms, player.x, player.y);
  if (room) {
    for (let y = room.y; y < room.y + room.h; y += 1) {
      for (let x = room.x; x < room.x + room.w; x += 1) {
        state.visible.add(keyOf(x, y));
      }
    }
  }

  for (const key of [...state.visible]) {
    const [x, y] = key.split(",").map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && map[ny][nx] === WALL) {
        state.visible.add(keyOf(nx, ny));
      }
    }
  }

  for (const key of state.visible) state.discovered.add(key);

  if (state.boss && !state.boss.dead) {
    state.boss.visible = state.visible.has(keyOf(state.boss.x, state.boss.y));
    if (state.boss.visible && !state.bossAnnounced) {
      state.bossAnnounced = true;
      setTimeout(() => {
        if (!state.playing || !state.boss?.visible) return;
        showToast("The Ember Warden has found you.", "bad", 3300);
        setEvent("The Ember Warden wakes. The floor grows hot.");
        audio.play("boss");
        renderer.shake(7);
      }, 160);
    }
  }
}

function loadFloor(floorNum, seed = Date.now()) {
  const floor = generateFloor(floorNum, seed);
  state.floor = floorNum;
  state.theme = floor.theme;
  state.cols = floor.cols;
  state.rows = floor.rows;
  state.map = floor.map;
  state.rooms = floor.rooms;
  state.objects = floor.objects;
  state.enemies = floor.enemies;
  state.hasSigil = false;
  state.stairsOpen = false;
  state.boss = floor.enemies.find(enemy => enemy.boss) || null;
  state.bossAnnounced = false;
  state.turn = 0;
  state.player.x = floor.start.x;
  state.player.y = floor.start.y;
  state.player.facing = 1;
  state.player.skillCd = 0;
  state.visible.clear();
  state.discovered.clear();

  computeVisibility();
  renderer.setState(state);
  renderer.resize();
  renderer.hintAlpha = 1;
  updateHUD();
  showFloorBanner();
  showTapHint();
  setEvent(state.floor === 5 ? "The air tastes of iron and ash." : "The dark is listening.");
  updateTiltPill();
}

async function descendFloor() {
  audio.play("descend");
  const pos = { x: state.player.x, y: state.player.y };
  renderer.ring(pos.x, pos.y, "#ffe0a0", { radius: 1.5, life: 0.8, width: 0.07 });
  renderer.burst(pos.x, pos.y, "#ffd27a", 24, { lift: 1.3, speed: 1.3 });
  renderer.shake(4);
  showFloorBanner({
    kicker: "The stairwell takes you",
    title: "Descending",
    sub: `Floor ${state.floor + 1} awaits`,
    duration: 900
  });
  await delay(720);
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + Math.round(state.player.maxHp * 0.1));
  loadFloor(state.floor + 1);
  await delay(720);
  if (state.floor === 5) {
    showToast("The Emberheart pulses somewhere below.", "epic", 3000);
  } else {
    showToast("A little warmth returns to your bones.", "good", 1800);
  }
}

/* ------------------------------------------------------------------ */
/* Loot                                                                */
/* ------------------------------------------------------------------ */

function gainXp(amount) {
  const p = state.player;
  p.xp += amount;
  let leveled = false;
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext;
    p.level += 1;
    p.xpNext = Math.round(p.xpNext * 1.28 + 8);
    p.maxHp += 9;
    p.hp = Math.min(p.maxHp, p.hp + 16);
    p.atk += 2;
    p.def += 1;
    p.crit += 0.004;
    if (p.level % 2 === 0) p.potions += 1;
    leveled = true;
  }
  if (leveled) {
    audio.play("level");
    renderer.ring(p.x, p.y, "#ffe6a3", { radius: 1.3, life: 0.9, width: 0.07 });
    renderer.burst(p.x, p.y, "#ffe6a3", 24, { lift: 1.2 });
    showToast(`Level ${p.level} — the ember burns brighter.`, "epic", 3100);
    setEvent(`You reach level ${p.level}. Health restored, strength grown.`);
    announce(`Level up. You are now level ${p.level}.`);
  }
  updateHUD();
}

function openChest(chest) {
  const p = state.player;
  const x = chest.x;
  const y = chest.y;
  renderer.burst(x, y, "#ffd27a", 16, { lift: 0.9 });
  audio.play("chest");
  if (chest.loot === "gold") {
    const amount = 14 + state.floor * 6 + randInt(0, 8);
    p.gold += amount;
    renderer.floatText(`+${amount} gold`, x, y - 0.35, "#ffd76e", { size: 0.9 });
    showToast(`A hidden purse: +${amount} gold.`, "good");
    setEvent(`You find ${amount} gold in a dusty chest.`);
  } else if (chest.loot === "potion") {
    p.potions += 1;
    renderer.floatText("+1 potion", x, y - 0.35, "#ffb8cc", { size: 0.9 });
    showToast("A potion, still warm.", "good");
    setEvent("You pocket a healing potion.");
  } else if (chest.loot === "xp") {
    const amount = 12 + state.floor * 7;
    renderer.floatText(`+${amount} XP`, x, y - 0.35, "#bda5ff", { size: 0.9 });
    showToast("Old knowledge seeps into you.", "epic");
    setEvent(`Ancient insight: +${amount} XP.`);
    gainXp(amount);
  } else if (chest.loot === "atk") {
    p.atk += 1;
    renderer.floatText("ATK +1", x, y - 0.35, "#ff9e8f", { size: 0.9 });
    showToast("Your weapon drinks the dark. Attack +1.", "epic");
    setEvent("The edge of your weapon sharpens. Attack +1.");
  } else {
    p.def += 1;
    renderer.floatText("DEF +1", x, y - 0.35, "#9cc8ff", { size: 0.9 });
    showToast("Old wards settle over you. Defense +1.", "epic");
    setEvent("A ward settles over your shoulders. Defense +1.");
  }
  updateHUD();
}

function resolveTile() {
  const p = state.player;
  const index = state.objects.findIndex(object => object.x === p.x && object.y === p.y);
  if (index < 0) return null;
  const object = state.objects[index];

  if (object.type === "stairs") {
    if (state.hasSigil) return "descend";
    audio.play("deny");
    showToast("The stairwell is sealed. Find the Ember Sigil.", "bad", 2600);
    setEvent("The stairwell is bound by an old sigil.");
    return null;
  }

  state.objects.splice(index, 1);

  if (object.type === "sigil") {
    state.hasSigil = true;
    state.stairsOpen = true;
    audio.play("sigil");
    renderer.ring(p.x, p.y, "#7ff0cf", { radius: 1.5, life: 0.9, width: 0.07 });
    renderer.burst(p.x, p.y, "#8dffdf", 26, { lift: 1.2, speed: 1.2 });
    renderer.floatText("SIGIL", p.x, p.y - 0.5, "#b9ffed", { size: 1.1 });
    showToast("Ember Sigil claimed. The stairwell opens.", "epic", 3200);
    setEvent("The Ember Sigil burns in your hand. The stairs are open.");
    announce("Ember Sigil claimed. The stairwell is open.");
    updateHUD();
    return null;
  }

  if (object.type === "chest") {
    openChest(object);
    return null;
  }

  if (object.type === "potion") {
    p.potions += 1;
    audio.play("potion");
    renderer.burst(p.x, p.y, "#ff9fbc", 12, { lift: 0.7 });
    renderer.floatText("+1 potion", p.x, p.y - 0.35, "#ffc0d1", { size: 0.85 });
    showToast("Potion found.", "good", 1600);
    setEvent("You find a healing potion.");
    updateHUD();
    return null;
  }

  if (object.type === "gold") {
    p.gold += object.amount;
    audio.play("coin");
    renderer.burst(p.x, p.y, "#ffd76e", 8, { lift: 0.6, size: 0.035 });
    renderer.floatText(`+${object.amount}`, p.x, p.y - 0.3, "#ffd76e", { size: 0.85 });
    setEvent(`You gather ${object.amount} gold.`);
    updateHUD();
    return null;
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* Combat                                                              */
/* ------------------------------------------------------------------ */

function enemyAt(x, y) {
  return state.enemies.find(enemy => !enemy.dead && enemy.x === x && enemy.y === y) || null;
}

function livingEnemies() {
  return state.enemies.filter(enemy => !enemy.dead);
}

function occupiedByEnemy(x, y, except = null) {
  return state.enemies.some(enemy => enemy !== except && !enemy.dead && enemy.x === x && enemy.y === y);
}

async function killEnemy(enemy) {
  if (enemy.dead) return;
  const p = state.player;
  enemy.dead = true;
  state.kills += 1;
  p.gold += enemy.gold;
  audio.play("coin");
  renderer.burst(enemy.x, enemy.y, enemy.boss ? "#ff9b6b" : "#ffd28a", enemy.boss ? 40 : 18, { lift: 1.2, speed: enemy.boss ? 1.6 : 1 });
  renderer.ring(enemy.x, enemy.y, enemy.boss ? "#ff8b67" : "#ffd28a", { radius: enemy.boss ? 1.6 : 0.8, life: 0.7 });
  renderer.floatText(`+${enemy.gold}`, enemy.x, enemy.y - 0.12, "#ffd76e", { size: 0.8 });
  renderer.floatText(`+${enemy.xp} XP`, enemy.x, enemy.y - 0.45, "#c9b5ff", { size: 0.8, life: 1.2 });
  setEvent(`${enemy.name} falls. +${enemy.xp} XP, +${enemy.gold} gold.`);
  gainXp(enemy.xp);

  if (enemy.boss) {
    state.boss.alive = false;
    state.boss.visible = false;
    audio.play("boss");
    renderer.shake(14);
    showToast("The Ember Warden falls. The deep exhales.", "epic", 3600);
    setEvent("The Ember Warden falls. The Emberheart is yours.");
    announce("Victory. The Ember Warden has fallen.");
    await delay(1050);
    endRun(true);
    return;
  }

  updateHUD();
}

function damageEnemy(enemy, amount, options = {}) {
  const crit = Boolean(options.crit);
  enemy.hp = Math.max(0, enemy.hp - amount);
  renderer.floatText(`${crit ? "CRIT " : ""}${amount}`, enemy.x, enemy.y - 0.42, crit ? "#ffe58a" : "#fff4d6", { size: crit ? 1.3 : 1.02 });
  renderer.burst(enemy.x, enemy.y, crit ? "#ffe58a" : "#ffb3a0", crit ? 22 : 12, { lift: 0.8 });
  renderer.shake(crit ? 6 : 2.5);
  if (crit) audio.play("crit");
  else audio.play("hit");
  if (enemy.boss) updateHUD();
}

async function attackEnemy(enemy, dx, dy) {
  const p = state.player;
  p.facing = dx !== 0 ? Math.sign(dx) : p.facing;
  renderer.animateLunge(p, dx, dy, 220);
  await delay(85);
  const crit = Math.random() < p.crit;
  const raw = p.atk + randInt(-1, 2);
  const amount = Math.max(1, Math.round((raw - enemy.def) * (crit ? 1.8 : 1)));
  damageEnemy(enemy, amount, { crit });
  if (enemy.hp <= 0) {
    await killEnemy(enemy);
  } else {
    setEvent(`You strike ${enemy.name} for ${amount}.`);
    updateHUD();
  }
  await delay(210);
}

async function enemyAttack(enemy) {
  const p = state.player;
  const dx = p.x - enemy.x;
  const dy = p.y - enemy.y;
  renderer.animateLunge(enemy, dx, dy, 230);
  await delay(80);
  if (Math.random() < 0.06) {
    renderer.floatText("MISS", p.x, p.y - 0.4, "#b9c2df", { size: 0.9 });
    setEvent(`${enemy.name} misses.`);
    await delay(170);
    return;
  }
  const amount = Math.max(1, Math.round(enemy.atk + randInt(-1, 2) - p.def * 0.8));
  p.hp = Math.max(0, p.hp - amount);
  audio.play("hurt");
  renderer.floatText(`-${amount}`, p.x, p.y - 0.46, "#ff8e9c", { size: 1.08 });
  renderer.burst(p.x, p.y, "#ff6f86", 10, { lift: 0.4 });
  renderer.shake(5);
  if (navigator.vibrate) navigator.vibrate(22);
  updateHUD();
  setEvent(`${enemy.name} hits you for ${amount}.`);
  await delay(220);
}

async function bossSpecial(boss) {
  const p = state.player;
  showToast("The Warden gathers cinders.", "bad", 1700);
  setEvent("The Ember Warden gathers cinders for a ranged blast.");
  renderer.ring(boss.x, boss.y, "#ff7b55", { radius: 2.4, life: 0.85, width: 0.06 });
  audio.play("boss");
  await delay(480);
  if (!state.playing) return;
  const amount = Math.max(1, Math.round(boss.atk * 1.12 - p.def * 0.55));
  p.hp = Math.max(0, p.hp - amount);
  audio.play("hurt");
  renderer.floatText(`-${amount}`, p.x, p.y - 0.48, "#ff9a83", { size: 1.16 });
  renderer.burst(p.x, p.y, "#ff7b55", 28, { lift: 1.1, speed: 1.3 });
  renderer.shake(9);
  if (navigator.vibrate) navigator.vibrate([18, 40, 28]);
  updateHUD();
  setEvent(`Cinders wash over you for ${amount}.`);
  await delay(260);
}

async function enemyStep(enemy, step) {
  const from = { x: enemy.x, y: enemy.y };
  if (step.x === state.player.x && step.y === state.player.y) {
    await enemyAttack(enemy);
    return;
  }
  if (occupiedByEnemy(step.x, step.y, enemy)) return;
  enemy.x = step.x;
  enemy.y = step.y;
  renderer.animateMove(enemy, from, step, 130);
  await delay(105);
}

async function enemyWander(enemy) {
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const options = [];
  for (const [dx, dy] of dirs) {
    const nx = enemy.x + dx;
    const ny = enemy.y + dy;
    if (nx < 0 || ny < 0 || nx >= state.cols || ny >= state.rows) continue;
    if (state.map[ny][nx] === WALL) continue;
    if (nx === state.player.x && ny === state.player.y) continue;
    if (occupiedByEnemy(nx, ny, enemy)) continue;
    options.push({ x: nx, y: ny });
  }
  if (!options.length) return;
  await enemyStep(enemy, options[Math.floor(Math.random() * options.length)]);
}

async function enemiesTurn() {
  const living = livingEnemies();
  for (const enemy of living) {
    if (!state.playing) return;
    if (enemy.stun > 0) {
      enemy.stun -= 1;
      renderer.floatText("STUN", enemy.x, enemy.y - 0.42, "#ffe6a3", { size: 0.82 });
      await delay(80);
      continue;
    }

    const dist = Math.abs(enemy.x - state.player.x) + Math.abs(enemy.y - state.player.y);
    if (enemy.boss) {
      enemy.bossTurn = (enemy.bossTurn || 0) + 1;
      if (enemy.bossTurn % 3 === 0 && dist <= 7) {
        await bossSpecial(enemy);
        if (!state.playing) return;
        continue;
      }
    }

    if (dist === 1) {
      await enemyAttack(enemy);
      if (!state.playing) return;
      continue;
    }

    if (dist <= enemy.aggro) {
      const blocked = new Set(living.filter(other => other !== enemy).map(other => keyOf(other.x, other.y)));
      const path = findPath(state.map, { x: enemy.x, y: enemy.y }, { x: state.player.x, y: state.player.y }, blocked);
      if (path && path.length) {
        const step = path[0];
        if (step.x === state.player.x && step.y === state.player.y) {
          await enemyAttack(enemy);
        } else {
          await enemyStep(enemy, step);
        }
        if (!state.playing) return;
      } else if (Math.random() < 0.22) {
        await enemyWander(enemy);
      }
    } else if (Math.random() < 0.16) {
      await enemyWander(enemy);
    }
  }

  computeVisibility();
  updateHUD();
  if (state.player.hp <= 0) {
    endRun(false);
  }
}

async function endTurn(usedSkill = false) {
  if (!usedSkill && state.player.skillCd > 0) state.player.skillCd -= 1;
  state.turn += 1;
  updateHUD();
  await enemiesTurn();
  updateHUD();
}

/* ------------------------------------------------------------------ */
/* Player actions                                                      */
/* ------------------------------------------------------------------ */

function canAct() {
  return state.playing && !state.busy && !state.paused && !isModalOpen() && !state.resultOpen;
}

async function playerMove(dx, dy) {
  if (!canAct()) return;
  const p = state.player;
  const nx = p.x + dx;
  const ny = p.y + dy;

  if (nx < 0 || ny < 0 || nx >= state.cols || ny >= state.rows || state.map[ny][nx] === WALL) {
    audio.play("deny");
    renderer.shake(1.5);
    setEvent("Cold stone blocks the way.");
    return;
  }

  state.busy = true;
  updateHUD();
  hideTapHint();

  const enemy = enemyAt(nx, ny);
  if (enemy) {
    await attackEnemy(enemy, dx, dy);
    if (state.playing) await endTurn(false);
    state.busy = false;
    updateHUD();
    return;
  }

  const from = { x: p.x, y: p.y };
  p.facing = dx !== 0 ? Math.sign(dx) : p.facing;
  p.x = nx;
  p.y = ny;
  renderer.animateMove(p, from, { x: nx, y: ny }, 150);
  audio.play("step");
  await delay(150);
  const result = resolveTile();
  computeVisibility();
  updateHUD();

  if (result === "descend") {
    await descendFloor();
    state.busy = false;
    updateHUD();
    return;
  }

  if (state.playing) await endTurn(false);
  state.busy = false;
  updateHUD();
}

async function usePotion() {
  if (!canAct()) return;
  const p = state.player;
  if (p.potions <= 0) {
    audio.play("deny");
    showToast("No potions left.", "bad", 1600);
    return;
  }
  if (p.hp >= p.maxHp) {
    audio.play("deny");
    showToast("You are already whole.", "bad", 1600);
    return;
  }

  state.busy = true;
  updateHUD();
  p.potions -= 1;
  const heal = Math.max(8, Math.round(p.maxHp * 0.38));
  const actual = Math.min(p.maxHp - p.hp, heal);
  p.hp += actual;
  audio.play("potion");
  renderer.floatText(`+${actual}`, p.x, p.y - 0.45, "#8dffc9", { size: 1.05 });
  renderer.burst(p.x, p.y, "#6fe3b0", 16, { lift: 0.7 });
  renderer.ring(p.x, p.y, "#6fe3b0", { radius: 0.8, life: 0.55 });
  setEvent(`You drink a potion. +${actual} health.`);
  updateHUD();
  await delay(320);
  if (state.playing) await endTurn(false);
  state.busy = false;
  updateHUD();
}

function skillTargets() {
  const p = state.player;
  if (state.playerClass === "knight") {
    return livingEnemies().filter(enemy => Math.abs(enemy.x - p.x) + Math.abs(enemy.y - p.y) === 1);
  }
  if (state.playerClass === "ranger") {
    return livingEnemies().filter(enemy => {
      const dist = Math.abs(enemy.x - p.x) + Math.abs(enemy.y - p.y);
      return dist <= 4 && state.visible.has(keyOf(enemy.x, enemy.y));
    });
  }
  return livingEnemies().filter(enemy => {
    const dist = Math.abs(enemy.x - p.x) + Math.abs(enemy.y - p.y);
    return dist <= 3 && lineOfSight(state.map, p.x, p.y, enemy.x, enemy.y);
  });
}

async function useSkill() {
  if (!canAct()) return;
  const p = state.player;
  if (p.skillCd > 0) {
    audio.play("deny");
    showToast(`${CLASSES[state.playerClass].skill.name} is not ready.`, "bad", 1500);
    return;
  }
  const targets = skillTargets();
  if (!targets.length) {
    audio.play("deny");
    const message = state.playerClass === "knight"
      ? "No foe stands beside you."
      : state.playerClass === "ranger"
        ? "No target in bow range."
        : "No target within the ember's reach.";
    showToast(message, "bad", 1700);
    return;
  }

  state.busy = true;
  const skill = CLASSES[state.playerClass].skill;
  p.skillCd = skill.cd;
  updateHUD();
  audio.play("skill");

  if (state.playerClass === "knight") {
    renderer.ring(p.x, p.y, "#ffe0a0", { radius: 1.4, life: 0.7, width: 0.08 });
    renderer.burst(p.x, p.y, "#ffd27a", 20, { lift: 0.8 });
    setEvent("You drive your shield into the dark.");
    await delay(170);
    for (const enemy of targets) {
      if (!state.playing) break;
      const amount = Math.max(1, Math.round(p.atk * 1.05 + p.def * 0.55));
      damageEnemy(enemy, amount, { crit: false });
      enemy.stun = 1;
      renderer.floatText("STAGGER", enemy.x, enemy.y - 0.62, "#ffe6a3", { size: 0.78, life: 0.9 });
      if (enemy.hp <= 0) await killEnemy(enemy);
      await delay(130);
    }
  } else if (state.playerClass === "ranger") {
    renderer.ring(p.x, p.y, "#7be0b8", { radius: 2.8, life: 0.8, width: 0.06 });
    setEvent("You loose a rain of arrows into the dark.");
    for (const enemy of targets) {
      if (!state.playing) break;
      renderer.burst(enemy.x, enemy.y, "#9cf5ce", 10, { lift: 0.8, speed: 1.2 });
      const amount = Math.max(1, Math.round(p.atk * 0.74 + randInt(0, 2)));
      damageEnemy(enemy, amount, { crit: Math.random() < p.crit });
      if (enemy.hp <= 0) await killEnemy(enemy);
      await delay(115);
    }
  } else {
    renderer.ring(p.x, p.y, "#b49bff", { radius: 3, life: 0.9, width: 0.08 });
    renderer.burst(p.x, p.y, "#b49bff", 26, { lift: 1, speed: 1.5 });
    setEvent("Arcane fire answers your call.");
    await delay(190);
    for (const enemy of targets) {
      if (!state.playing) break;
      renderer.ring(enemy.x, enemy.y, "#c6a9ff", { radius: 0.9, life: 0.6, width: 0.06 });
      const amount = Math.max(1, Math.round(p.atk * 1.06 + randInt(0, 2)));
      damageEnemy(enemy, amount, { crit: Math.random() < p.crit });
      if (enemy.hp <= 0) await killEnemy(enemy);
      await delay(120);
    }
  }

  updateHUD();
  if (state.playing) await endTurn(true);
  state.busy = false;
  updateHUD();
}

async function waitTurn() {
  if (!canAct()) return;
  state.busy = true;
  updateHUD();
  setEvent("You hold your breath and listen.");
  await delay(120);
  if (state.playing) await endTurn(false);
  state.busy = false;
  updateHUD();
}

function handleTileTap(tile) {
  if (!canAct() || !tile) return;
  const p = state.player;
  if (tile.x === p.x && tile.y === p.y) return;
  const key = keyOf(tile.x, tile.y);
  const enemy = enemyAt(tile.x, tile.y);
  const dist = Math.abs(tile.x - p.x) + Math.abs(tile.y - p.y);

  if (enemy) {
    if (dist === 1) {
      playerMove(tile.x - p.x, tile.y - p.y);
      return;
    }
    if (!state.discovered.has(key)) {
      audio.play("deny");
      showToast("Beyond the light.", "bad", 1300);
      return;
    }
    const blocked = new Set(livingEnemies().filter(other => other !== enemy).map(other => keyOf(other.x, other.y)));
    const path = findPath(state.map, { x: p.x, y: p.y }, { x: enemy.x, y: enemy.y }, blocked);
    if (path && path.length) {
      const step = path[0];
      playerMove(step.x - p.x, step.y - p.y);
    } else {
      audio.play("deny");
      showToast("No path to that foe.", "bad", 1400);
    }
    return;
  }

  if (state.map[tile.y][tile.x] === WALL) {
    audio.play("deny");
    showToast("The wall offers no passage.", "bad", 1300);
    return;
  }
  if (!state.discovered.has(key)) {
    audio.play("deny");
    showToast("The map is dark there.", "bad", 1300);
    return;
  }

  if (dist === 1) {
    playerMove(tile.x - p.x, tile.y - p.y);
    return;
  }

  const blocked = new Set(livingEnemies().map(other => keyOf(other.x, other.y)));
  const path = findPath(state.map, { x: p.x, y: p.y }, { x: tile.x, y: tile.y }, blocked);
  if (path && path.length) {
    const step = path[0];
    playerMove(step.x - p.x, step.y - p.y);
  } else {
    audio.play("deny");
    showToast("No path through the dark.", "bad", 1400);
  }
}

/* ------------------------------------------------------------------ */
/* Run lifecycle                                                       */
/* ------------------------------------------------------------------ */

function startRun(classId) {
  const cls = CLASSES[classId] || CLASSES.knight;
  audio.init();
  audio.play("click");
  modalLayer.hidden = true;
  pauseChain = false;
  modalReturn = null;
  state.resultOpen = false;
  state.paused = false;
  state.playing = true;
  state.busy = false;
  state.playerClass = classId;
  state.lastClass = classId;
  state.kills = 0;
  state.turn = 0;
  state.player = {
    id: "player",
    x: 4,
    y: 4,
    hp: cls.hp,
    maxHp: cls.hp,
    atk: cls.atk,
    def: cls.def,
    crit: cls.crit,
    potions: cls.potions,
    level: 1,
    xp: 0,
    xpNext: 30,
    skillCd: 0,
    gold: 0,
    facing: 1
  };

  showScreen("game");
  updateAvatar();
  loadFloor(1);
  renderer.resize();
  updateHUD();
  showToast("Find the Ember Sigil. The stairwell is sealed.", "good", 3000);

  if (settings.tilt && !tilt.active) {
    enableTilt({ automatic: true });
  }
}

function endRun(win, options = {}) {
  if (!state.playing) return;
  state.playing = false;
  state.busy = false;
  state.paused = false;
  hideTapHint();
  updateHUD();

  save.bestFloor = Math.max(save.bestFloor, state.floor);
  if (win) save.wins += 1;
  writeSave();
  updateBestUI();

  if (win) {
    audio.play("win");
    renderer.ring(state.player.x, state.player.y, "#b9ffed", { radius: 2.4, life: 1.2, width: 0.08 });
    renderer.burst(state.player.x, state.player.y, "#b9ffed", 40, { lift: 1.6, speed: 1.4 });
  } else {
    audio.play("lose");
    renderer.shake(9);
    renderer.burst(state.player.x, state.player.y, "#ff7f91", 30, { lift: 1, speed: 1.1 });
  }

  const abandoned = Boolean(options.abandoned);
  $("#result-emblem").classList.toggle("is-win", win);
  $("#result-kicker").innerHTML = win
    ? "<span></span>The Emberheart is yours<span></span>"
    : abandoned
      ? "<span></span>You turn back<span></span>"
      : "<span></span>The deep keeps you<span></span>";
  $("#result-title").textContent = win ? "The deep is quiet" : abandoned ? "A careful retreat" : "Taken by the dark";
  $("#result-lead").textContent = win
    ? "The Warden falls, the Emberheart dims, and for the first time in centuries the dark exhales."
    : abandoned
      ? "You leave the stairwell behind. The Emberheart still beats somewhere below."
      : "Your ember gutters out on the cold stone. The dungeon remembers your name.";
  $("#result-floor").textContent = String(state.floor);
  $("#result-level").textContent = String(state.player.level);
  $("#result-gold").textContent = String(state.player.gold);
  $("#result-kills").textContent = String(state.kills);

  setTimeout(() => {
    state.resultOpen = true;
    openModal("modal-result");
    announce(win ? "Victory. The Emberheart is yours." : "Your run has ended.");
  }, win ? 900 : 620);
}

/* ------------------------------------------------------------------ */
/* Motion controls                                                     */
/* ------------------------------------------------------------------ */

function updateTiltPill() {
  const show = tilt.active && tilt.gotEvent && state.playing && !state.paused && !isModalOpen();
  tiltPill.hidden = !show;
}

function updateTiltUI() {
  const toggle = $("#toggle-tilt");
  const calibrate = $("#btn-calibrate");
  const status = $("#tilt-status");
  if (toggle) toggle.setAttribute("aria-checked", String(tilt.active));
  if (calibrate) calibrate.disabled = !tilt.active;
  if (status) status.textContent = tilt.status;
  const help = $("#tilt-help");
  if (help) {
    help.textContent = typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function"
      ? "Tilt your device to step. iOS will ask for motion access."
      : "Tilt your device to step through the dungeon.";
  }
  updateTiltPill();
}

function handleOrientation(event) {
  if (!tilt.active || event.beta == null || event.gamma == null) return;
  tilt.gotEvent = true;
  if (!tilt.baseline) {
    tilt.baseline = { beta: event.beta, gamma: event.gamma };
    tilt.status = "Tilt active. Hold naturally, then tilt to step.";
    updateTiltUI();
    return;
  }
  if (!state.playing || state.busy || state.paused || isModalOpen()) return;

  const db = event.beta - tilt.baseline.beta;
  const dg = event.gamma - tilt.baseline.gamma;
  if (Math.abs(db) < 5 && Math.abs(dg) < 5) {
    tilt.locked = false;
    return;
  }
  if (tilt.locked) return;
  const now = performance.now();
  if (now - tilt.last < 190) return;

  let dx = 0;
  let dy = 0;
  if (Math.abs(dg) > Math.abs(db)) {
    if (dg > 15) dx = 1;
    else if (dg < -15) dx = -1;
  } else {
    if (db < -15) dy = -1;
    else if (db > 15) dy = 1;
  }
  if (dx || dy) {
    tilt.locked = true;
    tilt.last = now;
    playerMove(dx, dy);
  }
}

async function enableTilt(options = {}) {
  if (!window.DeviceOrientationEvent) {
    tilt.status = "Motion sensors are not available on this device.";
    tilt.active = false;
    settings.tilt = false;
    writeSettings();
    updateTiltUI();
    return false;
  }

  try {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== "granted") {
        tilt.status = "Motion access was declined. Enable it in browser settings.";
        tilt.active = false;
        settings.tilt = false;
        writeSettings();
        updateTiltUI();
        return false;
      }
    }
  } catch {
    tilt.status = "Motion access could not be requested.";
    tilt.active = false;
    settings.tilt = false;
    writeSettings();
    updateTiltUI();
    return false;
  }

  window.addEventListener("deviceorientation", handleOrientation, true);
  tilt.active = true;
  tilt.baseline = null;
  tilt.gotEvent = false;
  tilt.locked = false;
  tilt.status = "Listening for motion…";
  settings.tilt = true;
  writeSettings();
  updateTiltUI();

  setTimeout(() => {
    if (!tilt.active || tilt.gotEvent) return;
    tilt.status = "No motion data detected. Try calibrating or another device.";
    updateTiltUI();
  }, 2200);

  if (!options.automatic) audio.play("click");
  return true;
}

function disableTilt() {
  window.removeEventListener("deviceorientation", handleOrientation, true);
  tilt.active = false;
  tilt.baseline = null;
  tilt.locked = false;
  tilt.gotEvent = false;
  tilt.status = "Tilt controls off.";
  settings.tilt = false;
  writeSettings();
  updateTiltUI();
}

async function toggleTilt() {
  audio.init();
  if (tilt.active) {
    disableTilt();
  } else {
    await enableTilt();
  }
}

function calibrateTilt() {
  if (!tilt.active) return;
  tilt.baseline = null;
  tilt.locked = false;
  tilt.gotEvent = false;
  tilt.status = "Hold your device comfortably. Calibrating…";
  updateTiltUI();
  audio.play("click");
}

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */

canvas.addEventListener("pointerdown", event => {
  if (!canAct()) return;
  canvas.setPointerCapture?.(event.pointerId);
  lastPointer = {
    x: event.clientX,
    y: event.clientY,
    time: performance.now(),
    pointerId: event.pointerId,
    tile: renderer.tileFromClient(event.clientX, event.clientY)
  };
  if (event.pointerType === "mouse") renderer.setPointer(lastPointer.tile);
});

canvas.addEventListener("pointermove", event => {
  if (event.pointerType === "mouse") {
    renderer.setPointer(renderer.tileFromClient(event.clientX, event.clientY));
  }
});

canvas.addEventListener("pointerup", event => {
  if (!lastPointer || lastPointer.pointerId !== event.pointerId) return;
  const dx = event.clientX - lastPointer.x;
  const dy = event.clientY - lastPointer.y;
  const distance = Math.hypot(dx, dy);
  const elapsed = performance.now() - lastPointer.time;
  const start = lastPointer;
  lastPointer = null;

  if (!canAct()) return;
  if (distance > 24 && elapsed < 900) {
    if (Math.abs(dx) > Math.abs(dy)) playerMove(dx > 0 ? 1 : -1, 0);
    else playerMove(0, dy > 0 ? 1 : -1);
    return;
  }
  const tile = renderer.tileFromClient(event.clientX, event.clientY) || start.tile;
  handleTileTap(tile);
});

canvas.addEventListener("pointercancel", () => {
  lastPointer = null;
});

canvas.addEventListener("pointerleave", () => {
  renderer.setPointer(null);
});

for (const button of $$("[data-move]")) {
  button.addEventListener("click", () => {
    const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [dx, dy] = dirs[button.dataset.move] || [0, 0];
    playerMove(dx, dy);
  });
}

$("#btn-potion").addEventListener("click", usePotion);
$("#btn-skill").addEventListener("click", useSkill);
$("#btn-wait").addEventListener("click", waitTurn);
$("#btn-pause").addEventListener("click", () => {
  audio.play("click");
  openPause();
});

$("#btn-sound").addEventListener("click", () => {
  audio.init();
  settings.muted = !settings.muted;
  audio.setMuted(settings.muted);
  writeSettings();
  updateSoundUI();
  if (!settings.muted) audio.play("click");
});

$("#toggle-sound").addEventListener("click", () => {
  audio.init();
  settings.muted = !settings.muted;
  audio.setMuted(settings.muted);
  writeSettings();
  updateSoundUI();
  if (!settings.muted) audio.play("click");
});

$("#toggle-tilt").addEventListener("click", toggleTilt);
$("#btn-calibrate").addEventListener("click", calibrateTilt);

$("#btn-start").addEventListener("click", () => {
  audio.init();
  audio.play("click");
  showScreen("class");
});

$("#btn-class-back").addEventListener("click", () => {
  audio.play("click");
  showScreen("title");
});

for (const card of $$(".class-card")) {
  card.addEventListener("click", () => startRun(card.dataset.class));
}

for (const button of $$("#btn-help-title, #btn-help-class, #btn-how")) {
  button.addEventListener("click", () => {
    audio.init();
    audio.play("click");
    openModal("modal-help");
  });
}

for (const button of $$("[data-close-modal]")) {
  button.addEventListener("click", closeModal);
}

$("#btn-resume").addEventListener("click", closeModal);
$("#btn-pause-help").addEventListener("click", () => openModal("modal-help", "modal-pause"));
$("#btn-pause-settings").addEventListener("click", () => openModal("modal-settings", "modal-pause"));
$("#btn-abandon").addEventListener("click", () => {
  audio.play("click");
  modalLayer.hidden = true;
  pauseChain = false;
  modalReturn = null;
  state.paused = false;
  endRun(false, { abandoned: true });
});

$("#btn-again").addEventListener("click", () => {
  audio.play("click");
  modalLayer.hidden = true;
  state.resultOpen = false;
  startRun(state.lastClass);
});

$("#btn-result-title").addEventListener("click", () => {
  audio.play("click");
  modalLayer.hidden = true;
  state.resultOpen = false;
  state.playing = false;
  showScreen("title");
  updateBestUI();
});

window.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (!modalLayer.hidden) {
      closeModal();
      return;
    }
    if (state.playing) openPause();
    return;
  }
  if (!state.playing || isModalOpen()) return;
  const key = event.key.toLowerCase();
  const dirs = {
    arrowup: [0, -1], w: [0, -1],
    arrowdown: [0, 1], s: [0, 1],
    arrowleft: [-1, 0], a: [-1, 0],
    arrowright: [1, 0], d: [1, 0]
  };
  if (dirs[key]) {
    event.preventDefault();
    playerMove(dirs[key][0], dirs[key][1]);
  } else if (key === " " || key === "spacebar") {
    event.preventDefault();
    waitTurn();
  } else if (key === "q") {
    usePotion();
  } else if (key === "e") {
    useSkill();
  }
});

window.addEventListener("pointerdown", () => audio.init(), { once: true });
window.addEventListener("pointermove", event => {
  ambient.pointer.x = event.clientX / window.innerWidth;
  ambient.pointer.y = event.clientY / window.innerHeight;
}, { passive: true });

window.addEventListener("resize", () => {
  ambient.resize();
  if (state.screen === "game") renderer.resize();
});

if ("ResizeObserver" in window) {
  const observer = new ResizeObserver(() => {
    if (state.screen === "game") renderer.resize();
  });
  observer.observe($("#board-frame"));
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.playing && !state.busy && !state.resultOpen) {
    openPause();
  }
});

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

drawClassArt();
audio.setMuted(settings.muted);
updateSoundUI();
updateBestUI();
updateTiltUI();
updateHUD();
showScreen("title");

let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  ambient.update(dt);
  ambient.draw();
  if (state.screen === "game") renderer.render(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);




