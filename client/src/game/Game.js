// client/src/game/Game.js
import * as THREE from 'three';
import { NPC as NPC_CONST, NPC_TYPES, BOSS_UNIQUE_WEAPONS, WEAPONS } from '../../../shared/constants.js';
import { SceneManager } from './SceneManager.js';
import { Player } from './Player.js';
import { MapBuilder } from './MapBuilder.js';
import { WeaponSystem } from './WeaponSystem.js';
import { NPCManager } from './NPCManager.js';
import { Minimap } from '../ui/Minimap.js';
import { HUD } from '../ui/HUD.js';
import { NetworkManager } from '../network/NetworkManager.js';
import { PhysicsWorld } from './PhysicsWorld.js';
import { MobileControls } from '../ui/MobileControls.js';
import { SoundManager } from './SoundManager.js';

export class Game {
  constructor() {
    this.isRunning = false;
    this.clock = new THREE.Clock();

    // Core systems
    this.scene = new SceneManager();
    this.physics = new PhysicsWorld();
    this.map = new MapBuilder(this.scene, this.physics);
    this.player = new Player(this.scene, this.physics);
    this.weapons = new WeaponSystem(this.scene, this.player);
    this.npcManager = new NPCManager(this.scene, this.physics);
    this.network = new NetworkManager(this);
    this.minimap = new Minimap();
    this.hud = new HUD();

    // Sound
    this.sound = new SoundManager();

    // Mobile controls
    this.mobileControls = new MobileControls(this.player, this.weapons);

    // Connect systems
    this.weapons.game = this;
    this.weapons.sound = this.sound;
    this.hud.game = this;
    this.player.map = this.map;
    this.npcManager.map = this.map;
    this.npcManager.sound = this.sound;

    // Kill tracking
    this.killCount = 0;
    this.bossKillCount = 0;
    this.gameOver = false;

    // NPC attack → player damage
    window.__onNPCAttack = (damage) => {
      this.player.takeDamage(damage);
      if (this.player.isDead && !this.gameOver) {
        this.showDeathScreen();
      }
    };

    // Remote players
    this.remotePlayers = new Map();

    // Resize handler
    window.addEventListener('resize', () => this.scene.resize());
  }

  start() {
    this.isRunning = true;
    this.sound.init();
    this.sound.startBGM();
    this.map.build();
    this.player.init();
    this.npcManager.spawnInitialNPCs();
    this.mobileControls.init();
    this.network.connect();
    this.loop();
  }

  onNPCKill(npcIndex) {
    const npc = this.npcManager.npcs[npcIndex];
    const coinDrop = npc.coinDrop || NPC_CONST.COIN_DROP;
    this.player.addCoins(coinDrop);
    this.hud.showCoinPopup(coinDrop);

    // XP from kill
    const npcCfg = NPC_TYPES[npc.type] || NPC_TYPES.normal;
    const xpGain = npcCfg.xp || 1;
    const prevLevel = this.player.level;
    const leveled = this.player.addXP(xpGain);

    if (leveled) {
      this.hud.showBossAlert(`LEVEL UP! Lv.${this.player.level} (DMG +${Math.round((this.player.damageMultiplier - 1) * 100)}%)`);

      // Special weapon full reload on level up
      for (let i = 0; i < this.weapons.slots.length; i++) {
        const wid = this.weapons.slots[i];
        if (wid && WEAPONS[wid] && WEAPONS[wid].unique) {
          this.weapons.slotAmmo[wid] = WEAPONS[wid].maxAmmo;
          // If currently equipped, update current ammo too
          if (this.weapons.currentWeaponId === wid) {
            this.weapons.currentAmmo = WEAPONS[wid].maxAmmo;
          }
        }
      }
    }

    this.killCount++;
    this.hud.updateKillCount(this.killCount);

    if (npc.isBoss) {
      this.bossKillCount++;

      // Random unique weapon drop
      const pool = BOSS_UNIQUE_WEAPONS;
      const dropId = pool[Math.floor(Math.random() * pool.length)];
      this.weapons.slots[3] = dropId;
      this.weapons.slotAmmo[dropId] = WEAPONS[dropId].maxAmmo;
      this.weapons.switchSlot(3);

      this.hud.showBossAlert(`BOSS DEFEATED! ${this.weapons.config.name} ACQUIRED!`);
      this.hud.addKillFeedEntry('You', 'BOSS');

      // Boss death → all zombies level up
      this.npcManager.levelUpZombies();
      this.hud.showZombieLevelUp(this.npcManager.zombieLevel);
    } else {
      this.hud.addKillFeedEntry('You', npc.typeName || 'Zombie');
    }

    // Boss spawn every 50 kills
    if (this.killCount >= 50 && this.killCount % 50 === 0 && !this.npcManager.bossAlive) {
      this.npcManager.spawnBoss();
      this.hud.showBossAlert('BOSS ZOMBIE APPEARED!');
    }
  }

