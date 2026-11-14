import { COMPONENT_CATALOG } from './components.js';

export function getComponentGraphic(inst, state, gpioStates = {}) {
  const spec = COMPONENT_CATALOG[inst.type];
  const isLit = state?.lit;
  const isBlown = state?.blown;

  if (inst.type === 'oled_ssd1306') {
    const powered = state?.powered;
    const lines = state?.oledLines || ['VOLTLAB OS v3', 'I2C READY'];
    return `
      <svg viewBox="0 0 150 105" class="w-full h-full drop-shadow-2xl overflow-visible">
        <rect x="4" y="6" width="142" height="95" rx="6" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
        <!-- Top Gold Header Pins -->
        <rect x="26" y="0" width="98" height="10" rx="2" fill="#1e293b"/>
        <text x="23" y="18" fill="#93c5fd" font-family="monospace" font-size="7" font-weight="bold">GND</text>
        <text x="53" y="18" fill="#fca5a5" font-family="monospace" font-size="7" font-weight="bold">VCC</text>
        <text x="84" y="18" fill="#fde047" font-family="monospace" font-size="7" font-weight="bold">SCL</text>
        <text x="114" y="18" fill="#86efac" font-family="monospace" font-size="7" font-weight="bold">SDA</text>
        <!-- OLED Glass Screen -->
        <rect x="14" y="24" width="122" height="68" rx="4" fill="${powered ? '#042f2e' : '#020617'}" stroke="#334155" stroke-width="1.5"/>
        ${powered ? `
          <text x="22" y="42" fill="#22d3ee" font-family="monospace" font-size="10" font-weight="bold">${lines[0] || ''}</text>
          <text x="22" y="58" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold">${lines[1] || ''}</text>
          <text x="22" y="74" fill="#a5f3fc" font-family="monospace" font-size="10">${lines[2] || ''}</text>
          <rect x="22" y="80" width="96" height="4" rx="2" fill="#0e7490"/>
          <rect x="22" y="80" width="${state?.barWidth || 64}" height="4" rx="2" fill="#22d3ee"/>
        ` : `<text x="42" y="62" fill="#334155" font-family="monospace" font-size="9">NO I2C / PWR</text>`}
      </svg>
    `;
  }

  if (inst.type === 'dht22_sensor') {
    const temp = inst.temp ?? 28.5;
    const hum = inst.hum ?? 62;
    return `
      <svg viewBox="0 0 96 92" class="w-full h-full drop-shadow-xl overflow-visible cursor-pointer">
        <!-- White Perforated Sensor Housing -->
        <rect x="12" y="4" width="72" height="68" rx="6" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/>
        <!-- Sensor Grid Vents -->
        <rect x="22" y="14" width="52" height="32" rx="3" fill="#cbd5e1"/>
        <line x1="22" y1="22" x2="74" y2="22" stroke="#64748b" stroke-width="1.5"/>
        <line x1="22" y1="30" x2="74" y2="30" stroke="#64748b" stroke-width="1.5"/>
        <line x1="22" y1="38" x2="74" y2="38" stroke="#64748b" stroke-width="1.5"/>
        <text x="24" y="60" fill="#0f172a" font-family="monospace" font-size="9" font-weight="900">DHT22</text>
        <text x="18" y="69" fill="#0284c7" font-family="monospace" font-size="8" font-weight="bold">${temp}°C${hum}%</text>
        <!-- Metal Pins -->
        <line x1="24" y1="72" x2="24" y2="92" stroke="#cbd5e1" stroke-width="3"/>
        <line x1="48" y1="72" x2="48" y2="92" stroke="#cbd5e1" stroke-width="3"/>
        <line x1="72" y1="72" x2="72" y2="92" stroke="#cbd5e1" stroke-width="3"/>
      </svg>
    `;
  }

  if (inst.type === 'servo_sg90') {
    const angle = state?.servoAngle ?? 0;
    return `
      <svg viewBox="0 0 120 82" class="w-full h-full drop-shadow-xl overflow-visible">
        <!-- Translucent Blue Servo Body -->
        <rect x="16" y="16" width="84" height="50" rx="5" fill="#0284c7" stroke="#38bdf8" stroke-width="2"/>
        <rect x="8" y="34" width="100" height="14" rx="2" fill="#0369a1"/>
        <text x="22" y="45" fill="#e0f2fe" font-family="sans-serif" font-size="9" font-weight="bold">SG90 (${angle}°)</text>
        <!-- Output Gear & Rotating White Servo Horn -->
        <circle cx="80" cy="41" r="14" fill="#0f172a" stroke="#cbd5e1" stroke-width="1.5"/>
        <g style="transform-origin: 80px 41px; transform: rotate(${angle - 90}deg); transition: transform 0.35s ease-out;">
          <rect x="75" y="10" width="10" height="36" rx="5" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
          <circle cx="80" cy="41" r="4" fill="#64748b"/>
        </g>
      </svg>
    `;
  }

  if (inst.type === 'buzzer_piezo') {
    return `
      <svg viewBox="0 0 84 84" class="w-full h-full drop-shadow-xl overflow-visible">
        <circle cx="46" cy="42" r="32" fill="#0f172a" stroke="${isLit ? '#22d3ee' : '#475569'}" stroke-width="3"/>
        <circle cx="46" cy="42" r="10" fill="#1e293b" stroke="#94a3b8" stroke-width="2"/>
        ${isLit ? `
          <circle cx="46" cy="42" r="38" fill="none" stroke="#22d3ee" stroke-width="2" stroke-dasharray="6,4" class="animate-spin"/>
          <text x="28" y="10" fill="#22d3ee" font-family="monospace" font-size="9" font-weight="bold">♪ BEEP!</text>
        ` : `<text x="28" y="78" fill="#94a3b8" font-family="monospace" font-size="8">BUZZER</text>`}
      </svg>
    `;
  }

  if (inst.type === 'pico_rp2040') {
    const gp15High = gpioStates[inst.id]?.GP15;
    return `
      <svg viewBox="0 0 165 86" class="w-full h-full drop-shadow-xl overflow-visible">
        <rect x="6" y="4" width="153" height="78" rx="5" fill="#065f46" stroke="#10b981" stroke-width="2"/>
        <rect x="0" y="27" width="16" height="32" rx="2" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
        <rect x="64" y="25" width="36" height="36" rx="3" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>
        <text x="69" y="46" fill="#94a3b8" font-family="monospace" font-size="8" font-weight="bold">RP2040</text>
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
        <rect x="64" y="62" width="84" height="22" rx="2" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
        <circle cx="72" cy="34" r="3.5" fill="${d13High ? '#fbbf24' : '#78350f'}"/>
        <circle cx="148" cy="34" r="3.5" fill="#22c55e"/>
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
        <rect x="114" y="17" width="14" height="14" rx="3" fill="#cbd5e1"/>
        <polygon points="114,45 128,43 128,61 114,59" fill="#94a3b8"/>
        <rect x="4" y="6" width="112" height="64" rx="8" fill="#0f172a" stroke="#334155" stroke-width="2"/>
        <path d="M 86 6 H 108 A 8 8 0 0 1 116 14 V 62 A 8 8 0 0 1 108 70 H 86 Z" fill="#d97706"/>
        <text x="14" y="34" fill="#fbbf24" font-family="monospace" font-weight="900" font-size="16">9V</text>
        <text x="14" y="52" fill="#e2e8f0" font-family="sans-serif" font-weight="800" font-size="11">DURAVOLT</text>
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
          <rect x="23" y="28" width="84" height="7" rx="2" fill="#fbbf24"/>
          <rect x="96" y="24" width="22" height="14" rx="5" fill="#0f172a"/>
        </g>
        <text x="42" y="52" fill="${inst.closed ? '#4ade80' : '#fbbf24'}" font-family="monospace" font-size="9" font-weight="bold">${inst.closed ? 'CLOSED' : 'OPEN'}</text>
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
        <rect x="48" y="13" width="8" height="44" rx="2" fill="${isBlown ? '#334155' : color}"/>
        <path d="M 56 16 H 78 A 19 19 0 0 1 78 54 H 56 Z" fill="${isLit ? color : isBlown ? '#1e293b' : color + '55'}" stroke="${isBlown ? '#ef4444' : '#ffffff'}" stroke-opacity="0.6" stroke-width="1.5"/>
        ${isBlown ? '<text x="64" y="40" font-size="16">💥</text>' : ''}
        <text x="54" y="8" fill="#cbd5e1" font-family="monospace" font-size="10" font-weight="bold">${spec.name.split(' ')[1]} LED</text>
      </svg>
    `;
  }

  return '';
}
