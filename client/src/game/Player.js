// client/src/game/Player.js
import * as THREE from 'three';
import { PLAYER } from '../../../shared/constants.js';

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
    this.velocity = new THREE.Vector3();
    this.isGrounded = false;
    this.isSprinting = false;

    // Physics body (created in init)
    this.body = null;

    this.setupInput();
  }

  init() {
    this.body = this.physics.createPlayerBody({ x: 0, y: 5, z: 0 });
    this.camera.position.set(0, PLAYER.HEIGHT, 0);
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
    if (this.isDead || !this.body) return;

    const speed = this.isSprinting ? PLAYER.SPRINT_SPEED : PLAYER.SPEED;

    const forward = new THREE.Vector3(
      -Math.sin(this.rotation.y),
      0,
      -Math.cos(this.rotation.y)
    );
    const right = new THREE.Vector3(
      Math.cos(this.rotation.y),
      0,
      -Math.sin(this.rotation.y)
    );

    const moveDir = new THREE.Vector3();
    if (this.keys['KeyW']) moveDir.add(forward);
    if (this.keys['KeyS']) moveDir.sub(forward);
    if (this.keys['KeyA']) moveDir.sub(right);
    if (this.keys['KeyD']) moveDir.add(right);

    if (moveDir.length() > 0) moveDir.normalize();

    this.body.velocity.x = moveDir.x * speed;
    this.body.velocity.z = moveDir.z * speed;

    this.isGrounded = Math.abs(this.body.velocity.y) < 0.5 && this.body.position.y < PLAYER.HEIGHT + 0.5;

    if (this.keys['Space'] && this.isGrounded) {
      this.body.velocity.y = PLAYER.JUMP_FORCE;
    }

    this.camera.position.set(
      this.body.position.x,
      this.body.position.y + PLAYER.HEIGHT / 2,
      this.body.position.z
    );

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.rotation.y;
    this.camera.rotation.x = this.rotation.x;
  }

  getPosition() {
    if (!this.body) return { x: 0, y: 0, z: 0 };
    return {
      x: this.body.position.x,
      y: this.body.position.y,
      z: this.body.position.z,
    };
  }

  getRotationY() {
    return this.rotation.y;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    this.isDead = true;
    setTimeout(() => this.respawn(), PLAYER.RESPAWN_TIME * 1000);
  }

  respawn() {
    this.health = PLAYER.MAX_HEALTH;
    this.isDead = false;
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 30;
    this.body.position.set(Math.cos(angle) * dist, 5, Math.sin(angle) * dist);
    this.body.velocity.set(0, 0, 0);
  }
}