  showDeathScreen() {
    this.gameOver = true;
    this.isRunning = false;
    this.sound.stopBGM();

    const overlay = document.getElementById('death-screen');
    if (overlay) {
      document.getElementById('death-kills').textContent = this.killCount;
      document.getElementById('death-level').textContent = this.player.level;
      document.getElementById('death-xp').textContent = this.player.totalXP;
      overlay.classList.add('active');
    }

    // Restart button
    const restartBtn = document.getElementById('death-restart');
    if (restartBtn) {
      restartBtn.onclick = () => location.reload();
    }
  }

  pause() {}

  loop() {
    if (!this.isRunning) return;
    requestAnimationFrame(() => this.loop());

    const delta = this.clock.getDelta();

    // Check death during gameplay
    if (this.player.isDead && !this.gameOver) {
      this.showDeathScreen();
      return;
    }

    this.mobileControls.update();
    this.physics.update(delta);
    this.player.update(delta);
    this.weapons.update(delta);
    this.npcManager.update(delta, this.player.getPosition());
    this.updateRemotePlayers(delta);

    this.minimap.update(
      this.player.getPosition(),
      this.player.getRotationY(),
      this.getEntities()
    );

    this.hud.update({
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      ammo: this.weapons.currentAmmo,
      maxAmmo: this.weapons.maxAmmo,
      playerCount: this.remotePlayers.size + 1,
      coins: this.player.coins,
      weaponName: this.weapons.config ? this.weapons.config.name : '',
      currentSlot: this.weapons.currentSlot,
      isReloading: this.weapons.isReloading,
      weaponId: this.weapons.currentWeaponId,
      level: this.player.level,
      xp: this.player.xp,
      xpToNext: this.player.xpToNext,
      damageBonus: Math.round((this.player.damageMultiplier - 1) * 100),
    });

    this.network.sendPosition(
      this.player.getPosition(),
      this.player.getRotationY(),
      this.weapons.currentWeaponId
    );

    this.scene.render();
  }

  getEntities() {
    const entities = [];
    for (const [id, rp] of this.remotePlayers) {
      entities.push({ type: 'player', position: rp.mesh.position });
    }
    for (const npc of this.npcManager.npcs) {
      if (npc.alive) {
        entities.push({ type: 'npc', position: npc.mesh.position });
      }
    }
    return entities;
  }

  updateRemotePlayers(delta) {
    for (const [id, rp] of this.remotePlayers) {
      if (rp.targetPosition) {
        rp.mesh.position.lerp(rp.targetPosition, 0.15);
      }
      if (rp.targetRotationY !== undefined) {
        rp.mesh.rotation.y += (rp.targetRotationY - rp.mesh.rotation.y) * 0.15;
      }
    }
  }

  addRemotePlayer(id, data) {
    if (this.remotePlayers.has(id)) return;
    const mesh = this.createBlockCharacter(data.color || 0xe74c3c, data.weaponId || 'BasicGun');
    mesh.position.set(data.x || 0, 0, data.z || 0);
    this.scene.add(mesh);
    this.remotePlayers.set(id, {
      mesh,
      targetPosition: null,
      targetRotationY: 0,
      weaponId: data.weaponId || 'BasicGun',
    });
  }

