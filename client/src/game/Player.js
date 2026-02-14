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

  update(delta) {
    if (this.isDead) return;

    const speed = this.isSprinting ? PLAYER.SPRINT_SPEED : PLAYER.SPEED;

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

    // Mobile joystick input (additive, analog)
    if (Math.abs(this.mobileMove.x) > 0.1 || Math.abs(this.mobileMove.y) > 0.1) {
      moveDir.addScaledVector(right, this.mobileMove.x);
      moveDir.addScaledVector(forward, -this.mobileMove.y);
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
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) this.die();
  }

  die() {
    this.isDead = true;
    setTimeout(() => this.respawn(), PLAYER.RESPAWN_TIME * 1000);
  }

  respawn() {
    this.health = PLAYER.MAX_HEALTH;
    this.isDead = false;
    this.position.set((Math.random() - 0.5) * 60, PLAYER.HEIGHT, (Math.random() - 0.5) * 60);
    this.velocityY = 0;
  }
}
