// client/src/game/WeaponSystem.js
import * as THREE from 'three';
import { WEAPONS, WEAPON_SLOTS, NPC_TYPES, WEAKNESS_DAMAGE_MULTIPLIER } from '../../../shared/constants.js';

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

  // Get effective fire rate considering fire rate bonus
  getEffectiveFireRate() {
    const base = this.config.fireRate;
    const reduction = Math.min(this.player.fireRateBonus, 0.7); // cap at 70% reduction
    return base * (1 - reduction);
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
      case 'RocketLauncher': {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.65, 8), mat(0x3a3a2a));
        tube.rotation.x = Math.PI / 2;
        tube.position.z = -0.35;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.3), mat(0x444444));
        body.position.set(0, -0.02, 0.0);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.06), mat(0x5c3a1e));
        grip.position.set(0, -0.14, 0.06);
        const sight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.04), mat(0x666666));
        sight.position.set(0, 0.08, -0.1);
        const muzzle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.05, 0.06, 8),
          new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff4400, emissiveIntensity: 0.5 })
        );
        muzzle.rotation.x = Math.PI / 2;
        muzzle.position.z = -0.68;
        gun.add(tube, body, grip, sight, muzzle);
        break;
      }
      // ── Slot 0 Rare ──
      case 'BasicGunRare': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.55), mat(0x224466));
        barrel.position.z = -0.35;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.3), mat(0x335577));
        body.position.set(0, -0.04, -0.1);
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.15), mat(0x3a5a8e));
        stock.position.set(0, -0.02, 0.12);
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.04), mat(0x2a4466));
        mag.position.set(0, -0.13, -0.05);
        gun.add(barrel, body, stock, mag);
        break;
      }
      case 'MinigunRare': {
        for (let i = 0; i < 4; i++) {
          const b = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), mat(0x2a4466));
          b.rotation.x = Math.PI / 2;
          const angle = (i / 4) * Math.PI * 2;
          b.position.set(Math.cos(angle) * 0.04, Math.sin(angle) * 0.04, -0.35);
          gun.add(b);
        }
        const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 8), mat(0x335577));
        housing.rotation.x = Math.PI / 2; housing.position.z = -0.08;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.22), mat(0x446688));
        body.position.set(0, -0.04, 0.06);
        gun.add(housing, body);
        break;
      }
      case 'ShotgunRare': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.65), mat(0x2a4466));
        barrel.position.z = -0.4;
        const pump = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.12), mat(0x3a5a8e));
        pump.position.set(0, -0.05, -0.2);
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.25), mat(0x335577));
        body.position.set(0, -0.02, 0.0);
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.2), mat(0x3a5a8e));
        stock.position.set(0, -0.01, 0.17);
        gun.add(barrel, pump, body, stock);
        break;
      }
      // ── Slot 0 Legendary ──
      case 'GoldAssault': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.55), mat(0xaa8822));
        barrel.position.z = -0.35;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.3), mat(0xcc9933));
        body.position.set(0, -0.04, -0.1);
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.15), mat(0xddaa44));
        stock.position.set(0, -0.02, 0.12);
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.04), mat(0xbb8833));
        mag.position.set(0, -0.13, -0.05);
        const glow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.08),
          new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 0.6 }));
        glow.position.z = -0.62;
        gun.add(barrel, body, stock, mag, glow);
        break;
      }
      case 'HellMinigun': {
        for (let i = 0; i < 4; i++) {
          const b = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), mat(0x882200));
          b.rotation.x = Math.PI / 2;
          const angle = (i / 4) * Math.PI * 2;
          b.position.set(Math.cos(angle) * 0.04, Math.sin(angle) * 0.04, -0.35);
          gun.add(b);
        }
        const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 8), mat(0xaa4400));
        housing.rotation.x = Math.PI / 2; housing.position.z = -0.08;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.22), mat(0xcc5500));
        body.position.set(0, -0.04, 0.06);
        const glow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.06),
          new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff4400, emissiveIntensity: 0.8 }));
        glow.position.z = -0.6;
        gun.add(housing, body, glow);
        break;
      }
      case 'DoomShotgun': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.7), mat(0x882200));
        barrel.position.z = -0.42;
        const pump = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.14), mat(0xaa4400));
        pump.position.set(0, -0.05, -0.22);
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.28), mat(0xcc5500));
        body.position.set(0, -0.02, 0.0);
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.22), mat(0xddaa44));
        stock.position.set(0, -0.01, 0.18);
        const glow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.06),
          new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff6600, emissiveIntensity: 0.7 }));
        glow.position.z = -0.76;
        gun.add(barrel, pump, body, stock, glow);
        break;
      }
      // ── Slot 1 Rare ──
      case 'RevolverRare': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.35), mat(0x446688));
        barrel.position.z = -0.25;
        const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.08, 8), mat(0x5577aa));
        cylinder.rotation.x = Math.PI / 2; cylinder.position.set(0, 0, -0.06);
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.15), mat(0x335577));
        body.position.set(0, -0.04, 0.0);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.06), mat(0x3a5a8e));
        grip.position.set(0, -0.14, 0.04); grip.rotation.x = -0.15;
        gun.add(barrel, cylinder, body, grip);
        break;
      }
      case 'GlockRare': {
        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.28), mat(0x224466));
        slide.position.z = -0.18;
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.18), mat(0x335577));
        frame.position.set(0, -0.05, -0.06);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.14, 0.06), mat(0x2a4466));
        grip.position.set(0, -0.12, 0.02);
        gun.add(slide, frame, grip);
        break;
      }
      // ── Slot 1 Legendary ──
      case 'DesertKing': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.4), mat(0xcc9933));
        barrel.position.z = -0.28;
        const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.09, 8), mat(0xddaa44));
        cylinder.rotation.x = Math.PI / 2; cylinder.position.set(0, 0, -0.06);
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.18), mat(0xaa8822));
        body.position.set(0, -0.04, 0.02);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.06), mat(0x886622));
        grip.position.set(0, -0.15, 0.06); grip.rotation.x = -0.15;
        const glow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.06),
          new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 0.6 }));
        glow.position.z = -0.48;
        gun.add(barrel, cylinder, body, grip, glow);
        break;
      }
      case 'BlazeGlock': {
        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), mat(0xcc4400));
        slide.position.z = -0.2;
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.2), mat(0xaa3300));
        frame.position.set(0, -0.05, -0.06);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.14, 0.06), mat(0x882200));
        grip.position.set(0, -0.12, 0.02);
        const glow = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.04),
          new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff6600, emissiveIntensity: 0.8 }));
        glow.position.z = -0.35;
        gun.add(slide, frame, grip, glow);
        break;
      }
      // ── Slot 2 Rare ──
      case 'KnifeRare': {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.48), mat(0x6688bb));
        blade.position.z = -0.3;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.06, 0.03), mat(0x4466aa));
        guard.position.set(0, 0, -0.05);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.14), mat(0x3a5a8e));
        handle.position.set(0, 0, 0.05);
        gun.add(blade, guard, handle);
        break;
      }
      case 'AxeRare': {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.58), mat(0x3a5a8e));
        handle.position.z = -0.27;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.09), mat(0x4466aa));
        head.position.set(0, 0.02, -0.52);
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.03), mat(0x6688bb));
        edge.position.set(0, 0.02, -0.56);
        gun.add(handle, head, edge);
        break;
      }
      // ── Slot 2 Legendary ──
      case 'BloodBlade': {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.52),
          new THREE.MeshStandardMaterial({ color: 0xcc2222, emissive: 0xcc0000, emissiveIntensity: 0.4 }));
        blade.position.z = -0.32;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.03), mat(0xaa0000));
        guard.position.set(0, 0, -0.05);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.14), mat(0x660000));
        handle.position.set(0, 0, 0.05);
        gun.add(blade, guard, handle);
        break;
      }
      case 'WorldBreaker': {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.6), mat(0x886622));
        handle.position.z = -0.28;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.12),
          new THREE.MeshStandardMaterial({ color: 0xddaa44, emissive: 0xffaa00, emissiveIntensity: 0.5 }));
        head.position.set(0, 0.02, -0.54);
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.04),
          new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xffcc00, emissiveIntensity: 0.4 }));
        edge.position.set(0, 0.02, -0.58);
        gun.add(handle, head, edge);
        break;
      }
      // ── Slot 3 Rare ──
      case 'RailgunRare': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.6), mat(0x3366aa));
        barrel.position.z = -0.4;
        const glow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.08),
          new THREE.MeshStandardMaterial({ color: 0x66bbff, emissive: 0x66bbff, emissiveIntensity: 0.9 }));
        glow.position.z = -0.68;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.25), mat(0x4477aa));
        body.position.set(0, -0.02, -0.1);
        const coil1 = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 8), mat(0x66bbff));
        coil1.position.z = -0.25;
        const coil2 = coil1.clone(); coil2.position.z = -0.4;
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.06), mat(0x2a4488));
        grip.position.set(0, -0.13, 0.04);
        gun.add(barrel, glow, body, coil1, coil2, grip);
        break;
      }
      case 'PlasmaMK2': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.45), mat(0x5500aa));
        barrel.position.z = -0.3;
        const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xdd44ff, emissive: 0xdd44ff, emissiveIntensity: 0.9 }));
        muzzle.position.z = -0.52;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.22), mat(0x4400aa));
        body.position.set(0, -0.03, -0.05);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.06), mat(0x330066));
        grip.position.set(0, -0.13, 0.05);
        gun.add(barrel, muzzle, body, grip);
        break;
      }
      case 'RocketRare': {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.7, 8), mat(0x4a5a3a));
        tube.rotation.x = Math.PI / 2; tube.position.z = -0.38;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.3), mat(0x556644));
        body.position.set(0, -0.02, 0.0);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.06), mat(0x3a5a2e));
        grip.position.set(0, -0.14, 0.06);
        const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.06, 8),
          new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff6600, emissiveIntensity: 0.6 }));
        muzzle.rotation.x = Math.PI / 2; muzzle.position.z = -0.72;
        gun.add(tube, body, grip, muzzle);
        break;
      }
      // ── Slot 3 Legendary ──
      case 'ZeusRailgun': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.65), mat(0xcc9933));
        barrel.position.z = -0.42;
        const glow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.1),
          new THREE.MeshStandardMaterial({ color: 0xffdd44, emissive: 0xffdd44, emissiveIntensity: 1.0 }));
        glow.position.z = -0.72;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.28), mat(0xddaa44));
        body.position.set(0, -0.02, -0.1);
        const coil1 = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 8),
          new THREE.MeshStandardMaterial({ color: 0xffee66, emissive: 0xffee66, emissiveIntensity: 0.6 }));
        coil1.position.z = -0.25;
        const coil2 = coil1.clone(); coil2.position.z = -0.4;
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.06), mat(0xaa8822));
        grip.position.set(0, -0.13, 0.04);
        gun.add(barrel, glow, body, coil1, coil2, grip);
        break;
      }
      case 'PlasmaOverload': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), mat(0x8800cc));
        barrel.position.z = -0.32;
        const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xff44ff, emissive: 0xff44ff, emissiveIntensity: 1.0 }));
        muzzle.position.z = -0.56;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.15, 0.24), mat(0x6600aa));
        body.position.set(0, -0.03, -0.05);
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xff88ff, emissive: 0xff88ff, emissiveIntensity: 0.8 }));
        core.position.set(0, 0.02, -0.05);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.06), mat(0x440066));
        grip.position.set(0, -0.13, 0.05);
        gun.add(barrel, muzzle, body, core, grip);
        break;
      }
      case 'DoomBringer': {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 8), mat(0x882200));
        tube.rotation.x = Math.PI / 2; tube.position.z = -0.38;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.32), mat(0xaa4400));
        body.position.set(0, -0.02, 0.0);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.06), mat(0x660000));
        grip.position.set(0, -0.16, 0.06);
        const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.08, 8),
          new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 0.8 }));
        muzzle.rotation.x = Math.PI / 2; muzzle.position.z = -0.72;
        const sight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.04), mat(0xffaa00));
        sight.position.set(0, 0.1, -0.1);
        gun.add(tube, body, grip, muzzle, sight);
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

    // Apply power glow effect
    this.applyPowerGlow(gun);

    return gun;
  }

  /* ── Power Glow Effect ── */
  applyPowerGlow(gunGroup) {
    const level = this.player.getPowerLevel();
    if (level <= 0) return;

    let emissiveColor, intensity;
    if (level <= 2) {
      emissiveColor = 0x4488ff; intensity = 0.2;
    } else if (level <= 4) {
      emissiveColor = 0x8844ff; intensity = 0.4;
    } else if (level <= 6) {
      emissiveColor = 0xff8800; intensity = 0.6;
    } else {
      emissiveColor = 0xff2200; intensity = 0.8;
    }

    gunGroup.traverse(c => {
      if (c.isMesh && c.material && c.material.isMeshStandardMaterial) {
        // Don't override already-emissive parts (e.g. Railgun coils)
        if (c.material.emissiveIntensity > 0.3) return;
        c.material = c.material.clone();
        c.material.emissive = new THREE.Color(emissiveColor);
        c.material.emissiveIntensity = intensity;
      }
    });
  }

  refreshGlow() {
    this.applyPowerGlow(this.gunModel);
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

    // Block shooting in safe zone
    if (this.player.isInSafeZone()) return;

    const now = performance.now();
    if (now - this.lastShotTime < this.getEffectiveFireRate()) return;
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
      if (this.sound) {
        if (this.config.explosive) {
          this.sound.playExplosion();
        } else {
          this.sound.playGunshot(this.currentWeaponId);
        }
      }
    }
  }

  meleeAttack() {
    if (!this.game) return;
    const npcManager = this.game.npcManager;
    const baseDamage = this.config.damage;
    let damage = Math.floor(baseDamage * this.player.damageMultiplier * (1 + this.player.damageBonus));

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
        // Weakness bonus: melee weapons vs melee-weak enemies
        let isWeakness = false;
        if (npc.weakness === 'melee') {
          damage = Math.floor(damage * WEAKNESS_DAMAGE_MULTIPLIER);
          isWeakness = true;
        }

        // Shield zombie front damage reduction for melee (30%)
        if (npc.type === 'shield') {
          const nfx = Math.sin(npc.mesh.rotation.y);
          const nfz = Math.cos(npc.mesh.rotation.y);
          const dn = Math.sqrt(dx * dx + dz * dz);
          if (dn > 0) {
            const dot = (dx / dn) * nfx + (dz / dn) * nfz;
            if (dot < -0.3) damage = Math.floor(damage * 0.7);
          }
        }

        npcManager.damageNPC(i, damage);
        this.game.hud.showHitMarker(false, false, isWeakness);
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
    const damageMultiplier = this.player.damageMultiplier * (1 + this.player.damageBonus);
    const range = this.config.range;

    // Step 1: Find wall distance (skip NPC meshes, effects, player gun)
    let wallHitDist = range;
    let wallHitPoint = null;
    try {
      this.raycaster.set(origin, direction);
      this.raycaster.far = range;
      const intersects = this.raycaster.intersectObjects(this.scene.scene.children, true);
      for (const hit of intersects) {
        let obj = hit.object;
        let skip = false;
        while (obj) {
          if (obj.userData && (obj.userData.isEffect || obj.userData.isPlayerGun || obj.userData.isNPC)) { skip = true; break; }
          obj = obj.parent;
        }
        if (!skip) {
          wallHitDist = hit.distance;
          wallHitPoint = hit.point.clone();
          break;
        }
      }
    } catch (e) { /* raycaster error - use default range */ }

    // Step 2: Check NPC hits using 3D ray-sphere test (no raycaster dependency)
    let hitNPC = null;
    let hitDist = wallHitDist;

    if (this.game) {
      const npcManager = this.game.npcManager;

      for (let i = 0; i < npcManager.npcs.length; i++) {
        const npc = npcManager.npcs[i];
        if (!npc.alive) continue;

        const cfg = NPC_TYPES[npc.type] || NPC_TYPES.normal;
        const s = cfg.scale;
        const npcPos = npc.mesh.position;

        // Vector from ray origin to NPC center (body midpoint)
        const tX = npcPos.x - origin.x;
        const tY = (npcPos.y + 1.9 * s) - origin.y;
        const tZ = npcPos.z - origin.z;

        // Project onto ray direction (direction is unit vector)
        const proj = tX * direction.x + tY * direction.y + tZ * direction.z;
        if (proj < 0 || proj > hitDist) continue;

        // Perpendicular distance squared from ray to NPC center
        const distSq = tX * tX + tY * tY + tZ * tZ;
        const perpSq = distSq - proj * proj;
        const hitRadius = 1.2 * s;
        if (perpSq > hitRadius * hitRadius) continue;

        // Verify Y bounds at hit point
        const hitY = origin.y + direction.y * proj;
        const npcTop = 3.8 * s;
        if (hitY < npcPos.y - 0.5 || hitY > npcPos.y + npcTop + 0.5) continue;

        hitDist = proj;
        const hitPoint = new THREE.Vector3(
          origin.x + direction.x * proj,
          hitY,
          origin.z + direction.z * proj
        );
        hitNPC = { index: i, npc, cfg, hitPoint };
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

      // Weakness bonus: pistol slot vs pistol-weak enemies
      let isWeakness = false;
      if (npc.weakness === 'pistol' && this.currentSlot === 1) {
        damage = Math.floor(damage * WEAKNESS_DAMAGE_MULTIPLIER);
        isWeakness = true;
      }

      // Shield zombie: 30% reduced damage from front (nerfed from 50%)
      if (npc.type === 'shield') {
        const sdx = direction.x, sdz = direction.z;
        const nfx = Math.sin(npc.mesh.rotation.y);
        const nfz = Math.cos(npc.mesh.rotation.y);
        const dot = sdx * nfx + sdz * nfz;
        if (dot < -0.3) {
          damage = Math.floor(damage * 0.7);
        }
      }

      // Explosive weapons: area damage
      if (this.config.explosive && this.game) {
        this.applyExplosion(hitPoint, damage, damageMultiplier);
      } else {
        this.game.npcManager.damageNPC(index, damage);
        if (npc.health <= 0) {
          this.game.onNPCKill(index);
        }
      }

      this.game.hud.showHitMarker(isHeadshot, isCrit, isWeakness);

      // Headshot bonus XP
      if (isHeadshot && this.game) {
        this.game.onHeadshotXP();
      }

      return;
    }

    // No NPC hit - show wall impact or endpoint
    if (wallHitPoint) {
      this.createTracer(origin, wallHitPoint);
      this.createImpact(wallHitPoint);
      // Explosive weapons: explode on wall too
      if (this.config.explosive && this.game) {
        this.applyExplosion(wallHitPoint, baseDamage, damageMultiplier);
      }
    } else {
      const endpoint = origin.clone().addScaledVector(direction, range);
      this.createTracer(origin, endpoint);
    }
  }

  /* ── Explosion (Rocket Launcher AOE) ── */
  applyExplosion(center, directDamage, damageMultiplier) {
    const radius = this.config.explosionRadius || 8;
    const npcManager = this.game.npcManager;

    // Visual explosion effect
    this.createExplosionEffect(center, radius);

    // Damage all NPCs in radius
    const killList = [];
    for (let i = 0; i < npcManager.npcs.length; i++) {
      const npc = npcManager.npcs[i];
      if (!npc.alive) continue;

      const dx = npc.mesh.position.x - center.x;
      const dz = npc.mesh.position.z - center.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= radius) {
        // Linear falloff: 100% at center, 30% at edge
        const falloff = 1.0 - (dist / radius) * 0.7;
        const aoeDamage = Math.floor(directDamage * damageMultiplier * falloff);
        npcManager.damageNPC(i, aoeDamage);
        if (npc.health <= 0) {
          killList.push(i);
        }
      }
    }

    // Process kills
    for (const idx of killList) {
      this.game.onNPCKill(idx);
    }
  }

  createExplosionEffect(position, radius) {
    // Expanding sphere effect
    const geo = new THREE.SphereGeometry(0.5, 12, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff6600, transparent: true, opacity: 0.8,
    });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.position.copy(position);
    sphere.userData.isEffect = true;
    this.scene.add(sphere);

    // Inner bright core
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00, transparent: true, opacity: 0.9,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), coreMat);
    core.position.copy(position);
    core.userData.isEffect = true;
    this.scene.add(core);

    // Animate expansion
    const startTime = performance.now();
    const maxScale = radius * 0.6;
    const duration = 400;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);

      const scale = 0.5 + t * maxScale;
      sphere.scale.setScalar(scale);
      core.scale.setScalar(scale * 0.5);
      mat.opacity = 0.8 * (1 - t);
      coreMat.opacity = 0.9 * (1 - t);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(sphere);
        this.scene.remove(core);
        geo.dispose(); mat.dispose();
        coreMat.dispose();
      }
    };
    requestAnimationFrame(animate);
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
