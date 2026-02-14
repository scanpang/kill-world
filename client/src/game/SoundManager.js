// client/src/game/SoundManager.js

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.bgmPlaying = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.15;
      this.bgmGain.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.3;
      this.sfxGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Audio not supported');
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // ── Weapon Sounds ──

  playGunshot(weaponId) {
    if (!this.ctx) return;
    this.resume();

    switch (weaponId) {
      case 'MachineGun':
      case 'Glock':
        this._shot(0.06, 150, 80, 0.4);
        break;
      case 'Pistol':
      case 'Revolver':
        this._shot(0.1, 200, 60, 0.5);
        break;
      case 'Minigun':
      case 'HellFire':
        this._shot(0.04, 120, 100, 0.3);
        break;
      case 'Shotgun':
        this._shotgunBlast();
        break;
      case 'Sniper':
        this._shot(0.15, 100, 40, 0.7);
        break;
      case 'BossGun':
      case 'LaserRifle':
        this._laserShot();
        break;
      case 'ThunderGun':
        this._thunderShot();
        break;
      case 'FrostCannon':
        this._frostShot();
        break;
      default:
        this._shot(0.08, 150, 70, 0.4);
    }
  }

  _shot(duration, freq, noiseFreq, volume) {
    const t = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + duration);
    g.connect(this.sfxGain);

    // Noise burst
    const bufSize = this.ctx.sampleRate * duration;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = noiseFreq;
    noise.connect(lp);
    lp.connect(g);
    noise.start(t);

    // Tone pop
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + duration);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(volume * 0.5, t);
    og.gain.exponentialRampToValueAtTime(0.01, t + duration * 0.5);
    osc.connect(og);
    og.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  _shotgunBlast() {
    const t = this.ctx.currentTime;
    const dur = 0.15;
    const bufSize = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.15));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + dur);
    noise.connect(g);
    g.connect(this.sfxGain);
    noise.start(t);
  }

  _laserShot() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.15);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  _thunderShot() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.25);

    // Crackle
    this._shot(0.12, 80, 200, 0.3);
  }

  _frostShot() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(2000, t + 0.1);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playMelee() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  playGrenade() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    // Throw whoosh
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  playExplosion() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const dur = 0.5;
    // Big boom noise
    const bufSize = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.2));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(200, t);
    lp.frequency.exponentialRampToValueAtTime(50, t + dur);
    noise.connect(lp);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.8, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + dur);
    lp.connect(g);
    g.connect(this.sfxGain);
    noise.start(t);

    // Sub bass thump
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(60, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.3);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.6, t);
    og.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    osc.connect(og);
    og.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  playReload() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    // Click
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.03);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.03);

    // Clack
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 600;
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0.2, t + 0.1);
    g2.gain.exponentialRampToValueAtTime(0.01, t + 0.13);
    osc2.connect(g2);
    g2.connect(this.sfxGain);
    osc2.start(t + 0.1);
    osc2.stop(t + 0.13);
  }

  // ── Zombie Sounds ──

  playZombieGrowl() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const dur = 0.4 + Math.random() * 0.3;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    const baseFreq = 60 + Math.random() * 40;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.setValueAtTime(baseFreq * 1.2, t + dur * 0.3);
    osc.frequency.setValueAtTime(baseFreq * 0.8, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.15, t + 0.05);
    g.gain.setValueAtTime(0.15, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.01, t + dur);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300;
    osc.connect(lp);
    lp.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur);
  }

  playZombieHit() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const bufSize = this.ctx.sampleRate * 0.08;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
    noise.connect(g);
    g.connect(this.sfxGain);
    noise.start(t);
  }

  playZombieDeath() {
    if (!this.ctx) return;
    this.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.4);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 250;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
    osc.connect(lp);
    lp.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  // ── Background Music ──

  startBGM() {
    if (!this.ctx || this.bgmPlaying) return;
    this.resume();
    this.bgmPlaying = true;
    this._playBGMLoop();
  }

  _playBGMLoop() {
    if (!this.bgmPlaying || !this.ctx) return;

    const t = this.ctx.currentTime;
    const bpm = 100;
    const beat = 60 / bpm;

    // Dark ambient bass loop
    const notes = [40, 40, 45, 40, 38, 38, 45, 38];
    const loopDur = notes.length * beat;

    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = notes[i];
      const g = this.ctx.createGain();
      const noteStart = t + i * beat;
      g.gain.setValueAtTime(0, noteStart);
      g.gain.linearRampToValueAtTime(0.12, noteStart + 0.05);
      g.gain.setValueAtTime(0.12, noteStart + beat * 0.7);
      g.gain.linearRampToValueAtTime(0, noteStart + beat);
      osc.connect(g);
      g.connect(this.bgmGain);
      osc.start(noteStart);
      osc.stop(noteStart + beat);
    }

    // Subtle pad
    const pad = this.ctx.createOscillator();
    pad.type = 'sine';
    pad.frequency.value = 80;
    const padG = this.ctx.createGain();
    padG.gain.setValueAtTime(0.06, t);
    pad.connect(padG);
    padG.connect(this.bgmGain);
    pad.start(t);
    pad.stop(t + loopDur);

    // Schedule next loop
    this._bgmTimer = setTimeout(() => this._playBGMLoop(), loopDur * 1000 - 50);
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this._bgmTimer) clearTimeout(this._bgmTimer);
  }
}
