// shared/constants.js

export const GAME = {
  TICK_RATE: 20,
  MAP_SIZE: 200,
  GRAVITY: -20,
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
  BasicGun: {
    name: '기본총',
    damage: 10,
    headshotMul: 2.0,
    fireRate: 167,      // 6/sec
    maxAmmo: 40,
    reloadTime: 2000,
    spread: 0.03,
    range: 200,
    auto: true,
    price: 0,
    type: 'gun',
    slot: 0,
  },
  Minigun: {
    name: '미니건',
    damage: 8,
    headshotMul: 1.5,
    fireRate: 125,      // 8/sec
    maxAmmo: 60,
    reloadTime: 3500,
    spread: 0.05,
    range: 150,
    auto: true,
    price: 300,
    type: 'gun',
    slot: 0,
  },
  Shotgun: {
    name: '샷건',
    damage: 50,
    headshotMul: 1.5,
    fireRate: 833,      // 1.2/sec
    maxAmmo: 10,
    reloadTime: 2500,
    spread: 0.06,
    range: 50,
    auto: false,
    price: 250,
    type: 'gun',
    slot: 0,
  },
  Revolver: {
    name: '리볼버',
    damage: 35,
    headshotMul: 3.0,
    fireRate: 500,      // 2/sec
    maxAmmo: 8,
    reloadTime: 2000,
    spread: 0.01,
    range: 180,
    auto: false,
    price: 200,
    type: 'gun',
    slot: 1,
  },
  Glock: {
    name: '글록',
    damage: 15,
    headshotMul: 2.0,
    fireRate: 250,      // 4/sec
    maxAmmo: 15,
    reloadTime: 1500,
    spread: 0.02,
    range: 120,
    auto: true,
    price: 150,
    type: 'gun',
    slot: 1,
  },
  Knife: {
    name: '칼',
    damage: 30,
    headshotMul: 1.5,
    fireRate: 400,      // 2.5/sec
    maxAmmo: Infinity,
    reloadTime: 0,
    spread: 0,
    range: 4,
    auto: false,
    price: 0,
    type: 'melee',
    slot: 2,
  },
  Axe: {
    name: '도끼',
    damage: 90,
    headshotMul: 1.5,
    fireRate: 1250,     // 0.8/sec
    maxAmmo: Infinity,
    reloadTime: 0,
    spread: 0,
    range: 4.5,
    auto: false,
    price: 400,
    type: 'melee',
    slot: 2,
  },
  Railgun: {
    name: '레일건',
    damage: 25,
    headshotMul: 2.5,
    fireRate: 333,      // 3/sec
    maxAmmo: 60,
    reloadTime: 0,
    spread: 0.005,
    range: 500,
    auto: true,
    price: 0,
    type: 'gun',
    slot: 3,
    unique: true,
  },
  PlasmaGun: {
    name: '플라즈마건',
    damage: 18,
    headshotMul: 2.0,
    fireRate: 167,      // 6/sec
    maxAmmo: 80,
    reloadTime: 0,
    spread: 0.02,
    range: 250,
    auto: true,
    price: 0,
    type: 'gun',
    slot: 3,
    unique: true,
  },
};

export const BOSS_UNIQUE_WEAPONS = ['Railgun', 'PlasmaGun'];

export const WEAPON_SLOTS = ['BasicGun', null, 'Knife', null];

export const SHOP_ITEMS = [
  { id: 'Minigun', name: '미니건', price: 300, desc: '고속 연사 (8발/초)', category: 'weapon', slot: 0 },
  { id: 'Shotgun', name: '샷건', price: 250, desc: '강력한 단발 (50 데미지)', category: 'weapon', slot: 0 },
  { id: 'Revolver', name: '리볼버', price: 200, desc: '강력한 권총', category: 'weapon', slot: 1 },
  { id: 'Glock', name: '글록', price: 150, desc: '빠른 연사 권총', category: 'weapon', slot: 1 },
  { id: 'Axe', name: '도끼', price: 400, desc: '강력한 근접 (90 데미지)', category: 'weapon', slot: 2 },
  { id: 'HealthPack', name: '회복팩', price: 30, desc: '최대 HP의 30% 회복', category: 'consumable' },
  { id: 'MaxHPUp', name: 'HP 강화', price: 100, desc: '최대 HP +20', category: 'consumable' },
  { id: 'MagUp', name: '탄창 강화', price: 150, desc: '탄창 용량 +20%', category: 'consumable' },
  { id: 'SpeedUp', name: '이속 강화', price: 200, desc: '이동속도 +5%', category: 'consumable' },
  { id: 'CritUp', name: '치명타 강화', price: 250, desc: '치명타 확률 +5%', category: 'consumable' },
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

export const NPC_TYPES = {
  normal:  { health: 50,   speed: 7.0,  scale: 1,    bodyColor: 0x8b0000, coinDrop: 10,  dmg: 10,  name: 'Zombie',  xp: 1 },
  fast:    { health: 70,   speed: 9.0,  scale: 0.85, bodyColor: 0xcc4400, coinDrop: 20,  dmg: 20,  name: 'Runner',  xp: 2 },
  tank:    { health: 150,  speed: 8.0,  scale: 1.35, bodyColor: 0x2d1b69, coinDrop: 25,  dmg: 20,  name: 'Tank',    xp: 2 },
  shield:  { health: 220,  speed: 6.5,  scale: 1.1,  bodyColor: 0x2a5a2a, coinDrop: 30,  dmg: 20,  name: 'Shield',  xp: 3 },
  boss:    { health: 3000, speed: 9.5,  scale: 2.5,  bodyColor: 0x4a0080, coinDrop: 300, dmg: 80,  name: 'BOSS',    xp: 15 },
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
