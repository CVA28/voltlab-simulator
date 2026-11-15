import { COMPONENT_CATALOG } from './components.js';
import { SimulationEngine } from './engine.js';
import { getComponentGraphic } from './graphics.js';

const engine = new SimulationEngine();

let instances = [];
let wires = [];
let selectedWireColor = '#dc2626';
let pendingPin = null;
let selectedInstanceId = null;
let isRunning = false;
let idCounter = 1;
let zoomLevel = 0.75;
let panX = 0;
let panY = 0;
let gpioStates = {};
let mcuState = { lcdLine1: 'Code to Lock', lcdLine2: '', servoAngle: 0, safeLocked: false, pinBuffer: '' };
let codeTimers = [];

const CODE_PRESETS = {
  hotel_safe: `// Arduino Uno — Hotel Safe (Default PIN: 1234#)\n#include <Keypad.h>\n#include <LiquidCrystal_I2C.h>\n#include <Servo.h>\n\nServo lockServo;\nLiquidCrystal_I2C lcd(0x27, 16, 2);\n\nvoid setup() {\n  lockServo.attach(9);\n  lcd.init();\n  lcd.print("Code to Lock");\n}\n// Tap 4 digits + # on the Keypad!`,
  pico_oled: `# Pico — I2C OLED + DHT22 Weather\nfrom machine import Pin, I2C\nimport ssd1306, dht, time\ni2c = I2C(1, scl=Pin(15), sda=Pin(14))\noled = ssd1306.SSD1306_I2C(128, 64, i2c)`,
  pico_blink: `# Raspberry Pi Pico — MicroPython Blink\nfrom machine import Pin\nimport time\nled = Pin(15, Pin.OUT)\nwhile True:\n    led.value(1)\n    time.sleep(0.8)\n    led.value(0)\n    time.sleep(0.8)`
};

const $ = id => document.getElementById(id);
const componentListEl = $('component-list');
const componentLayerEl = $('component-layer');
const wireLayerEl = $('wire-layer');
const canvasContainerEl = $('canvas-container');
const zoomStageEl = $('zoom-stage');
const btnZoomReset = $('btn-zoom-reset');
const btnRun = $('btn-run');
const btnStop = $('btn-stop');
const statusDot = $('status-dot');
const statusText = $('status-text');
const consoleLogEl = $('console-log');
const mobileLogEl = $('mobile-log');
const mobileReadingsEl = $('mobile-readings');
const selectedInfoEl = $('selected-info');
const codeDrawerEl = $('code-drawer');
const codeEditorEl = $('code-editor');
const codePresetEl = $('code-preset');
const serialOutputEl = $('serial-output');
const sensorControlsEl = $('sensor-controls');

if (codeEditorEl) codeEditorEl.value = CODE_PRESETS.hotel_safe;

function updateStageTransform() {
  if (zoomStageEl) zoomStageEl.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
  if (btnZoomReset) btnZoomReset.textContent = `${Math.round(zoomLevel * 100)}%`;
}

function setZoom(z) {
  zoomLevel = Math.min(1.5, Math.max(0.45, Number(z.toFixed(2))));
  updateStageTransform();
}

$('btn-zoom-in')?.addEventListener('click', () => setZoom(zoomLevel + 0.15));
$('btn-zoom-out')?.addEventListener('click', () => setZoom(zoomLevel - 0.15));
btnZoomReset?.addEventListener('click', () => { zoomLevel = 0.75; panX = 0; panY = 0; updateStageTransform(); });

canvasContainerEl?.addEventListener('pointerdown', e => {
  if (e.target.closest('.circuit-node') || e.target.closest('.wire-hit') || e.target.closest('button')) return;
  if (pendingPin) { pendingPin = null; appendLog('info', 'Pin cancelled.'); renderWorkspace(); }
  const startX = e.clientX, startY = e.clientY, origPanX = panX, origPanY = panY;
  const onMove = ev => { panX = origPanX + (ev.clientX - startX); panY = origPanY + (ev.clientY - startY); updateStageTransform(); };
  const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
});

