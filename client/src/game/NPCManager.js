// client/src/game/NPCManager.js
import * as THREE from 'three';
import { NPC, NPC_TYPES, GAME, SAFE_ZONE, WEAKNESS_DAMAGE_MULTIPLIER } from '../../../shared/constants.js';

export class NPCManager {
  constructor(sceneManager, physics) {
    this.scene = sceneManager;
    this.physics = physics;
    this.npcs = [];
    this.map = null;
    this.sound = null;
    this.bossAlive = false;
    this.bossKillCount = 0;
    this.totalKillCount = 0;
    this.zombieLevel = 1;
    this.lastGrowlTime = 0;
  }

  spawnInitialNPCs() {
    const spawnPoints = [
      { x: -30, z: -30 }, { x: 30, z: -30 },
      { x: -30, z: 30 },  { x: 30, z: 30 },
      { x: 0, z: -40 },   { x: -40, z: 0 },
      { x: 40, z: 0 },    { x: 0, z: 40 },
      { x: -55, z: -20 }, { x: 55, z: 20 },
    ];

    for (const sp of spawnPoints) {
      this.spawnNPC(sp.x, sp.z, this.randomType());
    }
  }

  randomType() {
    const r = Math.random();
    const kills = this.totalKillCount;

    if (kills >= 200) {
      // Unique tier unlocked
      if (r < 0.07) return 'banshee';
      if (r < 0.13) return 'juggernaut';
      if (r < 0.20) return 'reaper';
      if (r < 0.27) return 'spitter';
      if (r < 0.35) return 'stalker';
      if (r < 0.43) return 'brute';
      if (r < 0.49) return 'tank';
      if (r < 0.57) return 'shield';
      if (r < 0.70) return 'fast';
      return 'normal';
    } else if (kills >= 100) {
      // Rare tier unlocked
      if (r < 0.08) return 'spitter';
      if (r < 0.16) return 'stalker';
      if (r < 0.24) return 'brute';
      if (r < 0.32) return 'tank';
      if (r < 0.42) return 'shield';
      if (r < 0.60) return 'fast';
      return 'normal';
    } else {
      // Normal only
      if (r < 0.10) return 'tank';
      if (r < 0.22) return 'shield';
      if (r < 0.45) return 'fast';
      return 'normal';
    }
  }

  spawnNPC(x, z, type = 'normal') {
    const cfg = NPC_TYPES[type];
    const lvl = this.zombieLevel;

    let health, speed, damage;

    if (type === 'boss') {
      // Boss HP scales ×1.4 per boss kill
      health = Math.floor(cfg.health * Math.pow(1.4, this.bossKillCount));
      // Boss ATK/Speed scale with zombie level
      const atkMul = 1 + (lvl - 1) * 0.08;
      const spdMul = 1 + (lvl - 1) * 0.03;
      damage = Math.floor(cfg.dmg * atkMul);
      speed = cfg.speed * spdMul;
    } else {
      // Regular zombies: ATK +8%, HP +10%, Speed +3% per level
      const atkMul = 1 + (lvl - 1) * 0.08;
      const hpMul = 1 + (lvl - 1) * 0.10;
      const spdMul = 1 + (lvl - 1) * 0.03;
      health = Math.floor(cfg.health * hpMul);
      damage = Math.floor(cfg.dmg * atkMul);
      speed = cfg.speed * spdMul;
    }

    const npc = {
      mesh: this.createNPCMesh(cfg, lvl),
      alive: true,
      health: health,
      maxHealth: health,
      speed: speed,
      coinDrop: Math.floor(cfg.coinDrop * (1 + (lvl - 1) * 0.1)),
      damage: damage,
      typeName: cfg.name,
      type: type,
      tier: cfg.tier || 'normal',
      weakness: cfg.weakness || null,
      level: lvl,
      isBoss: type === 'boss',
      spawnPos: { x, z },
      patrolTarget: null,
      state: 'patrol',
      stateTimer: 0,
      attackCooldown: 0,
      aggroTimer: 0,
    };

    npc.mesh.position.set(x, 0, z);
    this.scene.add(npc.mesh);
    this.npcs.push(npc);
    return npc;
  }

  spawnBoss() {
    if (this.bossAlive) return;
    this.bossAlive = true;
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * 40;
    const z = Math.sin(angle) * 40;
    this.spawnNPC(x, z, 'boss');
  }

