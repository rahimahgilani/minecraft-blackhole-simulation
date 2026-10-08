import * as THREE from 'three';

export function buildVoxelWorld(scene: THREE.Scene) {
  const voxelSize = 1;
  const worldSize = 20;
  const blockGeo = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize);

  for (let x = -worldSize; x <= worldSize; x++) {
    for (let z = -worldSize; z <= worldSize; z++) {
      const isRoad = (x % 4 === 0) || (z % 4 === 0);
      const mat = new THREE.MeshLambertMaterial({
        color: isRoad ? 0x555555 : 0x8B4513,
      });
      const block = new THREE.Mesh(blockGeo, mat);
      block.position.set(x * voxelSize, voxelSize / 2, z * voxelSize);
      scene.add(block);
    }
  }

  // Add a few trees
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.2, 2, 8);
  const leafGeo = new THREE.ConeGeometry(1, 2, 8);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x228B22 });

  for (let i = 0; i < 30; i++) {
    const x = Math.random() * worldSize * 2 - worldSize;
    const z = Math.random() * worldSize * 2 - worldSize;
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 1, z);
    scene.add(trunk);

    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(x, 3, z);
    scene.add(leaf);
  }
}
