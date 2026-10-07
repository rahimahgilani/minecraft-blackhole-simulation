// main.js – enhanced Three.js setup for the Minecraft‑style black hole simulation
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const viewport = document.getElementById('viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // sky blue

const camera = new THREE.PerspectiveCamera(75, viewport.clientWidth / viewport.clientHeight, 0.1, 2000);
camera.position.set(0, 1.6, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ---------- Voxel world ----------
const voxelSize = 1;
const worldSize = 20;
const groundGeo = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize);
const groundMat = new THREE.MeshLambertMaterial({ color: 0x228B22 });

// Create a simple grid of blocks to represent buildings and roads
for (let x = -worldSize; x <= worldSize; x++) {
  for (let z = -worldSize; z <= worldSize; z++) {
    const isRoad = (x % 4 === 0) || (z % 4 === 0);
    const mat = new THREE.MeshLambertMaterial({ color: isRoad ? 0x555555 : 0x8B4513 });
    const block = new THREE.Mesh(groundGeo, mat);
    block.position.set(x * voxelSize, voxelSize / 2, z * voxelSize);
    scene.add(block);
  }
}

// ---------- Lighting ----------
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
scene.add(light);

// ---------- Black hole ----------
const bhGroup = new THREE.Group();
scene.add(bhGroup);

// Event horizon
const bhGeo = new THREE.SphereGeometry(0.5, 32, 32);
const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const bhMesh = new THREE.Mesh(bhGeo, bhMat);
bhGroup.add(bhMesh);

// Accretion disk (torus)
const diskGeo = new THREE.TorusGeometry(1.5, 0.1, 16, 100, Math.PI * 2);
const diskMat = new THREE.MeshBasicMaterial({ color: 0xffa500, side: THREE.DoubleSide });
const diskMesh = new THREE.Mesh(diskGeo, diskMat);
diskMesh.rotation.x = Math.PI / 2;
bhGroup.add(diskMesh);

// Initially invisible
bhGroup.visible = false;

// ---------- Timeline handling ----------
const slider = document.getElementById('time-slider');
let time = 0;
slider.addEventListener('input', () => {
  time = slider.value / 100; // 0 to 1
  updateSimulation(time);
});

function updateSimulation(t) {
  // Map t to milestones
  // 0: NORMAL, 0.1: 1 SEC, 0.2: 10 SEC, 0.4: 1 MIN, 0.6: 1 HOUR, 0.8: 1 DAY, 1: FINAL
  if (t < 0.1) {
    bhGroup.visible = false;
  } else {
    bhGroup.visible = true;
    // Simple animation: move black hole upward and increase disk size
    const phase = (t - 0.1) / 0.9; // 0 to 1
    bhGroup.position.y = 5 + phase * 20;
    diskMesh.scale.set(1 + phase * 2, 1 + phase * 2, 1 + phase * 2);
  }
  // Simple gravity effect: scale nearby blocks
  scene.traverse(obj => {
    if (obj.isMesh && obj !== bhMesh && obj !== diskMesh) {
      const dist = obj.position.distanceTo(bhGroup.position);
      const scale = Math.max(0.5, 1 - dist / 50);
      obj.scale.set(scale, scale, scale);
    }
  });
}

// ---------- AI chat stub ----------
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatLog = document.getElementById('chat-log');
chatSend.addEventListener('click', () => {
  const msg = chatInput.value.trim();
  if (!msg) return;
  appendChat('You', msg);
  // Dummy response
  setTimeout(() => {
    const response = `This is a placeholder answer to: "${msg}"`;
    appendChat('AI', response);
  }, 500);
  chatInput.value = '';
});
function appendChat(sender, text) {
  const div = document.createElement('div');
  div.textContent = `${sender}: ${text}`;
  chatLog.appendChild(div);
}

// ---------- Animation loop ----------
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();