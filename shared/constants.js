// shared/constants.js

export const GAME = {
  TICK_RATE: 20,
  MAP_SIZE: 200,
  GRAVITY: -20,
};

export const SAFE_ZONE = {
  X: 0,
  Z: 0,
  RADIUS: 8,
};

export const PLAYER = {
  SPEED: 14,
  SPRINT_SPEED: 24,
  JUMP_FORCE: 10,
  MAX_HEALTH: 100,
  HEIGHT: 4,
  RADIUS: 0.7,
  RESPAWN_TIME: 3,
};

export const WEAPONS = {
  // ── Slot 0: Primary ──
  BasicGun:     { name: '기본총',       damage: 10,  headshotMul: 2.0, fireRate: 167,  maxAmmo: 40,       reloadTime: 2000, spread: 0.03,  range: 200, auto: true,  price: 0,    type: 'gun',   slot: 0, tier: 'normal' },
  Minigun:      { name: '미니건',       damage: 8,   headshotMul: 1.5, fireRate: 125,  maxAmmo: 60,       reloadTime: 3500, spread: 0.05,  range: 150, auto: true,  price: 300,  type: 'gun',   slot: 0, tier: 'normal' },
  Shotgun:      { name: '샷건',         damage: 50,  headshotMul: 1.5, fireRate: 833,  maxAmmo: 10,       reloadTime: 2500, spread: 0.06,  range: 50,  auto: false, price: 250,  type: 'gun',   slot: 0, tier: 'normal' },
  BasicGunRare: { name: '강화 기본총',  damage: 16,  headshotMul: 2.0, fireRate: 143,  maxAmmo: 50,       reloadTime: 1800, spread: 0.025, range: 230, auto: true,  price: 800,  type: 'gun',   slot: 0, tier: 'rare' },
  MinigunRare:  { name: '개조 미니건',  damage: 12,  headshotMul: 1.5, fireRate: 100,  maxAmmo: 80,       reloadTime: 3000, spread: 0.04,  range: 170, auto: true,  price: 1200, type: 'gun',   slot: 0, tier: 'rare' },
  ShotgunRare:  { name: '강화 샷건',    damage: 80,  headshotMul: 1.5, fireRate: 714,  maxAmmo: 12,       reloadTime: 2200, spread: 0.05,  range: 70,  auto: false, price: 950,  type: 'gun',   slot: 0, tier: 'rare' },
  GoldAssault:  { name: '골드 어설트',  damage: 28,  headshotMul: 2.0, fireRate: 111,  maxAmmo: 70,       reloadTime: 1500, spread: 0.02,  range: 260, auto: true,  price: 2500, type: 'gun',   slot: 0, tier: 'legendary' },
  HellMinigun:  { name: '헬 미니건',    damage: 18,  headshotMul: 1.5, fireRate: 71,   maxAmmo: 120,      reloadTime: 2800, spread: 0.04,  range: 200, auto: true,  price: 3200, type: 'gun',   slot: 0, tier: 'legendary' },
  DoomShotgun:  { name: '둠 샷건',      damage: 150, headshotMul: 1.5, fireRate: 625,  maxAmmo: 15,       reloadTime: 2000, spread: 0.05,  range: 90,  auto: false, price: 2800, type: 'gun',   slot: 0, tier: 'legendary' },

  // ── Slot 1: Secondary ──
  Revolver:     { name: '리볼버',       damage: 35,  headshotMul: 3.0, fireRate: 500,  maxAmmo: 8,        reloadTime: 2000, spread: 0.01,  range: 180, auto: false, price: 200,  type: 'gun',   slot: 1, tier: 'normal' },
  Glock:        { name: '글록',         damage: 15,  headshotMul: 2.0, fireRate: 250,  maxAmmo: 15,       reloadTime: 1500, spread: 0.02,  range: 120, auto: true,  price: 150,  type: 'gun',   slot: 1, tier: 'normal' },
  RevolverRare: { name: '강화 리볼버',  damage: 55,  headshotMul: 3.0, fireRate: 400,  maxAmmo: 10,       reloadTime: 1800, spread: 0.008, range: 220, auto: false, price: 600,  type: 'gun',   slot: 1, tier: 'rare' },
  GlockRare:    { name: '개조 글록',    damage: 22,  headshotMul: 2.0, fireRate: 200,  maxAmmo: 20,       reloadTime: 1300, spread: 0.015, range: 150, auto: true,  price: 450,  type: 'gun',   slot: 1, tier: 'rare' },
  DesertKing:   { name: '데저트 킹',    damage: 90,  headshotMul: 3.0, fireRate: 333,  maxAmmo: 12,       reloadTime: 1500, spread: 0.005, range: 260, auto: false, price: 1500, type: 'gun',   slot: 1, tier: 'legendary' },
  BlazeGlock:   { name: '블레이즈 글록',damage: 30,  headshotMul: 2.0, fireRate: 125,  maxAmmo: 30,       reloadTime: 1100, spread: 0.012, range: 170, auto: true,  price: 1300, type: 'gun',   slot: 1, tier: 'legendary' },

  // ── Slot 2: Melee ──
  Knife:        { name: '칼',           damage: 30,  headshotMul: 1.5, fireRate: 400,  maxAmmo: Infinity, reloadTime: 0,    spread: 0,     range: 4,   auto: false, price: 0,    type: 'melee', slot: 2, tier: 'normal' },
  Axe:          { name: '도끼',         damage: 90,  headshotMul: 1.5, fireRate: 1250, maxAmmo: Infinity, reloadTime: 0,    spread: 0,     range: 4.5, auto: false, price: 400,  type: 'melee', slot: 2, tier: 'normal' },
  KnifeRare:    { name: '강화 칼',      damage: 50,  headshotMul: 1.5, fireRate: 333,  maxAmmo: Infinity, reloadTime: 0,    spread: 0,     range: 4.5, auto: false, price: 600,  type: 'melee', slot: 2, tier: 'rare' },
  AxeRare:      { name: '강화 도끼',    damage: 140, headshotMul: 1.5, fireRate: 1000, maxAmmo: Infinity, reloadTime: 0,    spread: 0,     range: 5,   auto: false, price: 1200, type: 'melee', slot: 2, tier: 'rare' },
  BloodBlade:   { name: '블러드 블레이드',damage: 90, headshotMul: 1.5, fireRate: 250,  maxAmmo: Infinity, reloadTime: 0,    spread: 0,     range: 5,   auto: false, price: 2000, type: 'melee', slot: 2, tier: 'legendary' },
  WorldBreaker: { name: '월드 브레이커',damage: 220, headshotMul: 1.5, fireRate: 833,  maxAmmo: Infinity, reloadTime: 0,    spread: 0,     range: 6,   auto: false, price: 3500, type: 'melee', slot: 2, tier: 'legendary' },

  // ── Slot 3: Special (Boss Drop) ──
  Railgun:       { name: '레일건',         damage: 25,  headshotMul: 2.5, fireRate: 333,  maxAmmo: 60,  reloadTime: 0, spread: 0.005, range: 500, auto: true,  price: 0, type: 'gun', slot: 3, unique: true, tier: 'normal' },
  PlasmaGun:     { name: '플라즈마건',     damage: 18,  headshotMul: 2.0, fireRate: 167,  maxAmmo: 80,  reloadTime: 0, spread: 0.02,  range: 250, auto: true,  price: 0, type: 'gun', slot: 3, unique: true, tier: 'normal' },
  RocketLauncher:{ name: '로켓런처',       damage: 120, headshotMul: 1.0, fireRate: 2000, maxAmmo: 10,  reloadTime: 0, spread: 0.01,  range: 300, auto: false, price: 0, type: 'gun', slot: 3, unique: true, tier: 'normal', explosive: true, explosionRadius: 8 },
  RailgunRare:   { name: '강화 레일건',    damage: 45,  headshotMul: 3.0, fireRate: 333,  maxAmmo: 80,  reloadTime: 0, spread: 0.004, range: 550, auto: true,  price: 0, type: 'gun', slot: 3, unique: true, tier: 'rare' },
  PlasmaMK2:     { name: '플라즈마 MK2',   damage: 28,  headshotMul: 2.0, fireRate: 125,  maxAmmo: 120, reloadTime: 0, spread: 0.015, range: 300, auto: true,  price: 0, type: 'gun', slot: 3, unique: true, tier: 'rare' },
  RocketRare:    { name: '개조 로켓런처',  damage: 200, headshotMul: 1.0, fireRate: 1429, maxAmmo: 15,  reloadTime: 0, spread: 0.008, range: 350, auto: false, price: 0, type: 'gun', slot: 3, unique: true, tier: 'rare', explosive: true, explosionRadius: 10 },
  ZeusRailgun:   { name: '제우스 레일건',  damage: 80,  headshotMul: 4.0, fireRate: 250,  maxAmmo: 120, reloadTime: 0, spread: 0.003, range: 700, auto: true,  price: 0, type: 'gun', slot: 3, unique: true, tier: 'legendary' },
  PlasmaOverload:{ name: '플라즈마 오버로드',damage: 40, headshotMul: 2.0, fireRate: 100,  maxAmmo: 200, reloadTime: 0, spread: 0.015, range: 350, auto: true,  price: 0, type: 'gun', slot: 3, unique: true, tier: 'legendary' },
  DoomBringer:   { name: '둠 브링어',      damage: 350, headshotMul: 1.0, fireRate: 1250, maxAmmo: 20,  reloadTime: 0, spread: 0.005, range: 400, auto: false, price: 0, type: 'gun', slot: 3, unique: true, tier: 'legendary', explosive: true, explosionRadius: 15 },
};