  // Called when boss dies - level up all zombies
  levelUpZombies() {
    this.zombieLevel++;
    for (const npc of this.npcs) {
      if (!npc.alive || npc.isBoss) continue;
      const cfg = NPC_TYPES[npc.type];
      const lvl = this.zombieLevel;
      const atkMul = 1 + (lvl - 1) * 0.08;
      const hpMul = 1 + (lvl - 1) * 0.10;
      const spdMul = 1 + (lvl - 1) * 0.03;

      npc.level = lvl;
      npc.maxHealth = Math.floor(cfg.health * hpMul);
      npc.health = npc.maxHealth;
      npc.speed = cfg.speed * spdMul;
      npc.damage = Math.floor(cfg.dmg * atkMul);
      npc.coinDrop = Math.floor(cfg.coinDrop * (1 + (lvl - 1) * 0.1));

      this.updateLevelLabel(npc);
    }
  }

  createLevelLabel(level, isBoss, tier = 'normal') {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 128, 48);

    let bgColor, borderColor, textColor;
    if (isBoss) {
      bgColor = 'rgba(128,0,255,0.7)';
      borderColor = '#ff00ff';
      textColor = '#ffcc00';
    } else if (tier === 'unique') {
      bgColor = 'rgba(80,0,120,0.7)';
      borderColor = '#ff44ff';
      textColor = '#ff88ff';
    } else if (tier === 'rare') {
      bgColor = 'rgba(120,80,0,0.7)';
      borderColor = '#ffaa00';
      textColor = '#ffcc44';
    } else {
      bgColor = 'rgba(0,0,0,0.6)';
      borderColor = 'rgba(255,255,255,0.3)';
      textColor = '#fff';
    }

