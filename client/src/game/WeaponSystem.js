// client/src/game/WeaponSystem.js
import * as THREE from 'three';
import { WEAPONS } from '../../../shared/constants.js';

export class WeaponSystem {
  constructor(sceneManager, player) {
    this.scene = sceneManager;
    this.player = player;
    this.camera = sceneManager.camera;
    this.raycaster = new THREE.Raycaster();

    // Current weapon
    this.currentWeaponId = 'AssaultRifle';
    this.config = WEAPONS[this.currentWeaponId];
    this.currentAmmo = this.config.maxAmmo;
    this.maxAmmo = this.config.maxAmmo;
    this.isReloading = false;
    this.lastShotTime = 0;
    this.isShooting = false;

    // Gun model (attached to camera)
    this.gunModel = this.createGunModel();
    this.camera.add(this.gunModel);
    this.scene.add(this.camera); // Camera must be in scene for children to render

    // Bullet tracers
    this.tracers = [];

    this.setupInput();
  }

  createGunModel() {
    const gun = new THREE.Group();
    const mat = (color) => new THREE.MeshStandardMaterial({ color });

    // Barrel
    const barrel = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.06, 0.55),
      mat(0x222222)
    );
    barrel.position.z = -0.35;

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.14, 0.3),
      mat(0x444444)
    );
    body.position.set(0, -0.04, -0.1);

    // Stock
    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.1, 0.15),
      mat(0x5c3a1e)
    );
    stock.position.set(0, -0.02, 0.12);

    // Magazine
    const mag = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.12, 0.04),
      mat(0x333333)
    );
    mag.position.set(0, -0.13, -0.05);

    gun.add(barrel, body, stock, mag);
    gun.position.set(0.28, -0.22, -0.45);

    return gun;
  }

  setupInput() {
    document.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isShooting = true;
        if (!this.config.auto) {
          this.shoot();
        }
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isShooting = false;
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR') this.reload();
      // Weapon switch
      if (e.code === 'Digit1') this.switchWeapon('AssaultRifle');
      if (e.code === 'Digit2') this.switchWeapon('Shotgun');
      if (e.code === 'Digit3') this.switchWeapon('Sniper');
    });
  }

  shoot() {
    if (this.isReloading || this.currentAmmo <= 0 || this.player.isDead) return;

    const now = performance.now();
    if (now - this.lastShotTime < this.config.fireRate) return;
    this.lastShotTime = now;
    this.currentAmmo--;

    // Auto reload when empty
    if (this.currentAmmo <= 0) {
      this.reload();
    }

    const pellets = this.config.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      this.fireRay();
    }

    // Recoil animation
    this.applyRecoil();
  }

  fireRay() {
    const spread = this.config.spread;
    const direction = new THREE.Vector3(
      (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * spread,
      -1
    ).normalize();

    // Transform direction to world space
    direction.applyQuaternion(this.camera.quaternion);

    this.raycaster.set(this.camera.position.clone(), direction);
    this.raycaster.far = this.config.range;

    const intersects = this.raycaster.intersectObjects(
      this.scene.scene.children, true
    );

    if (intersects.length > 0) {
      const hit = intersects[0];
      this.createTracer(this.camera.position, hit.point);
      this.createImpact(hit.point, hit.face?.normal);

      // Check if hit NPC or player
      // (handled via network/game logic)
    }
  }

  createTracer(from, to) {
    const points = [from.clone(), to.clone()];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.6,
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);

    this.tracers.push({ mesh: line, life: 0.08 });
  }

  createImpact(position, normal) {
    // Small flash at impact point
    const geo = new THREE.SphereGeometry(0.1, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.8,
    });
    const spark = new THREE.Mesh(geo, mat);
    spark.position.copy(position);
    this.scene.add(spark);

    this.tracers.push({ mesh: spark, life: 0.1 });
  }

  applyRecoil() {
    // Quick kick-back animation
    const original = this.gunModel.position.z;
    this.gunModel.position.z += 0.05;
    this.gunModel.rotation.x -= 0.03;

    setTimeout(() => {
      this.gunModel.position.z = original;
      this.gunModel.rotation.x = 0;
    }, 60);
  }

  reload() {
    if (this.isReloading || this.currentAmmo === this.config.maxAmmo) return;
    this.isReloading = true;

    setTimeout(() => {
      this.currentAmmo = this.config.maxAmmo;
      this.isReloading = false;
    }, this.config.reloadTime);
  }

  switchWeapon(weaponId) {
    if (!WEAPONS[weaponId] || weaponId === this.currentWeaponId) return;
    this.currentWeaponId = weaponId;
    this.config = WEAPONS[weaponId];
    this.currentAmmo = this.config.maxAmmo;
    this.maxAmmo = this.config.maxAmmo;
    this.isReloading = false;
  }

  update(delta) {
    // Auto fire
    if (this.isShooting && this.config.auto) {
      this.shoot();
    }

    // Update tracers
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
