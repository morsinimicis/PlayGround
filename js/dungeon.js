export const WALL = 0;
export const FLOOR = 1;

export const FLOOR_THEMES = [
  {
    name: "The Mossy Crypt",
    kicker: "Floor I",
    sub: "Find the Ember Sigil",
    wall: "#27312f",
    wallTop: "#3c4b45",
    wallEdge: "#596c61",
    floor: "#151e1c",
    floorAlt: "#1a2521",
    crack: "#0b1210",
    moss: "#3f6a50",
    accent: "#7fe0b2",
    accentSoft: "rgba(127, 224, 178, 0.22)",
    fog: "#050c0a",
    torch: "#ffbe62",
    dust: "#a9d8bd",
    ambient: "rgba(74, 135, 105, 0.16)",
    enemyTint: "#8fdf9d"
  },
  {
    name: "The Sunken Halls",
    kicker: "Floor II",
    sub: "The water remembers",
    wall: "#243240",
    wallTop: "#354c5e",
    wallEdge: "#51758a",
    floor: "#111c27",
    floorAlt: "#162330",
    crack: "#081019",
    moss: "#2f6470",
    accent: "#73d8ef",
    accentSoft: "rgba(115, 216, 239, 0.2)",
    fog: "#040b12",
    torch: "#9de9ff",
    dust: "#a4dceb",
    ambient: "rgba(58, 128, 158, 0.16)",
    enemyTint: "#83cfe4"
  },
  {
    name: "The Ashen Library",
    kicker: "Floor III",
    sub: "Every book is a warning",
    wall: "#382f29",
    wallTop: "#514438",
    wallEdge: "#7c644a",
    floor: "#211a16",
    floorAlt: "#2a211a",
    crack: "#120d0a",
    moss: "#77562f",
    accent: "#ffc46e",
    accentSoft: "rgba(255, 196, 110, 0.2)",
    fog: "#0e0906",
    torch: "#ff9f4d",
    dust: "#eccb94",
    ambient: "rgba(164, 102, 46, 0.15)",
    enemyTint: "#e2b27a"
  },
  {
    name: "The Frost Vault",
    kicker: "Floor IV",
    sub: "The cold keeps its promises",
    wall: "#2a3046",
    wallTop: "#404a67",
    wallEdge: "#66749a",
    floor: "#151a2a",
    floorAlt: "#1b2235",
    crack: "#090c15",
    moss: "#3f5f86",
    accent: "#9cc8ff",
    accentSoft: "rgba(156, 200, 255, 0.2)",
    fog: "#050915",
    torch: "#9dc9ff",
    dust: "#c6defa",
    ambient: "rgba(78, 112, 174, 0.17)",
    enemyTint: "#a9c6ec"
  },
  {
    name: "The Ember Throne",
    kicker: "Floor V",
    sub: "Wake the Ember Warden",
    wall: "#3b2529",
    wallTop: "#59363b",
    wallEdge: "#8a5253",
    floor: "#261417",
    floorAlt: "#31191d",
    crack: "#13080b",
    moss: "#7b3431",
    accent: "#ff8c73",
    accentSoft: "rgba(255, 140, 115, 0.22)",
    fog: "#130607",
    torch: "#ff6b4f",
    dust: "#ffc09d",
    ambient: "rgba(173, 62, 48, 0.19)",
    enemyTint: "#f0928c"
  }
];

export const ENEMY_TYPES = {
  slime: {
    name: "Moss Slime",
    hp: 13,
    atk: 5,
    def: 0,
    xp: 8,
    gold: 5,
    aggro: 5,
    kind: "slime"
  },
  bat: {
    name: "Crypt Bat",
    hp: 10,
    atk: 6,
    def: 0,
    xp: 9,
    gold: 6,
    aggro: 7,
    kind: "bat"
  },
  goblin: {
    name: "Cinder Goblin",
    hp: 19,
    atk: 8,
    def: 1,
    xp: 13,
    gold: 10,
    aggro: 6,
    kind: "goblin"
  },
  skeleton: {
    name: "Bone Sentinel",
    hp: 27,
    atk: 10,
    def: 3,
    xp: 17,
    gold: 14,
    aggro: 5,
    kind: "skeleton"
  },
  wraith: {
    name: "Ash Wraith",
    hp: 23,
    atk: 12,
    def: 2,
    xp: 19,
    gold: 17,
    aggro: 7,
    kind: "wraith"
  },
  warden: {
    name: "The Ember Warden",
    hp: 165,
    atk: 14,
    def: 4,
    xp: 140,
    gold: 90,
    aggro: 12,
    kind: "warden",
    boss: true
  }
};

const ENEMY_POOLS = [
  ["slime", "slime", "slime", "bat"],
  ["slime", "bat", "bat", "goblin"],
  ["bat", "goblin", "goblin", "skeleton"],
  ["goblin", "skeleton", "skeleton", "wraith"],
  ["skeleton", "wraith", "wraith", "skeleton"]
];

