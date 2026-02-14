// client/src/game/Game.js
import * as THREE from 'three';
import { NPC as NPC_CONST } from '../../../shared/constants.js';
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

    // Mobile controls
    this.mobileControls = new MobileControls(this.player, this.weapons);

    // Connect systems
    this.weapons.game = this;
    this.hud.game = this;
    this.player.map = this.map;
    this.npcManager.map = this.map;

    // Kill tracking
    this.killCount = 0;

    // NPC attack → player damage
    window.__onNPCAttack = (damage) => {
      this.player.takeDamage(damage);
    };

    // Remote players
    this.remotePlayers = new Map();

    // Resize handler
    window.addEventListener('resize', () => this.scene.resize());
  }

  start() {
    this.isRunning = true;
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
    this.killCount++;
    this.hud.updateKillCount(this.killCount);

    if (npc.isBoss) {
      // Boss killed - award unique weapon
      this.weapons.slots[3] = 'BossGun';
      this.weapons.switchSlot(3);
      this.hud.showBossAlert('BOSS DEFEATED! PLASMA GUN ACQUIRED!');
      this.hud.addKillFeedEntry('You', 'BOSS');
    } else {
      this.hud.addKillFeedEntry('You', npc.typeName || 'Zombie');
    }

    // Boss spawn every 100 kills
    if (this.killCount % 100 === 0 && !this.npcManager.bossAlive) {
      this.npcManager.spawnBoss();
      this.hud.showBossAlert('BOSS ZOMBIE APPEARED!');
    }
  }

  pause() {}

  loop() {
    if (!this.isRunning) return;
    requestAnimationFrame(() => this.loop());

    const delta = this.clock.getDelta();

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
      weaponName: this.weapons.config.name,
      currentSlot: this.weapons.currentSlot,
      isReloading: this.weapons.isReloading,
    });

    this.network.sendPosition(
      this.player.getPosition(),
      this.player.getRotationY()
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
    const mesh = this.createBlockCharacter(data.color || 0xe74c3c);
    mesh.position.set(data.x || 0, 0, data.z || 0);
    this.scene.add(mesh);
    this.remotePlayers.set(id, { mesh, targetPosition: null, targetRotationY: 0 });
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
    }
  }

  createBlockCharacter(bodyColor = 0xe74c3c) {
    const group = new THREE.Group();
    const mat = (color) => new THREE.MeshStandardMaterial({ color });

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), mat(0xffcc88));
    head.position.y = 3.6;
    head.castShadow = true;

    // Eyes
    const eyeMat = mat(0x000000);
    const eyeGeo = new THREE.BoxGeometry(0.15, 0.15, 0.05);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.25, 3.7, 0.61);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.25, 3.7, 0.61);

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.8), mat(bodyColor));
    body.position.y = 2.2;
    body.castShadow = true;

    // Arms
    const armGeo = new THREE.BoxGeometry(0.5, 1.4, 0.5);
    const armMat = mat(bodyColor);
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.95, 2.2, 0);
    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.95, 2.2, 0);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.6, 1.4, 0.6);
    const legMat = mat(0x2c3e50);
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.35, 0.7, 0);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.35, 0.7, 0);

    // Gun in hand
    const gunBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), mat(0x222222));
    gunBarrel.position.set(0.95, 2.0, -0.4);
    const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.25), mat(0x444444));
    gunBody.position.set(0.95, 1.95, -0.1);

    group.add(head, leftEye, rightEye, body, leftArm, rightArm, leftLeg, rightLeg, gunBarrel, gunBody);
    return group;
  }
}
