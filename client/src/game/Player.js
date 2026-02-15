// client/src/game/Player.js
import * as THREE from 'three';
import { PLAYER, GAME, SAFE_ZONE } from '../../../shared/constants.js';

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
    this.fireRateBonus = 0;      // +10% per purchase
    this.damageBonus = 0;        // +10% per purchase

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
    const r = SAFE_ZONE.RADIUS;

    // Outer ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r - 1, r, 48),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;

    // Inner circle
    const inner = new THREE.Mesh(
      new THREE.CircleGeometry(r - 1, 48),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.1, side: THREE.DoubleSide })
    );
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.04;

    // Cross pattern
    const crossMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.5 });
    const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 6), crossMat);
    bar1.position.y = 0.06;
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(6, 0.05, 0.3), crossMat);
    bar2.position.y = 0.06;

    // Dome shield effect
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.06, side: THREE.DoubleSide })
    );
    dome.position.y = 0;

    // Dome edge ring at top
    const domeRing = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.08, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.3 })
    );
    domeRing.rotation.x = Math.PI / 2;
    domeRing.position.y = 0.1;

    // SAFE ZONE text
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SAFE ZONE', 128, 42);
    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.7 });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(5, 1.2, 1);
    sprite.position.y = 7;

    pad.add(ring, inner, bar1, bar2, dome, domeRing, sprite);
    pad.position.set(SAFE_ZONE.X, 0, SAFE_ZONE.Z);
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

  isInSafeZone() {
    const dx = this.position.x - SAFE_ZONE.X;
    const dz = this.position.z - SAFE_ZONE.Z;
    return (dx * dx + dz * dz) < SAFE_ZONE.RADIUS * SAFE_ZONE.RADIUS;
  }

  getPowerLevel() {
    return Math.round(this.fireRateBonus / 0.1) + Math.round(this.damageBonus / 0.1);
  }

  takeDamage(amount) {
    if (this.isInSafeZone()) return;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) this.die();
  }

  die() {
    this.isDead = true;
  }
}
