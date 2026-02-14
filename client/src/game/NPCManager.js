// client/src/game/NPCManager.js
import * as THREE from 'three';
import { NPC, NPC_TYPES } from '../../../shared/constants.js';

export class NPCManager {
  constructor(sceneManager, physics) {
    this.scene = sceneManager;
    this.physics = physics;
    this.npcs = [];
    this.map = null;
    this.sound = null;
    this.bossAlive = false;
    this.zombieLevel = 1; // increases when boss dies
    this.lastGrowlTime = 0;
  }

  spawnInitialNPCs() {
    const spawnPoints = [
      { x: -30, z: -30 }, { x: 30, z: -30 },
      { x: -30, z: 30 },  { x: 30, z: 30 },
      { x: 0, z: -40 },   { x: -40, z: 0 },
      { x: 40, z: 0 },    { x: 0, z: 40 },
      { x: -55, z: -20 }, { x: 55, z: 20 },
    ];

    for (const sp of spawnPoints) {
      this.spawnNPC(sp.x, sp.z, this.randomType());
    }
  }

  randomType() {
    const r = Math.random();
    if (r < 0.15) return 'tank';
    if (r < 0.40) return 'fast';
    return 'normal';
  }

  spawnNPC(x, z, type = 'normal') {
    const cfg = NPC_TYPES[type];
    const lvl = type === 'boss' ? this.zombieLevel + 5 : this.zombieLevel;
    const levelMul = 1 + (lvl - 1) * 0.15;
    const dmgMul = 1 + (lvl - 1) * 0.1;

    const npc = {
      mesh: this.createNPCMesh(cfg, lvl),
      alive: true,
      health: Math.floor(cfg.health * levelMul),
      maxHealth: Math.floor(cfg.health * levelMul),
      speed: cfg.speed,
      coinDrop: Math.floor(cfg.coinDrop * (1 + (lvl - 1) * 0.1)),
      damage: Math.floor(cfg.dmg * dmgMul),
      typeName: cfg.name,
      type: type,
      level: lvl,
      isBoss: type === 'boss',
      spawnPos: { x, z },
      patrolTarget: null,
      state: 'patrol',
      stateTimer: 0,
      attackCooldown: 0,
      aggroTimer: 0,
    };

    npc.mesh.position.set(x, 0, z);
    this.scene.add(npc.mesh);
    this.npcs.push(npc);
    return npc;
  }

  spawnBoss() {
    if (this.bossAlive) return;
    this.bossAlive = true;
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * 40;
    const z = Math.sin(angle) * 40;
    this.spawnNPC(x, z, 'boss');
  }

  // Called when boss dies - level up all zombies
  levelUpZombies() {
    this.zombieLevel++;
    for (const npc of this.npcs) {
      if (!npc.alive || npc.isBoss) continue;
      const cfg = NPC_TYPES[npc.type];
      const lvl = this.zombieLevel;
      const levelMul = 1 + (lvl - 1) * 0.15;
      const dmgMul = 1 + (lvl - 1) * 0.1;

      npc.level = lvl;
      npc.maxHealth = Math.floor(cfg.health * levelMul);
      npc.health = npc.maxHealth;
      npc.damage = Math.floor(cfg.dmg * dmgMul);
      npc.coinDrop = Math.floor(cfg.coinDrop * (1 + (lvl - 1) * 0.1));

      // Update level label
      this.updateLevelLabel(npc);
    }
  }