    ctx.fillStyle = bgColor;
    const w = 100, h = 32, x = 14, y = 8;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Lv.${level}`, 64, 24);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2, 0.75, 1);
    sprite.name = 'levelLabel';
    return sprite;
  }

  updateLevelLabel(npc) {
    const old = npc.mesh.getObjectByName('levelLabel');
    if (old) {
      old.material.map.dispose();
      old.material.dispose();
      npc.mesh.remove(old);
    }
    const cfg = NPC_TYPES[npc.type] || NPC_TYPES.normal;
    const label = this.createLevelLabel(npc.level, npc.isBoss, npc.tier);
    label.position.set(0, (3.8 + 1.2) * cfg.scale, 0);
    npc.mesh.add(label);
  }

  createNPCMesh(cfg, level) {
    const group = new THREE.Group();
    const s = cfg.scale;
    const tier = cfg.tier || 'normal';
    const mat = (color) => new THREE.MeshStandardMaterial({ color });

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(1.0 * s, 1.0 * s, 1.0 * s),
      mat(0xcc9966)
    );
    head.position.y = 3.2 * s;
    head.castShadow = true;

    // Eye color per type
    const eyeColors = {
      boss: 0xff00ff, brute: 0xff4400, stalker: 0xaaff00, spitter: 0x00ff44,
      reaper: 0xff88ff, juggernaut: 0xff6600, banshee: 0x00ffff,
    };
    const eyeColor = eyeColors[this._cfgToType(cfg)] || 0xff0000;
    const eyeMat = new THREE.MeshStandardMaterial({
      color: eyeColor, emissive: eyeColor, emissiveIntensity: 0.8,
    });
    const eyeGeo = new THREE.BoxGeometry(0.18 * s, 0.12 * s, 0.05);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.22 * s, 3.3 * s, 0.51 * s);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.22 * s, 3.3 * s, 0.51 * s);

    // Banshee: transparent body
    const isBanshee = cfg === NPC_TYPES.banshee;
    const bodyMat = isBanshee
      ? new THREE.MeshStandardMaterial({ color: cfg.bodyColor, transparent: true, opacity: 0.4 })
      : mat(cfg.bodyColor);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.2 * s, 1.4 * s, 0.7 * s),
      bodyMat
    );
    body.position.y = 2.0 * s;
    body.castShadow = true;

    const armGeo = new THREE.BoxGeometry(0.4 * s, 1.2 * s, 0.4 * s);
    const armMaterial = isBanshee
      ? new THREE.MeshStandardMaterial({ color: cfg.bodyColor, transparent: true, opacity: 0.4 })
      : mat(cfg.bodyColor);
    const leftArm = new THREE.Mesh(armGeo, armMaterial);
    leftArm.position.set(-0.8 * s, 2.0 * s, 0);
    const rightArm = new THREE.Mesh(armGeo, armMaterial);
    rightArm.position.set(0.8 * s, 2.0 * s, 0);

    const legGeo = new THREE.BoxGeometry(0.5 * s, 1.2 * s, 0.5 * s);
    const legMat = isBanshee
      ? new THREE.MeshStandardMaterial({ color: 0x333333, transparent: true, opacity: 0.4 })
      : mat(0x333333);
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.3 * s, 0.6 * s, 0);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.3 * s, 0.6 * s, 0);

    // HP bar color by tier
    const isBoss = cfg === NPC_TYPES.boss;
    const hpW = isBoss ? 2.0 * s : 1.5 * s;
    const hpH = isBoss ? 0.25 : 0.2;
    const hpY = (3.8 + 0.8) * s;
    const hpBg = new THREE.Mesh(
      new THREE.BoxGeometry(hpW, hpH, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.85 })
    );
    hpBg.position.set(0, hpY, 0);

    let hpColor;
    if (isBoss) {
      hpColor = 0xff00ff;
    } else if (tier === 'unique') {
      const uniqueHpColors = { reaper: 0xcc44ff, juggernaut: 0x8888cc, banshee: 0x44ccff };
      hpColor = uniqueHpColors[this._cfgToType(cfg)] || 0xcc44ff;
    } else if (tier === 'rare') {
      hpColor = 0xffaa00;
    } else {
      hpColor = 0x00e676;
    }

    const hpFillMat = new THREE.MeshStandardMaterial({
      color: hpColor, emissive: hpColor, emissiveIntensity: 0.4,
    });
    const hpFill = new THREE.Mesh(
      new THREE.BoxGeometry((hpW - 0.04), hpH - 0.04, 0.06),
      hpFillMat
    );
    hpFill.position.set(0, hpY, 0.01);
    hpFill.name = 'hpFill';

    group.add(head, leftEye, rightEye, body, leftArm, rightArm, leftLeg, rightLeg, hpBg, hpFill);

    // Boss horns
    if (isBoss) {
      const hornMat = mat(0xffcc00);
      const hornGeo = new THREE.ConeGeometry(0.2 * s, 0.8 * s, 4);
      const lHorn = new THREE.Mesh(hornGeo, hornMat);
      lHorn.position.set(-0.35 * s, 4.0 * s, 0);
      lHorn.rotation.z = 0.3;
      const rHorn = new THREE.Mesh(hornGeo, hornMat);
      rHorn.position.set(0.35 * s, 4.0 * s, 0);
      rHorn.rotation.z = -0.3;
      group.add(lHorn, rHorn);
    }

    // Tank shield (visual only)
    if (cfg === NPC_TYPES.tank) {
      const shieldGeo = new THREE.BoxGeometry(1.4 * s, 1.6 * s, 0.15 * s);
      const shieldMat = new THREE.MeshStandardMaterial({
        color: 0x4444aa, transparent: true, opacity: 0.4,
      });
      const shield = new THREE.Mesh(shieldGeo, shieldMat);
      shield.position.set(0, 2.0 * s, 0.5 * s);
      group.add(shield);
    }

    // Shield zombie - front shield
    if (cfg === NPC_TYPES.shield) {
      const shieldGeo = new THREE.BoxGeometry(1.4 * s, 2.2 * s, 0.12 * s);
      const shieldMat = new THREE.MeshStandardMaterial({
        color: 0x44aa44, transparent: true, opacity: 0.5,
      });
      const shield = new THREE.Mesh(shieldGeo, shieldMat);
      shield.position.set(0, 1.8 * s, 0.55 * s);
      group.add(shield);

      const borderGeo = new THREE.BoxGeometry(1.5 * s, 2.3 * s, 0.04 * s);
      const borderMat = new THREE.MeshStandardMaterial({
        color: 0x66ff66, emissive: 0x66ff66, emissiveIntensity: 0.3,
        transparent: true, opacity: 0.3,
      });
      const border = new THREE.Mesh(borderGeo, borderMat);
      border.position.set(0, 1.8 * s, 0.6 * s);
      group.add(border);
    }

    // Brute: shoulder armor pads
    if (cfg === NPC_TYPES.brute) {
      const padMat = mat(0x880000);
      const padGeo = new THREE.BoxGeometry(0.6 * s, 0.3 * s, 0.5 * s);
      const lPad = new THREE.Mesh(padGeo, padMat);
      lPad.position.set(-0.8 * s, 2.8 * s, 0);
      const rPad = new THREE.Mesh(padGeo, padMat);
      rPad.position.set(0.8 * s, 2.8 * s, 0);
      group.add(lPad, rPad);
    }

    // Stalker: long claws on hands
    if (cfg === NPC_TYPES.stalker) {
      const clawMat = mat(0xccaa00);
      const clawGeo = new THREE.BoxGeometry(0.08 * s, 0.08 * s, 0.5 * s);
      for (let side = -1; side <= 1; side += 2) {
        for (let i = -1; i <= 1; i++) {
          const claw = new THREE.Mesh(clawGeo, clawMat);
          claw.position.set(side * 0.8 * s, 1.3 * s, -(0.3 + i * 0.1) * s);
          claw.rotation.x = -0.3;
          group.add(claw);
        }
      }
    }

    // Spitter: bloated belly
    if (cfg === NPC_TYPES.spitter) {
      const bellyMat = new THREE.MeshStandardMaterial({
        color: 0x44aa44, emissive: 0x00ff22, emissiveIntensity: 0.3,
      });
      const belly = new THREE.Mesh(
        new THREE.SphereGeometry(0.5 * s, 8, 8),
        bellyMat
      );
      belly.position.set(0, 1.6 * s, 0.35 * s);
      group.add(belly);
    }

    // Reaper: scythe
    if (cfg === NPC_TYPES.reaper) {
      const handleMat = mat(0x222222);
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.08 * s, 2.5 * s, 0.08 * s),
        handleMat
      );
      handle.position.set(1.0 * s, 2.5 * s, 0);
      group.add(handle);

      const bladeMat = new THREE.MeshStandardMaterial({
        color: 0x8800aa, emissive: 0x8800aa, emissiveIntensity: 0.5,
      });
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.8 * s, 0.06 * s, 0.3 * s),
        bladeMat
      );
      blade.position.set(0.6 * s, 3.8 * s, -0.1 * s);
      group.add(blade);
    }

    // Juggernaut: armor plates
    if (cfg === NPC_TYPES.juggernaut) {
      const armorMat = new THREE.MeshStandardMaterial({
        color: 0x556677, metalness: 0.7, roughness: 0.3,
      });
      // Chest plate
      const chest = new THREE.Mesh(
        new THREE.BoxGeometry(1.3 * s, 1.5 * s, 0.15 * s),
        armorMat
      );
      chest.position.set(0, 2.0 * s, 0.4 * s);
      group.add(chest);

      // Shoulder plates
      const shPadGeo = new THREE.BoxGeometry(0.7 * s, 0.4 * s, 0.6 * s);
      const lSh = new THREE.Mesh(shPadGeo, armorMat);
      lSh.position.set(-0.9 * s, 2.8 * s, 0);
      const rSh = new THREE.Mesh(shPadGeo, armorMat);
      rSh.position.set(0.9 * s, 2.8 * s, 0);
      group.add(lSh, rSh);
    }

    // Banshee: ghostly glow aura
    if (isBanshee) {
      const auraMat = new THREE.MeshStandardMaterial({
        color: 0x44ccff, emissive: 0x44ccff, emissiveIntensity: 0.6,
        transparent: true, opacity: 0.15,
      });
      const aura = new THREE.Mesh(
        new THREE.SphereGeometry(1.5 * s, 12, 12),
        auraMat
      );
      aura.position.set(0, 2.0 * s, 0);
      group.add(aura);
    }

    // Weakness icon for rare/unique
    if (cfg.weakness) {
      const icon = this.createWeaknessIcon(cfg.weakness);
      icon.position.set(0, (3.8 + 1.8) * s, 0);
      group.add(icon);
    }

    const label = this.createLevelLabel(level, isBoss, tier);
    label.position.set(0, (3.8 + 1.2) * s, 0);
    group.add(label);

    group.userData.leftArm = leftArm;
    group.userData.rightArm = rightArm;
    group.userData.leftLeg = leftLeg;
    group.userData.rightLeg = rightLeg;
    group.userData.hpBarWidth = (hpW - 0.04);
    group.userData.isBoss = isBoss;
    group.userData.tier = tier;
    group.userData.isNPC = true;
    group.traverse(c => { c.userData.isNPC = true; });

    return group;
  }

  _cfgToType(cfg) {
    for (const [key, val] of Object.entries(NPC_TYPES)) {
      if (val === cfg) return key;
    }
    return 'normal';
  }

  createWeaknessIcon(weakness) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 64, 64);

    // Background circle
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = weakness === 'melee' ? '#ff6644' : '#44aaff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (weakness === 'melee') {
      // Knife icon (unicode dagger)
      ctx.fillText('\u2694', 32, 32);
    } else {
      // Pistol icon (unicode)
      ctx.fillText('\uD83D\uDD2B', 32, 32);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.0, 1.0, 1);
    sprite.name = 'weaknessIcon';
    return sprite;
  }

  update(delta, playerPos) {
    const px = playerPos.x, pz = playerPos.z;

    for (const npc of this.npcs) {
      if (!npc.alive) continue;

      const npcPos = npc.mesh.position;
      const ddx = npcPos.x - px, ddz = npcPos.z - pz;
      const distToPlayer = Math.sqrt(ddx * ddx + ddz * ddz);

      const detectRange = npc.isBoss ? 60 : NPC.DETECT_RANGE;
      const attackRange = npc.isBoss ? 4 : NPC.ATTACK_RANGE;

      if (npc.aggroTimer > 0) npc.aggroTimer -= delta;

      if (distToPlayer < attackRange) {
        npc.state = 'attack';
      } else if (distToPlayer < detectRange || npc.aggroTimer > 0) {
        npc.state = 'chase';
      } else {
        npc.state = 'patrol';
      }

      switch (npc.state) {
        case 'patrol': this.updatePatrol(npc, delta); break;
        case 'chase':  this.updateChase(npc, delta, playerPos); break;
        case 'attack': this.updateAttack(npc, delta, playerPos); break;
      }

      if (this.sound && distToPlayer < 20 && npc.state !== 'patrol') {
        const now = performance.now();
        if (now - this.lastGrowlTime > 3000) {
          this.lastGrowlTime = now;
          this.sound.playZombieGrowl();
        }
      }

      this.animateWalk(npc, delta);

      const hpFill = npc.hpFill || (npc.hpFill = npc.mesh.getObjectByName('hpFill'));
      if (hpFill) {
        const scale = npc.health / npc.maxHealth;
        hpFill.scale.x = Math.max(0, scale);
        const barW = npc.mesh.userData.hpBarWidth || 1.46;
        hpFill.position.x = -(barW * (1 - scale)) / 2;

        // Dynamic color based on HP% (skip for boss, rare, unique)
        if (!npc.mesh.userData.isBoss && npc.mesh.userData.tier === 'normal') {
          const pct = scale * 100;
          let color;
          if (pct > 50) color = 0x00e676;       // green
          else if (pct > 25) color = 0xffca28;   // yellow
          else color = 0xff3d00;                  // red
          hpFill.material.color.setHex(color);
          hpFill.material.emissive.setHex(color);
        }
      }
    }
  }

  updatePatrol(npc, delta) {
    npc.stateTimer -= delta;
    if (!npc.patrolTarget || npc.stateTimer <= 0) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * NPC.PATROL_RADIUS;
      npc.patrolTarget = new THREE.Vector3(
        npc.spawnPos.x + Math.cos(angle) * dist, 0,
        npc.spawnPos.z + Math.sin(angle) * dist
      );
      npc.stateTimer = 3 + Math.random() * 4;
    }
    this.moveToward(npc, npc.patrolTarget, npc.speed * 0.5, delta);
  }

  updateChase(npc, delta, playerPos) {
    const target = new THREE.Vector3(playerPos.x, 0, playerPos.z);
    this.moveToward(npc, target, npc.speed, delta);
  }

  updateAttack(npc, delta, playerPos) {
    const target = new THREE.Vector3(playerPos.x, 0, playerPos.z);
    this.lookAt(npc, target);
    npc.attackCooldown -= delta;
    if (npc.attackCooldown <= 0) {
      npc.attackCooldown = npc.isBoss ? 0.8 : 1.5;
      if (typeof window.__onNPCAttack === 'function') {
        window.__onNPCAttack(npc.damage);
      }
    }
  }

  moveToward(npc, target, speed, delta) {
    const dir = new THREE.Vector3().subVectors(target, npc.mesh.position).setY(0);
    if (dir.length() < 1) return;
    dir.normalize();

    let nx = npc.mesh.position.x + dir.x * speed * delta;
    let nz = npc.mesh.position.z + dir.z * speed * delta;

    // Prevent zombies from entering safe zone
    const sdx = nx - SAFE_ZONE.X;
    const sdz = nz - SAFE_ZONE.Z;
    const safeDist = Math.sqrt(sdx * sdx + sdz * sdz);
    const safeR = SAFE_ZONE.RADIUS + 1;
    if (safeDist < safeR) {
      const pushAngle = Math.atan2(sdx, sdz);
      nx = SAFE_ZONE.X + Math.sin(pushAngle) * safeR;
      nz = SAFE_ZONE.Z + Math.cos(pushAngle) * safeR;
    }

    if (this.map) {
      const r = npc.isBoss ? 2.0 : 0.8;
      const resolved = this.map.resolveCollision(nx, nz, r);
      nx = resolved.x;
      nz = resolved.z;
    }

    const half = GAME.MAP_SIZE / 2 - 3;
    nx = Math.max(-half, Math.min(half, nx));
    nz = Math.max(-half, Math.min(half, nz));

    npc.mesh.position.x = nx;
    npc.mesh.position.z = nz;
    this.lookAt(npc, target);
  }

  lookAt(npc, target) {
    const dir = new THREE.Vector3().subVectors(target, npc.mesh.position).setY(0);
    if (dir.length() > 0.1) {
      npc.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    }
  }

  animateWalk(npc, delta) {
    const { leftArm, rightArm, leftLeg, rightLeg } = npc.mesh.userData;
    if (!leftArm) return;
    const isMoving = npc.state === 'patrol' || npc.state === 'chase';
    const animSpeed = npc.state === 'chase' ? 8 : 4;
    if (isMoving) {
      const t = performance.now() * 0.001 * animSpeed;
      leftArm.rotation.x = Math.sin(t) * 0.5;
      rightArm.rotation.x = -Math.sin(t) * 0.5;
      leftLeg.rotation.x = -Math.sin(t) * 0.5;
      rightLeg.rotation.x = Math.sin(t) * 0.5;
    } else {
      leftArm.rotation.x = rightArm.rotation.x = leftLeg.rotation.x = rightLeg.rotation.x = 0;
    }
  }

  damageNPC(npcIndex, damage) {
    const npc = this.npcs[npcIndex];
    if (!npc || !npc.alive) return;

    npc.health -= damage;
    if (this.sound) this.sound.playZombieHit();
    npc.aggroTimer = 8;

    for (const other of this.npcs) {
      if (other === npc || !other.alive || other.aggroTimer > 0) continue;
      const dist = other.mesh.position.distanceTo(npc.mesh.position);
      if (dist < 15) other.aggroTimer = 5;
    }

    if (npc.health <= 0) {
      npc.alive = false;
      this.totalKillCount++;
      if (this.sound) this.sound.playZombieDeath();
      this.scene.remove(npc.mesh);

      if (npc.isBoss) {
        this.bossAlive = false;
        this.bossKillCount++;
        return;
      }

      setTimeout(() => {
        const newType = this.randomType();
        const cfg = NPC_TYPES[newType];
        const lvl = this.zombieLevel;
        const atkMul = 1 + (lvl - 1) * 0.08;
        const hpMul = 1 + (lvl - 1) * 0.10;
        const spdMul = 1 + (lvl - 1) * 0.03;

        npc.type = newType;
        npc.typeName = cfg.name;
        npc.tier = cfg.tier || 'normal';
        npc.weakness = cfg.weakness || null;
        npc.level = lvl;
        npc.health = Math.floor(cfg.health * hpMul);
        npc.maxHealth = npc.health;
        npc.speed = cfg.speed * spdMul;
        npc.coinDrop = Math.floor(cfg.coinDrop * (1 + (lvl - 1) * 0.1));
        npc.damage = Math.floor(cfg.dmg * atkMul);
        npc.isBoss = false;
        npc.alive = true;
        npc.state = 'patrol';
        npc.aggroTimer = 0;

        npc.mesh.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        });
        npc.mesh = this.createNPCMesh(cfg, lvl);
        npc.hpFill = null;
        npc.mesh.position.set(npc.spawnPos.x, 0, npc.spawnPos.z);
        this.scene.add(npc.mesh);
      }, NPC.RESPAWN_TIME * 1000);
    }
  }
}
