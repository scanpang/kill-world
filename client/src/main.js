// client/src/main.js
import './style.css';
import { Game } from './game/Game.js';

/* ─── Game Tips ─── */
const TIPS = [
  "좀비 헤드샷은 2배 데미지!",
  "더블탭으로 자동 사격 ON/OFF",
  "B키로 상점을 열어 무기를 구매하세요",
  "콤보 킬로 추가 코인 획득!",
  "스프린트 중에는 탄퍼짐이 증가합니다",
  "리로드 중에는 이동으로 피하세요",
  "보스 좀비는 일반 좀비보다 훨씬 강력합니다",
  "웨이브가 진행될수록 좀비가 강해집니다",
  "무기 슬롯은 최대 4개까지 장착 가능",
  "상점에서 레어·전설 무기를 구매할 수 있습니다",
  "점프 중 사격은 정확도가 떨어집니다",
  "코인으로 체력을 회복할 수 있습니다",
  "미니맵으로 좀비 위치를 파악하세요",
  "무기마다 사거리와 데미지가 다릅니다",
  "Shift로 스프린트, 위험할 때 도망치세요",
  "빠른 무기 교체로 DPS를 올리세요",
  "킬 피드로 전투 상황을 확인하세요",
];

/* ─── DOM Elements ─── */
const introScreen = document.getElementById('intro-screen');
const introTip = document.getElementById('intro-tip');
const introLoadingFill = document.getElementById('intro-loading-fill');
const introLoadingText = document.getElementById('intro-loading-text');
const introStartBtn = document.getElementById('intro-start');
const overlay = document.getElementById('overlay');

const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

/* ─── Show random tip ─── */
introTip.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];

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

/* ─── Initialize game (behind intro screen) ─── */
const game = new Game();

// Simulate loading progress while game initializes
let loadProgress = 0;
const loadInterval = setInterval(() => {
  loadProgress = Math.min(loadProgress + Math.random() * 15, 90);
  introLoadingFill.style.width = loadProgress + '%';
}, 200);

game.start();

// Game started — complete loading bar
clearInterval(loadInterval);
introLoadingFill.style.width = '100%';
introLoadingText.textContent = 'READY';
introStartBtn.disabled = false;
introStartBtn.classList.add('ready');

// HUD stays hidden until game actually starts
document.getElementById('hud').classList.remove('active');

/* ─── START button handler ─── */
function startGame() {
  // Fade out intro
  introScreen.classList.add('fade-out');

  setTimeout(() => {
    introScreen.classList.remove('active');
    introScreen.classList.remove('fade-out');

    // Activate HUD
    document.getElementById('hud').classList.add('active');

    // Remove overlay (intro replaces it for first start)
    overlay.classList.remove('active');

    requestFullscreen();
    if (isMobile) {
      lockLandscape();
      acquireWakeLock();
    } else {
      document.body.requestPointerLock();
    }
  }, 600);
}

introStartBtn.addEventListener('click', startGame);
introStartBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  startGame();
}, { passive: false });

/* ─── Platform-specific overlay logic (for resume after pause) ─── */
if (isMobile) {
  // Hide keyboard controls, show TAP TO PLAY
  const controlsList = overlay.querySelector('.controls-list');
  if (controlsList) controlsList.style.display = 'none';
  const desktopText = overlay.querySelector('.desktop-only');
  const mobileText = overlay.querySelector('.mobile-only');
  if (desktopText) desktopText.style.display = 'none';
  if (mobileText) mobileText.style.display = 'block';

  // Tap overlay to resume (after pause)
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
  const shopClose = document.getElementById('shop-close');
  if (shopClose) {
    shopClose.addEventListener('touchstart', () => {
      setTimeout(() => requestFullscreen(), 100);
    });
  }
  const deathRestart = document.getElementById('death-restart');
  if (deathRestart) {
    deathRestart.addEventListener('touchstart', () => {
      requestFullscreen();
    });
  }

  /* ─── Block browser default gestures ─── */
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  document.body.addEventListener('touchmove', (e) => {
    if (e.target.closest('#shop-items')) return;
    e.preventDefault();
  }, { passive: false });

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
    // Don't request pointer lock if intro is showing
    if (introScreen.classList.contains('active')) return;
    if (!document.pointerLockElement) {
      const shop = document.getElementById('shop-panel');
      if (shop && shop.classList.contains('active')) return;
      if (e.target.closest('#weapon-replace-dialog') || e.target.closest('#death-screen')) return;
      document.body.requestPointerLock();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    if (introScreen.classList.contains('active')) return;
    if (document.pointerLockElement) {
      overlay.classList.remove('active');
    } else {
      overlay.classList.add('active');
    }
  });
}
