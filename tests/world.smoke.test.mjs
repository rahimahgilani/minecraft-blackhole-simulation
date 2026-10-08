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
assert.ok(w.ocean && w.crest && w.spout, 'ocean/crest/spout exposed');
assert.ok(w.moon && w.moonSphere && w.moonChunks.length > 0, 'moon system exposed');
assert.ok(w.atmoMesh && w.magmaMesh, 'atmosphere/magma systems exposed');
assert.ok(typeof w.update === 'function' && typeof w.spawnDebris === 'function', 'update/spawnDebris exposed');
ok('API surface (ocean, crest, spout, moon, atmo, magma, update, spawnDebris)');

// --- full timeline sweep must not throw ---
for (let i = 0; i <= 60; i++) w.update(i / 60, 0.016, i * 0.016, bhPos);
ok('update(t=0..1, dt, elapsed, bhPos) sweeps without throwing');

// --- lighting progression: bright day -> disk-lit void (fresh world) ---
const wl = createWorld(scene);
assert.ok(Math.abs(wl.lights.sun.intensity - 1.25) < 1e-6, 'sun at full intensity at t=0');
assert.ok(Math.abs(wl.lights.hemi.intensity - 0.85) < 1e-6, 'hemi at full intensity at t=0');
wl.update(1, 0.016, 1.0, bhPos);
assert.ok(wl.lights.sun.intensity < 0.1, 'sun dead at t=1');
assert.ok(wl.lights.hemi.intensity < 0.1, 'hemi dead at t=1');
assert.ok(wl.lights.bhLight.intensity > 1.0, 'accretion-disk light dominant at t=1');
ok('lighting: day bright at t=0, sun/hemi die, disk light rises by t=1');

// --- coastal drawback + tsunami crest lifecycle (fresh world) ---
const w2 = createWorld(scene);
const baseX = w2.ocean.userData.baseX;
w2.update(0.3, 0.016, 1, bhPos);
assert.strictEqual(w2.ocean.position.x, baseX, 'ocean in place before drawback');
assert.strictEqual(w2.crest.visible, false, 'crest hidden before t=0.58');
w2.update(0.55, 0.016, 1, bhPos);
assert.ok(w2.ocean.position.x < baseX - 20, 'ocean drawn back exposing seabed');
w2.update(0.65, 0.016, 1, bhPos);
assert.strictEqual(w2.crest.visible, true, 'tsunami crest visible mid-roll');
assert.ok(w2.crest.position.x > -95, 'crest advancing across the city');
w2.update(0.9, 0.016, 1, bhPos);
assert.strictEqual(w2.crest.visible, false, 'crest finished after sweep');
ok('coastal drawback then tsunami crest rolls across the city');

// --- ocean spout ---
const w3 = createWorld(scene);
w3.update(0.6, 0.016, 1, bhPos);
assert.strictEqual(w3.spout.visible, false, 'spout hidden before t=0.7');
w3.update(0.75, 0.016, 1, bhPos);
assert.strictEqual(w3.spout.visible, true, 'spout visible in late phase');
ok('ocean spout stretches water toward the black hole');

// --- moon: intact -> cracked -> shattered ---
const w4 = createWorld(scene);
w4.update(0.1, 0.016, 1, bhPos);
assert.strictEqual(w4.moonSphere.visible, true, 'moon intact early');
assert.strictEqual(w4.moonCracks[0].material.opacity < 0.1, true, 'moon cracks dark early');
w4.update(0.35, 0.016, 1, bhPos);
assert.ok(w4.moonCracks.some((mc) => mc.material.opacity > 0.1), 'moon cracks glowing at t=0.35 (pulsing, so check any)');
w4.update(0.5, 0.016, 1, bhPos);
assert.strictEqual(w4.moonSphere.visible, false, 'moon shattered by t=0.5');
assert.ok(w4.moonChunks.some((c) => c.visible), 'moon chunks drifting apart');
ok('moon cracks then shatters (tidal foreshadowing)');

// --- atmosphere stripping ---
const w5 = createWorld(scene);
w5.update(0.2, 0.016, 1, bhPos);
assert.strictEqual(w5.atmoMesh.visible, false, 'atmosphere intact early');
w5.update(0.4, 0.016, 1, bhPos);
assert.strictEqual(w5.atmoMesh.visible, true, 'atmosphere streaming away mid-phase');
w5.update(0.95, 0.016, 1, bhPos);
assert.strictEqual(w5.atmoMesh.visible, false, 'atmosphere gone by the end');
ok('atmosphere stripping: wisps stream to the BH then the sky is empty');

