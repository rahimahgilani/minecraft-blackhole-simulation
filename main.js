// main.js — engine, first-person controls, timeline engine, cinematic mode, AI panel
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { createWorld } from './src/world.js';
import { createBlackHole } from './src/blackhole.js';

const $ = (id) => document.getElementById(id);
const viewport = $('viewport');
const phaseLabel = $('phase-label');
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
const btnOrbit = $('btn-orbit');
const btnControls = $('btn-controls');
const controlsPanel = $('controls-panel');
const chatLog = $('chat-log');
const chatInput = $('chat-input');
const chatSend = $('chat-send');
const chatMin = $('chat-min');
const loading = $('loading');
const lockHint = $('lock-hint');
const timelineEl = $('timeline');

// pause veil (created here so index.html stays lean)
const pauseVeil = document.createElement('div');
pauseVeil.id = 'pause-veil';
pauseVeil.className = 'hidden';
pauseVeil.textContent = 'PAUSED';
document.body.appendChild(pauseVeil);

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
  { t: 0.14, label: '1 SEC' },
  { t: 0.28, label: '10 SEC' },
  { t: 0.46, label: '1 MIN' },
  { t: 0.64, label: '1 HOUR' },
  { t: 0.82, label: '1 DAY' },
  { t: 1.00, label: 'FINAL' },
];
const PHASES = [
  { until: 0.14, title: 'NORMAL', text: 'Everything is normal. Earth is in its usual gravitational environment.', real: 'With no black hole nearby, only Earth\u2019s own gravity acts on you.' },
  { until: 0.28, title: '1 SEC', text: 'The black hole has appeared. The first visible effect is the distortion of light around it.', real: 'Lensing would be the first sign \u2014 light bending around the object.' },
  { until: 0.46, title: '10 SEC', text: 'Lensing strengthens. The sky warps and distant objects shift position.', real: 'Gravitational lensing shifts apparent positions of background objects.' },
  { until: 0.64, title: '1 MIN', text: 'Tidal forces grow. Objects respond to abnormal gravitational acceleration.', real: 'Tidal forces scale as 1/r\u00b3 \u2014 they grow brutally fast as distance shrinks.' },
  { until: 0.82, title: '1 HOUR', text: 'Tidal waves sweep the streets. Buildings lean and debris streams skyward.', real: 'At this proximity, tidal disruption of the planet itself would begin.' },
  { until: 1.01, title: '1 DAY / FINAL', text: 'The crust cracks with glowing fissures and slabs of Earth tear free, spiraling into the disk.', real: 'Matter spirals in, heats up, and crosses the event horizon \u2014 nothing escapes.' },
];
function phaseFor(t) {
  for (const p of PHASES) if (t < p.until) return p;
  return PHASES[PHASES.length - 1];
}

let simTime = 0;
let playing = true;
let cinematic = false;
let orbitView = false;
let paused = false;
let elapsed = 0;
let dtLast = 0.016;

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
btnRestart.addEventListener('click', () => { setSimTime(0); setPaused(false); });
btnCinematic.addEventListener('click', () => {
  cinematic = !cinematic;
  btnCinematic.textContent = cinematic ? '\ud83c\udfac CINEMATIC: ON' : '\ud83c\udfac CINEMATIC: OFF';
  if (cinematic) { cineClock = 0; controls.unlock(); }
});
btnOrbit.addEventListener('click', () => {
  orbitView = !orbitView;
  btnOrbit.textContent = orbitView ? '\ud83c\udf0d STREET VIEW' : '\ud83c\udf0d ORBIT VIEW';
  if (orbitView) controls.unlock();
});
btnControls.addEventListener('click', () => controlsPanel.classList.toggle('hidden'));

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
  if (e.code === 'KeyV') btnOrbit.click();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
