// client/src/main.js
import './style.css';
import { Game } from './game/Game.js';

try {
  document.getElementById('hud').classList.add('active');

  const game = new Game();
  console.log('[Main] Game created successfully');

  game.start();
  console.log('[Main] Game started successfully');

  // Click to lock pointer for FPS controls
  document.addEventListener('click', () => {
    if (!document.pointerLockElement) {
      document.body.requestPointerLock();
    }
  });

  // Handle pointer lock changes
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement) {
      game.pause();
    }
  });
} catch (err) {
  console.error('[Main] FATAL ERROR:', err);
  document.body.innerHTML = `<div style="color:red;padding:20px;font-size:20px;">ERROR: ${err.message}</div>`;
}
