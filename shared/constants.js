// shared/constants.js
// 서버와 클라이언트 양쪽에서 사용하는 공통 상수

export const GAME = {
  TICK_RATE: 20,           // 서버 틱레이트 (초당)
  MAP_SIZE: 200,           // 맵 한 변 크기
  GRAVITY: -20,
};

export const PLAYER = {
  SPEED: 14,
  SPRINT_SPEED: 24,
  JUMP_FORCE: 10,
  MAX_HEALTH: 100,
  HEIGHT: 4,               // 로블록스 캐릭터 높이
  RADIUS: 0.7,
  RESPAWN_TIME: 3,         // 초
};

export const WEAPONS = {
  AssaultRifle: {
    name: '돌격소총',
    damage: 18,
    headshotMul: 2.0,
    fireRate: 100,          // ms
    maxAmmo: 30,
    reloadTime: 2000,       // ms
    spread: 0.02,
    range: 300,
    auto: true,
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
  },
  Sniper: {
    name: '스나이퍼',
    damage: 75,
    headshotMul: 3.0,
    fireRate: 1500,
    maxAmmo: 5,
    reloadTime: 3000,
    spread: 0.001,
    range: 1000,
    auto: false,
  },
};

export const NPC = {
  SPEED: 4,
  HEALTH: 80,
  DAMAGE: 10,
  ATTACK_RANGE: 3,
  DETECT_RANGE: 30,
  RESPAWN_TIME: 10,
  PATROL_RADIUS: 15,
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
