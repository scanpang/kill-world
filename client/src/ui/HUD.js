// client/src/ui/HUD.js
import { SHOP_ITEMS, WEAPONS } from '../../../shared/constants.js';

export class HUD {
  constructor() {
    this.healthFill = document.getElementById('health-fill');
    this.ammoCurrent = document.getElementById('ammo-current');
    this.ammoMax = document.getElementById('ammo-max');
    this.playerCount = document.getElementById('player-count');
    this.killFeed = document.getElementById('kill-feed');
    this.hitMarker = document.getElementById('hit-marker');
    this.coinDisplay = document.getElementById('coin-display');
    this.weaponName = document.getElementById('weapon-name');
    this.weaponSlots = document.getElementById('weapon-slots');
    this.shopOpen = false;
    this.game = null;

    this.setupShop();
  }

  setupShop() {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyB') this.toggleShop();
    });

    const shopBtn = document.getElementById('btn-shop');
    if (shopBtn) {
      shopBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.toggleShop();
      }, { passive: false });
    }

    const shopClose = document.getElementById('shop-close');
    if (shopClose) {
      shopClose.addEventListener('click', () => this.toggleShop());
    }

    // Shop item buttons
    const shopItems = document.querySelectorAll('.shop-item');
    shopItems.forEach(item => {
      item.addEventListener('click', () => {
        const itemId = item.dataset.id;
        this.buyItem(itemId);
      });
    });
  }

  toggleShop() {
    this.shopOpen = !this.shopOpen;
    const shop = document.getElementById('shop-panel');
    if (shop) {
      shop.classList.toggle('active', this.shopOpen);
    }
    // PC: release pointer lock when shop is open so user can click items
    if (this.shopOpen) {
      if (document.pointerLockElement) document.exitPointerLock();
    } else {
      const canvas = document.querySelector('canvas');
      if (canvas && !('ontouchstart' in window)) canvas.requestPointerLock();
    }
  }

  buyItem(itemId) {
    if (!this.game) return;
    const shopItem = SHOP_ITEMS.find(i => i.id === itemId);
    if (!shopItem) return;

    if (this.game.player.coins < shopItem.price) return;

    this.game.player.coins -= shopItem.price;

    if (itemId === 'HealthPack') {
      this.game.player.health = Math.min(
        this.game.player.health + 50,
        this.game.player.maxHealth
      );
    } else if (itemId === 'Grenade') {
      this.game.weapons.currentAmmo = 3;
    } else {
      // Replace slot 4 with purchased weapon, or add to available
      const weaponConfig = WEAPONS[itemId];
      if (weaponConfig) {
        this.game.weapons.slots[3] = itemId;
        this.game.weapons.switchSlot(3);
      }
    }

    this.toggleShop();
  }

  update({ health, maxHealth, ammo, maxAmmo, playerCount, coins, weaponName, currentSlot, isReloading }) {
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
    if (ammo === Infinity) {
      this.ammoCurrent.textContent = '--';
      this.ammoMax.textContent = '';
    } else {
      this.ammoCurrent.textContent = isReloading ? '...' : ammo;
      this.ammoMax.textContent = `/ ${maxAmmo}`;
    }

    if (ammo <= 5 && ammo !== Infinity) {
      this.ammoCurrent.style.color = '#ff5252';
    } else {
      this.ammoCurrent.style.color = '#fff';
    }

    // Player count
    this.playerCount.textContent = `PLAYERS: ${playerCount}`;

    // Coins
    if (this.coinDisplay) {
      this.coinDisplay.textContent = `${coins}`;
    }

    // Weapon name
    if (this.weaponName) {
      this.weaponName.textContent = weaponName;
    }

    // Weapon slots highlight
    if (this.weaponSlots) {
      const slots = this.weaponSlots.children;
      for (let i = 0; i < slots.length; i++) {
        slots[i].classList.toggle('active', i === currentSlot);
      }
    }
  }

  showHitMarker(isHeadshot = false) {
    this.hitMarker.classList.add('show');
    this.hitMarker.querySelectorAll('.hm').forEach(el => {
      el.style.background = isHeadshot ? '#ff0000' : '#fff';
    });
    setTimeout(() => this.hitMarker.classList.remove('show'), 150);
  }

  showCoinPopup(amount) {
    const popup = document.createElement('div');
    popup.className = 'coin-popup';
    popup.textContent = `+${amount}`;
    document.getElementById('hud').appendChild(popup);
    setTimeout(() => popup.remove(), 1200);
  }

  addKillFeedEntry(killer, victim) {
    const entry = document.createElement('div');
    entry.className = 'kill-entry';
    entry.innerHTML = `<span class="killer">${killer}</span> ► <span class="victim">${victim}</span>`;
    this.killFeed.prepend(entry);
    while (this.killFeed.children.length > 5) this.killFeed.lastChild.remove();
    setTimeout(() => { if (entry.parentNode) entry.remove(); }, 5000);
  }
}
