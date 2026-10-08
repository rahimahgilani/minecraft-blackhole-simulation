// main.js — engine, first-person controls, timeline engine, cinematic mode, AI panel
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { createWorld } from './src/world.js';
import { createBlackHole } from './src/blackhole.js';

const $ = (id) => document.getElementById(id);
const viewport = $('viewport');
const phaseLabel = $('phase-label');
const simClock = $('sim-clock');
const dilationEl = $('dilation');
const eduTitle = $('edu-title');
const eduText = $('edu-text');
const eduReal = $('edu-real');
const inspectNote = $('inspect-note');
const slider = $('time-slider');
const labelsRow = $('timeline-labels');
const milestonesRow = $('milestones');
const btnPlay = $('btn-play');
const btnRestart = $('btn-restart');
const btnCinematic = $('btn-cinematic');
const btnControls = $('btn-controls');
const controlsPanel = $('controls-panel');
const eduWatch = $('edu-watch');
const loading = $('loading');
const lockHint = $('lock-hint');
const timelineEl = $('timeline');

// pause veil (created here so index.html stays lean)
const pauseVeil = document.createElement('div');
pauseVeil.id = 'pause-veil';
pauseVeil.className = 'hidden';
pauseVeil.textContent = 'PAUSED';
document.body.appendChild(pauseVeil);

// end veil (shown when Earth is fully consumed)
const endVeil = document.createElement('div');
endVeil.id = 'end-veil';
endVeil.className = 'hidden';
endVeil.innerHTML = '<b>EARTH IS GONE</b><span>Every fragment has crossed the event horizon.<br/>Press R to restart, or drag the timeline back.</span>';
document.body.appendChild(endVeil);

