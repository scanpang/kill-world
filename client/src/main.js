// client/src/main.js
import './style.css';
import { Game } from './game/Game.js';

document.getElementById('hud').classList.add('active');

const game = new Game();
game.start();

const pauseMenu = document.getElementById('pause-menu');
const btnResume = document.getElementById('btn-resume');
const btnControls = document.getElementById('btn-controls');
let isPaused = false;

function showPause() {
  isPaused = true;
  pauseMenu.classList.add('active');
}

function hidePause() {
  isPaused = false;
  pauseMenu.classList.remove('active');
  document.body.requestPointerLock();
}

// Click to lock pointer for FPS controls
document.addEventListener('click', (e) => {
  if (!isPaused && !document.pointerLockElement) {
    document.body.requestPointerLock();
  }
});

// ESC releases pointer lock → show pause menu
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement) {
    showPause();
    game.pause();
  }
});

// Resume button
btnResume.addEventListener('click', (e) => {
  e.stopPropagation();
  hidePause();
});

// Controls button
btnControls.addEventListener('click', (e) => {
  e.stopPropagation();
  alert('WASD: Move\nR (hold): Sprint\nSpace: Jump\nMouse: Look\nLeft Click: Shoot\nESC: Pause');
});
