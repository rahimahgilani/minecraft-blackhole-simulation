// Smoke tests for src/world.js — run with: node tests/world.smoke.test.mjs
// Exercises the full destruction timeline headlessly via a minimal Three stub.
import assert from 'node:assert';

// DOM stub (world.js builds a canvas texture for windows)
globalThis.document = {
  createElement(tag) {
    return {
      width: 0, height: 0,
      getContext() { return { fillStyle: '', clearRect() {}, fillRect() {} }; },
    };
  },
};

const THREE = await import('three');
const { createWorld } = await import('../src/world.js');

const scene = { add() {} };
const bhPos = new THREE.Vector3(0, 120, 260);
let passed = 0;
const ok = (name) => { passed++; console.log('PASS ' + name); };

// --- API surface ---
const w = createWorld(scene);
assert.ok(w.group, 'group exposed');
assert.ok(Array.isArray(w.buildings) && w.buildings.length > 0, 'buildings generated');
assert.ok(Array.isArray(w.cars) && w.cars.length > 0, 'cars generated');
assert.ok(Array.isArray(w.peds) && w.peds.length > 0, 'peds generated');
assert.ok(typeof w.update === 'function' && typeof w.spawnDebris === 'function', 'update/spawnDebris exposed');
ok('API surface (group, buildings, cars, peds, update, spawnDebris)');

// --- full timeline sweep must not throw ---
for (let i = 0; i <= 40; i++) w.update(i / 40, 0.016, 1.0, bhPos);
ok('update(t=0..1, dt, elapsed, bhPos) sweeps without throwing');

// --- lighting progression: bright day -> disk-lit void (fresh world: sweep above mutated state) ---
const wl = createWorld(scene);
assert.ok(Math.abs(wl.lights.sun.intensity - 1.25) < 1e-6, 'sun at full intensity at t=0');
assert.ok(Math.abs(wl.lights.hemi.intensity - 0.85) < 1e-6, 'hemi at full intensity at t=0');
wl.update(1, 0.016, 1.0, bhPos);
assert.ok(wl.lights.sun.intensity < 0.1, 'sun dead at t=1');
assert.ok(wl.lights.hemi.intensity < 0.1, 'hemi dead at t=1');
assert.ok(wl.lights.bhLight.intensity > 1.0, 'accretion-disk light dominant at t=1');
ok('lighting: day bright at t=0, sun/hemi die, disk light rises by t=1');

// --- tidal wave lifecycle (fresh world for clean state) ---
const w2 = createWorld(scene);
w2.update(0.3, 0.016, 1, bhPos);
assert.strictEqual(w2.waves[0].mesh.visible, false, 'wave hidden before t0');
assert.strictEqual(w2.cracks[0].visible, false, 'cracks hidden early');
w2.update(0.6, 0.016, 1, bhPos);
assert.strictEqual(w2.waves[0].mesh.visible, true, 'wave visible mid-sweep');
w2.update(0.9, 0.016, 1, bhPos);
assert.strictEqual(w2.waves[0].mesh.visible, false, 'wave finished after sweep');
assert.strictEqual(w2.cracks[0].visible, true, 'cracks visible in late phase');
ok('tidal waves sweep (hidden->visible->gone) and cracks ignite late');

// --- spaghettification stretch ---
const w3 = createWorld(scene);
w3.update(0.2, 0.016, 1, bhPos);
assert.strictEqual(w3.peds[0].scale.y, 1, 'people unstretched early');
assert.strictEqual(w3.cars[0].scale.y, 1, 'cars unstretched early');
w3.update(0.9, 0.016, 1, bhPos);
assert.ok(w3.peds[0].scale.y > 1.05, 'people stretched toward BH late');
assert.ok(w3.cars[0].scale.y > 1.05, 'cars stretched toward BH late');
ok('spaghettification: people and cars stretch in late phases, normal early');

// --- final fragmentation: earth chunks spawn and fly (seeded random) ---
const w4 = createWorld(scene);
const realRandom = Math.random;
Math.random = () => 0.01; // force chunk spawns + deterministic behavior
for (let i = 0; i < 80; i++) w4.update(0.95, 0.016, i * 0.016, bhPos);
Math.random = realRandom;
assert.ok(w4.chunks.some((c) => c.visible), 'earth chunks tear free in final phase');
const flying = w4.chunks.find((c) => c.visible);
assert.ok(flying.position.y > 0 || flying.position.length() > 0, 'chunk is airborne/moving');
ok('final fragmentation: earth chunks spawn and spiral toward the black hole');

// --- debris system ---
const w5 = createWorld(scene);
w5.spawnDebris({ x: 0, y: 0, z: 0 }, 1);
w5.update(0.9, 0.016, 1, bhPos);
ok('spawnDebris + debris physics update without throwing');

console.log('\nALL ' + passed + ' SMOKE TEST GROUPS PASSED');