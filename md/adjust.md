# 🧟 Zombie Wave Shooter – Game System Design (Balanced Version)

## 1. Wave & Boss System

- Boss appears every 50 zombie kills
- All zombies display Attack / HP / Speed in UI

### Basic Zombies

- Normal Zombie (ATK 1 / HP 50 / SPD 70)
- Fast Zombie (ATK 2 / HP 70 / SPD 90)
- Tank Zombie (ATK 2 / HP 150 / SPD 80)
- Shield Zombie (ATK 2 / HP 220 / SPD 65)
  - Takes 50% reduced damage from front
  - Full damage from sides/back

### Boss Zombie

- ATK 8 / HP 3000 / SPD 95
- Boss entrance visual effect
- 30% chance to drop special weapon

---

### Difficulty Scaling (After Boss Kill)

When boss is defeated:

- All zombies level +1
- ATK +8%
- HP +10%
- Speed +3% (Do NOT increase speed by 10%)

Boss HP scaling:
- Each level increases boss HP ×1.4
  - 3000 → 4200 → 5880 → ...

---

## 2. Player XP & Growth System

### XP Rewards

- Normal Zombie = 1 XP
- Fast Zombie = 2 XP
- Tank Zombie = 2 XP
- Shield Zombie = 3 XP
- Boss Zombie = 15 XP

---

### Level Up XP Requirement

Formula:

XP Required = 100 × (1.6^(Level-1))

Examples:

- Lv2 → 100
- Lv3 → 160
- Lv4 → 256
- Lv5 → 410
- Lv6 → 655
- Lv7 → 1048

---

### Level Up Rewards

- Weapon Damage +10%
- Max HP +5
- Movement Speed +2

Base Player HP = 100

---

## 3. Weapon System

Stat format: Damage / Attacks per Second / Magazine Size

### 1. Starter Weapons

- Basic Gun (10 / 5 / 40)
- Minigun (8 / 8 / 60)
- Shotgun (50 / 1.2 / 10)

### 2. Pistols

- Revolver (35 / 2 / 8)
- Glock (15 / 4 / 15)

### 3. Melee

- Knife (30 / 2.5 / Infinite)
- Axe (90 / 0.8 / Infinite)

### 4. Special Weapons (Boss Drop Only)

- Railgun (25 / 3 / 60)
- Plasma Gun (18 / 6 / 80)

Special Weapon Rules:

- Cannot reload
- Fully recharged upon player level-up
- 30% drop chance from boss

---

## 4. Shop System

Shop opens once after each boss defeat.

Available items:

- All non-starter weapons
- Heal Pack (Restore 30% Max HP)
- Max HP +20 upgrade
- Magazine Capacity +20%
- Movement Speed +5%
- Critical Chance +5%

Special weapons are NOT sold in shop.

---

## 5. Game Loop

On Player Death:

- Display total accumulated XP
- Display highest wave reached
- Display total kills
- Display weapon usage statistics

Restart button resets run completely.

Boss Kill Bonus:

- Full HP recovery
- Screen effect animation

---

## 6. Difficulty Design Goals

- Early Game (Wave 1–3): Power fantasy feeling
- Mid Game (Wave 4–7): Strategic weapon choices
- Late Game (Wave 8+): Boss pattern mastery & ammo management
- Avoid uncontrollable speed inflation

Target session length: 20–30 minutes

---

## 7. Dopamine Mechanics

- 5-kill combo → +10% XP bonus
- 10-kill combo → slow-motion effect
- Boss spawn screen shake
- Special weapon drop highlight effect
- Headshot → +1 bonus XP

---

## Core Design Goals

- Replayable roguelike loop
- Clear sense of progression
- Controlled randomness via special weapons
- Balanced late-game difficulty
- Stable scaling without runaway stats
