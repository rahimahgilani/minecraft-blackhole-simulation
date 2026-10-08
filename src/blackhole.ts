import * as THREE from 'three';

export class BlackHole {
  public group: THREE.Group;
  private eventHorizon: THREE.Mesh;
  private disk: THREE.Mesh;

  constructor() {
    this.group = new THREE.Group();

    // Event horizon
    const horizonGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.eventHorizon = new THREE.Mesh(horizonGeo, horizonMat);
    this.group.add(this.eventHorizon);

    // Accretion disk
    const diskGeo = new THREE.TorusGeometry(1.5, 0.1, 16, 100);
    const diskMat = new THREE.MeshBasicMaterial({ color: 0xffa500, side: THREE.DoubleSide });
    this.disk = new THREE.Mesh(diskGeo, diskMat);
    this.disk.rotation.x = Math.PI / 2;
    this.group.add(this.disk);

    this.group.visible = false;
  }

  setPhase(phase: number) {
    if (phase < 0.1) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;
    const t = (phase - 0.1) / 0.9;
    this.group.position.y = 5 + t * 20;
    this.disk.scale.set(1 + t * 2, 1 + t * 2, 1 + t * 2);
  }
}