  removeRemotePlayer(id) {
    const rp = this.remotePlayers.get(id);
    if (rp) {
      this.scene.remove(rp.mesh);
      this.remotePlayers.delete(id);
    }
  }

  updateRemotePlayerPosition(id, data) {
    const rp = this.remotePlayers.get(id);
    if (rp) {
      rp.targetPosition = new THREE.Vector3(data.x, 0, data.z);
      rp.targetRotationY = data.ry || 0;
      if (data.weaponId && data.weaponId !== rp.weaponId) {
        rp.weaponId = data.weaponId;
        this.updateRemotePlayerWeapon(rp);
      }
    }
  }

  updateRemotePlayerWeapon(rp) {
    const toRemove = [];
    rp.mesh.traverse(c => { if (c.userData.isGun) toRemove.push(c); });
    toRemove.forEach(c => {
      rp.mesh.remove(c);
      c.geometry?.dispose();
      c.material?.dispose();
    });
    const gunParts = this.createRemoteGun(rp.weaponId);
    for (const part of gunParts) {
      part.userData.isGun = true;
      rp.mesh.add(part);
    }
  }

  createRemoteGun(weaponId) {
    const mat = (color) => new THREE.MeshStandardMaterial({ color });
    const parts = [];
    switch (weaponId) {
      case 'Minigun': {
        for (let i = 0; i < 3; i++) {
          const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 4), mat(0x333333));
          b.rotation.x = Math.PI / 2;
          const a = (i / 3) * Math.PI * 2;
          b.position.set(0.95 + Math.cos(a) * 0.06, 2.0 + Math.sin(a) * 0.06, -0.35);
          parts.push(b);
        }
        break;
      }
      case 'Shotgun': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.7), mat(0x333333));
        barrel.position.set(0.95, 2.0, -0.4);
        parts.push(barrel);
        break;
      }
      case 'Revolver': case 'Glock': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), mat(0x444444));
        barrel.position.set(0.95, 2.0, -0.3);
        parts.push(barrel);
        break;
      }
      case 'Knife': {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.5), mat(0xcccccc));
        blade.position.set(0.95, 2.0, -0.35);
        parts.push(blade);
        break;
      }
      case 'Axe': {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.5), mat(0x5c3a1e));
        handle.position.set(0.95, 2.0, -0.35);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.1), mat(0x888888));
        head.position.set(0.95, 2.0, -0.55);
        parts.push(handle, head);
        break;
      }
      case 'Railgun': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.7), mat(0x2244aa));
        barrel.position.set(0.95, 2.0, -0.45);
        parts.push(barrel);
        break;
      }
      case 'PlasmaGun': {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), mat(0x6600aa));
        barrel.position.set(0.95, 2.0, -0.4);
        parts.push(barrel);
        break;
      }
      default: {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), mat(0x222222));
        barrel.position.set(0.95, 2.0, -0.4);
        parts.push(barrel);
        break;
      }
    }
    return parts;
  }

  createBlockCharacter(bodyColor = 0xe74c3c, weaponId = 'BasicGun') {
    const group = new THREE.Group();
    const mat = (color) => new THREE.MeshStandardMaterial({ color });
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), mat(0xffcc88));
    head.position.y = 3.6; head.castShadow = true;
    const eyeMat = mat(0x000000);
    const eyeGeo = new THREE.BoxGeometry(0.15, 0.15, 0.05);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.25, 3.7, 0.61);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.25, 3.7, 0.61);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.8), mat(bodyColor));
    body.position.y = 2.2; body.castShadow = true;
    const armGeo = new THREE.BoxGeometry(0.5, 1.4, 0.5);
    const armMat = mat(bodyColor);
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.95, 2.2, 0);
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.95, 2.2, 0);
    const legGeo = new THREE.BoxGeometry(0.6, 1.4, 0.6);
    const legMat = mat(0x2c3e50);
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.35, 0.7, 0);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.35, 0.7, 0);
    group.add(head, leftEye, rightEye, body, leftArm, rightArm, leftLeg, rightLeg);
    const gunParts = this.createRemoteGun(weaponId);
    for (const part of gunParts) {
      part.userData.isGun = true;
      group.add(part);
    }
    return group;
  }
}
