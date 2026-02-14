// client/src/game/NPCManager.js
import * as THREE from 'three';
import { NPC } from '../../../shared/constants.js';

export class NPCManager {
  constructor(sceneManager, physics) {
    this.scene = sceneManager;
    this.physics = physics;
    this.npcs = [];
  }

  spawnInitialNPCs() {
    const spawnPoints = [
      { x: -30, z: -30 },
      { x: 30, z: -30 },
      { x: -30, z: 30 },
      { x: 30, z: 30 },
      { x: 0, z: -40 },
      { x: -40, z: 0 },
      { x: 40, z: 0 },
      { x: 0, z: 40 },
    ];

    for (const sp of spawnPoints) {
      this.spawnNPC(sp.x, sp.z);
    }
  }

  spawnNPC(x, z) {
    const npc = {
      mesh: this.createNPCMesh(),
      alive: true,
      health: NPC.HEALTH,
      spawnPos: { x, z },
      patrolTarget: null,
      state: 'patrol', // 'patrol' | 'chase' | 'attack'
      stateTimer: 0,
      attackCooldown: 0,
    };

    npc.mesh.position.set(x, 0, z);
    this.scene.add(npc.mesh);
    this.npcs.push(npc);
  }

  createNPCMesh() {
    const group = new THREE.Group();
    const mat = (color) => new THREE.MeshStandardMaterial({ color });

    // Head (red tint for enemy)
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 1.0, 1.0),
      mat(0xcc9966)
    );
    head.position.y = 3.2;
    head.castShadow = true;

    // Angry eyes
    const eyeMat = mat(0xff0000);
    const eyeGeo = new THREE.BoxGeometry(0.18, 0.12, 0.05);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.22, 3.3, 0.51);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.22, 3.3, 0.51);

    // Body (dark red)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.4, 0.7),
      mat(0x8b0000)
    );
    body.position.y = 2.0;
    body.castShadow = true;

    // Arms
    const armGeo = new THREE.BoxGeometry(0.4, 1.2, 0.4);
    const armMat = mat(0x8b0000);
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.8, 2.0, 0);
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.8, 2.0, 0);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.5, 1.2, 0.5);
    const legMat = mat(0x333333);
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.3, 0.6, 0);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.3, 0.6, 0);

    // Health bar above head
    const hpBg = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.12, 0.05),
      mat(0x333333)
    );
    hpBg.position.set(0, 4.0, 0);

    const hpFill = new THREE.Mesh(
      new THREE.BoxGeometry(1.18, 0.1, 0.06),
      mat(0xff0000)
    );
    hpFill.position.set(0, 4.0, 0.01);
    hpFill.name = 'hpFill';

    group.add(head, leftEye, rightEye, body, leftArm, rightArm, leftLeg, rightLeg, hpBg, hpFill);

    // Store arm refs for animation
    group.userData.leftArm = leftArm;
    group.userData.rightArm = rightArm;
    group.userData.leftLeg = leftLeg;
    group.userData.rightLeg = rightLeg;

    return group;
  }

  update(delta, playerPos) {
    for (const npc of this.npcs) {
      if (!npc.alive) continue;

      const npcPos = npc.mesh.position;
      const distToPlayer = npcPos.distanceTo(
        new THREE.Vector3(playerPos.x, npcPos.y, playerPos.z)
      );

      // State machine
      if (distToPlayer < NPC.ATTACK_RANGE) {
        npc.state = 'attack';
      } else if (distToPlayer < NPC.DETECT_RANGE) {
        npc.state = 'chase';
      } else {
        npc.state = 'patrol';
      }

      switch (npc.state) {
        case 'patrol':
          this.updatePatrol(npc, delta);
          break;
        case 'chase':
          this.updateChase(npc, delta, playerPos);
          break;
        case 'attack':
          this.updateAttack(npc, delta, playerPos);
          break;
      }

      // Walk animation
      this.animateWalk(npc, delta);

      // Make HP bar face camera
      const hpFill = npc.mesh.getObjectByName('hpFill');
      if (hpFill) {
        const scale = npc.health / NPC.HEALTH;
        hpFill.scale.x = Math.max(0, scale);
        hpFill.position.x = -(1.18 * (1 - scale)) / 2;
      }
    }
  }

  updatePatrol(npc, delta) {
    npc.stateTimer -= delta;

    if (!npc.patrolTarget || npc.stateTimer <= 0) {
      // Pick new patrol point near spawn
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * NPC.PATROL_RADIUS;
      npc.patrolTarget = new THREE.Vector3(
        npc.spawnPos.x + Math.cos(angle) * dist,
        0,
        npc.spawnPos.z + Math.sin(angle) * dist
      );
      npc.stateTimer = 3 + Math.random() * 4;
    }

    this.moveToward(npc, npc.patrolTarget, NPC.SPEED * 0.5, delta);
  }

  updateChase(npc, delta, playerPos) {
    const target = new THREE.Vector3(playerPos.x, 0, playerPos.z);
    this.moveToward(npc, target, NPC.SPEED, delta);
  }

  updateAttack(npc, delta, playerPos) {
    // Face player
    const target = new THREE.Vector3(playerPos.x, 0, playerPos.z);
    this.lookAt(npc, target);

    // Attack on cooldown
    npc.attackCooldown -= delta;
    if (npc.attackCooldown <= 0) {
      npc.attackCooldown = 1.5;
      // Damage is handled server-side in multiplayer
      // For single player demo, emit event
      if (typeof window.__onNPCAttack === 'function') {
        window.__onNPCAttack(NPC.DAMAGE);
      }
    }
  }

  moveToward(npc, target, speed, delta) {
    const dir = new THREE.Vector3()
      .subVectors(target, npc.mesh.position)
      .setY(0);

    if (dir.length() < 1) return;
    dir.normalize();

    npc.mesh.position.x += dir.x * speed * delta;
    npc.mesh.position.z += dir.z * speed * delta;

    this.lookAt(npc, target);
  }

  lookAt(npc, target) {
    const dir = new THREE.Vector3()
      .subVectors(target, npc.mesh.position)
      .setY(0);
    if (dir.length() > 0.1) {
      const angle = Math.atan2(dir.x, dir.z);
      npc.mesh.rotation.y = angle;
    }
  }

  animateWalk(npc, delta) {
    const { leftArm, rightArm, leftLeg, rightLeg } = npc.mesh.userData;
    if (!leftArm) return;

    const isMoving = npc.state === 'patrol' || npc.state === 'chase';
    const speed = npc.state === 'chase' ? 8 : 4;

    if (isMoving) {
      const t = performance.now() * 0.001 * speed;
      leftArm.rotation.x = Math.sin(t) * 0.5;
      rightArm.rotation.x = -Math.sin(t) * 0.5;
      leftLeg.rotation.x = -Math.sin(t) * 0.5;
      rightLeg.rotation.x = Math.sin(t) * 0.5;
    } else {
      leftArm.rotation.x = 0;
      rightArm.rotation.x = 0;
      leftLeg.rotation.x = 0;
      rightLeg.rotation.x = 0;
    }
  }

  damageNPC(npcIndex, damage) {
    const npc = this.npcs[npcIndex];
    if (!npc || !npc.alive) return;

    npc.health -= damage;
    if (npc.health <= 0) {
      npc.alive = false;
      this.scene.remove(npc.mesh);

      // Respawn after delay
      setTimeout(() => {
        npc.health = NPC.HEALTH;
        npc.alive = true;
        npc.mesh.position.set(npc.spawnPos.x, 0, npc.spawnPos.z);
        npc.state = 'patrol';
        this.scene.add(npc.mesh);
      }, NPC.RESPAWN_TIME * 1000);
    }
  }
}
