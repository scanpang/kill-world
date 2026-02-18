// client/src/game/Game.js
import * as THREE from 'three';
import { NPC as NPC_CONST, NPC_TYPES, BOSS_WEAPONS_NORMAL, BOSS_WEAPONS_RARE, BOSS_WEAPONS_LEGENDARY, WEAPONS, KILLSTREAK, ULTIMATE, AIRDROP, BONUS_ROUND } from '../../../shared/constants.js';
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
    this.npcManager.game = this;

    // Kill tracking
    this.killCount = 0;
    this.bossKillCount = 0;
    this.gameOver = false;

    // Wave tracking
    this.wave = 1;

    // Combo system
    this.comboCount = 0;
    this.comboTimer = 0;

    // Slow motion
    this.slowMotionTimer = 0;

    // Kill streak buffs
    this.killStreakBuffs = { infiniteAmmo: 0, speedBoost: 0, damageBoost: 0, godMode: 0 };

    // Multi-kill system
    this.multiKillCount = 0;
    this.multiKillTimer = 0;

    // Air drops
    this.airDrops = [];
    this.airDropKillTracker = 0;

    // Ultimate system
    this.ultimateCharge = 0;

    // Bonus round
    this.bonusRound = { active: false, timer: 0, kills: 0, coins: 0, zombies: [] };

    // Weapon kill stats (for death screen)
    this.weaponKills = {};

    // Connect NPC manager to player & HUD for special attacks
    this.npcManager.player = this.player;
    this.npcManager.hud = this.hud;

    // NPC attack → player damage
    window.__onNPCAttack = (damage) => {
      this.player.takeDamage(damage);
      if (this.player.isDead && !this.gameOver) {
        this.showDeathScreen();
      }
    };

    // Ultimate key handler
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyQ') this.activateUltimate();
    });

    // Mobile ultimate button
    const ultBtn = document.getElementById('btn-ult');
    if (ultBtn) {
      ultBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.activateUltimate();
      }, { passive: false });
    }

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
    this.mobileControls.init();
    this.network.connect();
    // NPCs will be spawned after HOST_ASSIGN event or after timeout (solo play fallback)
    this._npcSpawnTimeout = setTimeout(() => {
      if (this.npcManager.npcs.length === 0) {
        this.npcManager.spawnInitialNPCs();
      }
    }, 2000);
    this.loop();
  }

  syncGameState(state) {
    // Only overwrite if server value is higher (prevents race condition on fast kills)
    if (state.killCount >= this.killCount) {
      this.killCount = state.killCount;
      this.npcManager.totalKillCount = state.killCount;
    }
    if (state.bossKillCount >= this.bossKillCount) {
      this.bossKillCount = state.bossKillCount;
    }
    this.wave = state.wave;
    this.npcManager.zombieLevel = state.zombieLevel;
    if (state.bossAlive !== undefined) {
      this.npcManager.bossAlive = state.bossAlive;
    }
    this.hud.updateKillCount(this.killCount);
  }

  // ─── Co-op: Become host (first join or migration) ───
  onBecomeHost(roomState) {
    console.log('[Game] Becoming host');
    this.npcManager.isHost = true;
    this.npcManager.becomeHost();
    if (roomState) {
      this.syncGameState(roomState);
    }
    // Cancel pending NPC spawn timeout since becomeHost handles it
    if (this._npcSpawnTimeout) {
      clearTimeout(this._npcSpawnTimeout);
      this._npcSpawnTimeout = null;
    }
  }

  // ─── Co-op: Become guest ───
  onBecomeGuest() {
    console.log('[Game] Becoming guest');
    this.npcManager.isHost = false;
    // Cancel pending NPC spawn timeout - guests don't spawn NPCs
    if (this._npcSpawnTimeout) {
      clearTimeout(this._npcSpawnTimeout);
      this._npcSpawnTimeout = null;
    }
  }

  // ─── Co-op: Host receives NPC damage from guest ───
  onRemoteNPCDamage(data) {
    if (!this.network.isHost) return;
    const { npcId, damage, isHeadshot, fromId } = data;
    const npc = this.npcManager.npcs[npcId];
    if (!npc || !npc.alive) return;

    this.npcManager.damageNPC(npcId, damage);

    // If NPC died, process kill (rewards go to the guest who killed)
    if (npc.health <= 0) {
      // Host processes kill count and boss logic
      this.network.sendNPCKill(npc.isBoss);
      this.killCount++;
      this.npcManager.totalKillCount = this.killCount;
      this.hud.updateKillCount(this.killCount);
      this.hud.addKillFeedEntry('Ally', npc.typeName || 'Zombie');

      // Airdrop trigger
      this.airDropKillTracker++;
      if (this.airDropKillTracker >= AIRDROP.KILL_INTERVAL) {
        this.airDropKillTracker = 0;
        this.spawnAirDrop();
        this.network.sendAirdropSpawn({
          x: this.airDrops[this.airDrops.length - 1].mesh.position.x,
          z: this.airDrops[this.airDrops.length - 1].mesh.position.z,
        });
      }

      if (npc.isBoss) {
        this.bossKillCount++;
        this.wave = this.bossKillCount + 1;
        this.npcManager.levelUpZombies();
        this.hud.showZombieLevelUp(this.npcManager.zombieLevel);
        this.network.sendBossDeath({ bossKillCount: this.bossKillCount });
        this.hud.showBossAlert('BOSS DEFEATED!');
        this.hud.showScreenFlash(0x8800ff);
        this.spawnAirDrop();
      }

      // Boss spawn check
      if (this.killCount >= 25 && this.killCount % 25 === 0 && !this.npcManager.bossAlive) {
        this.npcManager.spawnBoss();
        this.hud.showBossAlert('BOSS ZOMBIE APPEARED!');
        this.hud.screenShake();
      }
    }
  }

  // ─── Co-op: Guest receives boss death from host ───
  onRemoteBossDeath(data) {
    this.bossKillCount = data.bossKillCount || this.bossKillCount + 1;
    this.wave = this.bossKillCount + 1;
    this.npcManager.bossAlive = false;
    this.npcManager.levelUpZombies();
    this.hud.showZombieLevelUp(this.npcManager.zombieLevel);
    this.hud.showBossAlert('BOSS DEFEATED!');
    this.hud.showScreenFlash(0x8800ff);
    // Guest gets assist rewards
    this.player.health = Math.min(this.player.health + Math.floor(this.player.maxHealth * 0.3), this.player.maxHealth);
    this.hud.shopAvailable = true;
  }

  // ─── Co-op: Guest receives airdrop spawn from host ───
  onRemoteAirdropSpawn(data) {
    this.spawnAirDropAt(data.x, data.z);
  }

  spawnAirDropAt(x, z) {
    const group = new THREE.Group();
    const boxGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 0.5,
      metalness: 0.4, roughness: 0.3,
    });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.y = 1.5;
    box.castShadow = true;
    const beaconGeo = new THREE.CylinderGeometry(0.05, 0.05, 8, 4);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00, transparent: true, opacity: 0.4,
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = 5;
    const ringGeo = new THREE.RingGeometry(1.5, 2, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00, transparent: true, opacity: 0.3, side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    group.add(box, beacon, ring);
    group.position.set(x, 0, z);
    group.userData.isEffect = true;
    group.traverse(c => { c.userData.isEffect = true; });
    this.scene.add(group);
    const drop = { mesh: group, box, life: AIRDROP.LIFETIME, collected: false };
    this.airDrops.push(drop);
    this.hud.showAirdropAlert();
  }

  onNPCKill(npcIndex) {
    const npc = this.npcManager.npcs[npcIndex];
    this.network.sendNPCKill(npc.isBoss);
    const isBonusZombie = npc._isBonusZombie;
    const coinMul = isBonusZombie ? BONUS_ROUND.COIN_MULTI : 1;
    const coinDrop = Math.floor((npc.coinDrop || NPC_CONST.COIN_DROP) * coinMul);
    this.player.addCoins(coinDrop);
    this.hud.showCoinPopup(coinDrop);

    // Track weapon kills
    const currentWeapon = this.weapons.currentWeaponId;
    this.weaponKills[currentWeapon] = (this.weaponKills[currentWeapon] || 0) + 1;

    // Combo system
    this.comboTimer = 5;
    this.comboCount++;
    this.hud.updateCombo(this.comboCount);

    if (this.comboCount === KILLSTREAK.INFINITE_AMMO.combo) {
      this.slowMotionTimer = 2.0;
      this.hud.showBossAlert('SLOW MOTION!');
      this.killStreakBuffs.infiniteAmmo = KILLSTREAK.INFINITE_AMMO.duration;
      this.hud.showBossAlert(KILLSTREAK.INFINITE_AMMO.label + '!');
    }
    if (this.comboCount === KILLSTREAK.SPEED_BOOST.combo) {
      this.killStreakBuffs.speedBoost = KILLSTREAK.SPEED_BOOST.duration;
      this.hud.showBossAlert(KILLSTREAK.SPEED_BOOST.label + '!');
    }
    if (this.comboCount === KILLSTREAK.DAMAGE_BOOST.combo) {
      this.killStreakBuffs.damageBoost = KILLSTREAK.DAMAGE_BOOST.duration;
      this.hud.showBossAlert(KILLSTREAK.DAMAGE_BOOST.label + '!');
    }
    if (this.comboCount === KILLSTREAK.GOD_MODE.combo) {
      this.killStreakBuffs.godMode = KILLSTREAK.GOD_MODE.duration;
      this.hud.showBossAlert(KILLSTREAK.GOD_MODE.label + '!');
      this.hud.showScreenFlash(0xffcc00);
    }

    // Multi-kill tracking (1.5s window)
    this.multiKillTimer = 1.5;
    this.multiKillCount++;
    if (this.multiKillCount >= 2) {
      this.hud.showMultiKill(this.multiKillCount);
    }

    // XP from kill
    const npcCfg = NPC_TYPES[npc.type] || NPC_TYPES.normal;
    let xpGain = npcCfg.xp || 1;
    if (isBonusZombie) xpGain *= BONUS_ROUND.XP_MULTI;

    // Combo XP bonus: 5+ kills = +10%
    if (this.comboCount >= 5) {
      xpGain = Math.ceil(xpGain * 1.1);
    }

    const prevLevel = this.player.level;
    const leveled = this.player.addXP(xpGain);

    if (leveled) {
      this.hud.showBossAlert(`LEVEL UP! Lv.${this.player.level} (DMG +${Math.round((this.player.damageMultiplier - 1) * 100)}%)`);

      // Special weapon full reload on level up
      for (let i = 0; i < this.weapons.slots.length; i++) {
        const wid = this.weapons.slots[i];
        if (wid && WEAPONS[wid] && WEAPONS[wid].unique) {
          this.weapons.slotAmmo[wid] = this.weapons.getEffectiveMaxAmmo(wid);
          if (this.weapons.currentWeaponId === wid) {
            this.weapons.currentAmmo = this.weapons.getEffectiveMaxAmmo(wid);
          }
        }
      }
    }

    this.killCount++;
    this.npcManager.totalKillCount = this.killCount;
    this.hud.updateKillCount(this.killCount);

    // Ultimate charge
    const tierCharge = { normal: ULTIMATE.CHARGE_NORMAL, rare: ULTIMATE.CHARGE_RARE, unique: ULTIMATE.CHARGE_UNIQUE, boss: ULTIMATE.CHARGE_BOSS };
    const chargeAmt = tierCharge[npcCfg.tier] || ULTIMATE.CHARGE_NORMAL;
    this.ultimateCharge = Math.min(100, this.ultimateCharge + chargeAmt);

    // Airdrop trigger (every N kills)
    this.airDropKillTracker++;
    if (this.airDropKillTracker >= AIRDROP.KILL_INTERVAL) {
      this.airDropKillTracker = 0;
      this.spawnAirDrop();
      // Notify guests about airdrop
      if (this.network.isHost && this.airDrops.length > 0) {
        const lastDrop = this.airDrops[this.airDrops.length - 1];
        this.network.sendAirdropSpawn({
          x: lastDrop.mesh.position.x,
          z: lastDrop.mesh.position.z,
        });
      }
    }

    // Bonus round trigger (every 50 kills)
    if (this.killCount > 0 && this.killCount % BONUS_ROUND.KILL_INTERVAL === 0 && !this.bonusRound.active) {
      this.startBonusRound();
    }

    // Bonus round kill tracking
    if (this.bonusRound.active && npc._isBonusZombie) {
      this.bonusRound.kills++;
      this.bonusRound.coins += coinDrop;
    }

    // Milestone alerts for new zombie tiers
    if (this.killCount === 100) {
      this.hud.showBossAlert('RARE ZOMBIES INCOMING!');
      this.hud.screenShake();
    } else if (this.killCount === 200) {
      this.hud.showBossAlert('UNIQUE ZOMBIES INCOMING!');
      this.hud.screenShake();
    }

    if (npc.isBoss) {
      this.bossKillCount++;
      this.wave = this.bossKillCount + 1;

      // 40% chance to drop special weapon (tier based on boss kill count)
      if (Math.random() < 0.4) {
        const pool = this.bossKillCount >= 7 ? BOSS_WEAPONS_LEGENDARY
                   : this.bossKillCount >= 4 ? BOSS_WEAPONS_RARE
                   : BOSS_WEAPONS_NORMAL;
        const dropId = pool[Math.floor(Math.random() * pool.length)];
        const existingId = this.weapons.slots[3];

        const equipWeapon = () => {
          this.weapons.slots[3] = dropId;
          this.weapons.slotAmmo[dropId] = this.weapons.getEffectiveMaxAmmo(dropId);
          this.weapons.switchSlot(3);
          this.hud.showWeaponDropEffect();
        };

        if (existingId && WEAPONS[existingId]) {
          // Show replacement confirmation dialog
          this.hud.showWeaponReplaceDialog(
            WEAPONS[existingId].name,
            WEAPONS[dropId].name,
            () => {
              equipWeapon();
              this.hud.showBossAlert(`${WEAPONS[dropId].name} ACQUIRED!`);
            },
            () => {
              this.hud.showBossAlert('BOSS DEFEATED!');
            }
          );
          this.hud.showBossAlert(`BOSS DEFEATED! ${WEAPONS[dropId].name} DROP!`);
        } else {
          equipWeapon();
          this.hud.showBossAlert(`BOSS DEFEATED! ${WEAPONS[dropId].name} ACQUIRED!`);
        }
      } else {
        this.hud.showBossAlert('BOSS DEFEATED!');
      }

      this.hud.addKillFeedEntry('You', 'BOSS');

      // Full HP recovery on boss kill
      this.player.health = this.player.maxHealth;

      // Boss death → all zombies level up
      this.npcManager.levelUpZombies();
      this.hud.showZombieLevelUp(this.npcManager.zombieLevel);

      // Notify guests about boss death (host only)
      if (this.network.isHost) {
        this.network.sendBossDeath({ bossKillCount: this.bossKillCount });
      }

      // Open shop (one-time after boss defeat)
      this.hud.shopAvailable = true;
      setTimeout(() => this.hud.toggleShop(), 1500);

      // Boss kill screen effect
      this.hud.showScreenFlash(0x8800ff);

      // Boss kill: airdrop bonus
      this.spawnAirDrop();

      // Notify guests about airdrop
      if (this.network.isHost && this.airDrops.length > 0) {
        const lastDrop = this.airDrops[this.airDrops.length - 1];
        this.network.sendAirdropSpawn({
          x: lastDrop.mesh.position.x,
          z: lastDrop.mesh.position.z,
        });
      }
    } else {
      this.hud.addKillFeedEntry('You', npc.typeName || 'Zombie');
    }

    // Boss spawn every 25 kills
    if (this.killCount >= 25 && this.killCount % 25 === 0 && !this.npcManager.bossAlive) {
      this.npcManager.spawnBoss();
      this.hud.showBossAlert('BOSS ZOMBIE APPEARED!');
      this.hud.screenShake();
    }
  }

  // Called from WeaponSystem on headshot hit
  onHeadshotXP() {
    this.player.addXP(1);
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
      document.getElementById('death-wave').textContent = this.wave;

      // Weapon usage stats
      const statsEl = document.getElementById('death-weapon-stats');
      if (statsEl) {
        statsEl.innerHTML = '';
        const sorted = Object.entries(this.weaponKills).sort((a, b) => b[1] - a[1]);
        for (const [wid, count] of sorted) {
          const wName = WEAPONS[wid] ? WEAPONS[wid].name : wid;
          const div = document.createElement('div');
          div.className = 'weapon-stat-row';
          div.textContent = `${wName}: ${count} kills`;
          statsEl.appendChild(div);
        }
      }

      overlay.classList.add('active');
    }

    const restartBtn = document.getElementById('death-restart');
    if (restartBtn) {
      restartBtn.onclick = () => location.reload();
    }
  }

  pause() {}

  loop() {
    if (!this.isRunning) return;
    requestAnimationFrame(() => this.loop());

    const realDelta = this.clock.getDelta();
    let delta = realDelta;

    // Check death during gameplay
    if (this.player.isDead && !this.gameOver) {
      this.showDeathScreen();
      return;
    }

    // Combo timer decay (real time)
    if (this.comboTimer > 0) {
      this.comboTimer -= realDelta;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
        this.hud.updateCombo(0);
      }
    }

    // Slow motion
    if (this.slowMotionTimer > 0) {
      this.slowMotionTimer -= realDelta;
      delta *= 0.3;
    }

    // Kill streak buff timers
    for (const key of Object.keys(this.killStreakBuffs)) {
      if (this.killStreakBuffs[key] > 0) {
        this.killStreakBuffs[key] -= realDelta;
        if (this.killStreakBuffs[key] <= 0) this.killStreakBuffs[key] = 0;
      }
    }
    this.player.speedBuffActive = this.killStreakBuffs.speedBoost > 0;
    this.player.godMode = this.killStreakBuffs.godMode > 0;

    // Player debuff timers
    if (this.player.poisonSlow > 0) this.player.poisonSlow -= realDelta;
    if (this.player.bansheeSlow > 0) this.player.bansheeSlow -= realDelta;

    // Multi-kill timer
    if (this.multiKillTimer > 0) {
      this.multiKillTimer -= realDelta;
      if (this.multiKillTimer <= 0) {
        this.multiKillCount = 0;
      }
    }

    // Bonus round timer
    if (this.bonusRound.active) {
      this.bonusRound.timer -= realDelta;
      this.hud.updateBonusRound(true, this.bonusRound.timer, this.bonusRound.kills, this.bonusRound.coins);
      if (this.bonusRound.timer <= 0) {
        this.endBonusRound();
      }
    }

    this.mobileControls.update();
    this.physics.update(delta);
    this.player.update(delta);
    this.weapons.update(delta);
    this.npcManager.update(delta, this.player.getPosition());
    this.npcManager.updateSpecialAttacks(delta, this.player.getPosition());
    this.updateRemotePlayers(delta);
    this.updateAirDrops(delta);
    this.map.updateBarrels(delta);

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
      wave: this.wave,
      bossKills: this.bossKillCount,
      totalKills: this.killCount,
      slots: this.weapons.slots,
    });

    this.hud.updateBuffs(this.killStreakBuffs);
    this.hud.updateUltimate(this.ultimateCharge);

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
    for (const drop of this.airDrops) {
      entities.push({ type: 'airdrop', position: drop.mesh.position });
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

  // ── Ultimate System ──
  activateUltimate() {
    if (this.ultimateCharge < 100 || this.gameOver) return;
    this.ultimateCharge = 0;

    // Screen flash
    this.hud.showScreenFlash(0xffcc00);
    this.hud.showBossAlert('NUCLEAR BLAST!');
    this.hud.screenShake();

    // Slow motion
    this.slowMotionTimer = ULTIMATE.SLOWMO_DURATION;

    // Damage all NPCs in radius
    const pos = this.player.getPosition();
    const isGuest = this.network && this.network.connected && !this.network.isHost;

    if (isGuest) {
      // Guest: send damage to host for each NPC in radius
      for (let i = 0; i < this.npcManager.npcs.length; i++) {
        const npc = this.npcManager.npcs[i];
        if (!npc.alive) continue;
        const dx = npc.mesh.position.x - pos.x;
        const dz = npc.mesh.position.z - pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist <= ULTIMATE.RADIUS) {
          const baseDmg = this.weapons.config ? this.weapons.config.damage : 50;
          const damage = Math.floor(baseDmg * ULTIMATE.DAMAGE_MULTI);
          this.network.sendNPCDamage({ npcId: i, damage, isHeadshot: false });
        }
      }
    } else {
      // Host/solo: apply damage locally
      const killList = [];
      for (let i = 0; i < this.npcManager.npcs.length; i++) {
        const npc = this.npcManager.npcs[i];
        if (!npc.alive) continue;
        const dx = npc.mesh.position.x - pos.x;
        const dz = npc.mesh.position.z - pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist <= ULTIMATE.RADIUS) {
          const baseDmg = this.weapons.config ? this.weapons.config.damage : 50;
          const damage = Math.floor(baseDmg * ULTIMATE.DAMAGE_MULTI);
          this.npcManager.damageNPC(i, damage);
          if (npc.health <= 0) killList.push(i);
        }
      }
      for (const idx of killList) {
        this.onNPCKill(idx);
      }
    }

    // Explosion visual at player position
    const center = new THREE.Vector3(pos.x, 1, pos.z);
    this.weapons.createExplosionEffect(center, ULTIMATE.RADIUS);
  }

  // ── AirDrop System ──
  spawnAirDrop() {
    const half = 80;
    const x = (Math.random() - 0.5) * half * 2;
    const z = (Math.random() - 0.5) * half * 2;

    const group = new THREE.Group();

    // Box body
    const boxGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0xffcc00, emissive: 0xffaa00, emissiveIntensity: 0.5,
      metalness: 0.4, roughness: 0.3,
    });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.y = 1.5;
    box.castShadow = true;

    // Glow beacon
    const beaconGeo = new THREE.CylinderGeometry(0.05, 0.05, 8, 4);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00, transparent: true, opacity: 0.4,
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = 5;

    // Base ring
    const ringGeo = new THREE.RingGeometry(1.5, 2, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00, transparent: true, opacity: 0.3, side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;

    group.add(box, beacon, ring);
    group.position.set(x, 0, z);
    group.userData.isEffect = true;
    group.traverse(c => { c.userData.isEffect = true; });
    this.scene.add(group);

    const drop = { mesh: group, box, life: AIRDROP.LIFETIME, collected: false };
    this.airDrops.push(drop);
    this.hud.showAirdropAlert();
  }

  updateAirDrops(delta) {
    const pos = this.player.getPosition();

    for (let i = this.airDrops.length - 1; i >= 0; i--) {
      const drop = this.airDrops[i];
      drop.life -= delta;

      // Float animation
      drop.box.position.y = 1.5 + Math.sin(performance.now() * 0.003) * 0.3;
      drop.box.rotation.y += delta * 0.8;

      // Check pickup
      const dx = drop.mesh.position.x - pos.x;
      const dz = drop.mesh.position.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < AIRDROP.PICKUP_RANGE && !drop.collected) {
        drop.collected = true;
        this.collectAirDrop(drop);
        this.scene.remove(drop.mesh);
        this.airDrops.splice(i, 1);
        continue;
      }

      // Expire
      if (drop.life <= 0) {
        this.scene.remove(drop.mesh);
        this.airDrops.splice(i, 1);
      }
    }
  }

  collectAirDrop(drop) {
    const rewards = [
      () => {
        this.player.health = Math.min(this.player.health + Math.floor(this.player.maxHealth * 0.5), this.player.maxHealth);
        this.hud.showBossAlert('HP +50%!');
      },
      () => {
        const coins = 100 + Math.floor(Math.random() * 200);
        this.player.addCoins(coins);
        this.hud.showCoinPopup(coins);
        this.hud.showBossAlert(`$${coins} COINS!`);
      },
      () => {
        // Full ammo refill
        for (const slot of this.weapons.slots) {
          if (slot && WEAPONS[slot]) {
            this.weapons.slotAmmo[slot] = this.weapons.getEffectiveMaxAmmo(slot);
          }
        }
        this.weapons.currentAmmo = this.weapons.getEffectiveMaxAmmo(this.weapons.currentWeaponId);
        this.hud.showBossAlert('FULL AMMO!');
      },
      () => {
        this.killStreakBuffs.damageBoost = 8;
        this.hud.showBossAlert('DAMAGE x3 (8s)!');
      },
      () => {
        this.killStreakBuffs.speedBoost = 8;
        this.hud.showBossAlert('SPEED x2 (8s)!');
      },
    ];
    rewards[Math.floor(Math.random() * rewards.length)]();
    this.hud.showScreenFlash(0x44ff88);
  }

  // ── Bonus Round System ──
  startBonusRound() {
    this.bonusRound.active = true;
    this.bonusRound.timer = BONUS_ROUND.DURATION;
    this.bonusRound.kills = 0;
    this.bonusRound.coins = 0;

    this.hud.showBossAlert('BONUS ROUND!');
    this.hud.showScreenFlash(0xffcc00);

    // Spawn bonus zombies
    for (let i = 0; i < BONUS_ROUND.SPAWN_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 30;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const npc = this.npcManager.spawnNPC(x, z, 'normal');
      npc._isBonusZombie = true;
      npc.health = Math.floor(npc.health * 0.5);
      npc.maxHealth = npc.health;
      this.bonusRound.zombies.push(npc);
    }
  }

  endBonusRound() {
    this.bonusRound.active = false;
    this.hud.updateBonusRound(false, 0, 0, 0);
    this.hud.showBonusRoundEnd(this.bonusRound.kills, this.bonusRound.coins);

    // Remove remaining bonus zombies
    for (const npc of this.bonusRound.zombies) {
      if (npc.alive) {
        npc.alive = false;
        this.scene.remove(npc.mesh);
      }
    }
    this.bonusRound.zombies = [];
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
      case 'RocketLauncher': {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6), mat(0x3a3a2a));
        tube.rotation.x = Math.PI / 2;
        tube.position.set(0.95, 2.0, -0.4);
        parts.push(tube);
        break;
      }
      // Rare weapons (blue tint)
      case 'BasicGunRare': {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), mat(0x335577));
        b.position.set(0.95, 2.0, -0.4); parts.push(b); break;
      }
      case 'MinigunRare': {
        for (let i = 0; i < 3; i++) {
          const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 4), mat(0x2a4466));
          b.rotation.x = Math.PI / 2;
          const a = (i / 3) * Math.PI * 2;
          b.position.set(0.95 + Math.cos(a) * 0.06, 2.0 + Math.sin(a) * 0.06, -0.35);
          parts.push(b);
        } break;
      }
      case 'ShotgunRare': {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.7), mat(0x2a4466));
        b.position.set(0.95, 2.0, -0.4); parts.push(b); break;
      }
      case 'RevolverRare': case 'GlockRare': {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), mat(0x446688));
        b.position.set(0.95, 2.0, -0.3); parts.push(b); break;
      }
      case 'KnifeRare': {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.5), mat(0x6688bb));
        b.position.set(0.95, 2.0, -0.35); parts.push(b); break;
      }
      case 'AxeRare': {
        const h = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.5), mat(0x3a5a8e));
        h.position.set(0.95, 2.0, -0.35);
        const hd = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.1), mat(0x4466aa));
        hd.position.set(0.95, 2.0, -0.55);
        parts.push(h, hd); break;
      }
      case 'RailgunRare': {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.7), mat(0x3366aa));
        b.position.set(0.95, 2.0, -0.45); parts.push(b); break;
      }
      case 'PlasmaMK2': {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), mat(0x5500aa));
        b.position.set(0.95, 2.0, -0.4); parts.push(b); break;
      }
      case 'RocketRare': {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6), mat(0x4a5a3a));
        t.rotation.x = Math.PI / 2; t.position.set(0.95, 2.0, -0.4);
        parts.push(t); break;
      }
      // Legendary weapons (gold/orange tint)
      case 'GoldAssault': {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), mat(0xcc9933));
        b.position.set(0.95, 2.0, -0.4); parts.push(b); break;
      }
      case 'HellMinigun': {
        for (let i = 0; i < 3; i++) {
          const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 4), mat(0x882200));
          b.rotation.x = Math.PI / 2;
          const a = (i / 3) * Math.PI * 2;
          b.position.set(0.95 + Math.cos(a) * 0.06, 2.0 + Math.sin(a) * 0.06, -0.35);
          parts.push(b);
        } break;
      }
      case 'DoomShotgun': {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.7), mat(0xcc5500));
        b.position.set(0.95, 2.0, -0.4); parts.push(b); break;
      }
      case 'DesertKing': case 'BlazeGlock': {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), mat(0xcc9933));
        b.position.set(0.95, 2.0, -0.3); parts.push(b); break;
      }
      case 'BloodBlade': {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.5), mat(0xcc2222));
        b.position.set(0.95, 2.0, -0.35); parts.push(b); break;
      }
      case 'WorldBreaker': {
        const h = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.5), mat(0x886622));
        h.position.set(0.95, 2.0, -0.35);
        const hd = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.12), mat(0xddaa44));
        hd.position.set(0.95, 2.0, -0.55);
        parts.push(h, hd); break;
      }
      case 'ZeusRailgun': {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.7), mat(0xddaa44));
        b.position.set(0.95, 2.0, -0.45); parts.push(b); break;
      }
      case 'PlasmaOverload': {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), mat(0x8800cc));
        b.position.set(0.95, 2.0, -0.4); parts.push(b); break;
      }
      case 'DoomBringer': {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.65, 6), mat(0x882200));
        t.rotation.x = Math.PI / 2; t.position.set(0.95, 2.0, -0.4);
        parts.push(t); break;
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
