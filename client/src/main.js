// client/src/main.js
import './style.css';
import { Game } from './game/Game.js';

document.getElementById('hud').classList.add('active');

const game = new Game();
game.start();

const overlay = document.getElementById('overlay');
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

if (isMobile) {
  // Mobile: tap overlay to start, no pointer lock needed
  overlay.addEventListener('touchstart', (e) => {
    e.preventDefault();
    overlay.classList.remove('active');
  }, { passive: false });
} else {
  // Desktop: click to lock pointer
  document.addEventListener('click', () => {
    if (!document.pointerLockElement) {
      document.body.requestPointerLock();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement) {
      overlay.classList.remove('active');
    } else {
      overlay.classList.add('active');
    }
  });
}