// --- magma eruptions ---
const w6 = createWorld(scene);
w6.update(0.5, 0.016, 1, bhPos);
assert.strictEqual(w6.magmaMesh.visible, false, 'magma dormant before fissures open');
w6.update(0.7, 0.016, 1, bhPos);
assert.strictEqual(w6.magmaMesh.visible, true, 'magma fountains active in late phase');
ok('magma eruptions fire from the fissures');

// --- spaghettification stretch (along the PULL axis: local Z after lookAt) ---
const w7 = createWorld(scene);
w7.update(0.2, 0.016, 1, bhPos);
assert.strictEqual(w7.peds[0].scale.z, 1, 'people unstretched early');
assert.strictEqual(w7.cars[0].scale.z, 1, 'cars unstretched early');
w7.update(0.9, 0.016, 1, bhPos);
assert.ok(w7.peds[0].scale.z > 1.05, 'people stretched along pull axis late');
assert.ok(w7.cars[0].scale.z > 1.05, 'cars stretched along pull axis late');
assert.ok(w7.peds[0].scale.x < 1, 'people thin across as they stretch');
ok('spaghettification: stretch along pull axis (Z), thinning across, normal early');

// --- beading: body parts separate into droplets along the pull line ---
const w8 = createWorld(scene);
w8.update(0.2, 0.016, 1, bhPos);
const earlyGap = Math.abs(w8.peds[0].children[0].position.z - w8.peds[0].children[1].position.z);
w8.update(0.9, 0.016, 1, bhPos);
const lateGap = Math.abs(w8.peds[0].children[0].position.z - w8.peds[0].children[1].position.z);
assert.ok(lateGap > earlyGap, 'body parts separate as stretch grows (beading)');
ok('beading: body parts separate into droplets along the pull line');

// --- late-phase infall + consumption (BH has descended near the city by now) ---
const bhEnd = new THREE.Vector3(0, 40, 90); // BH_END from main.js at approach=1
const w9 = createWorld(scene);
for (let i = 0; i < 120; i++) w9.update(0.95, 0.016, i * 0.016, bhEnd);
assert.ok(w9.cars.some((c) => !c.visible) || w9.peds.some((p) => !p.visible), 'objects consumed when they reach the BH');
ok('late-phase infall: objects accelerate to the BH and are consumed');

// --- final fragmentation: earth chunks spawn and fly (seeded random) ---
const w10 = createWorld(scene);
const realRandom = Math.random;
Math.random = () => 0.01; // force chunk spawns + deterministic behavior
for (let i = 0; i < 80; i++) w10.update(0.95, 0.016, i * 0.016, bhPos);
Math.random = realRandom;
assert.ok(w10.chunks.some((c) => c.visible), 'earth chunks tear free in final phase');
const flying = w10.chunks.find((c) => c.visible);
assert.ok(flying.position.y > 0 || flying.position.length() > 0, 'chunk is airborne/moving');
ok('final fragmentation: earth chunks spawn and spiral toward the black hole');

// --- END STATE: at t=1 Earth is fully consumed, only the debris ribbon remains ---
const w11 = createWorld(scene);
for (let i = 0; i < 60; i++) w11.update(i / 60, 0.016, i * 0.016, bhPos);
w11.update(1, 0.016, 1, bhPos);
assert.strictEqual(w11.group.children.some((ch) => ch === w11.ocean && ch.visible), false, 'ocean gone');
assert.strictEqual(w11.moon.visible, false, 'moon gone');
assert.strictEqual(w11.spout.visible, false, 'spout gone');
assert.strictEqual(w11.atmoMesh.visible, false, 'atmosphere gone');
assert.strictEqual(w11.magmaMesh.visible, false, 'magma gone');
assert.strictEqual(w11.cracks.every((c) => !c.visible), true, 'cracks faded');
assert.ok(w11.buildings.every((b) => !b.g.visible), 'buildings consumed');
ok('END STATE: at t=1 Earth is fully consumed (ocean, moon, spout, atmo, magma, cracks, buildings all gone)');

// --- debris system + spiral streams ---
const w12 = createWorld(scene);
w12.spawnDebris({ x: 0, y: 0, z: 0 }, 1);
w12.update(0.9, 0.016, 1, bhPos);
ok('spawnDebris + spiral debris physics update without throwing');

console.log('\nALL ' + passed + ' SMOKE TEST GROUPS PASSED');