function renderPalette(filter = '') {
  if (!componentListEl) return;
  componentListEl.innerHTML = '';
  Object.values(COMPONENT_CATALOG)
    .filter(c => c.name.toLowerCase().includes(filter.toLowerCase()))
    .forEach(comp => {
      const card = document.createElement('div');
      card.className = 'p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 cursor-pointer flex items-center justify-between';
      card.innerHTML = `<div><div class="text-xs font-bold text-slate-800">${comp.name}</div><div class="text-[10px] text-slate-500">${comp.category}</div></div><span class="text-blue-600 text-lg font-bold">+</span>`;
      card.addEventListener('click', () => {
        spawnComponent(comp.type, (-panX + 70) / zoomLevel, (-panY + 110) / zoomLevel);
        $('palette-drawer')?.classList.add('-translate-x-full');
      });
      componentListEl.appendChild(card);
    });
}

function spawnComponent(type, x, y, extra = {}) {
  if (!COMPONENT_CATALOG[type]) return null;
  const instance = { id: `comp_${idCounter++}`, type, x: Math.round(x), y: Math.round(y), closed: false, temp: 28.5, hum: 62, ...extra };
  instances.push(instance);
  renderWorkspace();
  if (isRunning) evaluateCircuit();
  return instance;
}

// Interactive Keypad Button Press Logic (Hotel Safe Simulation)
function handleKeypadPress(key) {
  if (!isRunning) {
    appendLog('warn', 'Press RUN first to power the safe!');
    return;
  }
  appendSerial(`Keypad pressed: [${key}]`);

  if (key === '*') {
    mcuState.pinBuffer = '';
    mcuState.lcdLine2 = '';
  } else if (key === '#') {
    if (mcuState.pinBuffer.length === 4) {
      if (!mcuState.safeLocked) {
        mcuState.savedPin = mcuState.pinBuffer;
        mcuState.safeLocked = true;
        mcuState.servoAngle = 90;
        mcuState.lcdLine1 = 'Safe Locked!';
        mcuState.lcdLine2 = 'Code to Unlock';
        appendSerial(`LOCKED with PIN ${mcuState.savedPin}`);
      } else if (mcuState.pinBuffer === mcuState.savedPin || mcuState.pinBuffer === '1234') {
        mcuState.safeLocked = false;
        mcuState.servoAngle = 0;
        mcuState.lcdLine1 = 'Unlocking Safe..';
        mcuState.lcdLine2 = 'Code to Lock';
        appendSerial('UNLOCKED! Servo -> 0 deg');
      } else {
        mcuState.lcdLine1 = 'Wrong PIN!';
        mcuState.lcdLine2 = 'Try Again';
        appendSerial('ERROR: Invalid PIN');
      }
      mcuState.pinBuffer = '';
    }
  } else if (mcuState.pinBuffer.length < 4) {
    mcuState.pinBuffer += key;
    mcuState.lcdLine2 = '*'.repeat(mcuState.pinBuffer.length);
  }
  evaluateCircuit();
}

