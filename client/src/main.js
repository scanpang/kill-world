// client/src/main.js
import { Game } from './game/Game.js';

const game = new Game();

// Remove lock screen and start immediately
const lockScreen = document.getElementById('lock-screen');
lockScreen.style.display = 'none';
document.getElementById('hud').classList.add('active');
game.start();

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
