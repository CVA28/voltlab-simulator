import { COMPONENT_CATALOG } from './components.js';

export function getComponentGraphic(inst, state, gpioStates = {}) {
  const spec = COMPONENT_CATALOG[inst.type];
  const isLit = state?.lit;
  const isBlown = state?.blown;

  if (inst.type === 'pico_rp2040') {
    const gp15High = gpioStates[inst.id]?.GP15;
    return `
      <svg viewBox="0 0 165 86" class="w-full h-full drop-shadow-xl overflow-visible">
        <rect x="6" y="4" width="153" height="78" rx="5" fill="#065f46" stroke="#10b981" stroke-width="2"/>
        <rect x="0" y="27" width="16" height="32" rx="2" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
        <rect x="64" y="25" width="36" height="36" rx="3" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>
        <text x="69" y="46" fill="#94a3b8" font-family="monospace" font-size="8" font-weight="bold">RP2040</text>
        <rect x="30" y="16" width="16" height="12" rx="2" fill="#f8fafc" stroke="#94a3b8" stroke-width="1"/>
        <circle cx="38" cy="54" r="4" fill="${gp15High ? '#4ade80' : '#14532d'}" style="${gp15High ? 'filter: drop-shadow(0 0 8px #4ade80);' : ''}"/>
        <text x="122" y="21" fill="#fde047" font-family="monospace" font-size="8" font-weight="bold">3V3</text>
        <text x="122" y="46" fill="#86efac" font-family="monospace" font-size="8" font-weight="bold">GP15</text>
        <text x="122" y="71" fill="#86efac" font-family="monospace" font-size="8" font-weight="bold">GP14</text>
        <text x="12" y="71" fill="#93c5fd" font-family="monospace" font-size="8" font-weight="bold">GND</text>
        <text x="54" y="16" fill="#ecfdf5" font-family="sans-serif" font-size="8" font-weight="bold">RASPBERRY PI PICO</text>
      </svg>
    `;
  }

  if (inst.type === 'arduino_uno') {
    const d13High = gpioStates[inst.id]?.D13;
    return `
      <svg viewBox="0 0 180 115" class="w-full h-full drop-shadow-xl overflow-visible">
        <rect x="10" y="4" width="164" height="107" rx="6" fill="#0369a1" stroke="#38bdf8" stroke-width="2"/>
        <rect x="0" y="18" width="24" height="28" rx="2" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
        <rect x="2" y="72" width="24" height="22" rx="2" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
        <rect x="64" y="62" width="84" height="22" rx="2" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
        <circle cx="72" cy="34" r="3.5" fill="${d13High ? '#fbbf24' : '#78350f'}" style="${d13High ? 'filter: drop-shadow(0 0 8px #fbbf24);' : ''}"/>
        <circle cx="148" cy="34" r="3.5" fill="#22c55e" style="filter: drop-shadow(0 0 5px #22c55e);"/>
        <text x="82" y="38" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="11">ARDUINO UNO</text>
        <text x="116" y="16" fill="#bae6fd" font-family="monospace" font-size="8" font-weight="bold">D13</text>
        <text x="148" y="16" fill="#bae6fd" font-family="monospace" font-size="8" font-weight="bold">D12</text>
        <text x="90" y="104" fill="#fca5a5" font-family="monospace" font-size="8" font-weight="bold">5V</text>
        <text x="122" y="104" fill="#93c5fd" font-family="monospace" font-size="8" font-weight="bold">GND</text>
      </svg>
    `;
  }

  if (inst.type === 'battery_9v') {
    return `
      <svg viewBox="0 0 130 76" class="w-full h-full drop-shadow-xl overflow-visible">
        <rect x="114" y="17" width="14" height="14" rx="3" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
        <polygon points="114,45 128,43 128,61 114,59" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
        <rect x="4" y="6" width="112" height="64" rx="8" fill="#0f172a" stroke="#334155" stroke-width="2"/>
        <path d="M 86 6 H 108 A 8 8 0 0 1 116 14 V 62 A 8 8 0 0 1 108 70 H 86 Z" fill="#d97706"/>
        <text x="14" y="34" fill="#fbbf24" font-family="monospace" font-weight="900" font-size="16">9V</text>
        <text x="14" y="52" fill="#e2e8f0" font-family="sans-serif" font-weight="800" font-size="11">DURAVOLT</text>
      </svg>
    `;
  }

  if (inst.type === 'battery_1v5') {
    return `
      <svg viewBox="0 0 140 54" class="w-full h-full drop-shadow-xl overflow-visible">
        <rect x="2" y="10" width="8" height="34" rx="2" fill="#94a3b8"/>
        <rect x="130" y="17" width="9" height="20" rx="3" fill="#e2e8f0"/>
        <rect x="8" y="6" width="124" height="42" rx="6" fill="#0f172a" stroke="#475569" stroke-width="1.5"/>
        <rect x="94" y="6" width="36" height="42" rx="4" fill="#d97706"/>
        <text x="48" y="32" fill="#f8fafc" font-family="monospace" font-weight="800" font-size="14">1.5 V</text>
      </svg>
    `;
  }

  if (inst.type === 'regulator_3v3') {
    const active = state?.status === 'REGULATING 3.3V';
    return `
      <svg viewBox="0 0 132 82" class="w-full h-full drop-shadow-xl overflow-visible">
        <rect x="4" y="4" width="124" height="74" rx="6" fill="#064e3b" stroke="#10b981" stroke-width="2"/>
        <rect x="46" y="22" width="40" height="34" rx="3" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
        <circle cx="105" cy="64" r="4" fill="${active ? '#22c55e' : '#14532d'}"/>
        <text x="48" y="42" fill="#e2e8f0" font-family="monospace" font-size="8" font-weight="bold">AMS1117</text>
        <text x="42" y="72" fill="#a7f3d0" font-family="monospace" font-size="9" font-weight="bold">3.3V OUT</text>
      </svg>
    `;
  }

  if (inst.type === 'resistor_220') {
    return `
      <svg viewBox="0 0 130 46" class="w-full h-full drop-shadow-md overflow-visible">
        <line x1="0" y1="23" x2="130" y2="23" stroke="#cbd5e1" stroke-width="4"/>
        <rect x="28" y="10" width="74" height="26" rx="10" fill="#fde68a" stroke="#b45309" stroke-width="1.5"/>
        <rect x="40" y="10" width="6" height="26" fill="#dc2626"/>
        <rect x="53" y="10" width="6" height="26" fill="#dc2626"/>
        <rect x="66" y="10" width="6" height="26" fill="#78350f"/>
        <rect x="84" y="10" width="5" height="26" fill="#eab308"/>
        <text x="50" y="6" fill="#94a3b8" font-family="monospace" font-size="10" font-weight="bold">220Ω</text>
      </svg>
    `;
  }

  if (inst.type === 'switch_toggle') {
    const bladeAngle = inst.closed ? 0 : -34;
    return `
      <svg viewBox="0 0 124 68" class="w-full h-full drop-shadow-xl overflow-visible cursor-pointer">
        <rect x="8" y="34" width="108" height="26" rx="5" fill="#451a03" stroke="#92400e" stroke-width="2"/>
        <rect x="18" y="28" width="14" height="16" rx="2" fill="#f59e0b"/>
        <rect x="92" y="28" width="14" height="16" rx="2" fill="#f59e0b"/>
        <g style="transform-origin: 25px 32px; transform: rotate(${bladeAngle}deg); transition: transform 0.2s ease;">
          <rect x="23" y="28" width="84" height="7" rx="2" fill="#fbbf24" stroke="#b45309" stroke-width="1"/>
          <rect x="96" y="24" width="22" height="14" rx="5" fill="#0f172a" stroke="#475569" stroke-width="1.5"/>
        </g>
        <text x="42" y="52" fill="${inst.closed ? '#4ade80' : '#fbbf24'}" font-family="monospace" font-size="9" font-weight="bold">
          ${inst.closed ? 'CLOSED' : 'OPEN'}
        </text>
      </svg>
    `;
  }

  if (inst.type === 'bulb_lamp') {
    const glowFilter = isLit ? 'filter: drop-shadow(0 0 22px #fbbf24);' : '';
    return `
      <svg viewBox="0 0 105 92" class="w-full h-full overflow-visible" style="${glowFilter}">
        <rect x="35" y="54" width="35" height="24" rx="4" fill="#d97706" stroke="#78350f" stroke-width="1.5"/>
        <polyline points="0,68 35,68" fill="none" stroke="#94a3b8" stroke-width="3"/>
        <polyline points="70,68 105,68" fill="none" stroke="#94a3b8" stroke-width="3"/>
        <circle cx="52.5" cy="32" r="26" fill="${isLit ? 'rgba(254, 240, 138, 0.85)' : 'rgba(148, 163, 184, 0.18)'}" stroke="#cbd5e1" stroke-width="1.8"/>
        <path d="M 45 34 Q 49 24 52.5 34 Q 56 24 60 34" fill="none" stroke="${isLit ? '#ffffff' : '#64748b'}" stroke-width="${isLit ? '3' : '1.8'}"/>
      </svg>
    `;
  }

  if (inst.type.startsWith('led_')) {
    const color = spec.ledColor;
    const bloom = isLit ? `filter: drop-shadow(0 0 18px ${color});` : '';
    return `
      <svg viewBox="0 0 110 70" class="w-full h-full overflow-visible ${isBlown ? 'component-blown' : ''}" style="${bloom}">
        <polyline points="0,22 24,22 30,27 52,27" fill="none" stroke="#cbd5e1" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="0" y1="48" x2="52" y2="48" stroke="#94a3b8" stroke-width="3.5" stroke-linecap="round"/>
        <rect x="48" y="13" width="8" height="44" rx="2" fill="${isBlown ? '#334155' : color}" stroke="#ffffff" stroke-opacity="0.4" stroke-width="1"/>
        <path d="M 56 16 H 78 A 19 19 0 0 1 78 54 H 56 Z" fill="${isLit ? color : isBlown ? '#1e293b' : color + '55'}" stroke="${isBlown ? '#ef4444' : '#ffffff'}" stroke-opacity="0.6" stroke-width="1.5"/>
        <path d="M 62 21 H 76 A 10 10 0 0 1 83 26" fill="none" stroke="#ffffff" stroke-opacity="0.7" stroke-width="2.5" stroke-linecap="round"/>
        ${isBlown ? '<text x="64" y="40" font-size="16">💥</text>' : ''}
        <text x="54" y="8" fill="#cbd5e1" font-family="monospace" font-size="10" font-weight="bold">${spec.name.split(' ')[1]} LED</text>
      </svg>
    `;
  }

  return '';
}
