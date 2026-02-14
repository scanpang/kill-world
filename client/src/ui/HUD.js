// client/src/ui/HUD.js

export class HUD {
  constructor() {
    this.healthFill = document.getElementById('health-fill');
    this.ammoCurrent = document.getElementById('ammo-current');
    this.ammoMax = document.getElementById('ammo-max');
    this.playerCount = document.getElementById('player-count');
    this.killFeed = document.getElementById('kill-feed');
    this.hitMarker = document.getElementById('hit-marker');
  }

  update({ health, maxHealth, ammo, maxAmmo, playerCount }) {
    // Health bar
    const pct = (health / maxHealth) * 100;
    this.healthFill.style.width = pct + '%';

    if (pct > 50) {
      this.healthFill.style.background = 'linear-gradient(90deg, #00e676, #69f0ae)';
    } else if (pct > 25) {
      this.healthFill.style.background = 'linear-gradient(90deg, #ffa000, #ffca28)';
    } else {
      this.healthFill.style.background = 'linear-gradient(90deg, #d32f2f, #ff5252)';
    }

    // Ammo
    this.ammoCurrent.textContent = ammo;
    this.ammoMax.textContent = `/ ${maxAmmo}`;

    if (ammo <= 5) {
      this.ammoCurrent.style.color = '#ff5252';
    } else {
      this.ammoCurrent.style.color = '#fff';
    }

    // Player count
    this.playerCount.textContent = `PLAYERS: ${playerCount}`;
  }

  showHitMarker(isHeadshot = false) {
    this.hitMarker.classList.add('show');
    if (isHeadshot) {
      this.hitMarker.querySelectorAll('.hm').forEach(el => {
        el.style.background = '#ff0000';
      });
    } else {
      this.hitMarker.querySelectorAll('.hm').forEach(el => {
        el.style.background = '#fff';
      });
    }

    setTimeout(() => {
      this.hitMarker.classList.remove('show');
    }, 150);
  }

  addKillFeedEntry(killer, victim, weapon = '') {
    const entry = document.createElement('div');
    entry.className = 'kill-entry';
    entry.innerHTML = `<span class="killer">${killer}</span> ► <span class="victim">${victim}</span>`;
    this.killFeed.prepend(entry);

    // Max 5 entries
    while (this.killFeed.children.length > 5) {
      this.killFeed.lastChild.remove();
    }

    // Auto remove after 5s
    setTimeout(() => {
      if (entry.parentNode) entry.remove();
    }, 5000);
  }
}
