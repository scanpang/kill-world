// client/src/ui/Minimap.js
import { GAME } from '../../../shared/constants.js';

export class Minimap {
  constructor() {
    this.canvas = document.getElementById('minimap-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.size = 180;
    this.scale = this.size / (GAME.MAP_SIZE * 0.6); // Show nearby area
    this.viewRange = GAME.MAP_SIZE * 0.3;
  }

  update(playerPos, playerRotY, entities) {
    const ctx = this.ctx;
    const cx = this.size / 2;
    const cy = this.size / 2;

    // Clear
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, this.size, this.size);

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 0.5;
    const gridStep = 20;
    for (let i = -this.viewRange; i <= this.viewRange; i += gridStep) {
      const sx = cx + (i - playerPos.x % gridStep) * this.scale;
      const sy = cy + (i - playerPos.z % gridStep) * this.scale;
      // Vertical
      ctx.beginPath();
      ctx.moveTo(cx + (i) * this.scale, 0);
      ctx.lineTo(cx + (i) * this.scale, this.size);
      ctx.stroke();
      // Horizontal
      ctx.beginPath();
      ctx.moveTo(0, cy + (i) * this.scale);
      ctx.lineTo(this.size, cy + (i) * this.scale);
      ctx.stroke();
    }

    // Entities
    for (const entity of entities) {
      const rx = (entity.position.x - playerPos.x) * this.scale;
      const rz = (entity.position.z - playerPos.z) * this.scale;

      const ex = cx + rx;
      const ey = cy + rz;

      // Skip if outside minimap
      if (ex < 0 || ex > this.size || ey < 0 || ey > this.size) continue;

      if (entity.type === 'npc') {
        // NPC - red dot
        ctx.fillStyle = '#ff3333';
        ctx.beginPath();
        ctx.arc(ex, ey, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (entity.type === 'player') {
        // Other player - blue dot
        ctx.fillStyle = '#3399ff';
        ctx.beginPath();
        ctx.arc(ex, ey, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (entity.type === 'airdrop') {
        // Airdrop - gold pulsing dot
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(ex, ey, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 200, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Player (center, with direction indicator)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-playerRotY);

    // Player triangle
    ctx.fillStyle = '#00ff66';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(-4, 4);
    ctx.lineTo(4, 4);
    ctx.closePath();
    ctx.fill();

    // FOV cone
    ctx.fillStyle = 'rgba(0, 255, 100, 0.08)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 40, -Math.PI / 4 - Math.PI / 2, Math.PI / 4 - Math.PI / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, this.size, this.size);

    // "N" indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '9px Rajdhani';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, 10);
  }
}
