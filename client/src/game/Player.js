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
    this.xpToNext = 100;

    // Gear effects
    this.armor = 0;       // damage reduction (0.0 - 1.0)
    this.speedBonus = 0;  // speed multiplier bonus
    this.shield = 0;      // absorb damage

    // Map reference for collision
    this.map = null;

    this.setupInput();
  }

  init() {
    this.position.set(
      (Math.random() - 0.5) * 40,
      PLAYER.HEIGHT,
      (Math.random() - 0.5) * 40
    );
    this.camera.position.copy(this.position);
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
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.xpToNext = this.level * 100;
      // Level up bonuses
      this.maxHealth += 5;
      this.health = this.maxHealth;
    }
    return this.level;
  }

  update(delta) {
    if (this.isDead) return;

    const baseSpeed = this.isSprinting ? PLAYER.SPRINT_SPEED : PLAYER.SPEED;
    let speed = baseSpeed * (1 + this.speedBonus);

    const forward = new THREE.Vector3(
      -Math.sin(this.rotation.y), 0, -Math.cos(this.rotation.y)
    );
    const right = new THREE.Vector3(
      Math.cos(this.rotation.y), 0, -Math.sin(this.rotation.y)
    );

    const moveDir = new THREE.Vector3();

    // Keyboard input
    if (this.keys['KeyW']) moveDir.add(forward);
    if (this.keys['KeyS']) moveDir.sub(forward);
    if (this.keys['KeyA']) moveDir.sub(right);
    if (this.keys['KeyD']) moveDir.add(right);

    // Mobile joystick input - speed scales with distance
    const mobileLen = Math.sqrt(this.mobileMove.x ** 2 + this.mobileMove.y ** 2);
    if (mobileLen > 0.1) {
      moveDir.addScaledVector(right, this.mobileMove.x);
      moveDir.addScaledVector(forward, -this.mobileMove.y);
      speed = PLAYER.SPEED * (1 + this.speedBonus) * Math.min(mobileLen, 1.0);
    }

    if (moveDir.length() > 0) moveDir.normalize();

    this.position.x += moveDir.x * speed * delta;
    this.position.z += moveDir.z * speed * delta;

    // Wall collision
    if (this.map) {
      const resolved = this.map.resolveCollision(this.position.x, this.position.z, PLAYER.RADIUS);
      this.position.x = resolved.x;
      this.position.z = resolved.z;
    }

    // Gravity & jump
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

    // Map boundary
    const half = GAME.MAP_SIZE / 2 - 2;
    this.position.x = Math.max(-half, Math.min(half, this.position.x));
    this.position.z = Math.max(-half, Math.min(half, this.position.z));

    // Sync camera
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
    // Shield absorbs first
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, amount);
      this.shield -= absorbed;
      amount -= absorbed;
    }
    // Armor reduces remaining
    amount = Math.floor(amount * (1 - this.armor));
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) this.die();
  }

  die() {
    this.isDead = true;
    setTimeout(() => this.respawn(), PLAYER.RESPAWN_TIME * 1000);
  }

  respawn() {
    this.health = this.maxHealth;
    this.isDead = false;
    this.position.set((Math.random() - 0.5) * 60, PLAYER.HEIGHT, (Math.random() - 0.5) * 60);
    this.velocityY = 0;
  }
}