export const BOSS_WEAPONS_NORMAL = ['Railgun', 'PlasmaGun', 'RocketLauncher'];
export const BOSS_WEAPONS_RARE = ['RailgunRare', 'PlasmaMK2', 'RocketRare'];
export const BOSS_WEAPONS_LEGENDARY = ['ZeusRailgun', 'PlasmaOverload', 'DoomBringer'];
export const BOSS_UNIQUE_WEAPONS = [...BOSS_WEAPONS_NORMAL, ...BOSS_WEAPONS_RARE, ...BOSS_WEAPONS_LEGENDARY];

export const WEAPON_SLOTS = ['BasicGun', null, 'Knife', null];

export const SHOP_ITEMS = [
  // Slot 0 - Normal
  { id: 'Minigun', name: '미니건', price: 300, desc: '고속 연사 (8발/초)', category: 'weapon', slot: 0, tier: 'normal' },
  { id: 'Shotgun', name: '샷건', price: 250, desc: '강력한 단발 (50 데미지)', category: 'weapon', slot: 0, tier: 'normal' },
  // Slot 0 - Rare
  { id: 'BasicGunRare', name: '강화 기본총', price: 800, desc: '강화된 기본총 (16 데미지, 7발/초)', category: 'weapon', slot: 0, tier: 'rare' },
  { id: 'MinigunRare', name: '개조 미니건', price: 1200, desc: '개조 미니건 (12 데미지, 10발/초)', category: 'weapon', slot: 0, tier: 'rare' },
  { id: 'ShotgunRare', name: '강화 샷건', price: 950, desc: '강화 샷건 (80 데미지)', category: 'weapon', slot: 0, tier: 'rare' },
  // Slot 0 - Legendary
  { id: 'GoldAssault', name: '골드 어설트', price: 2500, desc: '최강 어설트 (28 데미지, 9발/초)', category: 'weapon', slot: 0, tier: 'legendary' },
  { id: 'HellMinigun', name: '헬 미니건', price: 3200, desc: '지옥의 미니건 (18 데미지, 14발/초)', category: 'weapon', slot: 0, tier: 'legendary' },
  { id: 'DoomShotgun', name: '둠 샷건', price: 2800, desc: '파멸의 샷건 (150 데미지)', category: 'weapon', slot: 0, tier: 'legendary' },
  // Slot 1 - Normal
  { id: 'Revolver', name: '리볼버', price: 200, desc: '강력한 권총', category: 'weapon', slot: 1, tier: 'normal' },
  { id: 'Glock', name: '글록', price: 150, desc: '빠른 연사 권총', category: 'weapon', slot: 1, tier: 'normal' },
  // Slot 1 - Rare
  { id: 'RevolverRare', name: '강화 리볼버', price: 600, desc: '강화 리볼버 (55 데미지)', category: 'weapon', slot: 1, tier: 'rare' },
  { id: 'GlockRare', name: '개조 글록', price: 450, desc: '개조 글록 (22 데미지, 5발/초)', category: 'weapon', slot: 1, tier: 'rare' },
  // Slot 1 - Legendary
  { id: 'DesertKing', name: '데저트 킹', price: 1500, desc: '사막의 왕 (90 데미지, 3발/초)', category: 'weapon', slot: 1, tier: 'legendary' },
  { id: 'BlazeGlock', name: '블레이즈 글록', price: 1300, desc: '화염 글록 (30 데미지, 8발/초)', category: 'weapon', slot: 1, tier: 'legendary' },
  // Slot 2 - Normal
  { id: 'Axe', name: '도끼', price: 400, desc: '강력한 근접 (90 데미지)', category: 'weapon', slot: 2, tier: 'normal' },
  // Slot 2 - Rare
  { id: 'KnifeRare', name: '강화 칼', price: 600, desc: '강화 칼 (50 데미지, 3/초)', category: 'weapon', slot: 2, tier: 'rare' },
  { id: 'AxeRare', name: '강화 도끼', price: 1200, desc: '강화 도끼 (140 데미지)', category: 'weapon', slot: 2, tier: 'rare' },
  // Slot 2 - Legendary
  { id: 'BloodBlade', name: '블러드 블레이드', price: 2000, desc: '피의 검 (90 데미지, 4/초)', category: 'weapon', slot: 2, tier: 'legendary' },
  { id: 'WorldBreaker', name: '월드 브레이커', price: 3500, desc: '세계의 파괴자 (220 데미지)', category: 'weapon', slot: 2, tier: 'legendary' },
  // Consumables
  { id: 'HealthPack', name: '회복팩', price: 30, desc: '최대 HP의 30% 회복', category: 'consumable' },
  { id: 'MaxHPUp', name: 'HP 강화', price: 100, desc: '최대 HP +20', category: 'consumable' },
  { id: 'MagUp', name: '탄창 강화', price: 150, desc: '탄창 용량 +20%', category: 'consumable' },
  { id: 'SpeedUp', name: '이속 강화', price: 200, desc: '이동속도 +5%', category: 'consumable' },
  { id: 'CritUp', name: '치명타 강화', price: 250, desc: '치명타 확률 +5%', category: 'consumable' },
  { id: 'FireRateUp', name: '공속 강화', price: 200, desc: '공격속도 +10%', category: 'consumable' },
  { id: 'DamageUp', name: '공격력 강화', price: 200, desc: '공격력 +10%', category: 'consumable' },
];

