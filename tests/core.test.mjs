import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOONS,
  ENEMIES,
  PLAYER,
  ROOMS,
  WEAPONS,
  WEAPON_IDS,
  WORLD,
  angleDiff,
  clamp,
  formatTime,
  hexToRgb,
  normalize,
  pickBoons,
  rgba,
  tiltVector,
  waveEnemyCount
} from '../js/core.js';

test('weapons expose the three playable arms', () => {
  assert.deepEqual(WEAPON_IDS, ['blade', 'bow', 'shield']);
  for (const id of WEAPON_IDS) {
    const weapon = WEAPONS[id];
    assert.equal(weapon.id, id);
    assert.ok(weapon.name.length > 0);
    assert.ok(weapon.damage > 0);
    assert.ok(weapon.specialCost > 0);
    assert.ok(weapon.desc.length > 0);
  }
});

test('boons are unique and pickBoons returns distinct cards', () => {
  const ids = new Set(BOONS.map((boon) => boon.id));
  assert.equal(ids.size, BOONS.length);
  const picked = pickBoons(3, () => 0.42);
  assert.equal(picked.length, 3);
  assert.equal(new Set(picked.map((boon) => boon.id)).size, 3);
  for (const boon of picked) {
    assert.ok(boon.name && boon.desc && boon.effect && boon.icon);
  }
});

test('pickBoons clamps requests above the boon pool', () => {
  assert.equal(pickBoons(999).length, BOONS.length);
});

test('rooms and waves describe a complete three-chamber run', () => {
  assert.equal(ROOMS.length, 3);
  assert.equal(ROOMS[0].waves.length, 2);
  assert.ok(ROOMS[2].boss);
  for (const room of ROOMS) {
    for (const wave of room.waves) {
      for (const [type, count] of wave) {
        assert.ok(ENEMIES[type], `unknown enemy ${type}`);
        assert.ok(count > 0);
      }
    }
  }
  assert.equal(waveEnemyCount([['shade', 3], ['wisp', 2]]), 5);
});

test('arena constants leave room for movement', () => {
  assert.ok(WORLD.width > WORLD.margin * 4);
  assert.ok(WORLD.height > WORLD.margin * 4);
  assert.ok(PLAYER.radius > 0);
  assert.ok(PLAYER.speed > 0);
  assert.ok(PLAYER.dashSpeed > PLAYER.speed);
});

test('tiltVector applies deadzone, range, baseline, and orientation', () => {
  assert.deepEqual(tiltVector({ beta: 0, gamma: 0 }), { x: 0, y: 0 });
  assert.deepEqual(tiltVector({ beta: 0.5, gamma: 0.5 }), { x: 0, y: 0 });

  const right = tiltVector({ beta: 0, gamma: 10 });
  assert.ok(right.x > 0.5);
  assert.equal(right.y, 0);

  const down = tiltVector({ beta: 17, gamma: 0 });
  assert.ok(down.y > 0.95);

  const clamped = tiltVector({ beta: 90, gamma: -90 });
  assert.ok(Math.abs(clamped.x) <= 1);
  assert.ok(Math.abs(clamped.y) <= 1);

  const based = tiltVector({ beta: 20, gamma: 20, baseline: { beta: 20, gamma: 20 } });
  assert.deepEqual(based, { x: 0, y: 0 });

  const landscape = tiltVector({ beta: 10, gamma: 0, orientation: 90 });
  assert.ok(landscape.x > 0.5);
  assert.ok(Math.abs(landscape.y) < 0.0001);

  const inverted = tiltVector({ beta: 10, gamma: 0, orientation: 180 });
  assert.ok(inverted.y < -0.5);
});

test('math and formatting helpers behave predictably', () => {
  assert.equal(clamp(12, 0, 10), 10);
  assert.equal(clamp(-2, 0, 10), 0);
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(600), '10:00');
  assert.equal(formatTime(-4), '0:00');
  assert.ok(Math.abs(angleDiff(0, Math.PI / 2) - Math.PI / 2) < 1e-9);
  assert.deepEqual(normalize(0, 0), { x: 0, y: 0, length: 0 });
  const unit = normalize(3, 4);
  assert.ok(Math.abs(unit.x - 0.6) < 1e-9);
  assert.ok(Math.abs(unit.y - 0.8) < 1e-9);
});

test('color helpers accept short and long hex values', () => {
  assert.deepEqual(hexToRgb('#abc'), { r: 170, g: 187, b: 204 });
  assert.deepEqual(hexToRgb('#112233'), { r: 17, g: 34, b: 51 });
  assert.equal(rgba('#ff0000', 0.5), 'rgba(255, 0, 0, 0.5)');
  assert.deepEqual(hexToRgb('nope'), { r: 255, g: 255, b: 255 });
});