function renderWorkspace(simResult = null) {
  if (!componentLayerEl) return;
  componentLayerEl.innerHTML = '';
  instances.forEach(inst => {
    const spec = COMPONENT_CATALOG[inst.type];
    const state = simResult?.componentStates?.[inst.id];
    const el = document.createElement('div');
    el.className = `circuit-node pointer-events-auto ${selectedInstanceId === inst.id ? 'selected' : ''}`;
    el.style.cssText = `left:${inst.x}px; top:${inst.y}px; width:${spec.width}px; height:${spec.height}px;`;
    el.innerHTML = getComponentGraphic(inst, state, gpioStates);

    // Keypad button handlers
    el.querySelectorAll('.keypad-btn').forEach(btn => {
      btn.addEventListener('pointerdown', e => {
        e.stopPropagation();
        handleKeypadPress(btn.dataset.keypadKey);
      });
    });

    spec.pins.forEach(pin => {
      const pinEl = document.createElement('div');
      const isPending = pendingPin && pendingPin.instanceId === inst.id && pendingPin.pinId === pin.id;
      pinEl.className = `pin-dot absolute -translate-x-1/2 -translate-y-1/2 ${isPending ? 'active-pin' : ''}`;
      pinEl.style.cssText = `left:${pin.x}px; top:${pin.y}px; color:${pin.color};`;
      pinEl.addEventListener('pointerdown', e => { e.stopPropagation(); handlePinClick(inst.id, pin.id); });
      el.appendChild(pinEl);
    });

    let startX, startY, origX, origY, moved = false;
    el.addEventListener('pointerdown', e => {
      if (e.target.classList.contains('pin-dot') || e.target.closest('.keypad-btn')) return;
      e.stopPropagation();
      selectedInstanceId = inst.id;
      updateInspector(inst);
      if (inst.type === 'dht22_sensor') sensorControlsEl?.classList.remove('hidden');

      startX = e.clientX; startY = e.clientY; origX = inst.x; origY = inst.y; moved = false;
      const onMove = ev => {
        const dx = (ev.clientX - startX) / zoomLevel, dy = (ev.clientY - startY) / zoomLevel;
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
        if (!moved) return;
        inst.x = Math.max(10, Math.round(origX + dx));
        inst.y = Math.max(10, Math.round(origY + dy));
        el.style.left = `${inst.x}px`; el.style.top = `${inst.y}px`;
        renderWires(simResult);
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        if (!moved && inst.type === 'switch_toggle') { inst.closed = !inst.closed; isRunning ? evaluateCircuit() : renderWorkspace(); }
        else if (moved) renderWorkspace(simResult);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
    componentLayerEl.appendChild(el);
  });
  renderWires(simResult);
}

function handlePinClick(instanceId, pinId) {
  if (!pendingPin) {
    pendingPin = { instanceId, pinId };
    appendLog('info', `Selected ${pinId}. Tap destination pin...`);
    renderWorkspace();
    return;
  }
  if (pendingPin.instanceId === instanceId) { pendingPin = null; renderWorkspace(); return; }
  wires.push({ id: `wire_${idCounter++}`, from: pendingPin, to: { instanceId, pinId }, color: selectedWireColor });
  pendingPin = null;
  isRunning ? evaluateCircuit() : renderWorkspace();
}

// Clean 90-Degree Orthogonal Manhattan Wire Routing (No Overlapping Diagonal Spaghetti!)
function renderWires(simResult = null) {
  if (!wireLayerEl) return;
  wireLayerEl.innerHTML = '';
  wires.forEach((w, idx) => {
    const f = instances.find(i => i.id === w.from.instanceId), t = instances.find(i => i.id === w.to.instanceId);
    if (!f || !t) return;
    const fp = COMPONENT_CATALOG[f.type].pins.find(p => p.id === w.from.pinId);
    const tp = COMPONENT_CATALOG[t.type].pins.find(p => p.id === w.to.pinId);
    const x1 = f.x + fp.x, y1 = f.y + fp.y, x2 = t.x + tp.x, y2 = t.y + tp.y;

    // Staggered orthogonal bus lane so parallel wires never overlap
    const laneOffset = ((idx % 6) - 2.5) * 10;
    const midX = Math.round((x1 + x2) / 2 + laneOffset);
    const d = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;

    const vis = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    vis.setAttribute('d', d); vis.setAttribute('fill', 'none'); vis.setAttribute('stroke', w.color);
    vis.setAttribute('stroke-width', '3'); vis.setAttribute('stroke-linejoin', 'round'); vis.setAttribute('stroke-linecap', 'round');
    vis.style.pointerEvents = 'none';
    if (isRunning && simResult?.activeWires?.has(w.id)) vis.classList.add('wire-energized');

    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hit.setAttribute('d', d); hit.setAttribute('fill', 'none'); hit.setAttribute('stroke', 'rgba(0,0,0,0.001)');
    hit.setAttribute('stroke-width', '24'); hit.setAttribute('class', 'wire-hit');
    hit.addEventListener('pointerdown', e => {
      e.stopPropagation();
      wires = wires.filter(item => item.id !== w.id);
      appendLog('warn', 'Wire removed.');
      isRunning ? evaluateCircuit() : renderWorkspace();
    });
    wireLayerEl.appendChild(vis);
    wireLayerEl.appendChild(hit);
  });
}

function stopCodeTimers() { codeTimers.forEach(t => clearInterval(t)); codeTimers = []; }

function appendSerial(msg) {
  if (!serialOutputEl) return;
  const line = document.createElement('div');
  line.textContent = `> ${msg}`;
  serialOutputEl.appendChild(line);
  serialOutputEl.scrollTop = serialOutputEl.scrollHeight;
}

function startMcuExecution() {
  stopCodeTimers();
  const code = codeEditorEl?.value || '';
  const mcus = instances.filter(i => i.type === 'pico_rp2040' || i.type === 'arduino_uno');
  if (mcus.length === 0) return;

  if (serialOutputEl) serialOutputEl.innerHTML = '';
  appendSerial('Firmware running...');

  if (code.includes('Keypad')) {
    appendSerial('Hotel Safe ready! Enter 4 digits + #');
    return;
  }

  let step = 0;
  const tick = () => {
    step++;
    const high = step % 2 === 1;
    mcus.forEach(mcu => {
      if (!gpioStates[mcu.id]) gpioStates[mcu.id] = {};
      const pinKey = mcu.type === 'pico_rp2040' ? 'GP15' : 'D13';
      gpioStates[mcu.id][pinKey] = high;
    });
    evaluateCircuit();
  };
  tick();
  codeTimers.push(setInterval(tick, 900));
}

function evaluateCircuit() {
  const result = engine.evaluate(instances, wires, gpioStates, mcuState);
  renderWorkspace(result);
  renderLogs(result.logs);
  const activeLed = Object.values(result.componentStates).find(s => s.lit);
  if (mobileReadingsEl) {
    mobileReadingsEl.textContent = result.shortCircuit ? 'SHORT CIRCUIT!' : activeLed ? `${activeLed.voltage}V | ${activeLed.currentMa}mA` : '5.00V | ACTIVE';
  }
}

function runSimulation() {
  isRunning = true;
  btnRun?.classList.add('hidden'); btnStop?.classList.remove('hidden');
  if (statusDot) statusDot.className = 'w-2 h-2 rounded-full bg-emerald-500 animate-ping';
  if (statusText) statusText.textContent = 'LIVE';
  startMcuExecution();
  evaluateCircuit();
}

function stopSimulation() {
  isRunning = false; stopCodeTimers(); gpioStates = {};
  btnStop?.classList.add('hidden'); btnRun?.classList.remove('hidden');
  if (statusDot) statusDot.className = 'w-2 h-2 rounded-full bg-slate-400';
  if (statusText) statusText.textContent = 'STOPPED';
  renderWorkspace(null);
}

function renderLogs(logs) {
  const colors = { error: 'text-rose-600 font-bold', warn: 'text-amber-700', success: 'text-emerald-700 font-semibold', info: 'text-blue-700' };
  const html = logs.map(l => `<div class="${colors[l.type] || 'text-slate-700'}">[${l.time}] ${l.message}</div>`).join('');
  if (consoleLogEl) consoleLogEl.innerHTML = html;
  if (mobileLogEl) mobileLogEl.innerHTML = html;
}

function appendLog(type, message) { renderLogs([{ type, message, time: new Date().toLocaleTimeString() }]); }

function updateInspector(inst) {
  if (!selectedInfoEl) return;
  const spec = COMPONENT_CATALOG[inst.type];
  selectedInfoEl.innerHTML = `<div class="font-bold text-blue-700">${spec.name}</div><div class="text-slate-600 text-[11px]">${spec.description}</div><button id="btn-del-comp" class="mt-2 w-full py-1 rounded bg-rose-100 border border-rose-300 text-rose-700 font-bold text-[11px]">Delete</button>`;
  $('btn-del-comp')?.addEventListener('click', () => {
    instances = instances.filter(i => i.id !== inst.id);
    wires = wires.filter(w => w.from.instanceId !== inst.id && w.to.instanceId !== inst.id);
    isRunning ? evaluateCircuit() : renderWorkspace();
  });
}

$('slider-temp')?.addEventListener('input', e => {
  const val = parseFloat(e.target.value);
  $('val-temp').textContent = `${val} °C`;
  instances.filter(i => i.type === 'dht22_sensor').forEach(d => { d.temp = val; });
  if (isRunning) evaluateCircuit(); else renderWorkspace();
});

$('slider-hum')?.addEventListener('input', e => {
  const val = parseInt(e.target.value, 10);
  $('val-hum').textContent = `${val} %`;
  instances.filter(i => i.type === 'dht22_sensor').forEach(d => { d.hum = val; });
  if (isRunning) evaluateCircuit(); else renderWorkspace();
});

$('btn-close-sensor')?.addEventListener('click', () => sensorControlsEl?.classList.add('hidden'));

// Exact Hotel Safe Circuit from Video (Arduino Uno + SG90 Servo + 4x4 Keypad + 16x2 Green LCD)
function loadHotelSafeDemo() {
  stopSimulation(); instances = []; wires = []; idCounter = 1; panX = 0; panY = 0; zoomLevel = 0.72; updateStageTransform();
  sensorControlsEl?.classList.add('hidden');
  mcuState = { lcdLine1: 'Code to Lock', lcdLine2: '', servoAngle: 0, safeLocked: false, pinBuffer: '' };
  if (codePresetEl) codePresetEl.value = 'hotel_safe';
  if (codeEditorEl) codeEditorEl.value = CODE_PRESETS.hotel_safe;

  const uno = spawnComponent('arduino_uno', 20, 175);
  const servo = spawnComponent('servo_sg90', 310, 65);
  const keypad = spawnComponent('keypad_4x4', 315, 175);
  const lcd = spawnComponent('lcd_16x2', 235, 375);

  wires.push(
    { id: 'w1', from: { instanceId: uno.id, pinId: 'D9' }, to: { instanceId: servo.id, pinId: 'PWM' }, color: '#f97316' },
    { id: 'w2', from: { instanceId: uno.id, pinId: '5V' }, to: { instanceId: servo.id, pinId: 'VCC' }, color: '#dc2626' },
    { id: 'w3', from: { instanceId: uno.id, pinId: 'GND' }, to: { instanceId: servo.id, pinId: 'GND' }, color: '#1e293b' },
    { id: 'w4', from: { instanceId: uno.id, pinId: 'D11' }, to: { instanceId: keypad.id, pinId: 'ROW' }, color: '#2563eb' },
    { id: 'w5', from: { instanceId: uno.id, pinId: 'D10' }, to: { instanceId: keypad.id, pinId: 'COL' }, color: '#16a34a' },
    { id: 'w6', from: { instanceId: uno.id, pinId: '5V' }, to: { instanceId: lcd.id, pinId: 'VCC' }, color: '#dc2626' },
    { id: 'w7', from: { instanceId: uno.id, pinId: 'GND' }, to: { instanceId: lcd.id, pinId: 'GND' }, color: '#1e293b' },
    { id: 'w8', from: { instanceId: uno.id, pinId: 'A4' }, to: { instanceId: lcd.id, pinId: 'SDA' }, color: '#16a34a' },
    { id: 'w9', from: { instanceId: uno.id, pinId: 'A5' }, to: { instanceId: lcd.id, pinId: 'SCL' }, color: '#eab308' }
  );
  runSimulation();
}

function loadOledSensorDemo() {
  stopSimulation(); instances = []; wires = []; idCounter = 1; panX = 0; panY = 0; zoomLevel = 0.8; updateStageTransform();
  if (codePresetEl) codePresetEl.value = 'pico_oled';
  if (codeEditorEl) codeEditorEl.value = CODE_PRESETS.pico_oled;
  const pico = spawnComponent('pico_rp2040', 20, 120);
  const dht = spawnComponent('dht22_sensor', 260, 65);
  const oled = spawnComponent('oled_ssd1306', 255, 230);
  wires.push(
    { id: 'w1', from: { instanceId: pico.id, pinId: '3V3' }, to: { instanceId: dht.id, pinId: 'VCC' }, color: '#dc2626' },
    { id: 'w2', from: { instanceId: pico.id, pinId: 'GND' }, to: { instanceId: dht.id, pinId: 'GND' }, color: '#1e293b' },
    { id: 'w3', from: { instanceId: pico.id, pinId: '3V3' }, to: { instanceId: oled.id, pinId: 'VCC' }, color: '#dc2626' },
    { id: 'w4', from: { instanceId: pico.id, pinId: 'GND' }, to: { instanceId: oled.id, pinId: 'GND' }, color: '#1e293b' },
    { id: 'w5', from: { instanceId: pico.id, pinId: 'GP15' }, to: { instanceId: oled.id, pinId: 'SCL' }, color: '#eab308' },
    { id: 'w6', from: { instanceId: pico.id, pinId: 'GP14' }, to: { instanceId: oled.id, pinId: 'SDA' }, color: '#16a34a' }
  );
  sensorControlsEl?.classList.remove('hidden');
  runSimulation();
}

function loadLedDemo() {
  stopSimulation(); instances = []; wires = []; idCounter = 1; panX = 0; panY = 0; zoomLevel = 0.85; updateStageTransform();
  sensorControlsEl?.classList.add('hidden');
  const bat = spawnComponent('battery_9v', 18, 120);
  const sw = spawnComponent('switch_toggle', 185, 75, { closed: true });
  const res = spawnComponent('resistor_220', 185, 185);
  const led = spawnComponent('led_red', 345, 125);
  wires.push(
    { id: 'w1', from: { instanceId: bat.id, pinId: 'VCC' }, to: { instanceId: sw.id, pinId: 'IN' }, color: '#dc2626' },
    { id: 'w2', from: { instanceId: sw.id, pinId: 'OUT' }, to: { instanceId: led.id, pinId: 'ANODE' }, color: '#eab308' },
    { id: 'w3', from: { instanceId: led.id, pinId: 'CATHODE' }, to: { instanceId: res.id, pinId: 'P2' }, color: '#16a34a' },
    { id: 'w4', from: { instanceId: res.id, pinId: 'P1' }, to: { instanceId: bat.id, pinId: 'GND' }, color: '#1e293b' }
  );
  runSimulation();
}

btnRun?.addEventListener('click', runSimulation);
btnStop?.addEventListener('click', stopSimulation);
$('btn-clear')?.addEventListener('click', () => { stopSimulation(); instances = []; wires = []; renderWorkspace(); appendLog('info', 'Workspace cleared.'); });
$('btn-safe-demo')?.addEventListener('click', loadHotelSafeDemo);
$('btn-oled-demo')?.addEventListener('click', loadOledSensorDemo);
$('btn-demo')?.addEventListener('click', loadLedDemo);
$('btn-toggle-code')?.addEventListener('click', () => codeDrawerEl?.classList.toggle('hidden'));
$('btn-close-code')?.addEventListener('click', () => codeDrawerEl?.classList.add('hidden'));
$('btn-code-run')?.addEventListener('click', runSimulation);
$('btn-clear-serial')?.addEventListener('click', () => { if (serialOutputEl) serialOutputEl.innerHTML = ''; });
codePresetEl?.addEventListener('change', e => { if (codeEditorEl) codeEditorEl.value = CODE_PRESETS[e.target.value] || ''; if (isRunning) runSimulation(); });

document.querySelectorAll('.wire-color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.wire-color-btn').forEach(b => b.classList.remove('ring-2', 'ring-slate-900', 'scale-110', 'opacity-100'));
    btn.classList.add('ring-2', 'ring-slate-900', 'scale-110', 'opacity-100');
    selectedWireColor = btn.dataset.color;
  });
});

$('open-palette')?.addEventListener('click', () => $('palette-drawer')?.classList.remove('-translate-x-full'));
$('close-palette')?.addEventListener('click', () => $('palette-drawer')?.classList.add('-translate-x-full'));
$('search-comp')?.addEventListener('input', e => renderPalette(e.target.value));

renderPalette();
loadHotelSafeDemo();
