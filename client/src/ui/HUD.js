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
    this.stageInfoEl = document.getElementById('stage-info');
    this.shopOpen = false;
    this.shopAvailable = false; // Only available after boss kill
    this.game = null;
    this.purchaseCounts = {}; // track consumable purchase counts

    this.buildShopItems();
    this.setupShop();
  }

  getItemPrice(item) {
    if (item.category !== 'consumable') return item.price;
    const count = this.purchaseCounts[item.id] || 0;
    return Math.floor(item.price * Math.pow(1.5, count));
  }

  buildShopItems() {
    const container = document.getElementById('shop-items');
    if (!container) return;
    container.innerHTML = '';

    const sections = [
      { label: '주무기', filter: i => i.category === 'weapon' && i.slot === 0 },
      { label: '보조무기', filter: i => i.category === 'weapon' && i.slot === 1 },
      { label: '근접무기', filter: i => i.category === 'weapon' && i.slot === 2 },
      { label: '소모품', filter: i => i.category === 'consumable' },
    ];

    for (const sec of sections) {
      const items = SHOP_ITEMS.filter(sec.filter);
      if (items.length === 0) continue;

      const header = document.createElement('div');
      header.className = 'shop-section-header';
      header.textContent = `${sec.label} (${items.length})`;
      container.appendChild(header);

      for (const item of items) {
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.dataset.id = item.id;
        if (item.tier) div.dataset.tier = item.tier;
        const tierBadge = item.tier === 'legendary' ? '<span class="tier-badge legendary">★ 전설</span>'
                        : item.tier === 'rare' ? '<span class="tier-badge rare">◆ 레어</span>'
                        : '';
        const price = this.getItemPrice(item);
        const countLabel = item.category === 'consumable' && this.purchaseCounts[item.id]
          ? `<span class="shop-bought-count">x${this.purchaseCounts[item.id]}</span>` : '';
        div.innerHTML = `
          <div class="shop-icon">${getWeaponIcon(item.id)}</div>
          <div class="shop-info">
            <div class="shop-name">${item.name} ${tierBadge}</div>
            <div class="shop-desc">${item.desc}</div>
          </div>
          ${countLabel}
          <span class="shop-price" data-id="${item.id}">$${price}</span>
          <button class="shop-buy-btn" data-id="${item.id}">구매</button>
        `;
        container.appendChild(div);
      }
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
      // Buy button click (PC)
      container.addEventListener('click', (e) => {
        const btn = e.target.closest('.shop-buy-btn');
        if (btn) {
          e.stopPropagation();
          this.buyItem(btn.dataset.id);
        }
      });

      // Buy button touch (Mobile)
      container.addEventListener('touchend', (e) => {
        const btn = e.target.closest('.shop-buy-btn');
        if (btn) {
          e.preventDefault();
          e.stopPropagation();
          this.buyItem(btn.dataset.id);
        }
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
      if (!item) return;
      const price = this.getItemPrice(item);
      el.classList.toggle('too-expensive', coins < price);
      // Update displayed price for consumables
      const priceEl = el.querySelector('.shop-price');
      if (priceEl) priceEl.textContent = `$${price}`;
    });
  }

  buyItem(itemId) {
    if (!this.game) return;
    const shopItem = SHOP_ITEMS.find(i => i.id === itemId);
    if (!shopItem) return;
    const price = this.getItemPrice(shopItem);
    if (this.game.player.coins < price) return;

    // Step 1: Always ask "구매하시겠습니까?"
    this.showConfirmDialog(`${shopItem.name} 구매하시겠습니까? ($${price})`, () => {
      // Step 2: If weapon with same slot exists, warn about deletion
      const weaponConfig = WEAPONS[itemId];
      if (weaponConfig && shopItem.category === 'weapon') {
        const slot = shopItem.slot !== undefined ? shopItem.slot : weaponConfig.slot;
        const existingId = this.game.weapons.slots[slot];
        if (existingId && existingId !== itemId) {
          const existingName = WEAPONS[existingId] ? WEAPONS[existingId].name : existingId;
          this.showConfirmDialog(
            `${existingName}이(가) 삭제됩니다. 그래도 구매하시겠습니까?`,
            () => this.executeBuy(itemId, shopItem)
          );
          return;
        }
      }
      this.executeBuy(itemId, shopItem);
    });
  }

  executeBuy(itemId, shopItem) {
    const price = this.getItemPrice(shopItem);
    this.game.player.coins -= price;

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
        this.game.weapons.maxAmmo = this.game.weapons.getEffectiveMaxAmmo(this.game.weapons.currentWeaponId);
        break;
      case 'SpeedUp':
        this.game.player.speedBonus += 0.05;
        break;
      case 'CritUp':
        this.game.player.critChance += 0.05;
        break;
      case 'FireRateUp':
        this.game.player.fireRateBonus += 0.1;
        this.game.weapons.refreshGlow();
        break;
      case 'DamageUp':
        this.game.player.damageBonus += 0.1;
        this.game.weapons.refreshGlow();
        break;
      default: {
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

    // Increment purchase count for consumables (escalating price)
    if (shopItem.category === 'consumable') {
      this.purchaseCounts[itemId] = (this.purchaseCounts[itemId] || 0) + 1;
      this.buildShopItems(); // rebuild to show updated prices & counts
    }

    this.updateShopAffordability();
    this.showBuyFeedback(shopItem.name);
  }

  showConfirmDialog(message, onYes) {
    // Remove existing dialog if any
    const old = document.getElementById('shop-confirm');
    if (old) old.remove();

    const dialog = document.createElement('div');
    dialog.id = 'shop-confirm';
    dialog.innerHTML = `
      <div class="confirm-msg">${message}</div>
      <div class="confirm-btns">
        <button class="confirm-yes">YES</button>
        <button class="confirm-no">NO</button>
      </div>
    `;
    document.getElementById('shop-panel').appendChild(dialog);

    dialog.querySelector('.confirm-yes').addEventListener('click', () => {
      dialog.remove();
      onYes();
    });
    dialog.querySelector('.confirm-no').addEventListener('click', () => {
      dialog.remove();
    });
  }

  showWeaponReplaceDialog(currentName, newName, onYes, onNo) {
    const old = document.getElementById('weapon-replace-dialog');
    if (old) old.remove();

    const dialog = document.createElement('div');
    dialog.id = 'weapon-replace-dialog';
    dialog.innerHTML = `
      <div class="replace-msg">현재 ${currentName}을(를)<br>${newName}(으)로 교체하시겠습니까?</div>
      <div class="replace-btns">
        <button class="replace-yes">YES</button>
        <button class="replace-no">NO</button>
      </div>
    `;
    document.body.appendChild(dialog);

    dialog.querySelector('.replace-yes').addEventListener('click', () => {
      dialog.remove();
      onYes();
    });
    dialog.querySelector('.replace-no').addEventListener('click', () => {
      dialog.remove();
      onNo();
    });

    // Auto-close after 10 seconds
    setTimeout(() => {
      if (dialog.parentNode) {
        dialog.remove();
        onNo();
      }
    }, 10000);
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
           currentSlot, isReloading, weaponId, level, xp, xpToNext, damageBonus, wave,
           bossKills, totalKills, slots }) {
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

    if (this.weaponSlots && slots) {
      const slotEls = this.weaponSlots.children;
      for (let i = 0; i < slotEls.length; i++) {
        slotEls[i].classList.toggle('active', i === currentSlot);
        const hasWeapon = slots[i] && WEAPONS[slots[i]];
        slotEls[i].classList.toggle('empty-slot', !hasWeapon);
      }
    }

    // Stage info
    if (this.stageInfoEl && bossKills !== undefined) {
      this.stageInfoEl.textContent = `WAVE ${wave} | BOSS ${bossKills}킬 | ZOMBIE ${totalKills}킬`;
    }

    // Mobile weapon switch buttons
    const mobileSlots = document.querySelectorAll('.ws-btn');
    if (mobileSlots.length > 0 && slots) {
      mobileSlots.forEach(btn => {
        const idx = parseInt(btn.dataset.slot);
        const hasWeapon = slots[idx] && WEAPONS[slots[idx]];
        btn.classList.toggle('empty-slot', !hasWeapon);
        btn.classList.toggle('active', idx === currentSlot);
      });
    }

    if (this.shopOpen) this.updateShopAffordability();
  }

  showHitMarker(isHeadshot = false, isCrit = false, isWeakness = false) {
    this.hitMarker.classList.add('show');
    this.hitMarker.querySelectorAll('.hm').forEach(el => {
      if (isWeakness) {
        el.style.background = '#00ffaa';
      } else if (isCrit) {
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
