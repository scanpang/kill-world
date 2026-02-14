// client/src/ui/MobileControls.js

export class MobileControls {
  constructor(player, weaponSystem) {
    this.player = player;
    this.weapons = weaponSystem;
    this.enabled = false;

    // Joystick state
    this.joystickActive = false;
    this.joystickTouchId = null;
    this.joystickOrigin = { x: 0, y: 0 };

    // Look state
    this.lookTouchId = null;
    this.lastLookPos = { x: 0, y: 0 };
  }

  init() {
    if (!this.isMobile()) return;
    this.enabled = true;

    document.getElementById('mobile-controls').style.display = 'block';

    this.setupJoystick();
    this.setupLook();
    this.setupButtons();
  }

  isMobile() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  setupJoystick() {
    const zone = document.getElementById('joystick-zone');
    const stick = document.getElementById('joystick-stick');
    const base = document.getElementById('joystick-base');
    const maxDist = 50;

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this.joystickTouchId = touch.identifier;
      this.joystickActive = true;
      this.joystickOrigin = { x: touch.clientX, y: touch.clientY };

      base.style.left = (touch.clientX - 60) + 'px';
      base.style.top = (touch.clientY - 60) + 'px';
      base.style.opacity = '1';
      stick.style.opacity = '1';
      stick.style.left = (touch.clientX - 20) + 'px';
      stick.style.top = (touch.clientY - 20) + 'px';
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        if (touch.identifier !== this.joystickTouchId) continue;

        let dx = touch.clientX - this.joystickOrigin.x;
        let dy = touch.clientY - this.joystickOrigin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > maxDist) {
          dx = (dx / dist) * maxDist;
          dy = (dy / dist) * maxDist;
        }

        // Set analog input directly on player
        this.player.mobileMove.x = dx / maxDist;
        this.player.mobileMove.y = dy / maxDist;

        stick.style.left = (this.joystickOrigin.x + dx - 20) + 'px';
        stick.style.top = (this.joystickOrigin.y + dy - 20) + 'px';
      }
    }, { passive: false });

    const endJoystick = (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier !== this.joystickTouchId) continue;
        this.joystickActive = false;
        this.joystickTouchId = null;

        // Clear mobile input
        this.player.mobileMove.x = 0;
        this.player.mobileMove.y = 0;
        this.player.isSprinting = false;

        base.style.opacity = '0.3';
        stick.style.opacity = '0.3';
        stick.style.left = base.style.left ? (parseInt(base.style.left) + 40) + 'px' : '60px';
        stick.style.top = base.style.top ? (parseInt(base.style.top) + 40) + 'px' : '60px';
      }
    };

    zone.addEventListener('touchend', endJoystick);
    zone.addEventListener('touchcancel', endJoystick);
  }

  setupLook() {
    const zone = document.getElementById('look-zone');

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this.lookTouchId = touch.identifier;
      this.lastLookPos = { x: touch.clientX, y: touch.clientY };
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        if (touch.identifier !== this.lookTouchId) continue;

        const dx = touch.clientX - this.lastLookPos.x;
        const dy = touch.clientY - this.lastLookPos.y;

        this.player.rotation.y -= dx * 0.01;
        this.player.rotation.x -= dy * 0.01;
        this.player.rotation.x = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.player.rotation.x));

        this.lastLookPos = { x: touch.clientX, y: touch.clientY };
      }
    }, { passive: false });

    const endLook = (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === this.lookTouchId) {
          this.lookTouchId = null;
        }
      }
    };

    zone.addEventListener('touchend', endLook);
    zone.addEventListener('touchcancel', endLook);
  }

  setupButtons() {
    const shootBtn = document.getElementById('btn-shoot');
    shootBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.weapons.isShooting = true;
      if (!this.weapons.config.auto) this.weapons.shoot();
    }, { passive: false });
    shootBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.weapons.isShooting = false;
    });

    const jumpBtn = document.getElementById('btn-jump');
    jumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.player.keys['Space'] = true;
    }, { passive: false });
    jumpBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.player.keys['Space'] = false;
    });

    const reloadBtn = document.getElementById('btn-reload');
    reloadBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.weapons.reload();
    }, { passive: false });

    // Weapon switch buttons
    const wsBtns = document.querySelectorAll('.ws-btn');
    wsBtns.forEach(btn => {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const slot = parseInt(btn.dataset.slot);
        this.weapons.switchSlot(slot);
        // Update button highlight
        wsBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }, { passive: false });
    });
  }

  update() {
    // No per-frame update needed - all input handled via touch events
  }
}
