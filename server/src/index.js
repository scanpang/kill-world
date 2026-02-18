// server/src/index.js
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { EVENTS, WEAPONS, PLAYER, NPC } from '../../shared/constants.js';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'https://kill-world.vercel.app'],
    methods: ['GET', 'POST'],
  },
});

// ─── Game State ───
const players = new Map();
const TEAM_COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c];

// ─── Room State (host-synced) ───
let roomState = { wave: 1, killCount: 0, bossKillCount: 0, zombieLevel: 1, bossAlive: false, bossHealth: 0, bossMaxHealth: 0 };
const joinOrder = []; // track connection order for host succession

function getHostId() {
  return joinOrder.length > 0 ? joinOrder[0] : null;
}

// ─── Socket Handling ───
io.on('connection', (socket) => {
  console.log(`[Server] Player connected: ${socket.id}`);

  // Register player
  const playerData = {
    id: socket.id,
    x: (Math.random() - 0.5) * 60,
    y: 5,
    z: (Math.random() - 0.5) * 60,
    ry: 0,
    health: PLAYER.MAX_HEALTH,
    kills: 0,
    deaths: 0,
    color: TEAM_COLORS[players.size % TEAM_COLORS.length],
    name: `Player_${socket.id.slice(0, 4)}`,
  };

  players.set(socket.id, playerData);
  joinOrder.push(socket.id);

  const isHost = getHostId() === socket.id;

  // Send current state to new player (include roomState + host info)
  const currentPlayers = Object.fromEntries(players);
  socket.emit(EVENTS.STATE_UPDATE, { players: currentPlayers, roomState });

  // Tell this player if they are host
  socket.emit(EVENTS.HOST_ASSIGN, { isHost });

  // Notify others
  socket.broadcast.emit(EVENTS.PLAYER_JOIN, playerData);

  console.log(`[Server] Players online: ${players.size} | Host: ${getHostId()} | isHost: ${isHost}`);

  // ─── Movement ───
  socket.on(EVENTS.PLAYER_MOVE, (data) => {
    const player = players.get(socket.id);
    if (!player) return;

    player.x = data.x;
    player.y = data.y;
    player.z = data.z;
    player.ry = data.ry;

    socket.broadcast.emit(EVENTS.PLAYER_MOVE, {
      id: socket.id,
      ...data,
    });
  });

  // ─── Shooting (server authoritative damage for PvP) ───
  socket.on(EVENTS.PLAYER_SHOOT, (data) => {
    const shooter = players.get(socket.id);
    if (!shooter || !data.targetId) return;

    const weapon = WEAPONS[data.weaponId];
    if (!weapon) return;

    const target = players.get(data.targetId);
    if (!target || target.health <= 0) return;

    // Calculate damage
    let damage = weapon.damage;
    if (data.headshot) {
      damage *= weapon.headshotMul;
    }

    target.health -= damage;

    // Notify shooter of hit
    socket.emit(EVENTS.PLAYER_HIT, {
      targetId: data.targetId,
      damage,
      headshot: data.headshot || false,
      killed: target.health <= 0,
    });

    // Kill handling
    if (target.health <= 0) {
      shooter.kills++;
      target.deaths++;

      io.emit(EVENTS.PLAYER_DEATH, {
        killerId: socket.id,
        killerName: shooter.name,
        victimId: data.targetId,
        victimName: target.name,
      });

      // Respawn after delay
      setTimeout(() => {
        target.health = PLAYER.MAX_HEALTH;
        target.x = (Math.random() - 0.5) * 60;
        target.y = 5;
        target.z = (Math.random() - 0.5) * 60;

        io.to(data.targetId).emit(EVENTS.PLAYER_RESPAWN, {
          x: target.x,
          y: target.y,
          z: target.z,
        });
      }, PLAYER.RESPAWN_TIME * 1000);
    }
  });

  // ─── NPC Kill (sync game state) ───
  socket.on(EVENTS.NPC_KILL, (data) => {
    roomState.killCount++;
    if (data && data.isBoss) {
      roomState.bossKillCount++;
      roomState.wave = roomState.bossKillCount + 1;
      roomState.zombieLevel++;
      roomState.bossAlive = false;
      roomState.bossHealth = 0;
    }
    io.emit(EVENTS.GAME_STATE_SYNC, roomState);
  });

  // ─── NPC State Sync (host → server → guests) ───
  socket.on(EVENTS.NPC_STATE_SYNC, (data) => {
    // Only accept from host
    if (socket.id !== getHostId()) return;
    socket.broadcast.emit(EVENTS.NPC_STATE_SYNC, data);
  });

  // ─── NPC Damage (guest → server → host) ───
  socket.on(EVENTS.NPC_DAMAGE, (data) => {
    const hostId = getHostId();
    if (!hostId || socket.id === hostId) return;
    // Forward damage request to host, include who sent it
    io.to(hostId).emit(EVENTS.NPC_DAMAGE, { ...data, fromId: socket.id });
  });

  // ─── Boss Spawn (host → server → all) ───
  socket.on(EVENTS.BOSS_SPAWN, (data) => {
    if (socket.id !== getHostId()) return;
    roomState.bossAlive = true;
    roomState.bossHealth = data.health || 0;
    roomState.bossMaxHealth = data.maxHealth || data.health || 0;
    socket.broadcast.emit(EVENTS.BOSS_SPAWN, data);
  });

  // ─── Boss Death (host → server → all) ───
  socket.on(EVENTS.BOSS_DEATH, (data) => {
    if (socket.id !== getHostId()) return;
    roomState.bossAlive = false;
    roomState.bossHealth = 0;
    socket.broadcast.emit(EVENTS.BOSS_DEATH, data);
  });

  // ─── Airdrop Spawn (host → server → guests) ───
  socket.on(EVENTS.AIRDROP_SPAWN, (data) => {
    if (socket.id !== getHostId()) return;
    socket.broadcast.emit(EVENTS.AIRDROP_SPAWN, data);
  });

  // ─── Disconnect ───
  socket.on('disconnect', () => {
    const wasHost = socket.id === getHostId();

    players.delete(socket.id);
    const idx = joinOrder.indexOf(socket.id);
    if (idx !== -1) joinOrder.splice(idx, 1);

    io.emit(EVENTS.PLAYER_LEAVE, socket.id);
    console.log(`[Server] Player disconnected: ${socket.id} | Online: ${players.size}`);

    // Reset room state when all players leave
    if (players.size === 0) {
      roomState = { wave: 1, killCount: 0, bossKillCount: 0, zombieLevel: 1, bossAlive: false, bossHealth: 0, bossMaxHealth: 0 };
      console.log('[Server] All players left - roomState reset');
    } else if (wasHost) {
      // Host migration: assign next player as host
      const newHostId = getHostId();
      if (newHostId) {
        console.log(`[Server] Host migrated: ${socket.id} -> ${newHostId}`);
        io.to(newHostId).emit(EVENTS.HOST_ASSIGN, { isHost: true, roomState });
        // Notify all others about host change
        io.emit(EVENTS.HOST_CHANGED, { hostId: newHostId });
      }
    }
  });
});

// ─── Health endpoint for monitoring ───
app.get('/api/status', (req, res) => {
  res.json({
    players: players.size,
    uptime: process.uptime(),
    host: getHostId(),
  });
});

// ─── Start Server ───
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   KILL WORLD Server                  ║
  ║   Port: ${PORT}                          ║
  ║   Ready for connections...            ║
  ╚═══════════════════════════════════════╝
  `);
});
