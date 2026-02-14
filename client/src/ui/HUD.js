// client/src/ui/HUD.js
import { SHOP_ITEMS, WEAPONS } from '../../../shared/constants.js';
import { getWeaponIcon } from './WeaponIcons.js';

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
    this.weaponIconEl = document.getElementById('weapon-icon');
    this.killCountEl = document.getElementById('kill-count');
    this.bossAlertEl = document.getElementById('boss-alert');
    this.shopCoinsEl = document.getElementById('shop-coins');
    this.shopOpen = false;
    this.game = null;

    this.buildShopItems();
    this.setupShop();
  }

  buildShopItems() {
    const container = document.getElementById('shop-items');
    if (!container) return;
    container.innerHTML = '';
    for (const item of SHOP_ITEMS) {
      const div = document.createElement('div');
      div.className = 'shop-item';
      div.dataset.id = item.id;
      div.innerHTML = `
        <div class="shop-icon">${getWeaponIcon(item.id)}</div>
        <div class="shop-info">
          <div class="shop-name">${item.name}</div>
          <div class="shop-desc">${item.desc}</div>
        </div>
        <span class="shop-price">$${item.price}</span>
      `;
      container.appendChild(div);
    }
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
      shopClose.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.toggleShop();
      }, { passive: false });
    }

    // Delegate click on shop items (PC only)
    const container = document.getElementById('shop-items');
    if (container) {
      container.addEventListener('click', (e) => {
        if ('ontouchstart' in window) return; // skip on mobile, handled by touch
        const item = e.target.closest('.shop-item');
        if (item) this.buyItem(item.dataset.id);
      });

      // Mobile: differentiate scroll vs tap
      let touchStartY = 0;
      let touchStartItem = null;
      container.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
        touchStartItem = e.target.closest('.shop-item');
      }, { passive: true });

      container.addEventListener('touchend', (e) => {
        if (!touchStartItem) return;
        const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
        if (dy < 10) { // tap, not scroll
          e.preventDefault();
          this.buyItem(touchStartItem.dataset.id);
        }
        touchStartItem = null;
      }, { passive: false });
    }
  }

  toggleShop() {
    this.shopOpen = !this.shopOpen;
    const shop = document.getElementById('shop-panel');
    if (shop) shop.classList.toggle('active', this.shopOpen);

    if (this.shopOpen) {
      this.updateShopAffordability();
      if (document.pointerLockElement) document.exitPointerLock();
    } else {
      const canvas = document.querySelector('canvas');
      if (canvas && !('ontouchstart' in window)) canvas.requestPointerLock();
    }
  }

  updateShopAffordability() {
    if (!this.game) return;
    const coins = this.game.player.coins;
    if (this.shopCoinsEl) this.shopCoinsEl.textContent = `$${coins}`;
    document.querySelectorAll('.shop-item').forEach(el => {
      const item = SHOP_ITEMS.find(i => i.id === el.dataset.id);
      if (item) el.classList.toggle('too-expensive', coins < item.price);
    });
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
      this.game.weapons.slots[3] = 'Grenade';
      this.game.weapons.switchSlot(3);
    } else {
      const weaponConfig = WEAPONS[itemId];
      if (weaponConfig) {
        this.game.weapons.slots[3] = itemId;
        this.game.weapons.switchSlot(3);
      }
    }

    this.updateShopAffordability();
    this.showBuyFeedback(shopItem.name);
  }

  showBuyFeedback(name) {
    const popup = document.createElement('div');
    popup.className = 'buy-popup';
    popup.textContent = `${name} purchased!`;
    document.getElementById('hud').appendChild(popup);
    setTimeout(() => popup.remove(), 1500);
  }

  updateKillCount(count) {
    if (this.killCountEl) this.killCountEl.textContent = `KILLS: ${count}`;
  }

  showBossAlert(text) {
    if (!this.bossAlertEl) return;
    this.bossAlertEl.textContent = text;
    this.bossAlertEl.classList.add('show');
    setTimeout(() => this.bossAlertEl.classList.remove('show'), 4000);
  }

  update({ health, maxHealth, ammo, maxAmmo, playerCount, coins, weaponName, currentSlot, isReloading, weaponId }) {
    const pct = (health / maxHealth) * 100;
    this.healthFill.style.width = pct + '%';
    if (pct > 50) {
      this.healthFill.style.background = 'linear-gradient(90deg, #00e676, #69f0ae)';
    } else if (pct > 25) {
      this.healthFill.style.background = 'linear-gradient(90deg, #ffa000, #ffca28)';
    } else {
      this.healthFill.style.background = 'linear-gradient(90deg, #d32f2f, #ff5252)';
    }

    if (ammo === Infinity) {
      this.ammoCurrent.textContent = '--';
      this.ammoMax.textContent = '';
    } else {
      this.ammoCurrent.textContent = isReloading ? '...' : ammo;
      this.ammoMax.textContent = `/ ${maxAmmo}`;
    }
    this.ammoCurrent.classList.toggle('low', ammo <= 5 && ammo !== Infinity);

    this.playerCount.textContent = `PLAYERS: ${playerCount}`;
    if (this.coinDisplay) this.coinDisplay.textContent = `${coins}`;
    if (this.weaponName) this.weaponName.textContent = weaponName;

    // Weapon icon
    if (this.weaponIconEl && weaponId) {
      this.weaponIconEl.innerHTML = getWeaponIcon(weaponId);
    }

    // Weapon slots highlight
    if (this.weaponSlots) {
      const slots = this.weaponSlots.children;
      for (let i = 0; i < slots.length; i++) {
        slots[i].classList.toggle('active', i === currentSlot);
      }
    }

    // Update shop coins if open
    if (this.shopOpen) this.updateShopAffordability();
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
