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
};

export function getWeaponIcon(id) {
  return ICONS[id] || '';
}
