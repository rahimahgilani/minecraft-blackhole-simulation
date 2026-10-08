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

  // ground plane (single big slab for perf) + road strips
  box(CITY * 2, 0.5, CITY * 2, M.grass, 0, -0.25, 0);
  for (let i = -CITY; i <= CITY; i += ROAD_EVERY) {
    box(6, 0.52, CITY * 2, M.road, i, 0.01, 0);   // roads along z
    box(CITY * 2, 0.52, 6, M.road, 0, 0.02, i);   // roads along x
    box(8.5, 0.53, CITY * 2, M.footpath, i, 0.015, 0);
    box(CITY * 2, 0.53, 8.5, M.footpath, 0, 0.025, i);
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
      addBuilding(bx + rnd(-2, 2), bz + rnd(-2, 2), w, d, h, wm);
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

  // ---------- tidal waves (water walls sweeping the city) ----------
  const waves = [0.5, 0.68].map((t0) => {
    const m = new THREE.MeshBasicMaterial({
      color: 0x3a9ad0, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 5, 48, 1, true), m);
    mesh.visible = false;
    group.add(mesh);
    return { mesh, t0 };
  });

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
      // lift toward BH in late phases, spaghettifying as they rise
      if (t > 0.55) {
        const lift = Math.max(0, (t - 0.55) * 2.2) * Math.min(1, 30 / (c.position.distanceTo(bhPos) + 1));
        c.position.y = lift * 6;
        c.lookAt(bhPos);
        const stretch = 1 + lift * 1.6;
        c.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
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
      if (t > 0.45) { // people pulled off the ground, stretched into filaments
        const lift = Math.max(0, (t - 0.45) * 2) * Math.min(1, 25 / (p.position.distanceTo(bhPos) + 1));
        p.position.y = lift * 10;
        p.lookAt(bhPos);
        const stretch = 1 + lift * 2.4;
        p.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
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

    // tidal waves: expanding water walls sweeping outward
    for (const w of waves) {
      const wt = THREE.MathUtils.smoothstep(t, w.t0, w.t0 + 0.22);
      w.mesh.visible = wt > 0.001 && wt < 0.999;
      if (w.mesh.visible) {
        const r = 8 + wt * (CITY + 40);
        w.mesh.scale.set(r, 1, r);
        w.mesh.position.y = 2.5 + Math.sin(elapsed * 5 + w.t0 * 20) * 0.4;
        w.mesh.rotation.y = elapsed * 0.5;
        w.mesh.material.opacity = 0.2 + 0.5 * (1 - wt);
      }
    }

    // glowing ground cracks spread as the crust strains
    const crackT = THREE.MathUtils.smoothstep(t, 0.42, 0.85);
    for (const c of cracks) {
      c.visible = crackT > 0.01;
      c.material.opacity = crackT * (0.45 + 0.4 * Math.sin(elapsed * 4 + c.position.x * 0.7));
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

    // building destruction: lean, sink, collapse
    const dest = THREE.MathUtils.smoothstep(t, 0.35, 0.95);
    state.destroyed = dest;
    for (const b of buildings) {
      const k = THREE.MathUtils.clamp(dest * 1.4 - b.phase * 0.4, 0, 1);
      b.g.rotation.z = k * 0.35 * (b.phase > 0.5 ? 1 : -1);
      b.g.rotation.x = k * 0.22 * (b.phase > 0.3 ? 1 : -1);
      b.g.position.y = -k * b.h * 0.45;
      if (k > 0.15 && Math.random() < 0.02 * k) spawnDebris(b.g.position, 1 + t);
    }

    // debris physics: pulled toward BH
    let anyActive = false;
    for (let i = 0; i < DEBRIS; i++) {
      const d = debris[i];
      if (!d.active) { dummy.position.set(0, -100, 0); }
      else {
        anyActive = true;
        const dir = new THREE.Vector3().subVectors(bhPos, d.p).normalize();
        const pull = 6 + t * 40;
        d.v.addScaledVector(dir, pull * dt);
        d.p.addScaledVector(d.v, dt);
        if (d.p.distanceTo(bhPos) < 4) d.active = false;
        dummy.position.copy(d.p);
        dummy.rotation.set(d.spin * elapsed, d.spin * elapsed * 0.7, 0);
      }
      dummy.updateMatrix();
      debrisMesh.setMatrixAt(i, dummy.matrix);
    }
    debrisMesh.visible = anyActive;
    debrisMesh.instanceMatrix.needsUpdate = true;

    // camera shake grows with t
    state.shake = t > 0.25 ? (t - 0.25) * 0.5 : 0;
  }

  return { group, buildings, cars, peds, waves, cracks, chunks, lights: { hemi, sun, amb, bhLight }, update, state, bhDir, spawnDebris };
}