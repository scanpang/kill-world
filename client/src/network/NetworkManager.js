// client/src/network/NetworkManager.js
import { io } from 'socket.io-client';
import { EVENTS } from '../../../shared/constants.js';

export class NetworkManager {
  constructor(game) {
    this.game = game;
    this.socket = null;
    this.connected = false;
    this.isHost = false;
    this.lastSendTime = 0;
    this.sendInterval = 50; // ms (20 updates/sec)
    this.npcSyncInterval = 100; // ms (10 NPC syncs/sec)
    this.lastNpcSyncTime = 0;
  }

  connect() {
    // Connect to game server
    const serverUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : 'https://kill-world.onrender.com';

    this.socket = io(serverUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[Network] Connected:', this.socket.id);
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('[Network] Disconnected');
      this.connected = false;
    });

    // ─── Event handlers ───

    // Existing players when joining
    this.socket.on(EVENTS.STATE_UPDATE, (payload) => {
      const players = payload.players || payload;
      for (const [id, data] of Object.entries(players)) {
        if (id !== this.socket.id) {
          this.game.addRemotePlayer(id, data);
        }
      }
      // Sync room state on join
      if (payload.roomState) {
        this.game.syncGameState(payload.roomState);
      }
    });

    // Host assignment
    this.socket.on(EVENTS.HOST_ASSIGN, (data) => {
      const wasHost = this.isHost;
      this.isHost = data.isHost;
      console.log(`[Network] Host assigned: ${this.isHost}`);
      if (data.isHost && !wasHost) {
        // Became host (either first join or migration)
        this.game.onBecomeHost(data.roomState || null);
      }
    });

    // Host changed notification (for guests)
    this.socket.on(EVENTS.HOST_CHANGED, (data) => {
      if (data.hostId !== this.socket.id) {
        console.log(`[Network] Host changed to: ${data.hostId}`);
      }
    });

    // Game state sync (from server on NPC kills)
    this.socket.on(EVENTS.GAME_STATE_SYNC, (state) => {
      this.game.syncGameState(state);
    });

    // New player joined
    this.socket.on(EVENTS.PLAYER_JOIN, (data) => {
      if (data.id !== this.socket.id) {
        this.game.addRemotePlayer(data.id, data);
        console.log('[Network] Player joined:', data.id);
      }
    });

    // Player left
    this.socket.on(EVENTS.PLAYER_LEAVE, (id) => {
      this.game.removeRemotePlayer(id);
      console.log('[Network] Player left:', id);
    });

    // Player moved
    this.socket.on(EVENTS.PLAYER_MOVE, (data) => {
      if (data.id !== this.socket.id) {
        this.game.updateRemotePlayerPosition(data.id, data);
      }
    });

    // Player hit
    this.socket.on(EVENTS.PLAYER_HIT, (data) => {
      this.game.hud.showHitMarker(data.headshot);
    });

    // Player death
    this.socket.on(EVENTS.PLAYER_DEATH, (data) => {
      this.game.hud.addKillFeedEntry(data.killerName, data.victimName);
    });

    // ─── Co-op NPC Events ───

    // NPC state sync from host (guests receive this)
    this.socket.on(EVENTS.NPC_STATE_SYNC, (data) => {
      if (!this.isHost) {
        this.game.npcManager.syncFromHost(data);
      }
    });

    // NPC damage request from guest (host receives this)
    this.socket.on(EVENTS.NPC_DAMAGE, (data) => {
      if (this.isHost) {
        this.game.onRemoteNPCDamage(data);
      }
    });

    // Boss spawn (guests receive this from host)
    this.socket.on(EVENTS.BOSS_SPAWN, (data) => {
      if (!this.isHost) {
        this.game.npcManager.onRemoteBossSpawn(data);
      }
    });

    // Boss death (guests receive this from host)
    this.socket.on(EVENTS.BOSS_DEATH, (data) => {
      if (!this.isHost) {
        this.game.onRemoteBossDeath(data);
      }
    });

    // Airdrop spawn (guests receive this from host)
    this.socket.on(EVENTS.AIRDROP_SPAWN, (data) => {
      if (!this.isHost) {
        this.game.onRemoteAirdropSpawn(data);
      }
    });
  }

  sendPosition(position, rotationY, weaponId) {
    if (!this.connected) return;

    const now = performance.now();
    if (now - this.lastSendTime < this.sendInterval) return;
    this.lastSendTime = now;

    this.socket.emit(EVENTS.PLAYER_MOVE, {
      x: position.x,
      y: position.y,
      z: position.z,
      ry: rotationY,
      weaponId: weaponId,
    });
  }

  sendShoot(data) {
    if (!this.connected) return;
    this.socket.emit(EVENTS.PLAYER_SHOOT, data);
  }

  sendReload() {
    if (!this.connected) return;
    this.socket.emit(EVENTS.PLAYER_RELOAD);
  }

  sendNPCKill(isBoss) {
    if (!this.connected) return;
    this.socket.emit(EVENTS.NPC_KILL, { isBoss });
  }

  // Host sends NPC state to guests
  sendNPCStateSync(npcStates) {
    if (!this.connected || !this.isHost) return;

    const now = performance.now();
    if (now - this.lastNpcSyncTime < this.npcSyncInterval) return;
    this.lastNpcSyncTime = now;

    this.socket.emit(EVENTS.NPC_STATE_SYNC, npcStates);
  }

  // Guest sends damage request to host
  sendNPCDamage(data) {
    if (!this.connected || this.isHost) return;
    this.socket.emit(EVENTS.NPC_DAMAGE, data);
  }

  // Host broadcasts boss spawn
  sendBossSpawn(data) {
    if (!this.connected || !this.isHost) return;
    this.socket.emit(EVENTS.BOSS_SPAWN, data);
  }

  // Host broadcasts boss death
  sendBossDeath(data) {
    if (!this.connected || !this.isHost) return;
    this.socket.emit(EVENTS.BOSS_DEATH, data);
  }

  // Host broadcasts airdrop
  sendAirdropSpawn(data) {
    if (!this.connected || !this.isHost) return;
    this.socket.emit(EVENTS.AIRDROP_SPAWN, data);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
