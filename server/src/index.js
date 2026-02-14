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

  // Send current state to new player
  const currentPlayers = Object.fromEntries(players);
  socket.emit(EVENTS.STATE_UPDATE, currentPlayers);

  // Notify others
  socket.broadcast.emit(EVENTS.PLAYER_JOIN, playerData);

  console.log(`[Server] Players online: ${players.size}`);

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

  // ─── Shooting (server authoritative damage) ───
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

  // ─── Disconnect ───
  socket.on('disconnect', () => {
    players.delete(socket.id);
    io.emit(EVENTS.PLAYER_LEAVE, socket.id);
    console.log(`[Server] Player disconnected: ${socket.id} | Online: ${players.size}`);
  });
});

// ─── Health endpoint for monitoring ───
app.get('/api/status', (req, res) => {
  res.json({
    players: players.size,
    uptime: process.uptime(),
  });
});

// ─── Start Server ───
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   🎮 KILL WORLD Server               ║
  ║   Port: ${PORT}                          ║
  ║   Ready for connections...            ║
  ╚═══════════════════════════════════════╝
  `);
});
