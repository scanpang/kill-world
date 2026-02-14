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
    this.slots = [...WEAPON_SLOTS]; // ['BasicGun', null, 'Knife', null]
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
      if (slot && WEAPONS[slot]) {
        this.slotAmmo[slot] = WEAPONS[slot].maxAmmo;
      }
    }

    // Gun model - per weapon
    this.gunModel = this.createWeaponModel(this.currentWeaponId);
    this.camera.add(this.gunModel);
    this.scene.add(this.camera);

    // Tracers & effects
    this.tracers = [];

    // Shared materials
    this._tracerMat = new THREE.LineBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.6 });
    this._impactGeo = new THREE.SphereGeometry(0.1, 4, 4);
    this._impactMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 });

    this.setupInput();
  }

  // Get effective max ammo considering magazine bonus
  getEffectiveMaxAmmo(weaponId) {
    const base = WEAPONS[weaponId] ? WEAPONS[weaponId].maxAmmo : 0;
    if (base === Infinity) return Infinity;
    return Math.floor(base * (1 + this.player.magBonus));
  }

  /* ── Weapon Models ── */
  createWeaponModel(weaponId) {
    const gun = new THREE.Group();
    const mat = (color) => new THREE.MeshStandardMaterial({ color });

    switch (weaponId) {
      case 'BasicGun': {
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
      case 'Minigun': {
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
      case 'Knife': {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.45), mat(0xcccccc));
        blade.position.z = -0.28;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.03), mat(0x888833));
        guard.position.set(0, 0, -0.05);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.14), mat(0x5c3a1e));
        handle.position.set(0, 0, 0.05);
        gun.add(blade, guard, handle);
        break;
      }
      case 'Axe': {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.55), mat(0x5c3a1e));
        handle.position.z = -0.25;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.08), mat(0x888888));
        head.position.set(0, 0.02, -0.48);
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.03), mat(0xaaaaaa));
        edge.position.set(0, 0.02, -0.52);
        gun.add(handle, head, edge);
        break;
      }
      case 'Railgun': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.6), mat(0x2244aa));
        barrel.position.z = -0.4;
        const glow = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.04, 0.08),
          new THREE.MeshStandardMaterial({ color: 0x44aaff, emissive: 0x44aaff, emissiveIntensity: 0.8 })
        );
        glow.position.z = -0.68;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.25), mat(0x334488));
        body.position.set(0, -0.02, -0.1);
        const coil1 = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 8), mat(0x44aaff));
        coil1.position.z = -0.25;
        const coil2 = coil1.clone();
        coil2.position.z = -0.4;
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.06), mat(0x222244));
        grip.position.set(0, -0.13, 0.04);
        gun.add(barrel, glow, body, coil1, coil2, grip);
        break;
      }
      case 'PlasmaGun': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.45), mat(0x440066));
        barrel.position.z = -0.3;
        const muzzle = new THREE.Mesh(
          new THREE.SphereGeometry(0.04, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xcc00ff, emissive: 0xcc00ff, emissiveIntensity: 0.8 })
        );
        muzzle.position.z = -0.52;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.22), mat(0x3a0066));
        body.position.set(0, -0.03, -0.05);
        const core = new THREE.Mesh(
          new THREE.SphereGeometry(0.035, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.6 })
        );
        core.position.set(0, 0.02, -0.05);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.06), mat(0x220033));
        grip.position.set(0, -0.13, 0.05);
        gun.add(barrel, muzzle, body, core, grip);
        break;
      }
      default: {
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
    if (!newWeaponId || !WEAPONS[newWeaponId]) return;
    if (index === this.currentSlot && newWeaponId === this.currentWeaponId) return;

    this.slotAmmo[this.currentWeaponId] = this.currentAmmo;

    this.currentSlot = index;
    this.currentWeaponId = newWeaponId;
    this.config = WEAPONS[this.currentWeaponId];
    this.maxAmmo = this.getEffectiveMaxAmmo(this.currentWeaponId);

    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer);
      this.reloadTimer = null;
    }
    this.isReloading = false;

    if (this.slotAmmo[this.currentWeaponId] !== undefined) {
      this.currentAmmo = this.slotAmmo[this.currentWeaponId];
    } else {
      this.currentAmmo = this.maxAmmo;
      this.slotAmmo[this.currentWeaponId] = this.currentAmmo;
    }

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
    this.slotAmmo[this.currentWeaponId] = this.currentAmmo;

    if (this.currentAmmo <= 0 && this.config.reloadTime > 0 && !this.config.unique) {
      this.reload();
    }

    if (this.config.type === 'melee') {
      this.meleeAttack();
      if (this.sound) this.sound.playMelee();
    } else {
      this.fireRay();
      this.applyRecoil();
      if (this.sound) this.sound.playGunshot(this.currentWeaponId);
    }
  }

  meleeAttack() {
    if (!this.game) return;
    const npcManager = this.game.npcManager;
    const baseDamage = this.config.damage;
    let damage = Math.floor(baseDamage * this.player.damageMultiplier);

    // Crit chance
    if (this.player.critChance > 0 && Math.random() < this.player.critChance) {
      damage *= 2;
    }

    for (let i = 0; i < npcManager.npcs.length; i++) {
      const npc = npcManager.npcs[i];
      if (!npc.alive) continue;

      const dx = npc.mesh.position.x - this.player.position.x;
      const dz = npc.mesh.position.z - this.player.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < this.config.range) {
        // Shield zombie front damage reduction for melee
        if (npc.type === 'shield') {
          const nfx = Math.sin(npc.mesh.rotation.y);
          const nfz = Math.cos(npc.mesh.rotation.y);
          const dn = Math.sqrt(dx * dx + dz * dz);
          if (dn > 0) {
            const dot = (dx / dn) * nfx + (dz / dn) * nfz;
            if (dot < -0.3) damage = Math.floor(damage * 0.5);
          }
        }

        npcManager.damageNPC(i, damage);
        this.game.hud.showHitMarker(false);
        if (npc.health <= 0) {
          this.game.onNPCKill(i);
        }
        break;
      }
    }

    this.gunModel.rotation.x = -0.5;
    setTimeout(() => { this.gunModel.rotation.x = 0; }, 200);
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

    const baseDamage = this.config.damage;
    const damageMultiplier = this.player.damageMultiplier;

    let hitNPC = null;
    let hitDist = this.config.range;

    if (this.game) {
      const npcManager = this.game.npcManager;
      const dx = direction.x, dy = direction.y, dz = direction.z;

      for (let i = 0; i < npcManager.npcs.length; i++) {
        const npc = npcManager.npcs[i];
        if (!npc.alive) continue;

        const cfg = NPC_TYPES[npc.type] || NPC_TYPES.normal;
        const npcPos = npc.mesh.position;

        const ox = origin.x - npcPos.x;
        const oz = origin.z - npcPos.z;
        const denom = dx * dx + dz * dz;
        if (denom < 0.0001) continue;

        const t = -(ox * dx + oz * dz) / denom;
        if (t < 0 || t > hitDist) continue;

        const cxz = ox + dx * t;
        const czz = oz + dz * t;
        const perpXZ = Math.sqrt(cxz * cxz + czz * czz);
        const hitRadius = 1.0 * cfg.scale;
        if (perpXZ > hitRadius) continue;

        const hitY = origin.y + dy * t;
        const npcTop = 3.8 * cfg.scale;
        if (hitY < -0.5 || hitY > npcTop + 0.5) continue;

        if (t < hitDist) {
          hitDist = t;
          const hitPoint = new THREE.Vector3(
            origin.x + dx * t,
            origin.y + dy * t,
            origin.z + dz * t
          );
          hitNPC = { index: i, npc, cfg, hitPoint };
        }
      }
    }

    if (hitNPC) {
      const { index, npc, cfg, hitPoint } = hitNPC;
      this.createTracer(origin, hitPoint);
      this.createImpact(hitPoint);

      const localHitY = hitPoint.y - npc.mesh.position.y;
      const isHeadshot = localHitY > 2.7 * cfg.scale;

      let damage = baseDamage;
      if (isHeadshot) damage = Math.floor(damage * this.config.headshotMul);
      damage = Math.floor(damage * damageMultiplier);

      // Crit chance
      let isCrit = false;
      if (this.player.critChance > 0 && Math.random() < this.player.critChance) {
        damage *= 2;
        isCrit = true;
      }

      // Shield zombie: 50% reduced damage from front
      if (npc.type === 'shield') {
        const dx = direction.x, dz = direction.z;
        const nfx = Math.sin(npc.mesh.rotation.y);
        const nfz = Math.cos(npc.mesh.rotation.y);
        const dot = dx * nfx + dz * nfz;
        if (dot < -0.3) {
          damage = Math.floor(damage * 0.5);
        }
      }

      this.game.npcManager.damageNPC(index, damage);
      this.game.hud.showHitMarker(isHeadshot, isCrit);

      // Headshot bonus XP
      if (isHeadshot && this.game) {
        this.game.onHeadshotXP();
      }

      if (npc.health <= 0) {
        this.game.onNPCKill(index);
      }
      return;
    }

    // No NPC hit
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

    const endpoint = origin.clone().addScaledVector(direction, this.config.range);
    this.createTracer(origin, endpoint);
  }

  createTracer(from, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geo, this._tracerMat);
    line.userData.isEffect = true;
    this.scene.add(line);
    this.tracers.push({ mesh: line, life: 0.08 });
  }

  createImpact(position) {
    const spark = new THREE.Mesh(this._impactGeo, this._impactMat);
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
    if (this.config.unique) return;
    if (this.isReloading || this.config.reloadTime === 0) return;
    const effectiveMax = this.getEffectiveMaxAmmo(this.currentWeaponId);
    if (this.currentAmmo === effectiveMax) return;
    this.isReloading = true;
    if (this.sound) this.sound.playReload();
    const weaponId = this.currentWeaponId;
    this.reloadTimer = setTimeout(() => {
      if (this.currentWeaponId === weaponId) {
        this.currentAmmo = this.getEffectiveMaxAmmo(weaponId);
        this.slotAmmo[weaponId] = this.currentAmmo;
        this.maxAmmo = this.currentAmmo;
      }
      this.isReloading = false;
      this.reloadTimer = null;
    }, this.config.reloadTime);
  }

  update(delta) {
    if (this.isShooting && this.config.auto && (this.isMobile || document.pointerLockElement)) {
      this.shoot();
    }

    for (let i = this.tracers.length - 1; i >= 0; i--) {
      this.tracers[i].life -= delta;
      if (this.tracers[i].life <= 0) {
        const m = this.tracers[i].mesh;
        this.scene.remove(m);
        if (m.isLine) m.geometry?.dispose();
        this.tracers.splice(i, 1);
      }
    }
  }
}
