import { COMPONENT_CATALOG } from './components.js';
import { SimulationEngine } from './engine.js';

const engine = new SimulationEngine();

// Application State
let instances = [];
let wires = [];
let selectedWireColor = '#ef4444';
let pendingPin = null;
let selectedInstanceId = null;
let isRunning = false;
let idCounter = 1;
let zoomLevel = 0.85;
let panX = 0;
let panY = 0;
let gpioStates = {}; // instanceId -> { GP15: true/false, D13: true/false }
let codeTimers = [];

// Code Presets
const CODE_PRESETS = {
  pico_blink: `# Raspberry Pi Pico — MicroPython Blink
from machine import Pin
import time

led = Pin(15, Pin.OUT)

while True:
    led.value(1)
    print("GP15 -> HIGH (3.3V)")
    time.sleep(0.8)
    led.value(0)
    print("GP15 -> LOW (0.0V)")
    time.sleep(0.8)`,

  pico_sos: `# Raspberry Pi Pico — Fast Pulse
from machine import Pin
import time

led = Pin(15, Pin.OUT)

while True:
    led.value(1)
    print("PULSE ON!")
    time.sleep(0.3)
    led.value(0)
    print("PULSE OFF")
    time.sleep(0.3)`,

  arduino_blink: `// Arduino Uno R3 — Blink Sketch
void setup() {
  Serial.begin(115200);
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  Serial.println("D13 -> HIGH (5.0V)");
  delay(800);
  digitalWrite(13, LOW);
  Serial.println("D13 -> LOW (0.0V)");
  delay(800);
}`
};

// DOM Elements
const componentListEl = document.getElementById('component-list');
const componentLayerEl = document.getElementById('component-layer');
const wireLayerEl = document.getElementById('wire-layer');
const canvasContainerEl = document.getElementById('canvas-container');
const zoomStageEl = document.getElementById('zoom-stage');
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnZoomReset = document.getElementById('btn-zoom-reset');
const btnRun = document.getElementById('btn-run');
const btnStop = document.getElementById('btn-stop');
const btnClear = document.getElementById('btn-clear');
const btnDemo = document.getElementById('btn-demo');
const btnPicoDemo = document.getElementById('btn-pico-demo');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const consoleLogEl = document.getElementById('console-log');
const mobileLogEl = document.getElementById('mobile-log');
const mobileReadingsEl = document.getElementById('mobile-readings');
const selectedInfoEl = document.getElementById('selected-info');
const codeDrawerEl = document.getElementById('code-drawer');
const codeEditorEl = document.getElementById('code-editor');
const codePresetEl = document.getElementById('code-preset');
const serialOutputEl = document.getElementById('serial-output');

codeEditorEl.value = CODE_PRESETS.pico_blink;

function updateStageTransform() {
  zoomStageEl.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
  btnZoomReset.textContent = `${Math.round(zoomLevel * 100)}%`;
}

function setZoom(newZoom) {
  zoomLevel = Math.min(1.5, Math.max(0.5, Number(newZoom.toFixed(2))));
  updateStageTransform();
}

btnZoomIn.addEventListener('click', () => setZoom(zoomLevel + 0.15));
btnZoomOut.addEventListener('click', () => setZoom(zoomLevel - 0.15));
btnZoomReset.addEventListener('click', () => {
  zoomLevel = 0.85;
  panX = 0;
  panY = 0;
  updateStageTransform();
});