renderer.domElement.addEventListener('click', () => {
  if (!orbitView && !cinematic && !paused) controls.lock();
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
  if (controls.isLocked && !orbitView && !cinematic) {
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

// ---------- AI panel (offline, context-aware) ----------
const KB = [
  { q: /lens|light bend|distort/i, a: 'Gravitational lensing: the black hole\u2019s gravity bends light passing near it, so background stars appear shifted, stretched, or ringed. Watch the star field warp around the dark disk in the sim.' },
  { q: /accretion|disk/i, a: 'The accretion disk is matter spiraling inward, heated to millions of degrees by friction and compression \u2014 brighter than stars. The sim shows a temperature gradient: white-hot inner edge, cooler orange outer edge.' },
  { q: /event horizon|black sphere|dark center/i, a: 'The event horizon is the boundary where escape velocity exceeds light-speed. It looks pure black because no light escapes. Its radius (Schwarzschild radius) is ~3 km per solar mass.' },
  { q: /tidal|spaghet|stretch/i, a: 'Tidal forces stretch objects radially because gravity is stronger on the near side than the far side. The gradient scales as 1/r\u00b3 \u2014 halve the distance and tidal stress grows ~8\u00d7.' },
  { q: /sky|atmosphere|cloud/i, a: 'As the black hole approaches, its pull exceeds Earth\u2019s hold on the atmosphere. Gases stream upward and the sky darkens \u2014 in the sim, clouds rise and the blue fades to black.' },
  { q: /time|dilation/i, a: 'Time dilation: clocks near the black hole tick slower relative to faraway observers; at the horizon, infalling objects appear frozen. The sim\u2019s timeline is simplified and does not model this.' },
  { q: /survive|safe|escape/i, a: 'Escape velocity at the horizon equals light speed \u2014 nothing gets out. Earth would be tidally disrupted long before reaching the horizon.' },
  { q: /mass|how big|size/i, a: 'Effects depend enormously on mass and distance. A stellar-mass BH would tear Earth apart from afar; a supermassive one could swallow it whole. The sim uses a simplified generic black hole.' },
  { q: /real|accurate|scientific/i, a: 'The timeline is compressed for storytelling. Real timescales depend on mass and approach velocity \u2014 from seconds to years. The SIMULATION MODE banner marks simplified visuals.' },
  { q: /lahore|city|building|road/i, a: 'The voxel city is a stylized Lahore: road grid, apartment blocks, trees, street lights, cars and pedestrians. It is the human stage \u2014 the science is in the sky.' },
  { q: /help|control/i, a: 'WASD move \u00b7 mouse look \u00b7 Shift sprint \u00b7 Space jump \u00b7 P pause \u00b7 R restart \u00b7 T timeline \u00b7 C cinematic \u00b7 V orbit view \u00b7 click to inspect.' },
];
function aiAnswer(q) {
  for (const k of KB) if (k.q.test(q)) return k.a;
  return 'In short: the black hole\u2019s gravity bends light (lensing), strips the atmosphere, then tidally disrupts Earth \u2014 deformation \u2192 disruption \u2192 fragmentation \u2192 accretion. Ask about lensing, the disk, the horizon, tides, time dilation, or survival.';
}
function appendChat(sender, text) {
  const div = document.createElement('div');
  div.className = 'msg ' + sender;
  div.textContent = (sender === 'user' ? 'You: ' : 'AI: ') + text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}
chatSend.addEventListener('click', () => {
  const msg = chatInput.value.trim();
  if (!msg) return;
  appendChat('user', msg);
  setTimeout(() => appendChat('ai', aiAnswer(msg)), 350);
  chatInput.value = '';
});
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') chatSend.click(); });
chatMin.addEventListener('click', () => chatLog.classList.toggle('hidden'));

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
    if (!cinematic && !orbitView) movePlayer(dt);
    updateCinematic(dt);
    if (!cinematic && playing) setSimTime(simTime + dt * 0.008);
    if (orbitView) {
      const a = elapsed * 0.08;
      camera.position.set(Math.cos(a) * 300, 160, Math.sin(a) * 300);
      camera.lookAt(0, 0, 0);
    }
    const shake = world.state.shake;
    if (shake > 0 && !orbitView) {
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
