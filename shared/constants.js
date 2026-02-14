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
  MachineGun: {
    name: '기관총',
    damage: 15,
    headshotMul: 2.0,
    fireRate: 100,
    maxAmmo: 40,
    reloadTime: 2500,
    spread: 0.03,
    range: 200,
    auto: true,
    price: 0,
    type: 'gun',
  },
  Pistol: {
    name: '권총',
    damage: 25,
    headshotMul: 2.5,
    fireRate: 300,
    maxAmmo: 12,
    reloadTime: 1500,
    spread: 0.01,
    range: 150,
    auto: false,
    price: 0,
    type: 'gun',
  },
  Melee: {
    name: '근접무기',
    damage: 50,
    headshotMul: 1.5,
    fireRate: 600,
    maxAmmo: Infinity,
    reloadTime: 0,
    spread: 0,
    range: 4,
    auto: false,
    price: 0,
    type: 'melee',
  },
  Grenade: {
    name: '수류탄',
    damage: 120,
    headshotMul: 1.0,
    fireRate: 1500,
    maxAmmo: 3,
    reloadTime: 0,
    spread: 0,
    range: 30,
    auto: false,
    price: 100,
    type: 'grenade',
    blastRadius: 8,
  },
  Shotgun: {
    name: '샷건',
    damage: 12,
    headshotMul: 1.5,
    fireRate: 800,
    maxAmmo: 6,
    reloadTime: 2500,
    spread: 0.08,
    range: 50,
    pellets: 8,
    auto: false,
    price: 300,
    type: 'gun',
  },
  Sniper: {
    name: '스나이퍼',
    damage: 90,
    headshotMul: 3.0,
    fireRate: 1500,
    maxAmmo: 5,
    reloadTime: 3000,
    spread: 0.001,
    range: 1000,
    auto: false,
    price: 500,
    type: 'gun',
  },
};

export const WEAPON_SLOTS = ['MachineGun', 'Pistol', 'Melee', 'Grenade'];

export const SHOP_ITEMS = [
  { id: 'Shotgun', name: '샷건', price: 300, desc: '근거리 강력 산탄' },
  { id: 'Sniper', name: '스나이퍼', price: 500, desc: '원거리 고데미지' },
  { id: 'Grenade', name: '수류탄 x3', price: 100, desc: '범위 폭발 데미지' },
  { id: 'HealthPack', name: '회복팩', price: 50, desc: 'HP 50 회복' },
];

export const NPC = {
  SPEED: 4,
  HEALTH: 80,
  DAMAGE: 10,
  ATTACK_RANGE: 3,
  DETECT_RANGE: 30,
  RESPAWN_TIME: 10,
  PATROL_RADIUS: 15,
  COIN_DROP: 25,
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
