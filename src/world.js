// src/world.js — voxel Lahore stage with ambient life and progressive destruction
import * as THREE from 'three';

const rnd = (a, b) => a + Math.random() * (b - a);

export function createWorld(scene) {
  const group = new THREE.Group();
  scene.add(group);

  // ---------- materials ----------
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const M = {
    road: mat(0x4a4a52), footpath: mat(0x9a9aa2), grass: mat(0x4fc24f),
    dirt: mat(0x9a7040), wallA: mat(0xf0d49a), wallB: mat(0xbcd8f5),
    wallC: mat(0xe88a54), wallD: mat(0x9fb4e0), roof: mat(0x8a5a3a),
    trunk: mat(0x7a5533), leaf: mat(0x3fae4a), pole: mat(0x606570),
    lamp: new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
    cloud: new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 }),
    carR: mat(0xe84040), carB: mat(0x3a6fe0), carY: mat(0xf0c040), carW: mat(0xf5f5f5),
    shirt: [mat(0x3a6fe0), mat(0xe84040), mat(0x3fae4a), mat(0xf0c040), mat(0xa05fd0)],
    skin: mat(0xe0a878), crack: new THREE.MeshBasicMaterial({ color: 0xff5a1f }),
  };

  const box = (w, h, d, m, x, y, z, parent = group) => {
    const g = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  // ---------- lighting (bright stylized day; dimmed by the timeline) ----------
  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x8a7a55, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.25);
  sun.position.set(80, 140, 50);
  scene.add(sun);
  const amb = new THREE.AmbientLight(0xffffff, 0.32);
  scene.add(amb);
  // orange side-light cast by the accretion disk as the black hole nears
  const bhLight = new THREE.DirectionalLight(0xff8a3a, 0);
  scene.add(bhLight);
  scene.add(bhLight.target);

  // ---------- ground & road grid ----------
  const CITY = 90;           // half-extent
  const ROAD_EVERY = 18;     // road spacing
  const isRoadX = (x) => Math.abs(((x % ROAD_EVERY) + ROAD_EVERY) % ROAD_EVERY - 0) < 3;
  const isRoadZ = (z) => Math.abs(((z % ROAD_EVERY) + ROAD_EVERY) % ROAD_EVERY - 0) < 3;

  // roads + footpaths (the land plate is built in the sea section below)
  const baseGroup = new THREE.Group();
  group.add(baseGroup);
  for (let i = -CITY; i <= CITY; i += ROAD_EVERY) {
    box(6, 0.52, CITY * 2, M.road, i, 0.01, 0, baseGroup);   // roads along z
    box(CITY * 2, 0.52, 6, M.road, 0, 0.02, i, baseGroup);   // roads along x
    box(8.5, 0.53, CITY * 2, M.footpath, i, 0.015, 0, baseGroup);
    box(CITY * 2, 0.53, 8.5, M.footpath, 0, 0.025, i, baseGroup);
  }

  // ---------- buildings ----------
  const buildings = [];
  const windowTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#00000000'; g.clearRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(255,235,170,0.85)';
    for (let y = 4; y < 64; y += 12) for (let x = 4; x < 64; x += 12)
      if (Math.random() > 0.35) g.fillRect(x, y, 6, 7);
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t;
  })();

  function addBuilding(x, z, w, d, h, wallMat) {
    const b = new THREE.Group();
    b.position.set(x, 0, z);
    const body = box(w, h, d, wallMat, 0, h / 2, 0, b);
    box(w + 1.2, 0.3, d + 1.2, M.dirt, 0, 0.15, 0, b); // foundation plinth, firmly on the land
    // window bands on 4 sides
    const floors = Math.max(1, Math.floor(h / 3));
    for (let f = 0; f < floors; f++) {
      const wy = 1.6 + f * 3;
      if (wy > h - 1) break;
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.86, 1.1, d * 0.86),
        new THREE.MeshBasicMaterial({ map: windowTex, transparent: true })
      );
      win.position.y = wy; b.add(win);
    }
    box(w + 0.6, 0.5, d + 0.6, M.roof, 0, h + 0.2, 0, b);
    group.add(b);
    buildings.push({ g: b, baseY: 0, h, lean: new THREE.Vector3(), phase: Math.random() });
    return b;
  }

  for (let bx = -CITY + 10; bx <= CITY - 10; bx += ROAD_EVERY) {
    for (let bz = -CITY + 10; bz <= CITY - 10; bz += ROAD_EVERY) {
      if (Math.abs(bx) < 8 && Math.abs(bz) < 8) continue; // keep spawn plaza clear
      if (Math.random() < 0.18) continue; // some empty lots
      const w = rnd(5, 9), d = rnd(5, 9);
      const distFromCenter = Math.hypot(bx, bz);
      const h = distFromCenter > 45 ? rnd(6, 14) : rnd(4, 10);
      const wm = [M.wallA, M.wallB, M.wallC, M.wallD][Math.floor(Math.random() * 4)];
      addBuilding(bx, bz, w, d, h, wm); // exact block centers: erect, never clipping roads
    }
  }

  // distant skyline silhouettes
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const r = rnd(120, 160);
    box(rnd(6, 14), rnd(15, 45), rnd(6, 14), M.wallD, Math.cos(a) * r, 10, Math.sin(a) * r);
  }

  // ---------- trees ----------
  const trees = [];
  for (let i = 0; i < 60; i++) {
    const t = new THREE.Group();
    const x = rnd(-CITY + 8, CITY - 8), z = rnd(-CITY + 8, CITY - 8);
    if (isRoadX(x) || isRoadZ(z)) continue;
    const th = rnd(2, 3.4);
    box(0.5, th, 0.5, M.trunk, 0, th / 2, 0, t);
    const lc = rnd(0x2f8f3e, 0x3fae4a) | 0;
    box(2.4, 1.6, 2.4, mat(lc), 0, th + 0.8, 0, t);
    box(1.6, 1.2, 1.6, mat(lc), 0, th + 2.1, 0, t);
    t.position.set(x, 0, z);
    group.add(t); trees.push(t);
  }

  // ---------- street lights ----------
  const lamps = [];
  for (let i = -CITY; i <= CITY; i += ROAD_EVERY) {
    for (let s = -1; s <= 1; s += 2) {
      const l = new THREE.Group();
      box(0.25, 6, 0.25, M.pole, 0, 3, 0, l);
      box(1.6, 0.25, 0.25, M.pole, 0.8, 6, 0, l);
      const lamp = box(0.7, 0.2, 0.4, M.lamp, 1.5, 5.85, 0, l);
      l.position.set(i + 4.2 * s, 0, s * 5);
      group.add(l); lamps.push(lamp);
    }
  }

  // ---------- cars ----------
  const cars = [];
  const carMats = [M.carR, M.carB, M.carY, M.carW];
  for (let i = 0; i < 26; i++) {
    const c = new THREE.Group();
    const m = carMats[i % 4];
    box(3.4, 0.8, 1.7, m, 0, 0.7, 0, c);
    box(1.8, 0.7, 1.5, mat(0x223344), -0.2, 1.35, 0, c);
    box(0.5, 0.35, 0.5, mat(0x111111), -1.1, 0.3, 0.9, c);
    box(0.5, 0.35, 0.5, mat(0x111111), 1.1, 0.3, 0.9, c);
    box(0.5, 0.35, 0.5, mat(0x111111), -1.1, 0.3, -0.9, c);
    box(0.5, 0.35, 0.5, mat(0x111111), 1.1, 0.3, -0.9, c);
    const alongX = Math.random() < 0.5;
    const lane = Math.floor(rnd(-CITY / ROAD_EVERY, CITY / ROAD_EVERY)) * ROAD_EVERY + (alongX ? 1.7 : -1.7);
    const pos = rnd(-CITY, CITY);
    c.position.set(alongX ? pos : lane, 0, alongX ? lane : pos);
    if (!alongX) c.rotation.y = Math.PI / 2;
    c.userData.speed = rnd(4, 9) * (Math.random() < 0.5 ? 1 : -1);
    c.userData.alongX = alongX;
    group.add(c); cars.push(c);
  }

  // ---------- pedestrians ----------
  const peds = [];
  for (let i = 0; i < 34; i++) {
    const p = new THREE.Group();
    box(0.55, 0.9, 0.35, M.shirt[i % 5], 0, 1.05, 0, p);
    box(0.3, 0.3, 0.3, M.skin, 0, 1.68, 0, p);
    box(0.5, 0.55, 0.3, mat(0x2b3a55), 0, 0.3, 0, p);
    const x = rnd(-CITY + 6, CITY - 6), z = rnd(-CITY + 6, CITY - 6);
    p.position.set(x, 0, z);
    p.userData = { dir: rnd(0, Math.PI * 2), speed: rnd(0.8, 1.8), t: rnd(0, 9) };
    group.add(p); peds.push(p);
  }

  // ---------- clouds ----------
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    const cl = new THREE.Group();
    const n = 3 + Math.floor(rnd(0, 4));
    for (let j = 0; j < n; j++)
      box(rnd(6, 14), rnd(1.5, 3), rnd(4, 9), M.cloud, rnd(-6, 6), rnd(-1, 1), rnd(-4, 4), cl);
    cl.position.set(rnd(-CITY, CITY), rnd(38, 60), rnd(-CITY, CITY));
    group.add(cl); clouds.push(cl);
  }

  // ---------- the sea: the island is surrounded on all sides ----------
  const seaFloor = box(1400, 0.5, 1400, mat(0x8a7a5a), 0, -1.05, 0);   // exposed during drawback
  const rockBase = box(180, 3, 180, mat(0x6b5a44), 0, -3.5, 0);        // island root, visible at low water
  const sandRim = box(CITY * 2 + 30, 0.5, CITY * 2 + 30, mat(0xd9c489), 0, -0.3, 0); // beach ring
  const landPlate = box(CITY * 2, 2, CITY * 2, M.grass, 0, -1, 0);     // raised land, top at y=0
  const oceanMat = new THREE.MeshLambertMaterial({ color: 0x2a7ec4, transparent: true, opacity: 0.85 });
  const ocean = box(1400, 0.7, 1400, oceanMat, 0, -0.9, 0);            // sea surface
  ocean.userData.baseY = ocean.position.y;
  // tsunami crest: a ring wall of water that closes in from the sea onto the island
  const crest = new THREE.Group();
  const crestWall = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 12, 64, 1, true),
    new THREE.MeshLambertMaterial({ color: 0x2a7ec4, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
  );
  crestWall.position.y = 6;
  crest.add(crestWall);
  const crestFoam = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 1.2, 64, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  crestFoam.position.y = 12.4;
  crest.add(crestFoam);
  crest.visible = false;
  group.add(crest);

  // ---------- ocean spout (water column stretched toward the black hole) ----------
  const spoutMat = new THREE.MeshLambertMaterial({ color: 0x6fb8e8, transparent: true, opacity: 0.35 });
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 6, 130, 12, 1, true), spoutMat);
  spout.position.set(-CITY - 30, 59, 0); // base at sea level, over the sea
  spout.rotation.z = -0.3; // lean toward the black hole side
  spout.visible = false;
  group.add(spout);

  // ---------- glowing ground cracks ----------
  const cracks = [];
  for (let i = 0; i < 26; i++) {
    const cm = new THREE.MeshBasicMaterial({ color: 0xff5a1f, transparent: true, opacity: 0 });
    const c = box(rnd(3, 9), 0.06, rnd(0.5, 1.2), cm, rnd(-CITY, CITY), 0.06, rnd(-CITY, CITY));
    c.visible = false;
    cracks.push(c);
  }

  // ---------- earth chunks (final fragmentation) ----------
  const chunks = [];
  for (let i = 0; i < 22; i++) {
    const s = rnd(3, 8);
    const c = box(s, s * rnd(0.5, 0.9), s * rnd(0.6, 1), i % 2 ? M.grass : M.dirt, 0, -100, 0);
    c.visible = false;
    c.userData = { v: new THREE.Vector3(), spin: new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)) };
    chunks.push(c);
  }

  // ---------- the Moon (tidal foreshadowing: cracks, then shatters) ----------
  // large, high, opposite the BH approach path, fog-exempt so it stays crisp
  const moon = new THREE.Group();
  const moonMat = mat(0xd8dce4);
  moonMat.fog = false;
  const moonSphere = new THREE.Mesh(new THREE.SphereGeometry(14, 32, 32), moonMat);
  moon.add(moonSphere);
  const moonCracks = [];
  for (let i = 0; i < 7; i++) {
    const mc = new THREE.Mesh(
      new THREE.BoxGeometry(rnd(1.5, 4), 0.4, rnd(3, 8)),
      new THREE.MeshBasicMaterial({ color: 0xff7a30, transparent: true, opacity: 0 })
    );
    mc.position.set(rnd(-6, 6), rnd(-4, 7), rnd(-6, 6));
    mc.rotation.y = rnd(0, Math.PI);
    moon.add(mc); moonCracks.push(mc);
  }
  const moonChunks = [];
  for (let i = 0; i < 10; i++) {
    const s = rnd(2, 4.5);
    const mc = box(s, s * rnd(0.6, 1), s * rnd(0.6, 1), mat(0x9aa0a8), 0, 0, 0, moon);
    mc.visible = false;
    mc.userData = { v: new THREE.Vector3(), spin: rnd(-0.8, 0.8) };
    moonChunks.push(mc);
  }
  moon.position.set(-170, 130, -170); // high, opposite the BH approach (+Z side)
  group.add(moon);

  // ---------- atmosphere stripping (wisps streaming to the black hole) ----------
  const ATMO = 140;
  const atmoMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.6, 0.6, 0.6),
    new THREE.MeshLambertMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.55 }),
    ATMO
  );
  atmoMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  atmoMesh.visible = false;
  group.add(atmoMesh);
  const atmo = Array.from({ length: ATMO }, () => ({
    p: new THREE.Vector3(), v: new THREE.Vector3(), active: false,
  }));

  // ---------- magma eruptions (fountains from the fissures) ----------
  const MAGMA = 90;
  const magmaMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.45, 0.45, 0.45),
    new THREE.MeshBasicMaterial({ color: 0xff6a20 }),
    MAGMA
  );
  magmaMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  magmaMesh.visible = false;
  group.add(magmaMesh);
  const magma = Array.from({ length: MAGMA }, () => ({
    p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0,
  }));

  // ---------- debris (for destruction) ----------
  const DEBRIS = 260;
  const debrisGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
  const debrisMesh = new THREE.InstancedMesh(debrisGeo, mat(0x8a7a5f), DEBRIS);
  debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  debrisMesh.visible = false;
  group.add(debrisMesh);
  const debris = Array.from({ length: DEBRIS }, () => ({
    p: new THREE.Vector3(), v: new THREE.Vector3(), active: false, spin: rnd(1, 4),
  }));
  const dummy = new THREE.Object3D();

  // ---------- state ----------
  const state = { shake: 0, destroyed: 0 };
  const bhDir = new THREE.Vector3(0, 1, 0); // set by main (toward black hole)

  function spawnDebris(origin, strength) {
    for (const d of debris) {
      if (d.active) continue;
      d.active = true;
      d.p.set(origin.x + rnd(-2, 2), origin.y + rnd(0, 2), origin.z + rnd(-2, 2));
      d.v.set(rnd(-2, 2), rnd(2, 6) * strength, rnd(-2, 2));
      return;
    }
  }

  // ---------- per-frame update ----------
  function update(t, dt, elapsed, bhPos) {
    // ambient life (fades as destruction rises)
    const life = Math.max(0, 1 - t * 1.6);

    // day → catastrophe lighting: sun dies, disk light rises
    const dusk = THREE.MathUtils.smoothstep(t, 0.15, 0.75);
    hemi.intensity = 0.85 * (1 - dusk * 0.92);
    sun.intensity = 1.25 * (1 - dusk * 0.97);
    amb.intensity = 0.32 * (1 - dusk * 0.7);
    bhLight.position.copy(bhPos);
    bhLight.intensity = THREE.MathUtils.smoothstep(t, 0.35, 0.9) * 1.4;

    for (const c of cars) {
      const sp = c.userData.speed * (0.2 + 0.8 * life);
      if (c.userData.alongX) {
        c.position.x += sp * dt;
        if (Math.abs(c.position.x) > CITY) c.position.x *= -0.98;
      } else {
        c.position.z += sp * dt;
        if (Math.abs(c.position.z) > CITY) c.position.z *= -0.98;
      }
      if (t > 0.6) { // lift toward BH in late phases, spaghettifying as they rise
        const lift = Math.max(0, (t - 0.55) * 2.2) * Math.min(1, 30 / (c.position.distanceTo(bhPos) + 1));
        if (t <= 0.85) c.position.y = lift * 6; // lift phase; infall owns y afterwards
        c.lookAt(bhPos);
        // stretch along the PULL axis: after lookAt, local +Z points at the BH
        const stretch = 1 + lift * 2.2;
        c.scale.set(1 / Math.sqrt(stretch), 1 / Math.sqrt(stretch), stretch);
        // beading: body parts separate into droplets along the pull line
        c.children.forEach((ch, i) => {
          if (ch.userData.baseZ === undefined) ch.userData.baseZ = ch.position.z;
          ch.position.z = ch.userData.baseZ + (i - 2.5) * (stretch - 1) * 0.55;
        });
        // late-phase infall: accelerate toward the BH, consumed on arrival
        if (t > 0.85) {
          const dir = new THREE.Vector3().subVectors(bhPos, c.position).normalize();
          c.position.addScaledVector(dir, (t - 0.85) * 600 * dt);
          if (c.position.distanceTo(bhPos) < 8) c.visible = false;
        }
      } else { c.position.y = 0; c.scale.set(1, 1, 1); }
    }

    for (const p of peds) {
      p.userData.t += dt;
      const sp = p.userData.speed * life;
      p.position.x += Math.cos(p.userData.dir) * sp * dt;
      p.position.z += Math.sin(p.userData.dir) * sp * dt;
      p.rotation.y = p.userData.dir;
      if (Math.random() < 0.005) p.userData.dir += rnd(-1, 1);
      p.position.x = THREE.MathUtils.clamp(p.position.x, -CITY + 4, CITY - 4);
      p.position.z = THREE.MathUtils.clamp(p.position.z, -CITY + 4, CITY - 4);
      if (t > 0.55) { // people pulled off the ground, stretched into filaments
        const lift = Math.max(0, (t - 0.45) * 2) * Math.min(1, 25 / (p.position.distanceTo(bhPos) + 1));
        if (t <= 0.85) p.position.y = lift * 10; // lift phase; infall owns y afterwards
        p.lookAt(bhPos);
        // stretch along the PULL axis: after lookAt, local +Z points at the BH
        const stretch = 1 + lift * 3.2;
        p.scale.set(1 / Math.sqrt(stretch), 1 / Math.sqrt(stretch), stretch);
        // beading: torso/head/legs separate into droplets along the pull line
        p.children.forEach((ch, i) => {
          if (ch.userData.baseZ === undefined) ch.userData.baseZ = ch.position.z;
          ch.position.z = ch.userData.baseZ + (i - 1) * (stretch - 1) * 0.4;
        });
        // late-phase infall: accelerate toward the BH, consumed on arrival
        if (t > 0.85) {
          const dir = new THREE.Vector3().subVectors(bhPos, p.position).normalize();
          p.position.addScaledVector(dir, (t - 0.85) * 600 * dt);
          if (p.position.distanceTo(bhPos) < 8) p.visible = false;
        }
      } else {
        p.position.y = Math.abs(Math.sin(p.userData.t * 8)) * 0.08 * life;
        p.scale.set(1, 1, 1);
      }
    }

    for (const cl of clouds) {
      cl.position.x += 1.2 * dt * (0.3 + life);
      if (cl.position.x > CITY + 20) cl.position.x = -CITY - 20;
      if (t > 0.5) cl.position.y += (t - 0.5) * 8 * dt; // atmosphere stripped upward
    }

    for (const tr of trees) {
      tr.rotation.z = Math.sin(elapsed * 1.3 + tr.position.x) * 0.03 * life;
      if (t > 0.6) tr.rotation.z += (t - 0.6) * 2 * Math.min(1, 20 / (tr.position.distanceTo(bhPos) + 1));
    }

    // coastal drawback: sea level drops, exposing the sea floor all around the island
    const drawback = THREE.MathUtils.smoothstep(t, 0.5, 0.58);
    ocean.position.y = ocean.userData.baseY + Math.sin(elapsed * 0.8) * 0.05 - drawback * 1.5;
    oceanMat.opacity = 0.85 - drawback * 0.15;

    // tsunami crest: a ring wall closing in from the sea onto the island
    const crestT = THREE.MathUtils.smoothstep(t, 0.58, 0.72);
    crest.visible = crestT > 0.001 && crestT < 0.999;
    if (crest.visible) {
      const r = 260 - crestT * 230; // closes in from the sea (r=260) to the city (r=30)
      crest.scale.set(r, 0.7 + Math.sin(crestT * Math.PI) * 1.1, r);
      crest.rotation.y = elapsed * 0.4; // slow swirl as it closes in
      crestWall.material.opacity = 0.8 * (1 - crestT * 0.4);
      crestFoam.material.opacity = 0.9 * (1 - crestT * 0.5);
    }

    // ocean spout: a water column stretched toward the black hole
    const spoutT = THREE.MathUtils.smoothstep(t, 0.7, 0.78) * (1 - THREE.MathUtils.smoothstep(t, 0.92, 0.98));
    spout.visible = spoutT > 0.01;
    if (spout.visible) {
      spout.scale.set(0.6 + spoutT * 0.8, 0.5 + spoutT * 0.7, 0.6 + spoutT * 0.8);
      spout.rotation.y += dt * 2.5;
      spoutMat.opacity = 0.2 + spoutT * 0.3 + Math.sin(elapsed * 6) * 0.05;
    }

    // the Moon: cracks glow, then it shatters and drifts apart
    const moonCrackT = THREE.MathUtils.smoothstep(t, 0.18, 0.42);
    const moonGone = t > 0.45;
    moonSphere.visible = !moonGone;
    moon.rotation.y += dt * 0.05;
    for (const mc of moonCracks) mc.material.opacity = moonCrackT * (0.5 + 0.4 * Math.sin(elapsed * 3 + mc.position.x));
    if (moonGone) {
      for (const mc of moonChunks) {
        if (!mc.visible) {
          mc.visible = true;
          mc.position.set(rnd(-8, 8), rnd(-8, 8), rnd(-8, 8));
          mc.userData.v.set(mc.position.x * 0.12, mc.position.y * 0.12 + 1.5, mc.position.z * 0.12);
        } else {
          mc.userData.v.x += dt * 0.4; // slow drift toward the black hole side
          mc.position.addScaledVector(mc.userData.v, dt);
          mc.rotation.x += mc.userData.spin * dt;
          mc.rotation.y += mc.userData.spin * 0.7 * dt;
        }
      }
    }

    // atmosphere stripping: wisps stream off the sky toward the black hole
    const atmoT = THREE.MathUtils.smoothstep(t, 0.3, 0.45) * (1 - THREE.MathUtils.smoothstep(t, 0.78, 0.88));
    atmoMesh.visible = atmoT > 0.01;
    atmoMesh.material.opacity = 0.55 * atmoT;
    if (atmoMesh.visible) {
      for (let i = 0; i < ATMO; i++) {
        const a = atmo[i];
        if (!a.active) {
          a.active = true;
          a.p.set(rnd(-CITY, CITY), rnd(15, 55), rnd(-CITY, CITY));
          a.v.subVectors(bhPos, a.p).normalize().multiplyScalar(rnd(8, 20));
        }
        a.p.addScaledVector(a.v, dt);
        if (a.p.distanceTo(bhPos) < 12) a.active = false;
        dummy.position.copy(a.p);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        atmoMesh.setMatrixAt(i, dummy.matrix);
      }
      atmoMesh.instanceMatrix.needsUpdate = true;
    }

    // magma eruptions from the fissures
    const magmaT = THREE.MathUtils.smoothstep(t, 0.55, 0.65) * (1 - THREE.MathUtils.smoothstep(t, 0.92, 0.97));
    magmaMesh.visible = magmaT > 0.01;
    if (magmaMesh.visible) {
      for (let i = 0; i < MAGMA; i++) {
        const mg = magma[i];
        mg.life -= dt;
        if (mg.life <= 0) {
          const src = cracks[Math.floor(Math.random() * cracks.length)];
          mg.p.set(src.position.x, 0.2, src.position.z);
          mg.v.set(rnd(-2, 2), rnd(7, 15), rnd(-2, 2));
          mg.life = rnd(0.8, 1.6);
        }
        mg.v.y -= 12 * dt;
        mg.p.addScaledVector(mg.v, dt);
        dummy.position.copy(mg.p);
        dummy.rotation.set(elapsed * 3, 0, 0);
        dummy.updateMatrix();
        magmaMesh.setMatrixAt(i, dummy.matrix);
      }
      magmaMesh.instanceMatrix.needsUpdate = true;
    }

    // glowing ground cracks spread, widen and heat up as the crust strains
    const crackT = THREE.MathUtils.smoothstep(t, 0.42, 0.85);
    for (const c of cracks) {
      c.visible = crackT > 0.01;
      c.material.opacity = crackT * (0.45 + 0.4 * Math.sin(elapsed * 4 + c.position.x * 0.7));
      c.scale.x = 1 + crackT * 1.6; // fissures widen
      const hot = 0.35 + 0.25 * Math.sin(elapsed * 4 + c.position.z);
      c.material.color.setRGB(1, hot, 0.08);
    }

    // final fragmentation: slabs of earth tear free and spiral into the BH
    if (t > 0.82) {
      for (const c of chunks) {
        if (!c.visible) {
          if (Math.random() < 0.05) {
            c.visible = true;
            c.position.set(rnd(-CITY, CITY), 0.5, rnd(-CITY, CITY));
            c.userData.v.set(rnd(-2, 2), rnd(6, 14), rnd(-2, 2));
          }
        } else {
          const dir = new THREE.Vector3().subVectors(bhPos, c.position).normalize();
          c.userData.v.addScaledVector(dir, (30 + t * 60) * dt);
          c.position.addScaledVector(c.userData.v, dt);
          c.rotation.x += c.userData.spin.x * dt;
          c.rotation.y += c.userData.spin.y * dt;
          c.rotation.z += c.userData.spin.z * dt;
          if (c.position.distanceTo(bhPos) < 6) c.visible = false;
        }
      }
    } else for (const c of chunks) c.visible = false;

    // ambient debris spawns: more matter tears free as the end nears
    if (t > 0.6 && Math.random() < t * 0.3) spawnDebris({ x: rnd(-CITY, CITY), y: rnd(0, 6), z: rnd(-CITY, CITY) }, 1 + t);

    // building destruction: lean, sink, collapse, then spaghettify and stream to the BH
    const dest = THREE.MathUtils.smoothstep(t, 0.35, 0.95);
    state.destroyed = dest;
    for (const b of buildings) {
      const k = THREE.MathUtils.clamp(dest * 1.4 - b.phase * 0.4, 0, 1);
      b.g.rotation.z = k * 0.35 * (b.phase > 0.5 ? 1 : -1);
      b.g.rotation.x = k * 0.22 * (b.phase > 0.3 ? 1 : -1);
      b.g.position.y = -k * b.h * 0.45;
      if (k > 0.15 && Math.random() < 0.02 * k) spawnDebris(b.g.position, 1 + t);
      // late phase: torn loose, stretched along the pull axis, consumed
      if (t > 0.8 && b.g.visible) {
        const lift = Math.max(0, (t - 0.8) * 4) * Math.min(1, 40 / (b.g.position.distanceTo(bhPos) + 1));
        b.g.position.y = -k * b.h * 0.45 + lift * 14;
        b.g.lookAt(bhPos);
        const stretch = 1 + lift * 2.5;
        b.g.scale.set(1 / Math.sqrt(stretch), 1 / Math.sqrt(stretch), stretch);
        if (t > 0.9) {
          const dir = new THREE.Vector3().subVectors(bhPos, b.g.position).normalize();
          b.g.position.addScaledVector(dir, (t - 0.9) * 80 * dt);
          if (b.g.position.distanceTo(bhPos) < 10) b.g.visible = false;
        }
      }
    }

    // debris physics: pulled toward BH, spiraling into streams late
    const tang = new THREE.Vector3();
    let anyActive = false;
    for (let i = 0; i < DEBRIS; i++) {
      const d = debris[i];
      if (!d.active) { dummy.position.set(0, -100, 0); dummy.scale.set(1, 1, 1); }
      else {
        anyActive = true;
        const dir = new THREE.Vector3().subVectors(bhPos, d.p).normalize();
        const pull = 6 + t * 40;
        d.v.addScaledVector(dir, pull * dt);
        if (t > 0.6) { // spiral stream: swirl around the infall axis
          tang.set(-dir.z, 0, dir.x).multiplyScalar(pull * 0.35);
          d.v.addScaledVector(tang, dt);
        }
        d.p.addScaledVector(d.v, dt);
        if (d.p.distanceTo(bhPos) < 4) d.active = false;
        dummy.position.copy(d.p);
        dummy.rotation.set(d.spin * elapsed, d.spin * elapsed * 0.7, 0);
        const st = 1 + Math.min(5, d.v.length() * 0.12); // motion streak along velocity
        dummy.scale.set(1, 1, st);
      }
      dummy.updateMatrix();
      debrisMesh.setMatrixAt(i, dummy.matrix);
    }
    // embers: debris glows hotter as it feeds the disk
    debrisMesh.material.color.setRGB(0.55 + t * 0.45, 0.48 - t * 0.13, 0.37 - t * 0.27);
    debrisMesh.visible = anyActive;
    debrisMesh.instanceMatrix.needsUpdate = true;

    // camera shake grows with t
    state.shake = t > 0.25 ? (t - 0.25) * 0.5 : 0;

    // END STATE (t = 1): Earth fully consumed — only the debris ribbon remains
    if (t >= 1) {
      baseGroup.visible = false;
      for (const b of buildings) b.g.visible = false;
      for (const c of cars) c.visible = false;
      for (const p of peds) p.visible = false;
      for (const tr of trees) tr.visible = false;
      for (const c of cracks) c.visible = false;
      ocean.visible = false;
      seaFloor.visible = false;
      crest.visible = false;
      spout.visible = false;
      moon.visible = false;
      atmoMesh.visible = false;
      magmaMesh.visible = false;
      for (const c of chunks) c.visible = false;
    }
  }

  return { group, buildings, cars, peds, ocean, crest, spout, moon, moonSphere, moonCracks, moonChunks, atmoMesh, magmaMesh, cracks, chunks, lights: { hemi, sun, amb, bhLight }, update, state, bhDir, spawnDebris };
}