export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle(rng, arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function carveRoom(map, room) {
  for (let y = room.y; y < room.y + room.h; y += 1) {
    for (let x = room.x; x < room.x + room.w; x += 1) {
      map[y][x] = FLOOR;
    }
  }
}

function carveCorridor(map, a, b, horizontalFirst) {
  const carveH = (x0, x1, y) => {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x += 1) map[y][x] = FLOOR;
  };
  const carveV = (y0, y1, x) => {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y += 1) map[y][x] = FLOOR;
  };
  if (horizontalFirst) {
    carveH(a.cx, b.cx, a.cy);
    carveV(a.cy, b.cy, b.cx);
  } else {
    carveV(a.cy, b.cy, a.cx);
    carveH(a.cx, b.cx, b.cy);
  }
}

function overlaps(room, rooms) {
  return rooms.some(other =>
    room.x - 1 < other.x + other.w &&
    room.x + room.w + 1 > other.x &&
    room.y - 1 < other.y + other.h &&
    room.y + room.h + 1 > other.y
  );
}

function roomAt(rooms, x, y) {
  return rooms.find(room => x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h) || null;
}

function distance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function makeRoomList(rng, size, floorNum) {
  const layout = size >= 11
    ? { cols: 3, rows: 2 }
    : size >= 10
      ? { cols: 2, rows: 3 }
      : { cols: 2, rows: 2 };
  const cellW = Math.floor(size / layout.cols);
  const cellH = Math.floor(size / layout.rows);
  const rooms = [];

  for (let row = 0; row < layout.rows; row += 1) {
    for (let col = 0; col < layout.cols; col += 1) {
      const cellX = col * cellW;
      const cellY = row * cellH;
      const maxW = Math.max(2, Math.min(4, cellW - 1));
      const maxH = Math.max(2, Math.min(4, cellH - 1));
      const w = randInt(rng, 2, maxW);
      const h = randInt(rng, 2, maxH);
      const x = randInt(rng, cellX + 1, cellX + cellW - w);
      const y = randInt(rng, cellY + 1, cellY + cellH - h);
      rooms.push({
        x,
        y,
        w,
        h,
        cx: x + Math.floor(w / 2),
        cy: y + Math.floor(h / 2)
      });
    }
  }

  return rooms;
}

export function generateFloor(floorNum, seed = Date.now()) {
  const size = [9, 9, 10, 10, 11][Math.max(0, Math.min(4, floorNum - 1))];
  const theme = FLOOR_THEMES[floorNum - 1];
  let rng = makeRng(seed);
  let rooms = [];
  let map = [];

  for (let attempt = 0; attempt < 30; attempt += 1) {
    rng = makeRng(seed + attempt * 7919);
    rooms = makeRoomList(rng, size, floorNum);
    if (rooms.length >= (floorNum === 5 ? 5 : 4)) break;
  }

  map = Array.from({ length: size }, () => Array(size).fill(WALL));
  for (const room of rooms) carveRoom(map, room);

  for (let i = 1; i < rooms.length; i += 1) {
    carveCorridor(map, rooms[i - 1], rooms[i], rng() > 0.45);
  }
  if (rooms.length > 3 && rng() > 0.25) {
    carveCorridor(map, rooms[0], rooms[rooms.length - 1], rng() > 0.5);
  }

  const startRoom = rooms[0];
  const endRoom = rooms[rooms.length - 1];
  const start = { x: startRoom.cx, y: startRoom.cy };
  const occupied = new Set();
  const keyOf = (x, y) => `${x},${y}`;
  const occupy = (x, y) => occupied.add(keyOf(x, y));
  occupy(start.x, start.y);

  const objects = [];
  const objectId = (() => {
    let id = 0;
    return () => `o${id++}`;
  })();

  const addObject = (type, x, y, extra = {}) => {
    objects.push({ id: objectId(), type, x, y, ...extra });
    occupy(x, y);
  };

  if (floorNum < 5) {
    addObject("stairs", endRoom.cx, endRoom.cy);
    const middleRooms = rooms.slice(1, Math.max(2, rooms.length - 1));
    const sigilRoom = middleRooms.length ? pick(rng, middleRooms) : rooms[Math.max(1, rooms.length - 2)];
    addObject("sigil", sigilRoom.cx, sigilRoom.cy);
  }

  const freeTiles = [];
  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      if (map[y][x] !== FLOOR) continue;
      if (occupied.has(keyOf(x, y))) continue;
      if (Math.abs(x - start.x) + Math.abs(y - start.y) < 3) continue;
      freeTiles.push({ x, y });
    }
  }

  const openTiles = shuffle(rng, freeTiles.slice());

  const place = (type, extra, roomFilter) => {
    for (let i = 0; i < openTiles.length; i += 1) {
      const tile = openTiles[i];
      if (occupied.has(keyOf(tile.x, tile.y))) continue;
      if (roomFilter && !roomFilter(roomAt(rooms, tile.x, tile.y))) continue;
      openTiles.splice(i, 1);
      addObject(type, tile.x, tile.y, extra);
      return tile;
    }
    return null;
  };

  const notStartRoom = room => room && room !== startRoom;

  const chestCount = floorNum >= 3 ? 3 : 2;
  for (let i = 0; i < chestCount; i += 1) {
    const roll = rng();
    const loot = roll < 0.34 ? "gold" : roll < 0.62 ? "potion" : roll < 0.8 ? "xp" : roll < 0.91 ? "atk" : "def";
    place("chest", { loot, opened: false }, notStartRoom);
  }

  for (let i = 0; i < 2; i += 1) {
    place("potion", { amount: 1 }, notStartRoom);
  }

  const goldCount = 3 + (floorNum > 2 ? 1 : 0);
  for (let i = 0; i < goldCount; i += 1) {
    place("gold", { amount: randInt(rng, 4, 9) + floorNum * 2 });
  }

  const enemies = [];
  let enemyId = 0;
  const addEnemy = (typeName, x, y) => {
    const base = ENEMY_TYPES[typeName];
    const scale = floorNum - 1;
    enemies.push({
      id: `e${enemyId++}`,
      type: typeName,
      kind: base.kind,
      name: base.name,
      x,
      y,
      hp: base.hp + scale * (base.boss ? 18 : 4),
      maxHp: base.hp + scale * (base.boss ? 18 : 4),
      atk: base.atk + scale * (base.boss ? 2 : 1),
      def: base.def + Math.floor(scale / 2),
      xp: base.xp + scale * 2,
      gold: base.gold + scale * 2,
      aggro: base.aggro,
      boss: Boolean(base.boss),
      stun: 0,
      bossTurn: 0,
      dead: false
    });
    occupy(x, y);
  };

  if (floorNum === 5) {
    const bossTile = openTiles.find(tile =>
      roomAt(rooms, tile.x, tile.y) === endRoom &&
      distance(tile, { x: endRoom.cx, y: endRoom.cy }) >= 1
    ) || { x: endRoom.cx, y: endRoom.cy };
    addEnemy("warden", bossTile.x, bossTile.y);
    const bossKey = keyOf(bossTile.x, bossTile.y);
    const idx = openTiles.findIndex(tile => keyOf(tile.x, tile.y) === bossKey);
    if (idx >= 0) openTiles.splice(idx, 1);
  }

  const pool = ENEMY_POOLS[floorNum - 1];
  const enemyCount = floorNum === 5 ? 5 : 4 + floorNum;
  for (let i = 0; i < enemyCount; i += 1) {
    const tile = place("__enemy", {}, notStartRoom);
    if (tile) addEnemy(pick(rng, pool), tile.x, tile.y);
  }

  const cleanedObjects = objects.filter(object => object.type !== "__enemy");

  return {
    floor: floorNum,
    theme,
    cols: size,
    rows: size,
    map,
    rooms,
    start,
    end: { x: endRoom.cx, y: endRoom.cy },
    objects: cleanedObjects,
    enemies,
    seed
  };
}

