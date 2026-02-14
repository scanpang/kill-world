// client/src/game/WeaponSystem.js
import * as THREE from 'three';
import { WEAPONS, WEAPON_SLOTS } from '../../../shared/constants.js';

export class WeaponSystem {
  constructor(sceneManager, player) {
    this.scene = sceneManager;
    this.player = player;
    this.camera = sceneManager.camera;
    this.raycaster = new THREE.Raycaster();
    this.game = null;
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Weapon slots (1-4)
    this.slots = [...WEAPON_SLOTS];
    this.currentSlot = 0;
    this.currentWeaponId = this.slots[0];
    this.config = WEAPONS[this.currentWeaponId];
    this.currentAmmo = this.config.maxAmmo;
    this.maxAmmo = this.config.maxAmmo;
    this.isReloading = false;
    this.lastShotTime = 0;
    this.isShooting = false;

    // Gun model
    this.gunModel = this.createGunModel();
    this.camera.add(this.gunModel);
    this.scene.add(this.camera);

    // Tracers & effects
    this.tracers = [];

    this.setupInput();
  }

  createGunModel() {
    const gun = new THREE.Group();
    const mat = (color) => new THREE.MeshStandardMaterial({ color });

    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.55), mat(0x222222));
    barrel.position.z = -0.35;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.3), mat(0x444444));
    body.position.set(0, -0.04, -0.1);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.15), mat(0x5c3a1e));
    stock.position.set(0, -0.02, 0.12);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.04), mat(0x333333));
    mag.position.set(0, -0.13, -0.05);

    gun.add(barrel, body, stock, mag);
    gun.position.set(0.28, -0.22, -0.45);
    return gun;
  }

  setupInput() {
    document.addEventListener('mousedown', (e) => {
      if (e.button === 0 && document.pointerLockElement) {
        this.isShooting = true;
        if (!this.config.auto) this.shoot();
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.isShooting = false;
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR') this.reload();
      if (e.code === 'Digit1') this.switchSlot(0);
      if (e.code === 'Digit2') this.switchSlot(1);
      if (e.code === 'Digit3') this.switchSlot(2);
      if (e.code === 'Digit4') this.switchSlot(3);
    });
  }

  switchSlot(index) {
    if (index < 0 || index >= this.slots.length) return;
    if (index === this.currentSlot) return;
    this.currentSlot = index;
    this.currentWeaponId = this.slots[index];
    this.config = WEAPONS[this.currentWeaponId];
    this.currentAmmo = this.config.maxAmmo;
    this.maxAmmo = this.config.maxAmmo;
    this.isReloading = false;

    // Update gun visual
    this.gunModel.visible = this.config.type !== 'grenade';
  }

  shoot() {
    if (this.isReloading || this.currentAmmo <= 0 || this.player.isDead) return;
    if (!this.isMobile && !document.pointerLockElement) return;

    const now = performance.now();
    if (now - this.lastShotTime < this.config.fireRate) return;
    this.lastShotTime = now;
    this.currentAmmo--;

    if (this.currentAmmo <= 0 && this.config.reloadTime > 0) {
      this.reload();
    }

    if (this.config.type === 'melee') {
      this.meleeAttack();
    } else if (this.config.type === 'grenade') {
      this.throwGrenade();
    } else {
      const pellets = this.config.pellets || 1;
      for (let i = 0; i < pellets; i++) {
        this.fireRay();
      }
      this.applyRecoil();
    }
  }

  meleeAttack() {
    if (!this.game) return;
    const npcManager = this.game.npcManager;

    for (let i = 0; i < npcManager.npcs.length; i++) {
      const npc = npcManager.npcs[i];
      if (!npc.alive) continue;

      const dist = npc.mesh.position.distanceTo(
        new THREE.Vector3(this.player.position.x, npc.mesh.position.y, this.player.position.z)
      );

      if (dist < this.config.range) {
        npcManager.damageNPC(i, this.config.damage);
        this.game.hud.showHitMarker(false);
        if (npc.health <= 0) {
          this.game.onNPCKill(i);
        }
        break;
      }
    }

    // Melee swing animation
    this.gunModel.rotation.x = -0.5;
    setTimeout(() => { this.gunModel.rotation.x = 0; }, 200);
  }

  throwGrenade() {
    if (!this.game) return;

    // Raycast to find landing point
    const dir = new THREE.Vector3(0, -0.3, -1).normalize();
    dir.applyQuaternion(this.camera.quaternion);
    this.raycaster.set(this.camera.position.clone(), dir);
    this.raycaster.far = this.config.range;

    const intersects = this.raycaster.intersectObjects(this.scene.scene.children, true);
    const landPoint = intersects.length > 0
      ? intersects[0].point
      : this.camera.position.clone().add(dir.multiplyScalar(this.config.range));

    // Explosion effect
    const explosion = new THREE.Mesh(
      new THREE.SphereGeometry(this.config.blastRadius, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.5 })
    );
    explosion.position.copy(landPoint);
    this.scene.add(explosion);
    this.tracers.push({ mesh: explosion, life: 0.4 });

    // Damage NPCs in blast radius
    const npcManager = this.game.npcManager;
    for (let i = 0; i < npcManager.npcs.length; i++) {
      const npc = npcManager.npcs[i];
      if (!npc.alive) continue;
      const dist = npc.mesh.position.distanceTo(landPoint);
      if (dist < this.config.blastRadius) {
        const dmg = Math.floor(this.config.damage * (1 - dist / this.config.blastRadius));
        npcManager.damageNPC(i, dmg);
        if (npc.health <= 0) {
          this.game.onNPCKill(i);
        }
      }
    }
  }

  fireRay() {
    const spread = this.config.spread;
    const direction = new THREE.Vector3(
      (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * spread,
      -1
    ).normalize();
    direction.applyQuaternion(this.camera.quaternion);

    this.raycaster.set(this.camera.position.clone(), direction);
    this.raycaster.far = this.config.range;

    const intersects = this.raycaster.intersectObjects(this.scene.scene.children, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      this.createTracer(this.camera.position, hit.point);
      this.createImpact(hit.point);
      if (this.game) this.checkNPCHit(hit);
    }
  }

  checkNPCHit(hit) {
    let obj = hit.object;
    while (obj.parent && obj.parent !== this.scene.scene) {
      obj = obj.parent;
    }

    const npcManager = this.game.npcManager;
    for (let i = 0; i < npcManager.npcs.length; i++) {
      const npc = npcManager.npcs[i];
      if (npc.alive && npc.mesh === obj) {
        const localHitY = hit.point.y - npc.mesh.position.y;
        const isHeadshot = localHitY > 2.7;

        let damage = this.config.damage;
        if (isHeadshot) damage = Math.floor(damage * this.config.headshotMul);

        npcManager.damageNPC(i, damage);
        this.game.hud.showHitMarker(isHeadshot);

        if (npc.health <= 0) {
          this.game.onNPCKill(i);
        }
        break;
      }
    }
  }

  createTracer(from, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
    const mat = new THREE.LineBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.6 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.tracers.push({ mesh: line, life: 0.08 });
  }

  createImpact(position) {
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 })
    );
    spark.position.copy(position);
    this.scene.add(spark);
    this.tracers.push({ mesh: spark, life: 0.1 });
  }

  applyRecoil() {
    const oz = this.gunModel.position.z;
    this.gunModel.position.z += 0.05;
    this.gunModel.rotation.x -= 0.03;
    setTimeout(() => { this.gunModel.position.z = oz; this.gunModel.rotation.x = 0; }, 60);
  }

  reload() {
    if (this.isReloading || this.config.reloadTime === 0) return;
    if (this.currentAmmo === this.config.maxAmmo) return;
    this.isReloading = true;
    setTimeout(() => {
      this.currentAmmo = this.config.maxAmmo;
      this.isReloading = false;
    }, this.config.reloadTime);
  }

  update(delta) {
    if (this.isShooting && this.config.auto && (this.isMobile || document.pointerLockElement)) {
      this.shoot();
    }

    for (let i = this.tracers.length - 1; i >= 0; i--) {
      this.tracers[i].life -= delta;
      if (this.tracers[i].life <= 0) {
        this.scene.remove(this.tracers[i].mesh);
        this.tracers[i].mesh.geometry?.dispose();
        this.tracers[i].mesh.material?.dispose();
        this.tracers.splice(i, 1);
      }
    }
  }
}
