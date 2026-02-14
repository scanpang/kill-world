// client/src/game/Player.js
import * as THREE from 'three';
import { PLAYER, GAME } from '../../../shared/constants.js';

export class Player {
  constructor(sceneManager, physics) {
    this.scene = sceneManager;
    this.physics = physics;
    this.camera = sceneManager.camera;

    this.health = PLAYER.MAX_HEALTH;
    this.maxHealth = PLAYER.MAX_HEALTH;
    this.isDead = false;

    // Movement state
    this.keys = {};
    this.rotation = { x: 0, y: 0 };
    this.position = new THREE.Vector3(0, PLAYER.HEIGHT, 0);
    this.velocityY = 0;
    this.isGrounded = false;
    this.isSprinting = false;

    // Mobile joystick input (-1 to 1)
    this.mobileMove = { x: 0, y: 0 };

    // Coins
    this.coins = 0;

    // Level & XP
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 100;         // 100 × 1.6^(level-1)
    this.totalXP = 0;            // accumulated total for death screen

    // Damage multiplier (increases 10% per level)
    this.damageMultiplier = 1.0;

    // Level-based bonuses
    this.bonusSpeed = 0;         // +2 per level

    // Shop-based bonuses
    this.speedBonus = 0;         // +5% per purchase
    this.critChance = 0;         // +5% per purchase
    this.magBonus = 0;           // +20% per purchase

    // Map reference for collision
    this.map = null;

    // Spawn point
    this.spawnPoint = new THREE.Vector3(0, PLAYER.HEIGHT, 0);
    this.spawnZone = null;

    this.setupInput();
  }

  init() {
    this.position.copy(this.spawnPoint);
    this.camera.position.copy(this.position);
    this.createSpawnZone();
  }

  createSpawnZone() {
    const pad = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(4, 5, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    const inner = new THREE.Mesh(
      new THREE.CircleGeometry(4, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
    );
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.04;
    const crossMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.5 });
    const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 6), crossMat);
    bar1.position.y = 0.06;
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(6, 0.05, 0.3), crossMat);
    bar2.position.y = 0.06;
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SPAWN', 128, 42);
    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.7 });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(4, 1, 1);
    sprite.position.y = 6;
    pad.add(ring, inner, bar1, bar2, sprite);
    pad.position.set(this.spawnPoint.x, 0, this.spawnPoint.z);
    pad.userData.isEffect = true;
    pad.traverse(c => { c.userData.isEffect = true; });
    this.scene.add(pad);
    this.spawnZone = pad;
  }

  setupInput() {
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'ShiftLeft') this.isSprinting = true;
    });
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'ShiftLeft') this.isSprinting = false;
    });
    document.addEventListener('mousemove', (e) => {
      if (!document.pointerLockElement) return;
      this.rotation.y -= e.movementX * 0.002;
      this.rotation.x -= e.movementY * 0.002;
      this.rotation.x = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.rotation.x));
    });
  }

  addXP(amount) {
    this.xp += amount;
    this.totalXP += amount;
    let leveled = false;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = Math.floor(100 * Math.pow(1.6, this.level - 1));
      this.damageMultiplier = 1 + (this.level - 1) * 0.1;
      this.maxHealth = PLAYER.MAX_HEALTH + (this.level - 1) * 5;
      this.bonusSpeed = (this.level - 1) * 2;
      leveled = true;
    }
    return leveled;
  }

  update(delta) {
    if (this.isDead) return;

    const baseSpeed = this.isSprinting ? PLAYER.SPRINT_SPEED : PLAYER.SPEED;
    let speed = (baseSpeed + this.bonusSpeed) * (1 + this.speedBonus);

    const forward = new THREE.Vector3(
      -Math.sin(this.rotation.y), 0, -Math.cos(this.rotation.y)
    );
    const right = new THREE.Vector3(
      Math.cos(this.rotation.y), 0, -Math.sin(this.rotation.y)
    );

    const moveDir = new THREE.Vector3();
    if (this.keys['KeyW']) moveDir.add(forward);
    if (this.keys['KeyS']) moveDir.sub(forward);
    if (this.keys['KeyA']) moveDir.sub(right);
    if (this.keys['KeyD']) moveDir.add(right);

    const mobileLen = Math.sqrt(this.mobileMove.x ** 2 + this.mobileMove.y ** 2);
    if (mobileLen > 0.1) {
      moveDir.addScaledVector(right, this.mobileMove.x);
      moveDir.addScaledVector(forward, -this.mobileMove.y);
      speed = (PLAYER.SPEED + this.bonusSpeed) * (1 + this.speedBonus) * Math.min(mobileLen, 1.0);
    }

    if (moveDir.length() > 0) moveDir.normalize();
    this.position.x += moveDir.x * speed * delta;
    this.position.z += moveDir.z * speed * delta;

    if (this.map) {
      const resolved = this.map.resolveCollision(this.position.x, this.position.z, PLAYER.RADIUS);
      this.position.x = resolved.x;
      this.position.z = resolved.z;
    }

    this.isGrounded = this.position.y <= PLAYER.HEIGHT;
    if (this.keys['Space'] && this.isGrounded) {
      this.velocityY = PLAYER.JUMP_FORCE;
    }
    this.velocityY += GAME.GRAVITY * delta;
    this.position.y += this.velocityY * delta;
    if (this.position.y < PLAYER.HEIGHT) {
      this.position.y = PLAYER.HEIGHT;
      this.velocityY = 0;
    }

    const half = GAME.MAP_SIZE / 2 - 2;
    this.position.x = Math.max(-half, Math.min(half, this.position.x));
    this.position.z = Math.max(-half, Math.min(half, this.position.z));

    this.camera.position.copy(this.position);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.rotation.y;
    this.camera.rotation.x = this.rotation.x;
  }

  getPosition() {
    return { x: this.position.x, y: this.position.y, z: this.position.z };
  }

  getRotationY() {
    return this.rotation.y;
  }

  addCoins(amount) {
    this.coins += amount;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) this.die();
  }

  die() {
    this.isDead = true;
  }
}