export function roomAtTile(rooms, x, y) {
  return roomAt(rooms, x, y);
}

export function lineOfSight(map, x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  let x = x0;
  let y = y0;
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (x !== x1 || y !== y1) {
    const e2 = err * 2;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
    if (x === x1 && y === y1) break;
    if (!map[y] || map[y][x] === WALL) return false;
  }
  return true;
}

export function distanceMap(map, from, blocked = new Set()) {
  const rows = map.length;
  const cols = map[0].length;
  const dist = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  const queue = [[from.x, from.y]];
  dist[from.y][from.x] = 0;
  let head = 0;

  while (head < queue.length) {
    const [x, y] = queue[head++];
    const d = dist[y][x];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (map[ny][nx] === WALL) continue;
      if (blocked.has(`${nx},${ny}`) && !(nx === from.x && ny === from.y)) continue;
      if (dist[ny][nx] <= d + 1) continue;
      dist[ny][nx] = d + 1;
      queue.push([nx, ny]);
    }
  }

  return dist;
}

export function findPath(map, from, to, blocked = new Set()) {
  if (from.x === to.x && from.y === to.y) return [];
  const rows = map.length;
  const cols = map[0].length;
  const prev = Array.from({ length: rows }, () => Array(cols).fill(null));
  const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
  const queue = [[from.x, from.y]];
  seen[from.y][from.x] = true;
  let head = 0;
  let found = false;

  while (head < queue.length) {
    const [x, y] = queue[head++];
    if (x === to.x && y === to.y) { found = true; break; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (map[ny][nx] === WALL || seen[ny][nx]) continue;
      if (blocked.has(`${nx},${ny}`) && !(nx === to.x && ny === to.y)) continue;
      seen[ny][nx] = true;
      prev[ny][nx] = [x, y];
      queue.push([nx, ny]);
    }
  }

  if (!found) return null;
  const path = [];
  let cx = to.x;
  let cy = to.y;
  while (cx !== from.x || cy !== from.y) {
    path.push({ x: cx, y: cy });
    const step = prev[cy][cx];
    if (!step) return null;
    [cx, cy] = step;
  }
  return path.reverse();
}

export function floorLabel(floorNum) {
  return ["I", "II", "III", "IV", "V"][floorNum - 1] || String(floorNum);
}
