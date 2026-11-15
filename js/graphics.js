import { COMPONENT_CATALOG } from './components.js';

export function getComponentGraphic(inst, state, gpioStates = {}) {
  const spec = COMPONENT_CATALOG[inst.type];
  const isLit = state?.lit;
  const isBlown = state?.blown;

  // Photorealistic Arduino Uno R3 (Exact Cirkit/Wokwi Style)
  if (inst.type === 'arduino_uno') {
    const d13High = gpioStates[inst.id]?.D13;
    return `
      <svg viewBox="0 0 220 150" class="w-full h-full drop-shadow-lg overflow-visible">
        <!-- Classic Arduino Teal-Blue PCB -->
        <path d="M 18 6 H 206 L 214 14 V 136 L 206 144 H 18 V 6 Z" fill="#008184" stroke="#005f63" stroke-width="2"/>
        <!-- Silver USB-B Port -->
        <rect x="0" y="22" width="34" height="36" rx="2" fill="#cbd5e1" stroke="#64748b" stroke-width="1.5"/>
        <rect x="4" y="26" width="24" height="28" fill="#94a3b8"/>
        <!-- Black DC Power Barrel Jack -->
        <rect x="2" y="96" width="36" height="30" rx="2" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
        <!-- Reset Button -->
        <rect x="24" y="10" width="14" height="14" rx="2" fill="#e2e8f0" stroke="#64748b" stroke-width="1"/>
        <circle cx="31" cy="17" r="4" fill="#dc2626"/>
        <!-- Top Black Header Strip -->
        <rect x="86" y="4" width="116" height="14" rx="2" fill="#0f172a"/>
        <text x="90" y="28" fill="#ffffff" font-family="monospace" font-size="8" font-weight="bold">13</text>
        <text x="114" y="28" fill="#ffffff" font-family="monospace" font-size="8" font-weight="bold">12</text>
        <text x="138" y="28" fill="#ffffff" font-family="monospace" font-size="8" font-weight="bold">~11</text>
        <text x="162" y="28" fill="#ffffff" font-family="monospace" font-size="8" font-weight="bold">~10</text>
        <text x="188" y="28" fill="#ffffff" font-family="monospace" font-size="8" font-weight="bold">~9</text>
        <!-- Bottom Black Header Strip -->
        <rect x="108" y="132" width="104" height="14" rx="2" fill="#0f172a"/>
        <text x="113" y="128" fill="#ffffff" font-family="monospace" font-size="8" font-weight="bold">5V</text>
        <text x="140" y="128" fill="#ffffff" font-family="monospace" font-size="8" font-weight="bold">GND</text>
        <text x="174" y="128" fill="#ffffff" font-family="monospace" font-size="8" font-weight="bold">A4</text>
        <text x="198" y="128" fill="#ffffff" font-family="monospace" font-size="8" font-weight="bold">A5</text>
        <!-- ATmega328P DIP Microcontroller Chip -->
        <rect x="84" y="84" width="114" height="28" rx="2" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
        <text x="106" y="101" fill="#94a3b8" font-family="monospace" font-size="8" font-weight="bold">ATMEGA328P-PU</text>
        <!-- Crystal Oscillator & Capacitors -->
        <rect x="52" y="62" width="24" height="10" rx="5" fill="#cbd5e1" stroke="#64748b" stroke-width="1"/>
        <circle cx="54" cy="116" r="8" fill="#94a3b8" stroke="#334155" stroke-width="1.5"/>
        <circle cx="74" cy="116" r="8" fill="#94a3b8" stroke="#334155" stroke-width="1.5"/>
        <!-- Arduino Branding & LEDs -->
        <text x="104" y="54" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="13">ARDUINO</text>
        <rect x="168" y="42" width="32" height="15" rx="2" fill="#ffffff"/>
        <text x="171" y="53" fill="#008184" font-family="sans-serif" font-weight="900" font-size="10">UNO</text>
        <circle cx="88" cy="46" r="3" fill="${d13High ? '#f59e0b' : '#451a03'}"/>
        <circle cx="196" cy="68" r="3" fill="#22c55e"/>
        <text x="180" y="71" fill="#ffffff" font-family="monospace" font-size="7" font-weight="bold">ON</text>
      </svg>
    `;
  }

  // Realistic 16x2 Green Backlit LCD Display
  if (inst.type === 'lcd_16x2') {
    const powered = state?.powered;
    const line1 = state?.lcdLine1 || 'Code to Lock';
    const line2 = state?.lcdLine2 || '';
    return `
      <svg viewBox="0 0 210 110" class="w-full h-full drop-shadow-lg overflow-visible">
        <!-- Green LCD PCB -->
        <rect x="2" y="4" width="206" height="102" rx="5" fill="#15803d" stroke="#14532d" stroke-width="2"/>
        <!-- Corner Mounting Holes -->
        <circle cx="10" cy="12" r="3.5" fill="#f1f5f9" stroke="#eab308" stroke-width="1.5"/>
        <circle cx="200" cy="12" r="3.5" fill="#f1f5f9" stroke="#eab308" stroke-width="1.5"/>
        <circle cx="10" cy="98" r="3.5" fill="#f1f5f9" stroke="#eab308" stroke-width="1.5"/>
        <circle cx="200" cy="98" r="3.5" fill="#f1f5f9" stroke="#eab308" stroke-width="1.5"/>
        <!-- Top Gold Header Strip -->
        <rect x="22" y="2" width="118" height="10" rx="2" fill="#0f172a"/>
        <text x="24" y="20" fill="#fef08a" font-family="monospace" font-size="7" font-weight="bold">GND  VCC  SDA  SCL</text>
        <!-- Dark Metal Bezel -->
        <rect x="14" y="24" width="182" height="68" rx="4" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
        <!-- Glowing Green Liquid Crystal Screen -->
        <rect x="22" y="31" width="166" height="54" rx="2" fill="${powered ? '#84cc16' : '#365314'}"/>
        ${powered ? `
          <text x="28" y="52" fill="#1a2e05" font-family="monospace" font-size="14" font-weight="900" letter-spacing="1">${line1}</text>
          <text x="28" y="74" fill="#1a2e05" font-family="monospace" font-size="14" font-weight="900" letter-spacing="1">${line2}</text>
        ` : `<text x="58" y="62" fill="#1a2e05" font-family="monospace" font-size="10">NO POWER / I2C</text>`}
      </svg>
    `;
  }

  // Interactive 4x4 Matrix Membrane Keypad
  if (inst.type === 'keypad_4x4') {
    const keys = [
      ['1', '2', '3', 'A'],
      ['4', '5', '6', 'B'],
      ['7', '8', '9', 'C'],
      ['*', '0', '#', 'D']
    ];
    let buttonsHtml = '';
    keys.forEach((row, rIdx) => {
      row.forEach((k, cIdx) => {
        const bx = 14 + cIdx * 25;
        const by = 14 + rIdx * 28;
        const isLetter = ['A', 'B', 'C', 'D'].includes(k);
        buttonsHtml += `
          <button data-keypad-key="${k}" style="position:absolute; left:${bx}px; top:${by}px; width:21px; height:23px;"
            class="keypad-btn rounded text-[11px] font-extrabold text-white shadow active:scale-90 flex items-center justify-center ${isLetter ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}">
            ${k}
          </button>
        `;
      });
    });

    return `
      <div class="w-full h-full relative">
        <svg viewBox="0 0 124 148" class="w-full h-full drop-shadow-lg overflow-visible">
          <rect x="6" y="4" width="112" height="128" rx="6" fill="#1e293b" stroke="#0f172a" stroke-width="2"/>
          <rect x="34" y="132" width="56" height="14" rx="2" fill="#334155"/>
        </svg>
        ${buttonsHtml}
      </div>
    `;
  }

  // Photorealistic SG90 Servo Motor
  if (inst.type === 'servo_sg90') {
    const angle = state?.servoAngle ?? 0;
    return `
      <svg viewBox="0 0 128 82" class="w-full h-full drop-shadow-lg overflow-visible">
        <rect x="18" y="16" width="86" height="50" rx="4" fill="#0284c7" stroke="#0369a1" stroke-width="2"/>
        <rect x="8" y="34" width="106" height="14" rx="2" fill="#0369a1"/>
        <text x="22" y="45" fill="#ffffff" font-family="sans-serif" font-size="9" font-weight="bold">SG90 (${angle}°)</text>
        <circle cx="82" cy="41" r="14" fill="#0f172a" stroke="#cbd5e1" stroke-width="1.5"/>
        <g style="transform-origin: 82px 41px; transform: rotate(${angle - 90}deg); transition: transform 0.35s ease-out;">
          <rect x="77" y="10" width="10" height="36" rx="5" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
          <circle cx="82" cy="41" r="4" fill="#475569"/>
        </g>
      </svg>
    `;
  }

  if (inst.type === 'pico_rp2040') {
    const gp15High = gpioStates[inst.id]?.GP15;
    return `
      <svg viewBox="0 0 185 96" class="w-full h-full drop-shadow-lg overflow-visible">
        <rect x="8" y="4" width="170" height="88" rx="5" fill="#15803d" stroke="#14532d" stroke-width="2"/>
        <rect x="0" y="30" width="18" height="36" rx="2" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
        <rect x="72" y="28" width="40" height="40" rx="3" fill="#0f172a"/>
        <text x="77" y="51" fill="#94a3b8" font-family="monospace" font-size="9" font-weight="bold">RP2040</text>
        <circle cx="42" cy="60" r="4" fill="${gp15High ? '#4ade80' : '#052e16'}"/>
        <text x="142" y="23" fill="#fef08a" font-family="monospace" font-size="8" font-weight="bold">3V3</text>
        <text x="138" y="51" fill="#bbf7d0" font-family="monospace" font-size="8" font-weight="bold">GP15</text>
        <text x="138" y="79" fill="#bbf7d0" font-family="monospace" font-size="8" font-weight="bold">GP14</text>
        <text x="14" y="79" fill="#bfdbfe" font-family="monospace" font-size="8" font-weight="bold">GND</text>
        <text x="58" y="18" fill="#ffffff" font-family="sans-serif" font-size="9" font-weight="bold">RASPBERRY PI PICO</text>
      </svg>
    `;
  }

  if (inst.type === 'oled_ssd1306') {
    const powered = state?.powered;
    const lines = state?.oledLines || ['VOLTLAB OS', 'I2C READY'];
    return `
      <svg viewBox="0 0 156 108" class="w-full h-full drop-shadow-lg overflow-visible">
        <rect x="4" y="6" width="148" height="98" rx="6" fill="#0f172a" stroke="#334155" stroke-width="2"/>
        <rect x="14" y="24" width="128" height="70" rx="4" fill="${powered ? '#042f2e' : '#020617'}"/>
        ${powered ? `
          <text x="22" y="44" fill="#22d3ee" font-family="monospace" font-size="10" font-weight="bold">${lines[0] || ''}</text>
          <text x="22" y="60" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="bold">${lines[1] || ''}</text>
          <text x="22" y="76" fill="#a5f3fc" font-family="monospace" font-size="10">${lines[2] || ''}</text>
        ` : `<text x="44" y="62" fill="#475569" font-family="monospace" font-size="9">NO I2C / PWR</text>`}
      </svg>
    `;
  }

  if (inst.type === 'dht22_sensor') {
    const temp = inst.temp ?? 28.5;
    const hum = inst.hum ?? 62;
    return `
      <svg viewBox="0 0 96 92" class="w-full h-full drop-shadow-lg overflow-visible cursor-pointer">
        <rect x="12" y="4" width="72" height="68" rx="6" fill="#ffffff" stroke="#64748b" stroke-width="2"/>
        <rect x="22" y="14" width="52" height="32" rx="3" fill="#cbd5e1"/>
        <text x="24" y="60" fill="#0f172a" font-family="monospace" font-size="9" font-weight="900">DHT22</text>
        <text x="18" y="69" fill="#0284c7" font-family="monospace" font-size="8" font-weight="bold">${temp}°C ${hum}%</text>
        <line x1="24" y1="72" x2="24" y2="92" stroke="#64748b" stroke-width="3"/>
        <line x1="48" y1="72" x2="48" y2="92" stroke="#64748b" stroke-width="3"/>
        <line x1="72" y1="72" x2="72" y2="92" stroke="#64748b" stroke-width="3"/>
      </svg>
    `;
  }

  if (inst.type === 'battery_9v') {
    return `
      <svg viewBox="0 0 130 76" class="w-full h-full drop-shadow-lg overflow-visible">
        <rect x="114" y="17" width="14" height="14" rx="3" fill="#94a3b8"/>
        <polygon points="114,45 128,43 128,61 114,59" fill="#64748b"/>
        <rect x="4" y="6" width="112" height="64" rx="8" fill="#0f172a"/>
        <path d="M 86 6 H 108 A 8 8 0 0 1 116 14 V 62 A 8 8 0 0 1 108 70 H 86 Z" fill="#d97706"/>
        <text x="14" y="34" fill="#fbbf24" font-family="monospace" font-weight="900" font-size="16">9V</text>
        <text x="14" y="52" fill="#e2e8f0" font-family="sans-serif" font-weight="800" font-size="11">DURAVOLT</text>
      </svg>
    `;
  }

  if (inst.type === 'resistor_220') {
    return `
      <svg viewBox="0 0 130 46" class="w-full h-full drop-shadow overflow-visible">
        <line x1="0" y1="23" x2="130" y2="23" stroke="#475569" stroke-width="4"/>
        <rect x="28" y="10" width="74" height="26" rx="10" fill="#fde68a" stroke="#92400e" stroke-width="1.5"/>
        <rect x="40" y="10" width="6" height="26" fill="#dc2626"/>
        <rect x="53" y="10" width="6" height="26" fill="#dc2626"/>
        <rect x="66" y="10" width="6" height="26" fill="#78350f"/>
        <rect x="84" y="10" width="5" height="26" fill="#eab308"/>
        <text x="50" y="6" fill="#334155" font-family="monospace" font-size="10" font-weight="bold">220Ω</text>
      </svg>
    `;
  }

  if (inst.type === 'switch_toggle') {
    const bladeAngle = inst.closed ? 0 : -34;
    return `
      <svg viewBox="0 0 124 68" class="w-full h-full drop-shadow-lg overflow-visible cursor-pointer">
        <rect x="8" y="34" width="108" height="26" rx="5" fill="#451a03"/>
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
    const bloom = isLit ? `filter: drop-shadow(0 0 16px ${color});` : '';
    return `
      <svg viewBox="0 0 110 70" class="w-full h-full overflow-visible ${isBlown ? 'component-blown' : ''}" style="${bloom}">
        <polyline points="0,22 24,22 30,27 52,27" fill="none" stroke="#475569" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="0" y1="48" x2="52" y2="48" stroke="#475569" stroke-width="3.5" stroke-linecap="round"/>
        <rect x="48" y="13" width="8" height="44" rx="2" fill="${isBlown ? '#334155' : color}"/>
        <path d="M 56 16 H 78 A 19 19 0 0 1 78 54 H 56 Z" fill="${isLit ? color : isBlown ? '#1e293b' : color + '66'}" stroke="#334155" stroke-width="1.5"/>
        ${isBlown ? '<text x="64" y="40" font-size="16">💥</text>' : ''}
        <text x="54" y="8" fill="#1e293b" font-family="monospace" font-size="10" font-weight="bold">${spec.name.split(' ')[1]} LED</text>
      </svg>
    `;
  }

  return '';
}
  
