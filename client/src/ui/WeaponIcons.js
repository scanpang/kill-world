// client/src/ui/WeaponIcons.js

const ICONS = {
  BasicGun: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="4" y="10" width="26" height="5" rx="1"/>
    <rect x="30" y="9" width="14" height="4" rx="1"/>
    <rect x="30" y="13" width="10" height="2"/>
    <rect x="12" y="15" width="6" height="8" rx="1"/>
    <rect x="16" y="5" width="3" height="6" rx=".5"/>
    <rect x="2" y="9" width="4" height="3" rx=".5"/>
  </svg>`,

  Minigun: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="4" y="6" width="26" height="2.5" rx=".5"/>
    <rect x="4" y="10" width="26" height="2.5" rx=".5"/>
    <rect x="4" y="14" width="26" height="2.5" rx=".5"/>
    <rect x="4" y="18" width="26" height="2.5" rx=".5"/>
    <rect x="30" y="4" width="14" height="20" rx="3"/>
    <rect x="12" y="21" width="6" height="5" rx="1"/>
  </svg>`,

  Shotgun: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="2" y="11" width="34" height="4" rx="1"/>
    <rect x="36" y="9" width="10" height="8" rx="2"/>
    <rect x="22" y="15" width="8" height="4" rx="1"/>
    <rect x="8" y="15" width="5" height="6" rx="1"/>
  </svg>`,

  Revolver: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="8" y="9" width="20" height="5" rx="1"/>
    <rect x="28" y="8" width="12" height="4" rx="1"/>
    <rect x="14" y="14" width="6" height="9" rx="1"/>
    <circle cx="20" cy="11.5" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
  </svg>`,

  Glock: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="10" y="8" width="18" height="2" rx=".5"/>
    <rect x="10" y="10" width="16" height="5" rx="1"/>
    <rect x="26" y="9" width="10" height="3.5" rx="1"/>
    <rect x="14" y="15" width="5" height="9" rx="1"/>
  </svg>`,

  Knife: `<svg viewBox="0 0 48 28" fill="currentColor">
    <polygon points="6,16 30,6 32,9 10,20"/>
    <rect x="30" y="8" width="12" height="10" rx="2"/>
  </svg>`,

  Axe: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="20" y="4" width="4" height="22" rx="1"/>
    <path d="M10,4 L24,4 L24,14 L14,14 Z" fill="#888"/>
    <rect x="10" y="4" width="14" height="2" rx=".5" fill="#aaa"/>
  </svg>`,

  Railgun: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="4" y="10" width="30" height="5" rx="1"/>
    <rect x="34" y="8" width="10" height="9" rx="2"/>
    <circle cx="8" cy="12.5" r="3" fill="none" stroke="#44aaff" stroke-width="2"/>
    <circle cx="16" cy="12.5" r="3" fill="none" stroke="#44aaff" stroke-width="2"/>
    <rect x="14" y="15" width="5" height="7" rx="1"/>
  </svg>`,

  PlasmaGun: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="6" y="10" width="24" height="6" rx="2"/>
    <rect x="30" y="8" width="14" height="10" rx="3"/>
    <circle cx="6" cy="13" r="4" fill="none" stroke="#cc00ff" stroke-width="2"/>
    <circle cx="36" cy="13" r="3" fill="#cc00ff" opacity="0.5"/>
    <rect x="12" y="16" width="6" height="6" rx="1"/>
  </svg>`,

  HealthPack: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="14" y="4" width="20" height="20" rx="3" fill="#cc3333"/>
    <rect x="21" y="8" width="6" height="12" fill="#fff"/>
    <rect x="17" y="11" width="14" height="6" fill="#fff"/>
  </svg>`,

  MaxHPUp: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="14" y="4" width="20" height="20" rx="3" fill="#22aa44"/>
    <rect x="21" y="8" width="6" height="12" fill="#fff"/>
    <rect x="17" y="11" width="14" height="6" fill="#fff"/>
    <polygon points="36,4 40,10 36,8 32,10" fill="#ffcc00"/>
  </svg>`,

  MagUp: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="10" y="6" width="28" height="18" rx="2" fill="#5c4a1e"/>
    <rect x="13" y="9" width="22" height="12" rx="1" fill="#3a3010"/>
    <rect x="18" y="12" width="4" height="6" fill="#ffcc00"/>
    <rect x="24" y="12" width="4" height="6" fill="#ffcc00"/>
    <rect x="30" y="12" width="4" height="6" fill="#ffcc00"/>
  </svg>`,

  SpeedUp: `<svg viewBox="0 0 48 28" fill="currentColor">
    <polygon points="18,4 32,14 18,14 30,24" fill="#ffcc00"/>
    <polygon points="22,8 30,14 22,14 28,20" fill="#ff8800"/>
  </svg>`,

  CritUp: `<svg viewBox="0 0 48 28" fill="currentColor">
    <circle cx="24" cy="14" r="10" fill="none" stroke="#ff4444" stroke-width="2"/>
    <circle cx="24" cy="14" r="5" fill="none" stroke="#ff4444" stroke-width="1.5"/>
    <circle cx="24" cy="14" r="1.5" fill="#ff4444"/>
  </svg>`,

  RocketLauncher: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="6" y="10" width="30" height="6" rx="3" fill="#3a3a2a"/>
    <rect x="36" y="8" width="8" height="10" rx="2" fill="#444"/>
    <circle cx="6" cy="13" r="4" fill="none" stroke="#ff4400" stroke-width="2"/>
    <rect x="12" y="16" width="6" height="6" rx="1" fill="#5c3a1e"/>
  </svg>`,

  FireRateUp: `<svg viewBox="0 0 48 28" fill="currentColor">
    <polygon points="14,4 22,14 16,14 24,24" fill="#44aaff"/>
    <polygon points="24,4 32,14 26,14 34,24" fill="#44aaff"/>
    <rect x="10" y="24" width="28" height="2" rx="1" fill="#44aaff"/>
  </svg>`,

  DamageUp: `<svg viewBox="0 0 48 28" fill="currentColor">
    <polygon points="24,2 28,10 36,12 30,18 32,26 24,22 16,26 18,18 12,12 20,10" fill="#ff4444"/>
    <polygon points="24,8 26,13 30,14 27,17 28,22 24,19 20,22 21,17 18,14 22,13" fill="#ff8844"/>
  </svg>`,

  // ── Slot 0 Rare (blue) ──
  BasicGunRare: `<svg viewBox="0 0 48 28" fill="#4488cc">
    <rect x="4" y="10" width="26" height="5" rx="1"/>
    <rect x="30" y="9" width="14" height="4" rx="1"/>
    <rect x="30" y="13" width="10" height="2"/>
    <rect x="12" y="15" width="6" height="8" rx="1"/>
    <rect x="16" y="5" width="3" height="6" rx=".5"/>
    <rect x="2" y="9" width="4" height="3" rx=".5"/>
  </svg>`,
  MinigunRare: `<svg viewBox="0 0 48 28" fill="#4488cc">
    <rect x="4" y="6" width="26" height="2.5" rx=".5"/>
    <rect x="4" y="10" width="26" height="2.5" rx=".5"/>
    <rect x="4" y="14" width="26" height="2.5" rx=".5"/>
    <rect x="4" y="18" width="26" height="2.5" rx=".5"/>
    <rect x="30" y="4" width="14" height="20" rx="3"/>
    <rect x="12" y="21" width="6" height="5" rx="1"/>
  </svg>`,
  ShotgunRare: `<svg viewBox="0 0 48 28" fill="#4488cc">
    <rect x="2" y="11" width="34" height="4" rx="1"/>
    <rect x="36" y="9" width="10" height="8" rx="2"/>
    <rect x="22" y="15" width="8" height="4" rx="1"/>
    <rect x="8" y="15" width="5" height="6" rx="1"/>
  </svg>`,

  // ── Slot 0 Legendary (gold) ──
  GoldAssault: `<svg viewBox="0 0 48 28" fill="#ddaa44">
    <rect x="4" y="10" width="26" height="5" rx="1"/>
    <rect x="30" y="9" width="14" height="4" rx="1"/>
    <rect x="30" y="13" width="10" height="2"/>
    <rect x="12" y="15" width="6" height="8" rx="1"/>
    <rect x="16" y="5" width="3" height="6" rx=".5"/>
    <rect x="2" y="9" width="4" height="3" rx=".5" fill="#ffcc00"/>
  </svg>`,
  HellMinigun: `<svg viewBox="0 0 48 28" fill="#cc5500">
    <rect x="4" y="6" width="26" height="2.5" rx=".5"/>
    <rect x="4" y="10" width="26" height="2.5" rx=".5"/>
    <rect x="4" y="14" width="26" height="2.5" rx=".5"/>
    <rect x="4" y="18" width="26" height="2.5" rx=".5"/>
    <rect x="30" y="4" width="14" height="20" rx="3"/>
    <rect x="12" y="21" width="6" height="5" rx="1"/>
    <circle cx="6" cy="12" r="3" fill="#ff4400" opacity="0.6"/>
  </svg>`,
  DoomShotgun: `<svg viewBox="0 0 48 28" fill="#cc5500">
    <rect x="2" y="11" width="34" height="4" rx="1"/>
    <rect x="36" y="9" width="10" height="8" rx="2"/>
    <rect x="22" y="15" width="8" height="4" rx="1"/>
    <rect x="8" y="15" width="5" height="6" rx="1"/>
    <circle cx="4" cy="13" r="3" fill="#ff6600" opacity="0.6"/>
  </svg>`,

  // ── Slot 1 Rare ──
  RevolverRare: `<svg viewBox="0 0 48 28" fill="#4488cc">
    <rect x="8" y="9" width="20" height="5" rx="1"/>
    <rect x="28" y="8" width="12" height="4" rx="1"/>
    <rect x="14" y="14" width="6" height="9" rx="1"/>
    <circle cx="20" cy="11.5" r="4" fill="none" stroke="#4488cc" stroke-width="2"/>
  </svg>`,
  GlockRare: `<svg viewBox="0 0 48 28" fill="#4488cc">
    <rect x="10" y="8" width="18" height="2" rx=".5"/>
    <rect x="10" y="10" width="16" height="5" rx="1"/>
    <rect x="26" y="9" width="10" height="3.5" rx="1"/>
    <rect x="14" y="15" width="5" height="9" rx="1"/>
  </svg>`,

  // ── Slot 1 Legendary ──
  DesertKing: `<svg viewBox="0 0 48 28" fill="#ddaa44">
    <rect x="6" y="9" width="24" height="5" rx="1"/>
    <rect x="30" y="8" width="12" height="4" rx="1"/>
    <rect x="14" y="14" width="6" height="9" rx="1"/>
    <circle cx="20" cy="11.5" r="4" fill="none" stroke="#ffcc00" stroke-width="2"/>
    <circle cx="6" cy="12" r="2" fill="#ffcc00" opacity="0.6"/>
  </svg>`,
  BlazeGlock: `<svg viewBox="0 0 48 28" fill="#cc4400">
    <rect x="10" y="8" width="18" height="2" rx=".5"/>
    <rect x="10" y="10" width="16" height="5" rx="1"/>
    <rect x="26" y="9" width="10" height="3.5" rx="1"/>
    <rect x="14" y="15" width="5" height="9" rx="1"/>
    <circle cx="10" cy="11" r="2" fill="#ff6600" opacity="0.6"/>
  </svg>`,

  // ── Slot 2 Rare ──
  KnifeRare: `<svg viewBox="0 0 48 28" fill="#4488cc">
    <polygon points="6,16 30,6 32,9 10,20"/>
    <rect x="30" y="8" width="12" height="10" rx="2"/>
  </svg>`,
  AxeRare: `<svg viewBox="0 0 48 28" fill="#4488cc">
    <rect x="20" y="4" width="4" height="22" rx="1"/>
    <path d="M10,4 L24,4 L24,14 L14,14 Z" fill="#4466aa"/>
    <rect x="10" y="4" width="14" height="2" rx=".5" fill="#6688bb"/>
  </svg>`,

  // ── Slot 2 Legendary ──
  BloodBlade: `<svg viewBox="0 0 48 28" fill="#cc2222">
    <polygon points="6,16 30,6 32,9 10,20"/>
    <rect x="30" y="8" width="12" height="10" rx="2" fill="#880000"/>
    <line x1="8" y1="15" x2="28" y2="7" stroke="#ff4444" stroke-width="1" opacity="0.6"/>
  </svg>`,
  WorldBreaker: `<svg viewBox="0 0 48 28" fill="#ddaa44">
    <rect x="20" y="4" width="4" height="22" rx="1" fill="#886622"/>
    <path d="M8,2 L24,2 L24,16 L12,16 Z" fill="#ddaa44"/>
    <rect x="8" y="2" width="16" height="2" rx=".5" fill="#ffcc44"/>
    <circle cx="16" cy="10" r="3" fill="#ffcc00" opacity="0.4"/>
  </svg>`,

  // ── Slot 3 Rare ──
  RailgunRare: `<svg viewBox="0 0 48 28" fill="#4488cc">
    <rect x="4" y="10" width="30" height="5" rx="1"/>
    <rect x="34" y="8" width="10" height="9" rx="2"/>
    <circle cx="8" cy="12.5" r="3" fill="none" stroke="#66bbff" stroke-width="2"/>
    <circle cx="16" cy="12.5" r="3" fill="none" stroke="#66bbff" stroke-width="2"/>
    <rect x="14" y="15" width="5" height="7" rx="1"/>
  </svg>`,
  PlasmaMK2: `<svg viewBox="0 0 48 28" fill="#5500aa">
    <rect x="6" y="10" width="24" height="6" rx="2"/>
    <rect x="30" y="8" width="14" height="10" rx="3"/>
    <circle cx="6" cy="13" r="4" fill="none" stroke="#dd44ff" stroke-width="2"/>
    <circle cx="36" cy="13" r="3" fill="#dd44ff" opacity="0.5"/>
    <rect x="12" y="16" width="6" height="6" rx="1"/>
  </svg>`,
  RocketRare: `<svg viewBox="0 0 48 28" fill="#4a5a3a">
    <rect x="6" y="10" width="30" height="6" rx="3"/>
    <rect x="36" y="8" width="8" height="10" rx="2" fill="#556644"/>
    <circle cx="6" cy="13" r="4" fill="none" stroke="#ff6600" stroke-width="2"/>
    <rect x="12" y="16" width="6" height="6" rx="1" fill="#3a5a2e"/>
  </svg>`,

  // ── Slot 3 Legendary ──
  ZeusRailgun: `<svg viewBox="0 0 48 28" fill="#ddaa44">
    <rect x="4" y="10" width="30" height="5" rx="1"/>
    <rect x="34" y="8" width="10" height="9" rx="2"/>
    <circle cx="8" cy="12.5" r="3" fill="none" stroke="#ffee66" stroke-width="2"/>
    <circle cx="16" cy="12.5" r="3" fill="none" stroke="#ffee66" stroke-width="2"/>
    <rect x="14" y="15" width="5" height="7" rx="1"/>
    <polygon points="2,6 5,12 2,10 4,14" fill="#ffcc00"/>
  </svg>`,
  PlasmaOverload: `<svg viewBox="0 0 48 28" fill="#8800cc">
    <rect x="6" y="10" width="24" height="6" rx="2"/>
    <rect x="30" y="8" width="14" height="10" rx="3"/>
    <circle cx="6" cy="13" r="4" fill="none" stroke="#ff44ff" stroke-width="2"/>
    <circle cx="36" cy="13" r="3" fill="#ff44ff" opacity="0.6"/>
    <circle cx="20" cy="13" r="2" fill="#ff88ff" opacity="0.5"/>
    <rect x="12" y="16" width="6" height="6" rx="1"/>
  </svg>`,
  DoomBringer: `<svg viewBox="0 0 48 28" fill="#882200">
    <rect x="6" y="10" width="30" height="6" rx="3"/>
    <rect x="36" y="8" width="8" height="10" rx="2" fill="#aa4400"/>
    <circle cx="6" cy="13" r="4" fill="none" stroke="#ff2200" stroke-width="2.5"/>
    <circle cx="6" cy="13" r="2" fill="#ff4400" opacity="0.6"/>
    <rect x="12" y="16" width="6" height="6" rx="1" fill="#660000"/>
  </svg>`,
};

export function getWeaponIcon(id) {
  return ICONS[id] || '';
}
