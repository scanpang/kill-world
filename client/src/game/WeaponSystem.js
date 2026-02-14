// client/src/game/WeaponSystem.js
import * as THREE from 'three';
import { WEAPONS, WEAPON_SLOTS, NPC_TYPES } from '../../../shared/constants.js';

export class WeaponSystem {
  constructor(sceneManager, player) {
    this.scene = sceneManager;
    this.player = player;
    this.camera = sceneManager.camera;
    this.raycaster = new THREE.Raycaster();
    this.game = null;
    this.sound = null;
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Weapon slots (1-4)
    this.slots = [...WEAPON_SLOTS];
    this.currentSlot = 0;
    this.currentWeaponId = this.slots[0];
    this.config = WEAPONS[this.currentWeaponId];
    this.currentAmmo = this.config.maxAmmo;
    this.maxAmmo = this.config.maxAmmo;
    this.isReloading = false;
    this.reloadTimer = null;
    this.lastShotTime = 0;
    this.isShooting = false;

    // Per-slot ammo tracking
    this.slotAmmo = {};
    for (const slot of this.slots) {
      this.slotAmmo[slot] = WEAPONS[slot].maxAmmo;
    }

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
      case 'LaserRifle': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.6), mat(0x333333));
        barrel.position.z = -0.4;
        const lens = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, 0.04, 8),
          new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.8 })
        );
        lens.rotation.x = Math.PI / 2;
        lens.position.z = -0.68;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.25), mat(0x444444));
        body.position.set(0, -0.02, -0.1);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.06), mat(0x333333));
        grip.position.set(0, -0.12, 0.0);
        gun.add(barrel, lens, body, grip);
        break;
      }
      case 'ThunderGun': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.45), mat(0x333355));
        barrel.position.z = -0.3;
        const coil1 = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 8), mat(0xffcc00));
        coil1.position.z = -0.2;
        const coil2 = coil1.clone();
        coil2.position.z = -0.35;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.2), mat(0x444466));
        body.position.set(0, -0.03, 0.0);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.06), mat(0x333333));
        grip.position.set(0, -0.13, 0.04);
        gun.add(barrel, coil1, coil2, body, grip);
        break;
      }
      case 'HellFire': {
        for (let i = 0; i < 3; i++) {
          const b = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), mat(0x440000));
          b.rotation.x = Math.PI / 2;
          const a = (i / 3) * Math.PI * 2;
          b.position.set(Math.cos(a) * 0.035, Math.sin(a) * 0.035, -0.35);
          gun.add(b);
        }
        const muzzle = new THREE.Mesh(
          new THREE.SphereGeometry(0.03, 6, 6),
          new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff4400, emissiveIntensity: 0.6 })
        );
        muzzle.position.z = -0.58;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.2), mat(0x551100));
        body.position.set(0, -0.03, -0.05);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.06), mat(0x331100));
        grip.position.set(0, -0.13, 0.04);
        gun.add(muzzle, body, grip);
        break;
      }
      case 'FrostCannon': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), mat(0x224466));
        barrel.position.z = -0.35;
        const tip = new THREE.Mesh(
          new THREE.SphereGeometry(0.05, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: 0x66ccff, emissiveIntensity: 0.6 })
        );
        tip.position.z = -0.58;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.25), mat(0x335577));
        body.position.set(0, -0.03, -0.05);
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.15, 8), mat(0x4488aa));
        tank.position.set(0, -0.12, -0.05);
        gun.add(barrel, tip, body, tank);
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
    gun.userData.isPlayerGun = true;
    gun.traverse(c => { c.userData.isPlayerGun = true; });
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

    const newWeaponId = this.slots[index];

    // Skip only if same slot AND same weapon
    if (index === this.currentSlot && newWeaponId === this.currentWeaponId) return;

    // Save current slot ammo
    this.slotAmmo[this.currentWeaponId] = this.currentAmmo;

    this.currentSlot = index;
    this.currentWeaponId = newWeaponId;
    this.config = WEAPONS[this.currentWeaponId];
    this.maxAmmo = this.config.maxAmmo;

    // Cancel any pending reload from previous weapon
    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer);
      this.reloadTimer = null;
    }
    this.isReloading = false;

    // Restore saved ammo (or max if new weapon)
    if (this.slotAmmo[this.currentWeaponId] !== undefined) {
      this.currentAmmo = this.slotAmmo[this.currentWeaponId];
    } else {
      this.currentAmmo = this.config.maxAmmo;
      this.slotAmmo[this.currentWeaponId] = this.currentAmmo;
    }

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
      if (this.sound) this.sound.playMelee();
    } else if (this.config.type === 'grenade') {
      this.throwGrenade();
      if (this.sound) this.sound.playGrenade();
    } else {
      const pellets = this.config.pellets || 1;
      for (let i = 0; i < pellets; i++) {
        this.fireRay();
      }
      this.applyRecoil();
      if (this.sound) this.sound.playGunshot(this.currentWeaponId);
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
    if (this.sound) this.sound.playExplosion();
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

    const origin = this.camera.getWorldPosition(new THREE.Vector3());

    // Geometric ray-sphere NPC hit test (no Three.js raycast dependency)
    let hitNPC = null;
    let hitDist = this.config.range;

    if (this.game) {
      const npcManager = this.game.npcManager;
      for (let i = 0; i < npcManager.npcs.length; i++) {
        const npc = npcManager.npcs[i];
        if (!npc.alive) continue;

        const cfg = NPC_TYPES[npc.type] || NPC_TYPES.normal;
        const npcPos = npc.mesh.position;

        // NPC body center (approximate)
        const centerY = npcPos.y + 1.8 * cfg.scale;
        const npcCenter = new THREE.Vector3(npcPos.x, centerY, npcPos.z);

        // Ray-sphere intersection
        const toNPC = npcCenter.clone().sub(origin);
        const proj = toNPC.dot(direction);
        if (proj < 0 || proj > hitDist) continue; // behind camera or too far

        const closestPoint = origin.clone().addScaledVector(direction, proj);
        const perpDist = closestPoint.distanceTo(npcCenter);
        const hitRadius = 1.0 * cfg.scale; // generous hit sphere

        if (perpDist < hitRadius && proj < hitDist) {
          hitDist = proj;
          hitNPC = { index: i, npc, cfg, hitPoint: closestPoint };
        }
      }
    }

    if (hitNPC) {
      const { index, npc, cfg, hitPoint } = hitNPC;
      this.createTracer(origin, hitPoint);
      this.createImpact(hitPoint);

      const localHitY = hitPoint.y - npc.mesh.position.y;
      const isHeadshot = localHitY > 2.7 * cfg.scale;

      let damage = this.config.damage;
      if (isHeadshot) damage = Math.floor(damage * this.config.headshotMul);

      this.game.npcManager.damageNPC(index, damage);
      this.game.hud.showHitMarker(isHeadshot);

      if (npc.health <= 0) {
        this.game.onNPCKill(index);
      }
      return;
    }

    // No NPC hit - raycast scene for tracer endpoint only
    this.raycaster.set(origin, direction);
    this.raycaster.far = this.config.range;
    const intersects = this.raycaster.intersectObjects(this.scene.scene.children, true);
    for (const hit of intersects) {
      let obj = hit.object;
      let skip = false;
      while (obj) {
        if (obj.userData && (obj.userData.isEffect || obj.userData.isPlayerGun)) { skip = true; break; }
        obj = obj.parent;
      }
      if (skip) continue;

      this.createTracer(origin, hit.point);
      this.createImpact(hit.point);
      return;
    }

    // Nothing hit - tracer goes to max range
    const endpoint = origin.clone().addScaledVector(direction, this.config.range);
    this.createTracer(origin, endpoint);
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
    if (this.sound) this.sound.playReload();
    const weaponId = this.currentWeaponId;
    this.reloadTimer = setTimeout(() => {
      // Only apply if still on the same weapon
      if (this.currentWeaponId === weaponId) {
        this.currentAmmo = this.config.maxAmmo;
        this.slotAmmo[weaponId] = this.currentAmmo;
      }
      this.isReloading = false;
      this.reloadTimer = null;
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
