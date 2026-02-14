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

    // Gun model - per weapon
    this.gunModel = this.createWeaponModel(this.currentWeaponId);
    this.camera.add(this.gunModel);
    this.scene.add(this.camera);

    // Tracers & effects
    this.tracers = [];

    // Grenade projectiles in flight
    this.grenades = [];

    this.setupInput();
  }

  /* ── Weapon Models ── */
  createWeaponModel(weaponId) {
    const gun = new THREE.Group();
    const mat = (color) => new THREE.MeshStandardMaterial({ color });

    switch (weaponId) {
      case 'MachineGun': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.55), mat(0x222222));
        barrel.position.z = -0.35;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.3), mat(0x444444));
        body.position.set(0, -0.04, -0.1);
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.15), mat(0x5c3a1e));
        stock.position.set(0, -0.02, 0.12);
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.04), mat(0x333333));
        mag.position.set(0, -0.13, -0.05);
        gun.add(barrel, body, stock, mag);
        break;
      }
      case 'Pistol': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.3), mat(0x333333));
        barrel.position.z = -0.2;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.2), mat(0x555555));
        body.position.set(0, -0.03, -0.05);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.06), mat(0x3a2a1a));
        grip.position.set(0, -0.12, 0.02);
        gun.add(barrel, body, grip);
        break;
      }
      case 'Melee': {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.45), mat(0xcccccc));
        blade.position.z = -0.28;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.03), mat(0x888833));
        guard.position.set(0, 0, -0.05);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.14), mat(0x5c3a1e));
        handle.position.set(0, 0, 0.05);
        gun.add(blade, guard, handle);
        break;
      }
      case 'Grenade': {
        const grenadeBody = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), mat(0x445533));
        grenadeBody.position.z = -0.15;
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.06, 6), mat(0x666666));
        top.position.set(0, 0.08, -0.15);
        const lever = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.08), mat(0x888888));
        lever.position.set(0.04, 0.06, -0.15);
        gun.add(grenadeBody, top, lever);
        break;
      }
      case 'Minigun': {
        // Multiple barrels
        for (let i = 0; i < 4; i++) {
          const b = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), mat(0x333333));
          b.rotation.x = Math.PI / 2;
          const angle = (i / 4) * Math.PI * 2;
          b.position.set(Math.cos(angle) * 0.04, Math.sin(angle) * 0.04, -0.35);
          gun.add(b);
        }
        const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 8), mat(0x444444));
        housing.rotation.x = Math.PI / 2;
        housing.position.z = -0.08;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.22), mat(0x555555));
        body.position.set(0, -0.04, 0.06);
        const ammoBox = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.08), mat(0x3a3a2a));
        ammoBox.position.set(0, -0.14, 0.0);
        gun.add(housing, body, ammoBox);
        break;
      }
      case 'Revolver': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.35), mat(0x555555));
        barrel.position.z = -0.25;
        const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.08, 8), mat(0x666666));
        cylinder.rotation.x = Math.PI / 2;
        cylinder.position.set(0, 0, -0.06);
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.15), mat(0x444444));
        body.position.set(0, -0.04, 0.0);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.06), mat(0x5c3a1e));
        grip.position.set(0, -0.14, 0.04);
        grip.rotation.x = -0.15;
        gun.add(barrel, cylinder, body, grip);
        break;
      }
      case 'Glock': {
        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.28), mat(0x222222));
        slide.position.z = -0.18;
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.18), mat(0x333333));
        frame.position.set(0, -0.05, -0.06);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.14, 0.06), mat(0x333333));
        grip.position.set(0, -0.12, 0.02);
        gun.add(slide, frame, grip);
        break;
      }
      case 'Shotgun': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.65), mat(0x333333));
        barrel.position.z = -0.4;
        const pump = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.12), mat(0x5c3a1e));
        pump.position.set(0, -0.05, -0.2);
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.25), mat(0x444444));
        body.position.set(0, -0.02, 0.0);
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.2), mat(0x5c3a1e));
        stock.position.set(0, -0.01, 0.17);
        gun.add(barrel, pump, body, stock);
        break;
      }
      case 'Sniper': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.7), mat(0x333333));
        barrel.position.z = -0.45;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.3), mat(0x444444));
        body.position.set(0, -0.02, -0.05);
        const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.15, 8), mat(0x222222));
        scope.rotation.x = Math.PI / 2;
        scope.position.set(0, 0.06, -0.1);
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.22), mat(0x5c3a1e));
        stock.position.set(0, -0.01, 0.16);
        const bipod1 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.12, 0.015), mat(0x333333));
        bipod1.position.set(-0.04, -0.1, -0.3);
        bipod1.rotation.x = -0.3;
        const bipod2 = bipod1.clone();
        bipod2.position.x = 0.04;
        gun.add(barrel, body, scope, stock, bipod1, bipod2);
        break;
      }
      case 'BossGun': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.5), mat(0x2a0050));
        barrel.position.z = -0.35;
        const glow = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.05, 0.1),
          new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.6 })
        );
        glow.position.z = -0.58;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.28), mat(0x3a0066));
        body.position.set(0, -0.03, -0.05);
        const core = new THREE.Mesh(
          new THREE.SphereGeometry(0.04, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xcc00ff, emissive: 0xcc00ff, emissiveIntensity: 0.8 })
        );
        core.position.set(0, 0.02, -0.05);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.06), mat(0x220033));
        grip.position.set(0, -0.13, 0.05);
        gun.add(barrel, glow, body, core, grip);
        break;
      }
      default: {
        // Fallback generic gun
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.4), mat(0x333333));
        barrel.position.z = -0.28;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.2), mat(0x555555));
        body.position.set(0, -0.03, -0.05);
        gun.add(barrel, body);
        break;
      }
    }

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

    // Rebuild weapon model
    this.camera.remove(this.gunModel);
    this.gunModel.traverse(c => { c.geometry?.dispose(); c.material?.dispose(); });
    this.gunModel = this.createWeaponModel(this.currentWeaponId);
    this.camera.add(this.gunModel);
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

    // Throw animation - arm goes up then back
    this.gunModel.rotation.x = -0.6;
    setTimeout(() => { this.gunModel.rotation.x = 0.3; }, 150);
    setTimeout(() => { this.gunModel.rotation.x = 0; }, 400);

    // Create grenade projectile
    const grenade = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x445533 })
    );
    grenade.userData.isEffect = true;

    // Start position at camera
    const camPos = this.camera.getWorldPosition(new THREE.Vector3());
    grenade.position.copy(camPos);

    // Throw direction = camera forward + upward arc
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const velocity = dir.multiplyScalar(25);
    velocity.y += 8; // arc upward

    this.scene.add(grenade);
    this.grenades.push({
      mesh: grenade,
      velocity: velocity.clone(),
      life: 2.0, // explodes after 2s or on ground hit
    });
  }

  explodeGrenade(position) {
    if (!this.game) return;
    const blastRadius = this.config.blastRadius || 12;
    const damage = this.config.damage || 200;

    // Explosion visual - ring + flash
    const explosion = new THREE.Mesh(
      new THREE.SphereGeometry(blastRadius * 0.3, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.8 })
    );
    explosion.userData.isEffect = true;
    explosion.position.copy(position);
    this.scene.add(explosion);
    this.tracers.push({ mesh: explosion, life: 0.15 });

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(blastRadius * 0.2, blastRadius * 0.6, 16),
      new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    ring.userData.isEffect = true;
    ring.position.copy(position);
    ring.position.y += 0.5;
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);
    this.tracers.push({ mesh: ring, life: 0.3 });

    // Outer blast sphere
    const outerBlast = new THREE.Mesh(
      new THREE.SphereGeometry(blastRadius * 0.7, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.25 })
    );
    outerBlast.userData.isEffect = true;
    outerBlast.position.copy(position);
    this.scene.add(outerBlast);
    this.tracers.push({ mesh: outerBlast, life: 0.4 });

    // Damage NPCs in blast radius
    const npcManager = this.game.npcManager;
    for (let i = 0; i < npcManager.npcs.length; i++) {
      const npc = npcManager.npcs[i];
      if (!npc.alive) continue;
      const dist = npc.mesh.position.distanceTo(position);
      if (dist < blastRadius) {
        const dmg = Math.floor(damage * (1 - dist / blastRadius));
        npcManager.damageNPC(i, dmg);
        this.game.hud.showHitMarker(false);
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

    // Filter out effects (tracers, impacts, explosions, grenades)
    for (const hit of intersects) {
      let obj = hit.object;
      // Walk up to check if any ancestor is tagged as effect
      let isEffect = false;
      while (obj) {
        if (obj.userData && obj.userData.isEffect) { isEffect = true; break; }
        obj = obj.parent;
      }
      if (isEffect) continue;

      this.createTracer(this.camera.position, hit.point);
      this.createImpact(hit.point);
      if (this.game) this.checkNPCHit(hit);
      return; // only process first valid hit
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
    line.userData.isEffect = true;
    this.scene.add(line);
    this.tracers.push({ mesh: line, life: 0.08 });
  }

  createImpact(position) {
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 })
    );
    spark.userData.isEffect = true;
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

    // Update grenade projectiles
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.life -= delta;

      // Gravity
      g.velocity.y -= 20 * delta;
      g.mesh.position.addScaledVector(g.velocity, delta);

      // Rotate for visual effect
      g.mesh.rotation.x += delta * 5;
      g.mesh.rotation.z += delta * 3;

      // Explode on ground hit or timeout
      if (g.mesh.position.y <= 0.5 || g.life <= 0) {
        g.mesh.position.y = Math.max(g.mesh.position.y, 0.5);
        this.explodeGrenade(g.mesh.position.clone());
        this.scene.remove(g.mesh);
        g.mesh.geometry?.dispose();
        g.mesh.material?.dispose();
        this.grenades.splice(i, 1);
      }
    }

    // Update tracers/effects
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
