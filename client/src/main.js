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
  // Desktop: click to lock pointer (skip UI panels)
  document.addEventListener('click', (e) => {
    if (!document.pointerLockElement) {
      // If shop is open, never re-lock (handles detached confirm dialogs too)
      const shop = document.getElementById('shop-panel');
      if (shop && shop.classList.contains('active')) return;
      if (e.target.closest('#weapon-replace-dialog') || e.target.closest('#death-screen')) return;
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
