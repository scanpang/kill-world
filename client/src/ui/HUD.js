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
    this.levelEl = document.getElementById('player-level');
    this.xpFillEl = document.getElementById('xp-fill');
    this.comboEl = document.getElementById('combo-counter');
    this.shopOpen = false;
    this.shopAvailable = false; // Only available after boss kill
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
      shopClose.addEventListener('click', () => this.closeShop());
      shopClose.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.closeShop();
      }, { passive: false });
    }

    const container = document.getElementById('shop-items');
    if (container) {
      container.addEventListener('click', (e) => {
        if ('ontouchstart' in window) return;
        const item = e.target.closest('.shop-item');
        if (item) this.buyItem(item.dataset.id);
      });

      let touchStartY = 0;
      let touchStartItem = null;
      container.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
        touchStartItem = e.target.closest('.shop-item');
      }, { passive: true });

      container.addEventListener('touchend', (e) => {
        if (!touchStartItem) return;
        const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
        if (dy < 10) {
          e.preventDefault();
          this.buyItem(touchStartItem.dataset.id);
        }
        touchStartItem = null;
      }, { passive: false });
    }
  }

  toggleShop() {
    if (this.shopOpen) {
      this.closeShop();
    } else {
      this.openShop();
    }
  }

  openShop() {
    this.shopOpen = true;
    const shop = document.getElementById('shop-panel');
    if (shop) shop.classList.add('active');
    this.updateShopAffordability();
    if (document.pointerLockElement) document.exitPointerLock();
  }

  closeShop() {
    this.shopOpen = false;
    const shop = document.getElementById('shop-panel');
    if (shop) shop.classList.remove('active');
    const canvas = document.querySelector('canvas');
    if (canvas && !('ontouchstart' in window)) canvas.requestPointerLock();
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

    switch (itemId) {
      case 'HealthPack':
        this.game.player.health = Math.min(
          this.game.player.health + Math.floor(this.game.player.maxHealth * 0.3),
          this.game.player.maxHealth
        );
        break;
      case 'MaxHPUp':
        this.game.player.maxHealth += 20;
        this.game.player.health += 20;
        break;
      case 'MagUp':
        this.game.player.magBonus += 0.2;
        // Update current weapon max ammo
        this.game.weapons.maxAmmo = this.game.weapons.getEffectiveMaxAmmo(this.game.weapons.currentWeaponId);
        break;
      case 'SpeedUp':
        this.game.player.speedBonus += 0.05;
        break;
      case 'CritUp':
        this.game.player.critChance += 0.05;
        break;
      default: {
        // Weapon purchase
        const weaponConfig = WEAPONS[itemId];
        if (weaponConfig) {
          const slot = shopItem.slot !== undefined ? shopItem.slot : weaponConfig.slot;
          this.game.weapons.slots[slot] = itemId;
          this.game.weapons.slotAmmo[itemId] = this.game.weapons.getEffectiveMaxAmmo(itemId);
          this.game.weapons.switchSlot(slot);
        }
        break;
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

  updateCombo(count) {
    if (!this.comboEl) return;
    if (count >= 3) {
      this.comboEl.textContent = `${count} COMBO`;
      this.comboEl.classList.add('show');
      if (count >= 5) this.comboEl.classList.add('bonus');
      if (count >= 10) this.comboEl.classList.add('mega');
    } else {
      this.comboEl.classList.remove('show', 'bonus', 'mega');
    }
  }

  showBossAlert(text) {
    if (!this.bossAlertEl) return;
    this.bossAlertEl.textContent = text;
    this.bossAlertEl.classList.add('show');
    setTimeout(() => this.bossAlertEl.classList.remove('show'), 4000);
  }

  showZombieLevelUp(level) {
    setTimeout(() => {
      this.showBossAlert(`ZOMBIES LEVELED UP! Lv.${level}`);
    }, 2000);
  }

  screenShake() {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.classList.add('screen-shake');
      setTimeout(() => canvas.classList.remove('screen-shake'), 600);
    }
  }

  showScreenFlash(color = 0xffffff) {
    const flash = document.createElement('div');
    flash.className = 'screen-flash';
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    flash.style.background = `rgba(${r},${g},${b},0.4)`;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 600);
  }

  showWeaponDropEffect() {
    const effect = document.createElement('div');
    effect.className = 'weapon-drop-effect';
    effect.textContent = 'SPECIAL WEAPON!';
    document.getElementById('hud').appendChild(effect);
    setTimeout(() => effect.remove(), 3000);
  }

  update({ health, maxHealth, ammo, maxAmmo, playerCount, coins, weaponName,
           currentSlot, isReloading, weaponId, level, xp, xpToNext, damageBonus, wave }) {
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

    if (this.levelEl) {
      let levelText = `Lv.${level}`;
      if (damageBonus > 0) levelText += ` (+${damageBonus}%)`;
      this.levelEl.textContent = levelText;
    }
    if (this.xpFillEl && xpToNext > 0) {
      this.xpFillEl.style.width = ((xp / xpToNext) * 100) + '%';
    }

    if (this.weaponIconEl && weaponId) {
      this.weaponIconEl.innerHTML = getWeaponIcon(weaponId);
    }

    if (this.weaponSlots) {
      const slots = this.weaponSlots.children;
      for (let i = 0; i < slots.length; i++) {
        slots[i].classList.toggle('active', i === currentSlot);
        const hasWeapon = this.game && this.game.weapons.slots[i];
        slots[i].classList.toggle('empty-slot', !hasWeapon);
      }
    }

    if (this.shopOpen) this.updateShopAffordability();
  }

  showHitMarker(isHeadshot = false, isCrit = false) {
    this.hitMarker.classList.add('show');
    this.hitMarker.querySelectorAll('.hm').forEach(el => {
      if (isCrit) {
        el.style.background = '#ffcc00';
      } else if (isHeadshot) {
        el.style.background = '#ff0000';
      } else {
        el.style.background = '#fff';
      }
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