// Pan or Cancel Pending Pin when tapping empty grid
canvasContainerEl.addEventListener('pointerdown', e => {
  if (e.target.closest('.circuit-node') || e.target.closest('.wire-hit') || e.target.closest('button')) return;

  if (pendingPin) {
    pendingPin = null;
    appendLog('info', 'Pin selection cancelled.');
    renderWorkspace();
  }

  const startX = e.clientX;
  const startY = e.clientY;
  const origPanX = panX;
  const origPanY = panY;

  const onMove = moveEv => {
    panX = origPanX + (moveEv.clientX - startX);
    panY = origPanY + (moveEv.clientY - startY);
    updateStageTransform();
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
});

// 1. Render Component Palette
function renderPalette(filter = '') {
  componentListEl.innerHTML = '';
  Object.values(COMPONENT_CATALOG)
    .filter(c => c.name.toLowerCase().includes(filter.toLowerCase()))
    .forEach(comp => {
      const card = document.createElement('div');
      card.className = 'p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400/60 cursor-pointer transition flex items-center justify-between active:scale-95';
      card.innerHTML = `
        <div>
          <div class="text-xs font-bold text-slate-100">${comp.name}</div>
          <div class="text-[10px] text-slate-400">${comp.category} • ${comp.pins.length} pins</div>
        </div>
        <span class="text-cyan-400 text-lg font-bold">+</span>
      `;
      card.addEventListener('click', () => {
        spawnComponent(comp.type, (-panX + 70) / zoomLevel, (-panY + 110) / zoomLevel);
        document.getElementById('palette-drawer').classList.add('-translate-x-full');
      });
      componentListEl.appendChild(card);
    });
}

function spawnComponent(type, x, y, extra = {}) {
  const spec = COMPONENT_CATALOG[type];
  if (!spec) return null;

  const instance = {
    id: `comp_${idCounter++}`,
    type,
    x: Math.round(x),
    y: Math.round(y),
    closed: false,
    ...extra
  };
  instances.push(instance);
  renderWorkspace();
  if (isRunning) evaluateCircuit();
  return instance;
}

// 3. Realistic Vector SVG Hardware Artwork
function getComponentGraphic(inst, state) {
  const spec = COMPONENT_CATALOG[inst.type];
  const isLit = state?.lit;
  const isBlown = state?.blown;

  // Raspberry Pi Pico RP2040
  if (inst.type === 'pico_rp2040') {
    const gp15High = gpioStates[inst.id]?.GP15;
    return `
      <svg viewBox="0 0 165 86" class="w-full h-full drop-shadow-xl overflow-visible">
        <!-- Green PCB -->
        <rect x="6" y="4" width="153" height="78" rx="5" fill="#065f46" stroke="#10b981" stroke-width="2"/>
        <!-- Micro-USB Port on Left -->
        <rect x="0" y="27" width="16" height="32" rx="2" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
        <!-- RP2040 Silicon Chip -->
        <rect x="64" y="25" width="36" height="36" rx="3" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>
        <text x="69" y="46" fill="#94a3b8" font-family="monospace" font-size="8" font-weight="bold">RP2040</text>
        <!-- White BOOTSEL Button -->
        <rect x="30" y="16" width="16" height="12" rx="2" fill="#f8fafc" stroke="#94a3b8" stroke-width="1"/>
        <!-- Onboard Green LED -->
        <circle cx="38" cy="54" r="4" fill="${gp15High ? '#4ade80' : '#14532d'}" style="${gp15High ? 'filter: drop-shadow(0 0 8px #4ade80);' : ''}"/>
        <!-- Pin Labels -->
        <text x="122" y="21" fill="#fde047" font-family="monospace" font-size="8" font-weight="bold">3V3</text>
        <text x="122" y="46" fill="#86efac" font-family="monospace" font-size="8" font-weight="bold">GP15</text>
        <text x="122" y="71" fill="#86efac" font-family="monospace" font-size="8" font-weight="bold">GP14</text>
        <text x="12" y="71" fill="#93c5fd" font-family="monospace" font-size="8" font-weight="bold">GND</text>
        <text x="54" y="16" fill="#ecfdf5" font-family="sans-serif" font-size="8" font-weight="bold">RASPBERRY PI PICO</text>
      </svg>
    `;
  }

  // Arduino Uno R3
  if (inst.type === 'arduino_uno') {
    const d13High = gpioStates[inst.id]?.D13;
    return `
      <svg viewBox="0 0 180 115" class="w-full h-full drop-shadow-xl overflow-visible">
        <!-- Blue Arduino PCB -->
        <rect x="10" y="4" width="164" height="107" rx="6" fill="#0369a1" stroke="#38bdf8" stroke-width="2"/>
        <!-- Silver USB-B Port -->
        <rect x="0" y="18" width="24" height="28" rx="2" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
        <!-- Black Barrel Jack -->
        <rect x="2" y="72" width="24" height="22" rx="2" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
        <!-- ATmega328P DIP Chip -->
        <rect x="64" y="62" width="84" height="22" rx="2" fill="#1e293b" stroke="#64748b" stroke-width="1.5"/>
        <!-- Onboard L (D13) & ON LEDs -->
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

// 4. Render All Components & Large Touch Pins
function renderWorkspace(simResult = null) {
  componentLayerEl.innerHTML = '';

  instances.forEach(inst => {
    const spec = COMPONENT_CATALOG[inst.type];
    const state = simResult?.componentStates?.[inst.id];

    const el = document.createElement('div');
    el.className = `circuit-node pointer-events-auto ${selectedInstanceId === inst.id ? 'selected' : ''}`;
    el.style.left = `${inst.x}px`;
    el.style.top = `${inst.y}px`;
    el.style.width = `${spec.width}px`;
    el.style.height = `${spec.height}px`;
    el.innerHTML = getComponentGraphic(inst, state);

    spec.pins.forEach(pin => {
      const pinEl = document.createElement('div');
      const isPending = pendingPin && pendingPin.instanceId === inst.id && pendingPin.pinId === pin.id;
      pinEl.className = `pin-dot absolute -translate-x-1/2 -translate-y-1/2 ${isPending ? 'active-pin' : ''}`;
      pinEl.style.left = `${pin.x}px`;
      pinEl.style.top = `${pin.y}px`;
      pinEl.style.backgroundColor = pin.color;
      pinEl.title = `${spec.name} — ${pin.label}`;

      pinEl.addEventListener('pointerdown', e => {
        e.stopPropagation();
        handlePinClick(inst.id, pin.id);
      });

      el.appendChild(pinEl);
    });

    let startX, startY, origX, origY, moved = false;

    el.addEventListener('pointerdown', e => {
      if (e.target.classList.contains('pin-dot')) return;
      e.stopPropagation();
      selectedInstanceId = inst.id;
      updateInspector(inst, state);

      startX = e.clientX;
      startY = e.clientY;
      origX = inst.x;
      origY = inst.y;
      moved = false;

      const onPointerMove = moveEvent => {
        const dx = (moveEvent.clientX - startX) / zoomLevel;
        const dy = (moveEvent.clientY - startY) / zoomLevel;
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
        if (!moved) return;
        inst.x = Math.max(10, Math.round(origX + dx));
        inst.y = Math.max(10, Math.round(origY + dy));
        el.style.left = `${inst.x}px`;
        el.style.top = `${inst.y}px`;
        renderWires(simResult);
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);

        if (!moved && inst.type === 'switch_toggle') {
          inst.closed = !inst.closed;
          if (isRunning) evaluateCircuit();
          else renderWorkspace();
        } else if (moved) {
          renderWorkspace(simResult);
        }
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    });

    componentLayerEl.appendChild(el);
  });

  renderWires(simResult);
}

// 5. Handle Pin-to-Pin Wiring
function handlePinClick(instanceId, pinId) {
  if (!pendingPin) {
    pendingPin = { instanceId, pinId };
    const inst = instances.find(i => i.id === instanceId);
    appendLog('info', `Selected ${COMPONENT_CATALOG[inst.type].name} (${pinId}). Tap destination pin...`);
    renderWorkspace();
    return;
  }

  if (pendingPin.instanceId === instanceId && pendingPin.pinId === pinId) {
    pendingPin = null;
    renderWorkspace();
    return;
  }

  if (pendingPin.instanceId === instanceId) {
    appendLog('warn', 'Cannot wire a component to itself.');
    pendingPin = null;
    renderWorkspace();
    return;
  }

  wires.push({
    id: `wire_${idCounter++}`,
    from: pendingPin,
    to: { instanceId, pinId },
    color: selectedWireColor
  });

  pendingPin = null;
  if (isRunning) evaluateCircuit();
  else renderWorkspace();
}

// 6. Render Curved SVG Wires
function renderWires(simResult = null) {
  wireLayerEl.innerHTML = '';

  wires.forEach(w => {
    const fromInst = instances.find(i => i.id === w.from.instanceId);
    const toInst = instances.find(i => i.id === w.to.instanceId);
    if (!fromInst || !toInst) return;

    const fromPin = COMPONENT_CATALOG[fromInst.type].pins.find(p => p.id === w.from.pinId);
    const toPin = COMPONENT_CATALOG[toInst.type].pins.find(p => p.id === w.to.pinId);

    const x1 = fromInst.x + fromPin.x;
    const y1 = fromInst.y + fromPin.y;
    const x2 = toInst.x + toPin.x;
    const y2 = toInst.y + toPin.y;

    const cx1 = x1 + (x2 - x1) * 0.4;
    const cy1 = y1 + 18;
    const cx2 = x2 - (x2 - x1) * 0.4;
    const cy2 = y2 + 18;
    const d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

    const visiblePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    visiblePath.setAttribute('d', d);
    visiblePath.setAttribute('fill', 'none');
    visiblePath.setAttribute('stroke', w.color);
    visiblePath.setAttribute('stroke-width', '4'
                             visiblePath.setAttribute('stroke-linecap', 'round');
    visiblePath.style.pointerEvents = 'none';

    if (isRunning && simResult?.activeWires?.has(w.id)) {
      visiblePath.classList.add('wire-energized');
    }

    const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitPath.setAttribute('d', d);
    hitPath.setAttribute('fill', 'none');
    hitPath.setAttribute('stroke', 'rgba(255,255,255,0.001)');
    hitPath.setAttribute('stroke-width', '28');
    hitPath.setAttribute('class', 'wire-hit');
    hitPath.style.cursor = 'pointer';
    hitPath.style.pointerEvents = 'stroke';

    const deleteWire = e => {
      e.stopPropagation();
      wires = wires.filter(item => item.id !== w.id);
      appendLog('warn', 'Wire removed.');
      if (isRunning) evaluateCircuit();
      else renderWorkspace();
    };

    hitPath.addEventListener('pointerdown', deleteWire);
    hitPath.addEventListener('click', deleteWire);

    wireLayerEl.appendChild(visiblePath);
    wireLayerEl.appendChild(hitPath);
  });
}

// 7. Microcontroller Code Interpreter & Timer Loop
function stopCodeTimers() {
  codeTimers.forEach(t => clearInterval(t));
  codeTimers = [];
}

function appendSerial(msg) {
  const line = document.createElement('div');
  line.textContent = `> ${msg}`;
  serialOutputEl.appendChild(line);
  serialOutputEl.scrollTop = serialOutputEl.scrollHeight;
}

function startMcuExecution() {
  stopCodeTimers();
  const code = codeEditorEl.value;
  const mcus = instances.filter(i => i.type === 'pico_rp2040' || i.type === 'arduino_uno');
  if (mcus.length === 0) return;

  // Parse delay/sleep interval in ms (defaults to 800ms)
  const sleepMatch = code.match(/time\.sleep\(([\d.]+)\)/);
  const delayMatch = code.match(/delay\((\d+)\)/);
  const intervalMs = sleepMatch ? parseFloat(sleepMatch[1]) * 1000 : delayMatch ? parseInt(delayMatch[1], 10) : 800;

  // Detect target pin (GP15, GP14, D13, D12)
  const pinMatch = code.match(/Pin\((\d+)/) || code.match(/digitalWrite\((\d+)/);
  const pinNum = pinMatch ? pinMatch[1] : '15';

  let toggleState = true;
  serialOutputEl.innerHTML = '';
  appendSerial('Booting microcontroller firmware...');

  const tick = () => {
    mcus.forEach(mcu => {
      if (!gpioStates[mcu.id]) gpioStates[mcu.id] = {};
      const pinKey = mcu.type === 'pico_rp2040' ? `GP${pinNum}` : `D${pinNum}`;
      gpioStates[mcu.id][pinKey] = toggleState;
      appendSerial(`${pinKey} = ${toggleState ? 'HIGH (1)' : 'LOW (0)'}`);
    });
    evaluateCircuit();
    toggleState = !toggleState;
  };

  tick();
  const timer = setInterval(tick, Math.max(250, intervalMs));
  codeTimers.push(timer);
}

// 8. Evaluate Electrical State
function evaluateCircuit() {
  const result = engine.evaluate(instances, wires, gpioStates);
  renderWorkspace(result);
  renderLogs(result.logs);

  const activeLed = Object.values(result.componentStates).find(s => s.lit);
  if (result.shortCircuit) {
    mobileReadingsEl.textContent = 'SHORT CIRCUIT!';
    mobileReadingsEl.className = 'text-rose-400 font-bold';
  } else if (activeLed) {
    mobileReadingsEl.textContent = `${activeLed.voltage}V | ${activeLed.currentMa}mA`;
    mobileReadingsEl.className = 'text-emerald-400 font-bold';
  } else {
    mobileReadingsEl.textContent = '0.00V | 0.0mA';
    mobileReadingsEl.className = 'text-slate-400';
  }
}

function runSimulation() {
  isRunning = true;
  btnRun.classList.add('hidden');
  btnStop.classList.remove('hidden');
  statusDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-ping';
  statusText.textContent = 'LIVE';
  statusText.className = 'text-emerald-400 font-bold';

  startMcuExecution();
  evaluateCircuit();
}

function stopSimulation() {
  isRunning = false;
  stopCodeTimers();
  gpioStates = {};
  btnStop.classList.add('hidden');
  btnRun.classList.remove('hidden');
  statusDot.className = 'w-2 h-2 rounded-full bg-slate-500';
  statusText.textContent = 'STOPPED';
  statusText.className = 'text-slate-300';
  renderWorkspace(null);
}

function renderLogs(logs) {
  const colorMap = {
    error: 'text-rose-400',
    warn: 'text-amber-300',
    success: 'text-emerald-400',
    info: 'text-cyan-300'
  };

  const html = logs
    .map(l => `<div class="${colorMap[l.type] || 'text-slate-300'}">[${l.time}] ${l.message}</div>`)
    .join('');

  consoleLogEl.innerHTML = html || '<div class="text-slate-500">No events.</div>';
  mobileLogEl.innerHTML = html || '<div class="text-slate-500">Ready.</div>';
}

function appendLog(type, message) {
  renderLogs([{ type, message, time: new Date().toLocaleTimeString() }]);
}

function updateInspector(inst, state) {
  const spec = COMPONENT_CATALOG[inst.type];
  selectedInfoEl.innerHTML = `
    <div class="font-bold text-cyan-300 text-sm">${spec.name}</div>
    <div class="text-slate-400 text-[11px] mt-0.5">${spec.description}</div>
    <div class="mt-2 pt-2 border-t border-slate-700 flex justify-between">
      <span>State:</span>
      <span class="font-bold text-emerald-400">${state?.status || 'READY'}</span>
    </div>
    <button id="btn-delete-comp" class="mt-2 w-full py-1 rounded bg-rose-500/20 border border-rose-500/50 text-rose-300 hover:bg-rose-500/30 text-[11px]">
      Delete Component
    </button>
  `;
  document.getElementById('btn-delete-comp')?.addEventListener('click', () => {
    instances = instances.filter(i => i.id !== inst.id);
    wires = wires.filter(w => w.from.instanceId !== inst.id && w.to.instanceId !== inst.id);
    selectedInstanceId = null;
    selectedInfoEl.textContent = 'Tap any component to inspect';
    if (isRunning) evaluateCircuit();
    else renderWorkspace();
  });
    }
// 9. Built-in Demos
function loadLedDemo() {
  stopSimulation();
  instances = [];
  wires = [];
  idCounter = 1;
  panX = 0;
  panY = 0;
  zoomLevel = 0.85;
  updateStageTransform();

  const bat = spawnComponent('battery_9v', 18, 120);
  const sw = spawnComponent('switch_toggle', 185, 75, { closed: true });
  const res = spawnComponent('resistor_220', 185, 185);
  const led = spawnComponent('led_cyan', 345, 125);

  wires.push(
    { id: 'w1', from: { instanceId: bat.id, pinId: 'VCC' }, to: { instanceId: sw.id, pinId: 'IN' }, color: '#ef4444' },
    { id: 'w2', from: { instanceId: sw.id, pinId: 'OUT' }, to: { instanceId: led.id, pinId: 'ANODE' }, color: '#eab308' },
    { id: 'w3', from: { instanceId: led.id, pinId: 'CATHODE' }, to: { instanceId: res.id, pinId: 'P2' }, color: '#22c55e' },
    { id: 'w4', from: { instanceId: res.id, pinId: 'P1' }, to: { instanceId: bat.id, pinId: 'GND' }, color: '#3b82f6' }
  );

  runSimulation();
}

function loadPicoBlinkDemo() {
  stopSimulation();
  instances = [];
  wires = [];
  idCounter = 1;
  panX = 0;
  panY = 0;
  zoomLevel = 0.85;
  updateStageTransform();

  codePresetEl.value = 'pico_blink';
  codeEditorEl.value = CODE_PRESETS.pico_blink;

  const pico = spawnComponent('pico_rp2040', 20, 110);
  const res = spawnComponent('resistor_220', 210, 195);
  const led = spawnComponent('led_red', 335, 115);

  wires.push(
    { id: 'w1', from: { instanceId: pico.id, pinId: 'GP15' }, to: { instanceId: led.id, pinId: 'ANODE' }, color: '#22c55e' },
    { id: 'w2', from: { instanceId: led.id, pinId: 'CATHODE' }, to: { instanceId: res.id, pinId: 'P2' }, color: '#eab308' },
    { id: 'w3', from: { instanceId: res.id, pinId: 'P1' }, to: { instanceId: pico.id, pinId: 'GND' }, color: '#3b82f6' }
  );

  runSimulation();
}

// Event Listeners
btnRun.addEventListener('click', runSimulation);
btnStop.addEventListener('click', stopSimulation);
btnClear.addEventListener('click', () => {
  stopSimulation();
  instances = [];
  wires = [];
  renderWorkspace();
  appendLog('info', 'Workspace cleared.');
});
btnDemo.addEventListener('click', loadLedDemo);
btnPicoDemo.addEventListener('click', loadPicoBlinkDemo);

// Code Drawer Controls
document.getElementById('btn-toggle-code').addEventListener('click', () => {
  codeDrawerEl.classList.toggle('hidden');
});
document.getElementById('btn-close-code').addEventListener('click', () => {
  codeDrawerEl.classList.add('hidden');
});
document.getElementById('btn-code-run').addEventListener('click', () => {
  runSimulation();
});
document.getElementById('btn-clear-serial').addEventListener('click', () => {
  serialOutputEl.innerHTML = '';
});
codePresetEl.addEventListener('change', e => {
  codeEditorEl.value = CODE_PRESETS[e.target.value] || '';
  if (isRunning) runSimulation();
});

document.querySelectorAll('.wire-color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.wire-color-btn').forEach(b => b.classList.remove('ring-2', 'ring-white', 'scale-110', 'opacity-100'));
    btn.classList.add('ring-2', 'ring-white', 'scale-110', 'opacity-100');
    selectedWireColor = btn.dataset.color;
  });
});

document.getElementById('open-palette').addEventListener('click', () => {
  document.getElementById('palette-drawer').classList.remove('-translate-x-full');
});
document.getElementById('close-palette').addEventListener('click', () => {
  document.getElementById('palette-drawer').classList.add('-translate-x-full');
});
document.getElementById('search-comp').addEventListener('input', e => renderPalette(e.target.value));

// Initialize with Pico Blink Demo
renderPalette();
loadPicoBlinkDemo();
