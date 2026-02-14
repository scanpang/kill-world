// client/src/network/NetworkManager.js
import { io } from 'socket.io-client';
import { EVENTS } from '../../../shared/constants.js';

export class NetworkManager {
  constructor(game) {
    this.game = game;
    this.socket = null;
    this.connected = false;
    this.lastSendTime = 0;
    this.sendInterval = 50; // ms (20 updates/sec)
  }

  connect() {
    // Connect to game server
    const serverUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : window.location.origin;

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
    this.socket.on(EVENTS.STATE_UPDATE, (players) => {
      for (const [id, data] of Object.entries(players)) {
        if (id !== this.socket.id) {
          this.game.addRemotePlayer(id, data);
        }
      }
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

    // NPC updates from server
    this.socket.on(EVENTS.NPC_UPDATE, (npcs) => {
      // Sync NPC states from server (for authoritative server mode)
    });
  }

  sendPosition(position, rotationY) {
    if (!this.connected) return;

    const now = performance.now();
    if (now - this.lastSendTime < this.sendInterval) return;
    this.lastSendTime = now;

    this.socket.emit(EVENTS.PLAYER_MOVE, {
      x: position.x,
      y: position.y,
      z: position.z,
      ry: rotationY,
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

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