// ---------- renderer / scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 60, 260);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 4000);
camera.position.set(0, 1.7, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
viewport.appendChild(renderer.domElement);

// ---------- world + black hole ----------
const world = createWorld(scene);
const bh = createBlackHole(scene);
const BH_POS = new THREE.Vector3(0, 120, 260);   // start high in the sky
const BH_END = new THREE.Vector3(0, 40, 90);     // final approach position
bh.group.position.copy(BH_POS);
bh.group.lookAt(0, 0, 0);

// ---------- timeline engine ----------
const MILESTONES = [
  { t: 0.00, label: 'NORMAL' },
  { t: 0.05, label: '1 SEC' },
  { t: 0.10, label: '1 MIN' },
  { t: 0.25, label: '1 HOUR' },
  { t: 0.45, label: '1 DAY' },
  { t: 0.70, label: '1 WEEK' },
  { t: 0.85, label: '2 WEEKS' },
  { t: 0.93, label: '4 WEEKS' },
  { t: 1.00, label: '6 WEEKS FINAL' },
];
const PHASES = [
  { until: 0.05, title: 'NORMAL', text: 'A bright Lahore morning. Traffic flows, pedestrians wander, the Moon hangs quietly in the sky. The only gravity that matters is Earth\u2019s own.', real: 'With no black hole nearby, only Earth\u2019s own gravity acts on you.', watch: 'Watch the traffic and the pedestrians \u2014 remember this. It\u2019s the last normal day.' },
  { until: 0.10, title: '1 SEC', text: 'A black hole has torn into the sky above the city. Light bends around it, warping the stars behind it into rings.', real: 'Lensing: gravity bends light passing near the horizon, shifting apparent star positions.', watch: 'Watch the star field warp around the dark disk \u2014 the sky is no longer honest.' },
  { until: 0.25, title: '1 MIN', text: 'The Moon\u2019s face splits with glowing cracks. Its near side is pulled harder than its far side, and the rock is starting to fail.', real: 'Tidal force scales as 1/r\u00b3 \u2014 the lighter Moon fails long before Earth does.', watch: 'Watch the Moon \u2014 it is the rehearsal for what happens to Earth.' },
  { until: 0.45, title: '1 HOUR', text: 'The sky itself is leaving. Blue-white wisps of atmosphere stream off the horizon toward the black hole, and the blue begins to thin.', real: 'Atmospheric stripping: gases escape when the BH\u2019s pull beats Earth\u2019s gravity.', watch: 'Watch the horizon \u2014 the air is visibly flowing away, and it will not come back.' },
  { until: 0.70, title: '1 DAY', text: 'The Moon shatters into drifting rubble. The ocean draws back from the coast, exposing the seabed \u2014 then a tsunami crest rolls through the city.', real: 'Tidal disruption begins; the ocean responds first, the crust follows.', watch: 'Watch the seabed appear, then the wall of water. It is faster than you.' },
  { until: 0.85, title: '1 WEEK', text: 'The crust fails. Magma fountains from widening fissures, and the ocean itself is stretched into a spout reaching for the black hole.', real: 'Matter spirals inward, heating by compression as it feeds the accretion disk.', watch: 'Watch the fissures widen and glow \u2014 the ground is opening under the city.' },
  { until: 0.93, title: '2 WEEKS', text: 'The city comes apart in earnest. Buildings tear loose and stream upward, stretching into glowing filaments as they rise.', real: 'Spaghettification: the near side is pulled so much harder that objects are drawn into filaments.', watch: 'Watch a building stretch as it rises \u2014 the pull is stronger on its top than its base.' },
  { until: 1.01, title: '4-6 WEEKS / FINAL', text: 'The last fragments of Earth stretch, glow, and cross the horizon. The city, the ocean, the sky \u2014 all of it is now part of the disk.', real: 'Fragmentation \u2192 accretion: the planet\u2019s mass joins the disk and the horizon. Nothing escapes.', watch: 'Watch the last chunk stretch and fade into the disk. Then it is over \u2014 Earth is gone.' },
];
function phaseFor(t) {
  for (const p of PHASES) if (t < p.until) return p;
  return PHASES[PHASES.length - 1];
}

// ---------- simulated clock: timeline position -> real elapsed time ----------
const CLOCK_STOPS = [
  [0.00, 0],           // T+0
  [0.05, 1],           // 1 sec
  [0.10, 60],          // 1 min
  [0.25, 3600],        // 1 hour
  [0.45, 86400],       // 1 day
  [0.70, 604800],      // 1 week
  [0.85, 1209600],     // 2 weeks
  [0.93, 2419200],     // 4 weeks
  [1.00, 3628800],     // 6 weeks
];
function simSeconds(t) {
  for (let i = 1; i < CLOCK_STOPS.length; i++) {
    if (t <= CLOCK_STOPS[i][0]) {
      const t0 = CLOCK_STOPS[i - 1][0], s0 = CLOCK_STOPS[i - 1][1];
      const t1 = CLOCK_STOPS[i][0], s1 = CLOCK_STOPS[i][1];
      return s0 + (s1 - s0) * ((t - t0) / (t1 - t0));
    }
  }
  return CLOCK_STOPS[CLOCK_STOPS.length - 1][1];
}
function formatClock(s) {
  const w = Math.floor(s / 604800); s -= w * 604800;
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  const p2 = (n) => String(n).padStart(2, '0');
  let out = '';
  if (w) out += w + 'w ';
  if (d) out += d + 'd ';
  out += p2(h) + ':' + p2(m) + ':' + p2(Math.floor(s));
  return 'T+ ' + out;
}

let simTime = 0;
let playing = true;
let cinematic = false;
let paused = false;
let elapsed = 0;
let dtLast = 0.016;
let speedMult = 1;

function setSimTime(t) {
  simTime = THREE.MathUtils.clamp(t, 0, 1);
  bh.group.visible = simTime > 0.10;
  const approach = THREE.MathUtils.smoothstep(simTime, 0.14, 1.0);
  bh.group.position.lerpVectors(BH_POS, BH_END, approach);
  bh.setProgress(approach);
  bh.update(dtLast, elapsed, simTime);
  world.update(simTime, dtLast, elapsed, bh.group.position);
  // sky progression: bright day → golden warning → blood dusk → void lit by the disk
  const k1 = THREE.MathUtils.smoothstep(simTime, 0.22, 0.5);   // day → golden
  const k2 = THREE.MathUtils.smoothstep(simTime, 0.5, 0.75);   // golden → blood dusk
  const k3 = THREE.MathUtils.smoothstep(simTime, 0.75, 1.0);   // blood → void
  scene.background.setHSL(
    0.58 - k1 * 0.49 - k2 * 0.07,   // blue → golden → blood red (no rainbow sweep)
    0.6 - k3 * 0.35,
    0.68 - k1 * 0.25 - k2 * 0.25 - k3 * 0.12
  );
  scene.fog.color.copy(scene.background);
  scene.fog.near = 60 - k3 * 30;
  scene.fog.far = 260 - k3 * 120;
  const ph = phaseFor(simTime);
  phaseLabel.textContent = ph.title;
  eduTitle.textContent = ph.title;
  eduText.textContent = ph.text;
  eduReal.textContent = 'Physically: ' + ph.real;
  eduWatch.textContent = 'WATCH FOR: ' + ph.watch;
  simClock.textContent = formatClock(simSeconds(simTime));
  // gravitational time dilation (simplified): clocks near the BH tick slower
  const dil = 1 / Math.sqrt(1 - Math.min(0.96, approach * approach * 0.96));
  dilationEl.textContent = approach > 0.02
    ? 'TIME DILATION \u00d7' + dil.toFixed(2) + ' \u2014 your clock runs ' + Math.round((1 - 1 / dil) * 100) + '% slower than faraway clocks'
    : '';
  // the sim ends only when Earth is fully consumed (t = 1)
  const ended = simTime >= 1;
  endVeil.classList.toggle('hidden', !ended);
  if (ended) playing = false;
  let active = MILESTONES[0];
  for (const m of MILESTONES) if (simTime >= m.t - 0.001) active = m;
  labelsRow.querySelectorAll('span').forEach((el, i) => el.classList.toggle('active', MILESTONES[i] === active));
  slider.value = Math.round(simTime * 1000);
}

// ---------- UI wiring ----------
MILESTONES.forEach((m) => {
  const dot = document.createElement('div');
  dot.className = 'dot';
  dot.style.left = (m.t * 100) + '%';
  milestonesRow.appendChild(dot);
  const span = document.createElement('span');
  span.textContent = m.label;
  span.addEventListener('click', () => setSimTime(m.t));
  labelsRow.appendChild(span);
});
slider.addEventListener('input', () => setSimTime(slider.value / 1000));

function setPaused(v) {
  paused = v;
  btnPlay.textContent = paused ? '\u25B6 PLAY' : '\u23F8 PAUSE';
  pauseVeil.classList.toggle('hidden', !paused);
}
btnPlay.addEventListener('click', () => setPaused(!paused));
btnRestart.addEventListener('click', () => {
  world.reset();
  camera.position.set(0, EYE, 0);
  vy = 0;
  velocity.set(0, 0, 0);
  playing = true;
  endVeil.classList.add('hidden');
  dilationEl.textContent = '';
  setSimTime(0);
  setPaused(false);
});
btnCinematic.addEventListener('click', () => {
  cinematic = !cinematic;
  btnCinematic.textContent = cinematic ? '\ud83c\udfac CINEMATIC: ON' : '\ud83c\udfac CINEMATIC: OFF';
  if (cinematic) { cineClock = 0; controls.unlock(); }
});
btnControls.addEventListener('click', () => controlsPanel.classList.toggle('hidden'));
const btnSpeed = $('btn-speed');
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
btnSpeed.addEventListener('click', () => {
  speedMult = SPEEDS[(SPEEDS.indexOf(speedMult) + 1) % SPEEDS.length];
  btnSpeed.textContent = '\u23E9 SPEED \u00D7' + speedMult;
});

// ---------- first-person controls ----------
const controls = new PointerLockControls(camera, renderer.domElement);
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyF') fly = !fly;
  if (e.code === 'KeyP') setPaused(!paused);
  if (e.code === 'KeyR') btnRestart.click();
  if (e.code === 'KeyT') timelineEl.classList.toggle('hidden');
  if (e.code === 'KeyC') btnCinematic.click();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
renderer.domElement.addEventListener('click', () => {
  if (!cinematic && !paused) controls.lock();
});
controls.addEventListener('lock', () => lockHint.classList.add('hidden'));
controls.addEventListener('unlock', () => lockHint.classList.remove('hidden'));

const velocity = new THREE.Vector3();
const dir = new THREE.Vector3();
let vy = 0;
let fly = false;
const GRAV = 22;
const EYE = 1.7;

function movePlayer(dt) {
  if (controls.isLocked && !cinematic) {
    const speed = (keys['ShiftLeft'] ? 14 : 7) * (fly ? 2.2 : 1);
    dir.set(0, 0, 0);
    if (keys['KeyW']) dir.z -= 1;
    if (keys['KeyS']) dir.z += 1;
    if (keys['KeyA']) dir.x -= 1;
    if (keys['KeyD']) dir.x += 1;
    dir.normalize().applyQuaternion(camera.quaternion);
    velocity.x = dir.x * speed;
    velocity.z = dir.z * speed;
    if (fly) {
      velocity.y = dir.y * speed;
      if (keys['Space']) velocity.y += speed * 0.8;
      if (keys['ControlLeft']) velocity.y -= speed * 0.8;
      vy = 0;
    } else {
      velocity.y = 0;
      if (keys['Space'] && camera.position.y <= EYE + 0.01) vy = 8;
    }
  } else {
    velocity.set(0, 0, 0);
  }
  vy -= (fly ? 0 : GRAV) * dt;
  camera.position.x += velocity.x * dt;
  camera.position.z += velocity.z * dt;
  camera.position.y += (fly ? velocity.y : vy) * dt;
  if (!fly && camera.position.y < EYE) { camera.position.y = EYE; vy = 0; }
}

// ---------- cinematic mode ----------
const CINEMATIC_SCENES = [
  { until: 4,  run: () => { camera.position.set(0, EYE, 12); camera.lookAt(0, 2, 60); } },
  { until: 8,  run: (k) => { camera.lookAt(0, 2 + (k - 4) * 12, 60 + (k - 4) * 30); } },
  { until: 12, run: () => { camera.lookAt(BH_POS); } },
  { until: 16, run: () => { camera.lookAt(bh.group.position); } },
  { until: 20, run: () => { camera.position.set(0, EYE, 12); camera.lookAt(0, 2, 40); } },
  { until: 26, run: (k) => { camera.position.set(0, EYE + (k - 20) * 3, 12 - (k - 20) * 2); camera.lookAt(bh.group.position); } },
  { until: 32, run: (k) => { camera.position.set(0, 60 + (k - 26) * 30, 200 + (k - 26) * 40); camera.lookAt(0, 0, 0); } },
  { until: 999, run: (k) => { camera.position.set(0, 240 + (k - 32) * 8, 440 + (k - 32) * 10); camera.lookAt(0, 0, 0); } },
];
let cineClock = 0;
function updateCinematic(dt) {
  if (!cinematic) return;
  cineClock += dt;
  for (const s of CINEMATIC_SCENES) {
    if (cineClock < s.until) { s.run(cineClock); break; }
  }
  setSimTime(simTime + dt * 0.02);
  if (simTime >= 1) btnCinematic.click();
}

// ---------- object inspection ----------
const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);
function inspect() {
  if (!controls.isLocked) return;
  raycaster.setFromCamera(center, camera);
  const hits = raycaster.intersectObjects(world.group.children, true);
  if (hits.length) {
    const d = hits[0].point.distanceTo(camera.position);
    inspectNote.textContent = 'Looking at: ' + hits[0].object.type + ' \u00b7 ' + d.toFixed(1) + ' m away \u00b7 pull grows as the timeline advances.';
  }
}
renderer.domElement.addEventListener('click', inspect);

// ---------- main loop ----------
let prev = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(0.05, (now - prev) / 1000);
  prev = now;
  if (!paused) {
    elapsed += dt;
    dtLast = dt;
    if (!cinematic) movePlayer(dt);
    updateCinematic(dt);
    if (!cinematic && playing) setSimTime(simTime + dt * 0.008 * speedMult);
    const shake = world.state.shake;
    if (shake > 0) {
      camera.position.x += (Math.random() - 0.5) * shake * 0.3;
      camera.position.y += (Math.random() - 0.5) * shake * 0.2;
    }
    renderer.render(scene, camera);
  }
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

setSimTime(0);
animate();
loading.classList.add('done');
setTimeout(() => loading.remove(), 700);

// exported for headless tests (no effect in the browser)
export { simSeconds, formatClock, phaseFor };
