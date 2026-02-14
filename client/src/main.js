// client/src/main.js
import './style.css';
import { Game } from './game/Game.js';

document.getElementById('hud').classList.add('active');

const game = new Game();
game.start();

const overlay = document.getElementById('overlay');

// Click anywhere → lock pointer and hide overlay
document.addEventListener('click', () => {
  if (!document.pointerLockElement) {
    document.body.requestPointerLock();
  }
});

// Pointer lock acquired → hide overlay
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement) {
    overlay.classList.remove('active');
  } else {
    overlay.classList.add('active');
  }
});