export const NPC = {
  SPEED: 7,
  HEALTH: 50,
  DAMAGE: 10,
  ATTACK_RANGE: 3,
  DETECT_RANGE: 30,
  RESPAWN_TIME: 10,
  PATROL_RADIUS: 15,
  COIN_DROP: 10,
};

export const WEAKNESS_DAMAGE_MULTIPLIER = 2.0;

export const NPC_TYPES = {
  normal:      { health: 50,   speed: 7.0,   scale: 1,    bodyColor: 0x8b0000, coinDrop: 10,  dmg: 10,  name: 'Zombie',      xp: 1,  tier: 'normal', weakness: null },
  fast:        { health: 70,   speed: 9.0,   scale: 0.85, bodyColor: 0xcc4400, coinDrop: 20,  dmg: 20,  name: 'Runner',      xp: 2,  tier: 'normal', weakness: null },
  tank:        { health: 220,  speed: 8.0,   scale: 1.35, bodyColor: 0x2d1b69, coinDrop: 30,  dmg: 25,  name: 'Tank',        xp: 3,  tier: 'normal', weakness: null },
  shield:      { health: 120,  speed: 6.0,   scale: 1.1,  bodyColor: 0x2a5a2a, coinDrop: 25,  dmg: 15,  name: 'Shield',      xp: 2,  tier: 'normal', weakness: null },
  boss:        { health: 3000, speed: 9.5,   scale: 2.5,  bodyColor: 0x4a0080, coinDrop: 300, dmg: 80,  name: 'BOSS',        xp: 15, tier: 'boss',   weakness: null },
  // Rare (100+ kills)
  brute:       { health: 300,  speed: 6.5,   scale: 1.5,  bodyColor: 0xb03030, coinDrop: 60,  dmg: 35,  name: 'Brute',       xp: 5,  tier: 'rare',   weakness: 'melee' },
  stalker:     { health: 200,  speed: 11.0,  scale: 0.9,  bodyColor: 0x664400, coinDrop: 50,  dmg: 25,  name: 'Stalker',     xp: 5,  tier: 'rare',   weakness: 'pistol' },
  spitter:     { health: 180,  speed: 7.5,   scale: 1.0,  bodyColor: 0x2a6633, coinDrop: 55,  dmg: 30,  name: 'Spitter',     xp: 5,  tier: 'rare',   weakness: 'melee' },
  // Unique (200+ kills)
  reaper:      { health: 800,  speed: 10.0,  scale: 1.6,  bodyColor: 0x1a0033, coinDrop: 120, dmg: 50,  name: 'Reaper',      xp: 10, tier: 'unique', weakness: 'pistol' },
  juggernaut:  { health: 1200, speed: 5.5,   scale: 1.8,  bodyColor: 0x333344, coinDrop: 150, dmg: 60,  name: 'Juggernaut',  xp: 12, tier: 'unique', weakness: 'melee' },
  banshee:     { health: 500,  speed: 13.0,  scale: 1.0,  bodyColor: 0x002244, coinDrop: 100, dmg: 40,  name: 'Banshee',     xp: 8,  tier: 'unique', weakness: 'pistol' },
};

export const EVENTS = {
  PLAYER_JOIN: 'player:join',
  PLAYER_LEAVE: 'player:leave',
  PLAYER_MOVE: 'player:move',
  PLAYER_SHOOT: 'player:shoot',
  PLAYER_HIT: 'player:hit',
  PLAYER_DEATH: 'player:death',
  PLAYER_RESPAWN: 'player:respawn',
  PLAYER_RELOAD: 'player:reload',
  STATE_UPDATE: 'state:update',
  NPC_UPDATE: 'npc:update',
  NPC_DEATH: 'npc:death',
  CHAT_MESSAGE: 'chat:message',
};
