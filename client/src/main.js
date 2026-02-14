// client/src/main.js
import './style.css';
import { Game } from './game/Game.js';

document.getElementById('hud').classList.add('active');

const game = new Game();
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
