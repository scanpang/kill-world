// client/src/ui/WeaponIcons.js

const ICONS = {
  MachineGun: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="4" y="10" width="26" height="5" rx="1"/>
    <rect x="30" y="9" width="14" height="4" rx="1"/>
    <rect x="30" y="13" width="10" height="2"/>
    <rect x="12" y="15" width="6" height="8" rx="1"/>
    <rect x="16" y="5" width="3" height="6" rx=".5"/>
    <rect x="2" y="9" width="4" height="3" rx=".5"/>
  </svg>`,

  Pistol: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="10" y="9" width="18" height="5" rx="1"/>
    <rect x="28" y="8" width="10" height="4" rx="1"/>
    <rect x="14" y="14" width="6" height="9" rx="1"/>
  </svg>`,

  Melee: `<svg viewBox="0 0 48 28" fill="currentColor">
    <polygon points="6,16 30,6 32,9 10,20"/>
    <rect x="30" y="8" width="12" height="10" rx="2"/>
  </svg>`,

  Grenade: `<svg viewBox="0 0 48 28" fill="currentColor">
    <ellipse cx="24" cy="17" rx="10" ry="9"/>
    <rect x="20" y="2" width="8" height="7" rx="2"/>
    <rect x="18" y="1" width="12" height="3" rx="1"/>
  </svg>`,

  Minigun: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="4" y="6" width="26" height="2.5" rx=".5"/>
    <rect x="4" y="10" width="26" height="2.5" rx=".5"/>
    <rect x="4" y="14" width="26" height="2.5" rx=".5"/>
    <rect x="4" y="18" width="26" height="2.5" rx=".5"/>
    <rect x="30" y="4" width="14" height="20" rx="3"/>
    <rect x="12" y="21" width="6" height="5" rx="1"/>
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

  Shotgun: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="2" y="11" width="34" height="4" rx="1"/>
    <rect x="36" y="9" width="10" height="8" rx="2"/>
    <rect x="22" y="15" width="8" height="4" rx="1"/>
    <rect x="8" y="15" width="5" height="6" rx="1"/>
  </svg>`,

  Sniper: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="2" y="12" width="36" height="3" rx="1"/>
    <rect x="38" y="10" width="8" height="7" rx="1"/>
    <rect x="18" y="15" width="6" height="8" rx="1"/>
    <circle cx="8" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
    <rect x="7" y="4" width="2" height="8"/>
  </svg>`,

  BossGun: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="4" y="9" width="24" height="7" rx="2"/>
    <rect x="28" y="7" width="16" height="11" rx="3"/>
    <circle cx="36" cy="12.5" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/>
    <rect x="10" y="16" width="6" height="6" rx="1"/>
    <rect x="4" y="7" width="6" height="3" rx="1"/>
  </svg>`,

  HealthPack: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="14" y="4" width="20" height="20" rx="3" fill="#cc3333"/>
    <rect x="21" y="8" width="6" height="12" fill="#fff"/>
    <rect x="17" y="11" width="14" height="6" fill="#fff"/>
  </svg>`,

  LaserRifle: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="4" y="10" width="30" height="5" rx="1"/>
    <rect x="34" y="8" width="10" height="9" rx="2"/>
    <line x1="2" y1="12.5" x2="6" y2="12.5" stroke="#ff0000" stroke-width="2"/>
    <circle cx="4" cy="12.5" r="2" fill="none" stroke="#ff0000" stroke-width="1.5"/>
    <rect x="14" y="15" width="5" height="7" rx="1"/>
  </svg>`,

  ThunderGun: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="6" y="10" width="24" height="6" rx="2"/>
    <rect x="30" y="8" width="14" height="10" rx="3"/>
    <polygon points="4,8 8,14 5,14 9,20 3,14 6,14" fill="#ffcc00"/>
    <rect x="12" y="16" width="6" height="6" rx="1"/>
  </svg>`,

  HellFire: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="4" y="8" width="26" height="3" rx=".5"/>
    <rect x="4" y="12" width="26" height="3" rx=".5"/>
    <rect x="4" y="16" width="26" height="3" rx=".5"/>
    <rect x="30" y="6" width="14" height="16" rx="3"/>
    <rect x="12" y="19" width="6" height="5" rx="1"/>
    <polygon points="2,6 5,10 3,10 6,14 1,10 3,10" fill="#ff4400"/>
  </svg>`,

  FrostCannon: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="6" y="10" width="28" height="6" rx="2"/>
    <rect x="34" y="8" width="10" height="10" rx="2"/>
    <circle cx="6" cy="13" r="4" fill="none" stroke="#66ccff" stroke-width="2"/>
    <rect x="14" y="16" width="6" height="7" rx="1"/>
  </svg>`,

  Armor: `<svg viewBox="0 0 48 28" fill="currentColor">
    <path d="M24,3 L38,8 L36,20 L24,25 L12,20 L10,8 Z" fill="#4466aa"/>
    <path d="M24,7 L33,10 L32,18 L24,22 L16,18 L15,10 Z" fill="#6688cc"/>
  </svg>`,

  SpeedBoost: `<svg viewBox="0 0 48 28" fill="currentColor">
    <polygon points="18,4 32,14 18,14 30,24" fill="#ffcc00"/>
    <polygon points="22,8 30,14 22,14 28,20" fill="#ff8800"/>
  </svg>`,

  MaxHPUp: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="14" y="4" width="20" height="20" rx="3" fill="#22aa44"/>
    <rect x="21" y="8" width="6" height="12" fill="#fff"/>
    <rect x="17" y="11" width="14" height="6" fill="#fff"/>
    <polygon points="36,4 40,10 36,8 32,10" fill="#ffcc00"/>
  </svg>`,

  AmmoBox: `<svg viewBox="0 0 48 28" fill="currentColor">
    <rect x="10" y="6" width="28" height="18" rx="2" fill="#5c4a1e"/>
    <rect x="13" y="9" width="22" height="12" rx="1" fill="#3a3010"/>
    <rect x="18" y="12" width="4" height="6" fill="#ffcc00"/>
    <rect x="24" y="12" width="4" height="6" fill="#ffcc00"/>
    <rect x="30" y="12" width="4" height="6" fill="#ffcc00"/>
  </svg>`,

  Shield: `<svg viewBox="0 0 48 28" fill="currentColor">
    <path d="M24,2 L40,8 L38,22 L24,27 L10,22 L8,8 Z" fill="none" stroke="#44aaff" stroke-width="3"/>
    <path d="M24,7 L34,11 L33,20 L24,23 L15,20 L14,11 Z" fill="#44aaff" opacity="0.3"/>
  </svg>`,
};

export function getWeaponIcon(id) {
  return ICONS[id] || '';
}