  createLevelLabel(level, isBoss) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 128, 48);

    // Background pill
    ctx.fillStyle = isBoss ? 'rgba(128,0,255,0.7)' : 'rgba(0,0,0,0.6)';
    const w = 100, h = 32, x = 14, y = 8;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = isBoss ? '#ff00ff' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.fillStyle = isBoss ? '#ffcc00' : '#fff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Lv.${level}`, 64, 24);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2, 0.75, 1);
    sprite.name = 'levelLabel';
    return sprite;
  }

  updateLevelLabel(npc) {
    const old = npc.mesh.getObjectByName('levelLabel');
    if (old) {
      old.material.map.dispose();
      old.material.dispose();
      npc.mesh.remove(old);
    }
    const cfg = NPC_TYPES[npc.type] || NPC_TYPES.normal;
    const label = this.createLevelLabel(npc.level, npc.isBoss);
    label.position.set(0, (3.8 + 1.2) * cfg.scale, 0);
    npc.mesh.add(label);
  }

  createNPCMesh(cfg, level) {
    const group = new THREE.Group();
    const s = cfg.scale;
    const mat = (color) => new THREE.MeshStandardMaterial({ color });

    // Head
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(1.0 * s, 1.0 * s, 1.0 * s),
      mat(0xcc9966)
    );
    head.position.y = 3.2 * s;
    head.castShadow = true;

    // Eyes (boss = purple glow)
    const eyeColor = cfg === NPC_TYPES.boss ? 0xff00ff : 0xff0000;
    const eyeMat = new THREE.MeshStandardMaterial({
      color: eyeColor, emissive: eyeColor, emissiveIntensity: 0.8,
    });
    const eyeGeo = new THREE.BoxGeometry(0.18 * s, 0.12 * s, 0.05);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.22 * s, 3.3 * s, 0.51 * s);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.22 * s, 3.3 * s, 0.51 * s);

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.2 * s, 1.4 * s, 0.7 * s),
      mat(cfg.bodyColor)
    );
    body.position.y = 2.0 * s;
    body.castShadow = true;

    // Arms
    const armGeo = new THREE.BoxGeometry(0.4 * s, 1.2 * s, 0.4 * s);
    const armMat = mat(cfg.bodyColor);
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.8 * s, 2.0 * s, 0);
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.8 * s, 2.0 * s, 0);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.5 * s, 1.2 * s, 0.5 * s);
    const legMat = mat(0x333333);
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.3 * s, 0.6 * s, 0);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.3 * s, 0.6 * s, 0);

    // Health bar
    const hpBg = new THREE.Mesh(
      new THREE.BoxGeometry(1.2 * s, 0.12, 0.05),
      mat(0x333333)
    );
    hpBg.position.set(0, (3.8 + 0.6) * s, 0);
    const hpColor = cfg === NPC_TYPES.boss ? 0xff00ff : 0xff0000;
    const hpFill = new THREE.Mesh(
      new THREE.BoxGeometry(1.18 * s, 0.1, 0.06),
      mat(hpColor)
    );
    hpFill.position.set(0, (3.8 + 0.6) * s, 0.01);
    hpFill.name = 'hpFill';

    group.add(head, leftEye, rightEye, body, leftArm, rightArm, leftLeg, rightLeg, hpBg, hpFill);

    // Boss horns
    if (cfg === NPC_TYPES.boss) {
      const hornMat = mat(0xffcc00);
      const hornGeo = new THREE.ConeGeometry(0.2 * s, 0.8 * s, 4);
      const lHorn = new THREE.Mesh(hornGeo, hornMat);
      lHorn.position.set(-0.35 * s, 4.0 * s, 0);
      lHorn.rotation.z = 0.3;
      const rHorn = new THREE.Mesh(hornGeo, hornMat);
      rHorn.position.set(0.35 * s, 4.0 * s, 0);
      rHorn.rotation.z = -0.3;
      group.add(lHorn, rHorn);
    }

    // Tank shield
    if (cfg === NPC_TYPES.tank) {
      const shieldGeo = new THREE.BoxGeometry(1.4 * s, 1.6 * s, 0.15 * s);
      const shieldMat = new THREE.MeshStandardMaterial({
        color: 0x4444aa, transparent: true, opacity: 0.4,
      });
      const shield = new THREE.Mesh(shieldGeo, shieldMat);
      shield.position.set(0, 2.0 * s, 0.5 * s);
      group.add(shield);
    }

    // Level label above head
    const isBoss = cfg === NPC_TYPES.boss;
    const label = this.createLevelLabel(level, isBoss);
    label.position.set(0, (3.8 + 1.2) * s, 0);
    group.add(label);

    group.userData.leftArm = leftArm;
    group.userData.rightArm = rightArm;
    group.userData.leftLeg = leftLeg;
    group.userData.rightLeg = rightLeg;
    group.userData.hpBarWidth = 1.18 * s;

    return group;
  }

  update(delta, playerPos) {
    for (const npc of this.npcs) {
      if (!npc.alive) continue;

      const npcPos = npc.mesh.position;
      const distToPlayer = npcPos.distanceTo(
        new THREE.Vector3(playerPos.x, npcPos.y, playerPos.z)
      );

      const detectRange = npc.isBoss ? 60 : NPC.DETECT_RANGE;
      const attackRange = npc.isBoss ? 4 : NPC.ATTACK_RANGE;

      // Decay aggro timer
      if (npc.aggroTimer > 0) npc.aggroTimer -= delta;

      if (distToPlayer < attackRange) {
        npc.state = 'attack';
      } else if (distToPlayer < detectRange || npc.aggroTimer > 0) {
        npc.state = 'chase';
      } else {
        npc.state = 'patrol';
      }

      switch (npc.state) {
        case 'patrol': this.updatePatrol(npc, delta); break;
        case 'chase':  this.updateChase(npc, delta, playerPos); break;
        case 'attack': this.updateAttack(npc, delta, playerPos); break;
      }

      // Zombie growl when close and chasing/attacking
      if (this.sound && distToPlayer < 20 && (npc.state === 'chase' || npc.state === 'attack')) {
        const now = performance.now();
        if (now - this.lastGrowlTime > 2000 + Math.random() * 3000) {
          this.lastGrowlTime = now;
          this.sound.playZombieGrowl();
        }
      }

      this.animateWalk(npc, delta);

      // HP bar
      const hpFill = npc.mesh.getObjectByName('hpFill');
      if (hpFill) {
        const scale = npc.health / npc.maxHealth;
        hpFill.scale.x = Math.max(0, scale);
        const barW = npc.mesh.userData.hpBarWidth || 1.18;
        hpFill.position.x = -(barW * (1 - scale)) / 2;
      }
    }
  }

  updatePatrol(npc, delta) {
    npc.stateTimer -= delta;
    if (!npc.patrolTarget || npc.stateTimer <= 0) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * NPC.PATROL_RADIUS;
      npc.patrolTarget = new THREE.Vector3(
        npc.spawnPos.x + Math.cos(angle) * dist, 0,
        npc.spawnPos.z + Math.sin(angle) * dist
      );
      npc.stateTimer = 3 + Math.random() * 4;
    }
    this.moveToward(npc, npc.patrolTarget, npc.speed * 0.5, delta);
  }

  updateChase(npc, delta, playerPos) {
    const target = new THREE.Vector3(playerPos.x, 0, playerPos.z);
    this.moveToward(npc, target, npc.speed, delta);
  }

  updateAttack(npc, delta, playerPos) {
    const target = new THREE.Vector3(playerPos.x, 0, playerPos.z);
    this.lookAt(npc, target);
    npc.attackCooldown -= delta;
    if (npc.attackCooldown <= 0) {
      npc.attackCooldown = npc.isBoss ? 0.8 : 1.5;
      if (typeof window.__onNPCAttack === 'function') {
        window.__onNPCAttack(npc.damage);
      }
    }
  }

  moveToward(npc, target, speed, delta) {
    const dir = new THREE.Vector3().subVectors(target, npc.mesh.position).setY(0);
    if (dir.length() < 1) return;
    dir.normalize();

    let nx = npc.mesh.position.x + dir.x * speed * delta;
    let nz = npc.mesh.position.z + dir.z * speed * delta;

    // Wall collision
    if (this.map) {
      const r = npc.isBoss ? 2.0 : 0.8;
      const resolved = this.map.resolveCollision(nx, nz, r);
      nx = resolved.x;
      nz = resolved.z;
    }

    npc.mesh.position.x = nx;
    npc.mesh.position.z = nz;
    this.lookAt(npc, target);
  }

  lookAt(npc, target) {
    const dir = new THREE.Vector3().subVectors(target, npc.mesh.position).setY(0);
    if (dir.length() > 0.1) {
      npc.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    }
  }

  animateWalk(npc, delta) {
    const { leftArm, rightArm, leftLeg, rightLeg } = npc.mesh.userData;
    if (!leftArm) return;
    const isMoving = npc.state === 'patrol' || npc.state === 'chase';
    const animSpeed = npc.state === 'chase' ? 8 : 4;
    if (isMoving) {
      const t = performance.now() * 0.001 * animSpeed;
      leftArm.rotation.x = Math.sin(t) * 0.5;
      rightArm.rotation.x = -Math.sin(t) * 0.5;
      leftLeg.rotation.x = -Math.sin(t) * 0.5;
      rightLeg.rotation.x = Math.sin(t) * 0.5;
    } else {
      leftArm.rotation.x = rightArm.rotation.x = leftLeg.rotation.x = rightLeg.rotation.x = 0;
    }
  }

  damageNPC(npcIndex, damage) {
    const npc = this.npcs[npcIndex];
    if (!npc || !npc.alive) return;

    npc.health -= damage;
    if (this.sound) this.sound.playZombieHit();
    // Aggro: chase player for 8 seconds after being hit
    npc.aggroTimer = 8;

    // Alert nearby zombies within 15 units
    for (const other of this.npcs) {
      if (other === npc || !other.alive || other.aggroTimer > 0) continue;
      const dist = other.mesh.position.distanceTo(npc.mesh.position);
      if (dist < 15) other.aggroTimer = 5;
    }

    if (npc.health <= 0) {
      npc.alive = false;
      if (this.sound) this.sound.playZombieDeath();
      this.scene.remove(npc.mesh);

      if (npc.isBoss) {
        this.bossAlive = false;
        return; // Boss does not respawn
      }

      // Respawn as random type
      setTimeout(() => {
        const newType = this.randomType();
        const cfg = NPC_TYPES[newType];
        const lvl = this.zombieLevel;
        const levelMul = 1 + (lvl - 1) * 0.15;
        const dmgMul = 1 + (lvl - 1) * 0.1;

        npc.type = newType;
        npc.typeName = cfg.name;
        npc.level = lvl;
        npc.health = Math.floor(cfg.health * levelMul);
        npc.maxHealth = npc.health;
        npc.speed = cfg.speed;
        npc.coinDrop = Math.floor(cfg.coinDrop * (1 + (lvl - 1) * 0.1));
        npc.damage = Math.floor(cfg.dmg * dmgMul);
        npc.isBoss = false;
        npc.alive = true;
        npc.state = 'patrol';
        npc.aggroTimer = 0;

        // Rebuild mesh
        npc.mesh.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        });
        npc.mesh = this.createNPCMesh(cfg, lvl);
        npc.mesh.position.set(npc.spawnPos.x, 0, npc.spawnPos.z);
        this.scene.add(npc.mesh);
      }, NPC.RESPAWN_TIME * 1000);
    }
  }
}
