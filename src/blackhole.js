// src/blackhole.js — shader-based black hole: dark horizon, accretion disk, gravitational lensing
import * as THREE from 'three';

export function createBlackHole(scene) {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);

  // ---------- event horizon (pure black sphere) ----------
  const horizon = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  horizon.scale.setScalar(2.2);
  group.add(horizon);

  // ---------- photon ring (thin bright ring just outside horizon) ----------
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.35, 0.06, 12, 128),
    new THREE.MeshBasicMaterial({ color: 0xfff3c0 })
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // ---------- accretion disk (custom shader, hot inner / cool outer, rotating) ----------
  const diskUniforms = {
    uTime: { value: 0 },
    uIntensity: { value: 1 },
  };
  const disk = new THREE.Mesh(
    new THREE.RingGeometry(2.6, 9, 128, 8),
    new THREE.ShaderMaterial({
      uniforms: diskUniforms,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vPos;
        void main() {
          vUv = uv;
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uIntensity;
        varying vec2 vUv;
        varying vec3 vPos;
        void main() {
          float r = length(vPos.xy);
          float t = (r - 2.6) / (9.0 - 2.6);          // 0 inner .. 1 outer
          // spiral streaks
          float ang = atan(vPos.y, vPos.x);
          float streak = 0.5 + 0.5 * sin(ang * 9.0 + uTime * 2.2 - r * 1.4);
          // temperature gradient: white-hot inner, orange outer
          vec3 hot  = vec3(1.0, 0.97, 0.90);
          vec3 mid  = vec3(1.0, 0.72, 0.25);
          vec3 cool = vec3(0.85, 0.35, 0.08);
          vec3 col = mix(hot, mid, smoothstep(0.0, 0.45, t));
          col = mix(col, cool, smoothstep(0.45, 1.0, t));
          float alpha = (1.0 - t) * (0.55 + 0.45 * streak);
          alpha *= uIntensity;
          // fade edges
          alpha *= smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.92, 1.0, t));
          gl_FragColor = vec4(col * (1.2 + streak * 0.8), alpha);
        }`,
    })
  );
  disk.rotation.x = Math.PI / 2 - 0.18; // slight tilt for drama
  group.add(disk);

  // ---------- lensing halo (backdrop sprite that warps sky behind BH) ----------
  const haloUniforms = { uTime: { value: 0 }, uStrength: { value: 0.3 } };
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.ShaderMaterial({
      uniforms: haloUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uStrength;
        varying vec2 vUv;
        // cheap hash star field
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main() {
          vec2 c = vUv - 0.5;
          float r = length(c);
          // lensing: pull sample point toward center, stronger when close
          vec2 warped = c * (1.0 - uStrength * 0.55 / (r * r + 0.02));
          // stars
          vec2 gp = warped * 42.0;
          vec2 cell = floor(gp);
          float star = step(0.995, hash(cell));
          float tw = 0.6 + 0.4 * sin(uTime * 2.0 + hash(cell) * 40.0);
          // faint blue glow ring around horizon
          float glow = exp(-abs(r - 0.09) * 26.0) * 0.9;
          vec3 col = vec3(star * tw) + vec3(0.55, 0.65, 1.0) * glow;
          float alpha = max(star * tw, glow) * uStrength;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(col, alpha);
        }`,
    })
  );
  halo.position.y = 0.5;
  group.add(halo);

  // ---------- API ----------
  function update(dt, elapsed, t) {
    diskUniforms.uTime.value = elapsed;
    haloUniforms.uTime.value = elapsed;
    // lensing strength ramps with simulation time
    haloUniforms.uStrength.value = 0.25 + t * 0.75;
    diskUniforms.uIntensity.value = 0.8 + t * 0.6;
    disk.rotation.z += dt * (0.15 + t * 0.5);
    ring.rotation.z -= dt * 0.4;
    // slow breathing scale of halo
    halo.scale.setScalar(1 + Math.sin(elapsed * 0.7) * 0.03);
  }

  function setProgress(p) {
    // p: 0 (just appeared) .. 1 (final)
    group.scale.setScalar(0.6 + p * 1.6);
    haloUniforms.uStrength.value = 0.25 + p * 0.75;
  }

  return { group, update, setProgress, horizon };
}