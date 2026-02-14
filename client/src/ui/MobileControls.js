// client/src/ui/MobileControls.js

export class MobileControls {
  constructor(player, weaponSystem) {
    this.player = player;
    this.weapons = weaponSystem;
    this.enabled = false;

    // Joystick state
    this.moveX = 0;
    this.moveY = 0;
    this.joystickActive = false;
    this.joystickTouchId = null;
    this.joystickOrigin = { x: 0, y: 0 };

    // Look state
    this.lookTouchId = null;
    this.lastLookPos = { x: 0, y: 0 };

    // Shoot state
    this.shootInterval = null;
  }

  init() {
    if (!this.isMobile()) return;
    this.enabled = true;

    // Show mobile UI
    document.getElementById('mobile-controls').style.display = 'block';

    // Hide desktop-only elements
    document.querySelector('.crosshair').style.display = 'block';

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

        this.moveX = dx / maxDist;
        this.moveY = dy / maxDist;

        stick.style.left = (this.joystickOrigin.x + dx - 20) + 'px';
        stick.style.top = (this.joystickOrigin.y + dy - 20) + 'px';
      }
    }, { passive: false });

    const endJoystick = (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier !== this.joystickTouchId) continue;
        this.joystickActive = false;
        this.joystickTouchId = null;
        this.moveX = 0;
        this.moveY = 0;
        // Clear movement keys
        this.player.keys['KeyW'] = false;
        this.player.keys['KeyS'] = false;
        this.player.keys['KeyA'] = false;
        this.player.keys['KeyD'] = false;
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
    // Shoot button
    const shootBtn = document.getElementById('btn-shoot');
    shootBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.weapons.isShooting = true;
      if (!this.weapons.config.auto) {
        this.weapons.shoot();
      }
    }, { passive: false });
    shootBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.weapons.isShooting = false;
    });

    // Jump button
    const jumpBtn = document.getElementById('btn-jump');
    jumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.player.keys['Space'] = true;
    }, { passive: false });
    jumpBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.player.keys['Space'] = false;
    });

    // Reload button
    const reloadBtn = document.getElementById('btn-reload');
    reloadBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.weapons.reload();
    }, { passive: false });
  }

  update() {
    if (!this.enabled || !this.joystickActive) return;

    // Convert joystick input to WASD-like keys
    this.player.keys['KeyW'] = this.moveY < -0.2;
    this.player.keys['KeyS'] = this.moveY > 0.2;
    this.player.keys['KeyA'] = this.moveX < -0.2;
    this.player.keys['KeyD'] = this.moveX > 0.2;

    // Sprint if joystick pushed to edge
    const dist = Math.sqrt(this.moveX * this.moveX + this.moveY * this.moveY);
    this.player.isSprinting = dist > 0.85;
  }
}
