// client/src/main.js
import { Game } from './game/Game.js';

const game = new Game();

// Lock screen → click to start
const lockScreen = document.getElementById('lock-screen');
lockScreen.addEventListener('click', async () => {
  // Request pointer lock for FPS controls
  document.body.requestPointerLock();
  lockScreen.style.display = 'none';
  document.getElementById('hud').classList.add('active');
  game.start();
});

// Handle pointer lock changes
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement) {
    game.pause();
  }
});

// Click to re-lock
document.addEventListener('click', () => {
  if (!document.pointerLockElement && game.isRunning) {
    document.body.requestPointerLock();
  }
});
