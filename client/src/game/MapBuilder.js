// client/src/game/MapBuilder.js
import * as THREE from 'three';
import { GAME, BARREL } from '../../../shared/constants.js';

export class MapBuilder {
  constructor(sceneManager, physics) {
    this.scene = sceneManager;
    this.physics = physics;
    this.objects = [];
    this.collisionBoxes = [];
    this.barrels = [];
  }

  build() {
    this.createGround();
    this.createBuildings();
    this.createWalls();
    this.createCover();
    this.createDecorations();
    this.createExplosiveBarrels();
  }

  createGround() {
    const size = GAME.MAP_SIZE;
    const geo = new THREE.PlaneGeometry(size, size, 20, 20);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x5b8a3c,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Grid lines for Roblox feel
    const gridHelper = new THREE.GridHelper(size, size / 4, 0x4a7c30, 0x4a7c30);
    gridHelper.position.y = 0.01;
    gridHelper.material.opacity = 0.15;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);
  }

  createBuildings() {
    const buildings = [
      // Central buildings
      { pos: [0, 6, -30], size: [12, 12, 12], color: 0x8e8e8e },
      { pos: [-25, 4, -15], size: [8, 8, 10], color: 0xa0522d },
      { pos: [25, 5, -20], size: [10, 10, 8], color: 0x708090 },

      // Side structures
      { pos: [-40, 3, 20], size: [14, 6, 8], color: 0xb8860b },
      { pos: [35, 4, 25], size: [8, 8, 12], color: 0x556b2f },
      { pos: [0, 3.5, 30], size: [20, 7, 6], color: 0x8b7355 },

      // Towers
      { pos: [-50, 8, -50], size: [6, 16, 6], color: 0x696969 },
      { pos: [50, 8, 50], size: [6, 16, 6], color: 0x696969 },
    ];

    for (const b of buildings) {
      this.addBlock(b.pos, b.size, b.color);
    }
  }

  createWalls() {
    const wallColor = 0x808080;
    const walls = [
      // Perimeter walls
      { pos: [0, 2, -GAME.MAP_SIZE / 2], size: [GAME.MAP_SIZE, 4, 2] },
      { pos: [0, 2, GAME.MAP_SIZE / 2], size: [GAME.MAP_SIZE, 4, 2] },
      { pos: [-GAME.MAP_SIZE / 2, 2, 0], size: [2, 4, GAME.MAP_SIZE] },
      { pos: [GAME.MAP_SIZE / 2, 2, 0], size: [2, 4, GAME.MAP_SIZE] },

      // Interior walls
      { pos: [-15, 1.5, 0], size: [1, 3, 16] },
      { pos: [15, 1.5, 5], size: [1, 3, 12] },
      { pos: [0, 1.5, 15], size: [20, 3, 1] },
    ];

    for (const w of walls) {
      this.addBlock(w.pos, w.size, wallColor);
    }
  }

  createCover() {
    const coverColor = 0x6b8e23;
    const covers = [
      // Crates and low cover
      { pos: [-8, 1, 5], size: [2, 2, 2] },
      { pos: [10, 1, -5], size: [2, 2, 2] },
      { pos: [-5, 1, -10], size: [3, 2, 1.5] },
      { pos: [20, 1, 10], size: [2, 2, 2] },
      { pos: [-20, 1, -25], size: [2, 2, 2] },
      { pos: [5, 1.5, -20], size: [4, 3, 1] },
      { pos: [-30, 1, 10], size: [2, 2, 3] },
      { pos: [30, 1, -10], size: [3, 2, 2] },

      // Sandbag-style low walls
      { pos: [-12, 0.75, -30], size: [6, 1.5, 1] },
      { pos: [12, 0.75, 20], size: [6, 1.5, 1] },
    ];

    for (const c of covers) {
      this.addBlock(c.pos, c.size, coverColor);
    }
  }

  createDecorations() {
    // Roblox-style colored accent blocks
    const accents = [
      { pos: [-8, 0.5, 5], size: [2.1, 0.1, 2.1], color: 0xff4444 },
      { pos: [10, 0.5, -5], size: [2.1, 0.1, 2.1], color: 0x4444ff },
      { pos: [20, 0.5, 10], size: [2.1, 0.1, 2.1], color: 0xffaa00 },
    ];

    for (const a of accents) {
      const geo = new THREE.BoxGeometry(a.size[0], a.size[1], a.size[2]);
      const mat = new THREE.MeshStandardMaterial({
        color: a.color,
        emissive: a.color,
        emissiveIntensity: 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...a.pos);
      this.scene.add(mesh);
    }

    // Spawn platform indicators
    this.createSpawnPlatform(-30, 0, -30, 0x3498db); // Blue spawn
    this.createSpawnPlatform(30, 0, 30, 0xe74c3c);   // Red spawn
  }

  createSpawnPlatform(x, y, z, color) {
    const geo = new THREE.CylinderGeometry(4, 4, 0.3, 16);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.7,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + 0.15, z);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  addBlock(pos, size, color) {
    // Three.js mesh
    const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      metalness: 0.05,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // Physics body
    this.physics.createStaticBox(
      { x: pos[0], y: pos[1], z: pos[2] },
      { x: size[0], y: size[1], z: size[2] }
    );

    this.objects.push(mesh);

    // Store AABB for collision
    this.collisionBoxes.push({
      minX: pos[0] - size[0] / 2,
      maxX: pos[0] + size[0] / 2,
      minZ: pos[2] - size[2] / 2,
      maxZ: pos[2] + size[2] / 2,
    });

    return mesh;
  }

  resolveCollision(x, z, radius) {
    for (const box of this.collisionBoxes) {
      const closestX = Math.max(box.minX, Math.min(x, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(z, box.maxZ));
      const dx = x - closestX;
      const dz = z - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        if (distSq === 0) {
          const ol = x - box.minX + radius;
          const or2 = box.maxX - x + radius;
          const ot = z - box.minZ + radius;
          const ob = box.maxZ - z + radius;
          const m = Math.min(ol, or2, ot, ob);
          if (m === ol) x = box.minX - radius;
          else if (m === or2) x = box.maxX + radius;
          else if (m === ot) z = box.minZ - radius;
          else z = box.maxZ + radius;
        } else {
          const dist = Math.sqrt(distSq);
          const overlap = radius - dist;
          x += (dx / dist) * overlap;
          z += (dz / dist) * overlap;
        }
      }
    }
    return { x, z };
  }

  createExplosiveBarrels() {
    const positions = [
      { x: -18, z: -8 }, { x: 22, z: -18 }, { x: -35, z: 15 },
      { x: 38, z: 28 }, { x: -10, z: -35 }, { x: 15, z: 25 },
      { x: -45, z: -40 }, { x: 45, z: -30 }, { x: -25, z: 35 },
      { x: 28, z: 8 }, { x: -50, z: 5 }, { x: 5, z: -50 },
    ];

    for (const pos of positions) {
      this.spawnBarrel(pos.x, pos.z);
    }
  }

  spawnBarrel(x, z) {
    const group = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(0.6, 0.6, 1.8, 12);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xcc2222, emissive: 0x440000, emissiveIntensity: 0.3,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    body.castShadow = true;

    // Warning stripe
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 0.2,
    });
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 0.15, 12),
      stripeMat
    );
    stripe.position.y = 1.2;

    // Top cap
    const capGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.1, 12);
    const cap = new THREE.Mesh(capGeo, new THREE.MeshStandardMaterial({ color: 0x333333 }));
    cap.position.y = 1.8;

    group.add(body, stripe, cap);
    group.position.set(x, 0, z);
    group.userData.isBarrel = true;
    group.traverse(c => { c.userData.isBarrel = true; });
    this.scene.add(group);

    const barrel = { mesh: group, x, z, alive: true, respawnTimer: 0 };
    this.barrels.push(barrel);
    return barrel;
  }

  explodeBarrel(index) {
    const barrel = this.barrels[index];
    if (!barrel || !barrel.alive) return;
    barrel.alive = false;
    this.scene.remove(barrel.mesh);

    // Respawn after BARREL.RESPAWN_TIME seconds
    barrel.respawnTimer = BARREL.RESPAWN_TIME;
  }

  updateBarrels(delta) {
    for (const barrel of this.barrels) {
      if (!barrel.alive && barrel.respawnTimer > 0) {
        barrel.respawnTimer -= delta;
        if (barrel.respawnTimer <= 0) {
          barrel.alive = true;
          barrel.mesh.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
          });
          barrel.mesh = null;
          // Recreate
          const idx = this.barrels.indexOf(barrel);
          this.barrels.splice(idx, 1);
          this.spawnBarrel(barrel.x, barrel.z);
        }
      }
    }
  }

  getCollidables() {
    return this.objects;
  }
}
