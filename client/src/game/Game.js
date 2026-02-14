// client/src/game/Game.js
import * as THREE from 'three';
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

    // Build the map
    this.map.build();

    // Initialize player
    this.player.init();

    // Spawn NPCs
    this.npcManager.spawnInitialNPCs();

    // Init mobile controls
    this.mobileControls.init();

    // Connect to server
    this.network.connect();

    // Start game loop
    this.loop();
  }

  pause() {
    // Don't stop the loop, just flag paused
  }

  loop() {
    if (!this.isRunning) return;
    requestAnimationFrame(() => this.loop());

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Update physics
    this.physics.update(delta);

    // Update mobile controls (before player update)
    this.mobileControls.update();

    // Update player
    this.player.update(delta);

    // Update weapons
    this.weapons.update(delta);

    // Update NPCs
    this.npcManager.update(delta, this.player.getPosition());

    // Update remote players
    this.updateRemotePlayers(delta);

    // Update minimap
    this.minimap.update(
      this.player.getPosition(),
      this.player.getRotationY(),
      this.getEntities()
    );

    // Update HUD
    this.hud.update({
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      ammo: this.weapons.currentAmmo,
      maxAmmo: this.weapons.maxAmmo,
      playerCount: this.remotePlayers.size + 1,
    });

    // Send position to server
    this.network.sendPosition(
      this.player.getPosition(),
      this.player.getRotationY()
    );

    // Render
    this.scene.render();
  }

  getEntities() {
    const entities = [];

    // Remote players
    for (const [id, rp] of this.remotePlayers) {
      entities.push({
        type: 'player',
        position: rp.mesh.position,
      });
    }

    // NPCs
    for (const npc of this.npcManager.npcs) {
      if (npc.alive) {
        entities.push({
          type: 'npc',
          position: npc.mesh.position,
        });
      }
    }

    return entities;
  }

  updateRemotePlayers(delta) {
    for (const [id, rp] of this.remotePlayers) {
      // Interpolate to target position
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
    mesh.position.set(data.x || 0, data.y || 2, data.z || 0);
    this.scene.add(mesh);

    this.remotePlayers.set(id, {
      mesh,
      targetPosition: null,
      targetRotationY: 0,
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
      rp.targetPosition = new THREE.Vector3(data.x, data.y, data.z);
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

    group.add(head, leftEye, rightEye, body, leftArm, rightArm, leftLeg, rightLeg);
    return group;
  }
}
