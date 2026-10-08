// Boot + pure-logic tests for main.js — run with: node tests/main.smoke.test.mjs
// Importing main.js boots the entire engine headlessly (DOM + WebGL stubbed):
// a throw anywhere in setup fails these tests.
import assert from 'node:assert';

const elements = new Map();
const makeEl = (id) => {
  const el = {
    id, textContent: '', className: '', value: 0, min: 0, max: 1000, style: {},
    scrollTop: 0, scrollHeight: 0,
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {}, appendChild() {}, remove() {},
    querySelectorAll: () => [],
  };
  if (id) elements.set(id, el);
  return el;
};

globalThis.document = {
  createElement: () => Object.assign(makeEl(null), {
    getContext: () => ({ fillStyle: '', clearRect() {}, fillRect() {} }),
  }),
  getElementById: (id) => { if (!elements.has(id)) makeEl(id); return elements.get(id); },
  body: makeEl(null),
};
globalThis.innerWidth = 1280;
globalThis.innerHeight = 720;
globalThis.devicePixelRatio = 1;
globalThis.addEventListener = () => {};
globalThis.requestAnimationFrame = () => {};

const { simSeconds, formatClock, phaseFor } = await import('../main.js');

let passed = 0;
const ok = (name) => { passed++; console.log('PASS ' + name); };

// --- boot: engine constructed, HUD wired, clock initialized ---
assert.strictEqual(elements.get('sim-clock').textContent, 'T+ 00:00:00', 'HUD clock initialized at boot');
assert.strictEqual(elements.get('phase-label').textContent, 'NORMAL', 'phase label initialized at boot');
ok('engine boots headlessly (renderer, world, black hole, HUD wiring)');

// --- clock mapping: timeline position -> simulated seconds ---
const stops = [[0, 0], [0.05, 1], [0.10, 60], [0.25, 3600], [0.45, 86400], [0.70, 604800], [0.85, 1209600], [0.93, 2419200], [1.0, 3628800]];
for (const [t, s] of stops) assert.ok(Math.abs(simSeconds(t) - s) < 1e-6, `simSeconds(${t}) should be ${s}`);
let prev = -1;
for (let i = 0; i <= 100; i++) {
  const s = simSeconds(i / 100);
  assert.ok(s >= prev, 'clock mapping is monotonic');
  prev = s;
}
ok('clock mapping hits every stop (1s/1min/1h/1d/1w/2w/4w/6w) and is monotonic');

// --- clock formatting ---
assert.strictEqual(formatClock(0), 'T+ 00:00:00');
assert.strictEqual(formatClock(1), 'T+ 00:00:01');
assert.strictEqual(formatClock(60), 'T+ 00:01:00');
assert.strictEqual(formatClock(3600), 'T+ 01:00:00');
assert.strictEqual(formatClock(90061), 'T+ 1d 01:01:01');
assert.strictEqual(formatClock(604800), 'T+ 1w 00:00:00');
assert.strictEqual(formatClock(3628800), 'T+ 6w 00:00:00');
ok('clock formats seconds, minutes, hours, days and weeks');

// --- phase lookup across the new timeline ---
assert.strictEqual(phaseFor(0).title, 'NORMAL');
assert.strictEqual(phaseFor(0.06).title, '1 SEC');
assert.strictEqual(phaseFor(0.12).title, '1 MIN');
assert.strictEqual(phaseFor(0.30).title, '1 HOUR');
assert.strictEqual(phaseFor(0.50).title, '1 DAY');
assert.strictEqual(phaseFor(0.75).title, '1 WEEK');
assert.strictEqual(phaseFor(0.90).title, '2 WEEKS');
assert.strictEqual(phaseFor(1).title, '4-6 WEEKS / FINAL');
ok('phaseFor matches the new seconds-to-weeks timeline');

console.log('\nALL ' + passed + ' MAIN TEST GROUPS PASSED');