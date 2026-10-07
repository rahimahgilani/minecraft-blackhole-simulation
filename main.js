// main.js – minimal Three.js setup for the Minecraft‑style black hole simulation
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const viewport = document.getElementById('viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // sky blue

const camera = new THREE.PerspectiveCamera(75, viewport.clientWidth / viewport.clientHeight, 0.1, 1000);
camera.position.set(0, 1.6, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Simple ground plane
const groundGeo = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.MeshLambertMaterial({ color: 0x228B22 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Light
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
scene.add(light);

// Placeholder for black hole object
const blackHole = new THREE.Mesh(
  new THREE.SphereGeometry(0.5, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0x000000 })
);
blackHole.position.set(0, 5, 0);
scene.add(blackHole);

// Timeline handling
const slider = document.getElementById('time-slider');
let time = 0;
slider.addEventListener('input', () => {
  time = slider.value / 100; // 0 to 1
  updateSimulation(time);
});

function updateSimulation(t) {
  // Very simple: move black hole up as time increases
  blackHole.position.y = 5 + t * 10;
  // TODO: add gravitational lensing, accretion disk, etc.
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
