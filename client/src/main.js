// client/src/main.js
import './style.css';
import { Game } from './game/Game.js';

document.getElementById('hud').classList.add('active');

const game = new Game();
game.start();

const overlay = document.getElementById('overlay');
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

/* ─── Fullscreen helpers ─── */
function requestFullscreen() {
  const el = document.documentElement;
  const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (rfs && !document.fullscreenElement && !document.webkitFullscreenElement) {
    rfs.call(el).catch(() => {});
  }
}

function lockLandscape() {
  try {
    const orient = screen.orientation;
    if (orient && orient.lock) {
      orient.lock('landscape').catch(() => {});
    }
  } catch (_) { /* unsupported */ }
}

/* ─── Wake Lock (prevent screen dim) ─── */
let wakeLock = null;
async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (_) { /* user denied or unsupported */ }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !wakeLock) {
    acquireWakeLock();
  }
});

if (isMobile) {
  /* ─── Mobile setup ─── */

  // Hide keyboard controls, show TAP TO PLAY
  const controlsList = overlay.querySelector('.controls-list');
  if (controlsList) controlsList.style.display = 'none';
  const desktopText = overlay.querySelector('.desktop-only');
  const mobileText = overlay.querySelector('.mobile-only');
  if (desktopText) desktopText.style.display = 'none';
  if (mobileText) mobileText.style.display = 'block';

  // Tap overlay to start + enter fullscreen
  overlay.addEventListener('touchstart', (e) => {
    e.preventDefault();
    overlay.classList.remove('active');
    requestFullscreen();
    lockLandscape();
    acquireWakeLock();
  }, { passive: false });

  /* ─── Fullscreen restore button ─── */
  const fsBtn = document.getElementById('fullscreen-btn');

  function onFullscreenChange() {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (fsBtn) {
      fsBtn.classList.toggle('visible', !isFs);
    }
  }

  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  if (fsBtn) {
    fsBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      requestFullscreen();
      lockLandscape();
    }, { passive: false });
  }

  /* ─── Re-request fullscreen on key interactions ─── */
  // Shop close
  const shopClose = document.getElementById('shop-close');
  if (shopClose) {
    shopClose.addEventListener('touchstart', () => {
      setTimeout(() => requestFullscreen(), 100);
    });
  }
  // Death restart
  const deathRestart = document.getElementById('death-restart');
  if (deathRestart) {
    deathRestart.addEventListener('touchstart', () => {
      requestFullscreen();
    });
  }

  /* ─── Block browser default gestures ─── */

  // Prevent context menu (long press)
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // Prevent pull-to-refresh and overscroll on body
  document.body.addEventListener('touchmove', (e) => {
    // Allow scrolling inside shop-items
    if (e.target.closest('#shop-items')) return;
    e.preventDefault();
  }, { passive: false });

  // Prevent double-tap zoom
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd < 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

} else {
  /* ─── Desktop setup ─── */

  // Click to lock pointer (skip UI panels)
  document.addEventListener('click', (e) => {
    if (!document.pointerLockElement) {
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
