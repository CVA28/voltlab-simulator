import { COMPONENT_CATALOG } from './components.js';
import { SimulationEngine } from './engine.js';
import { getComponentGraphic } from './graphics.js';

const engine = new SimulationEngine();

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
let gpioStates = {};
let codeTimers = [];

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

const componentListEl = document.getElementById('component-list');
const componentLayerEl = document.getElementById('component-layer');
const wireLayerEl = document.getElementById('wire-layer');
const canvasContainerEl = document.getElementById('canvas-container');
const zoomStageEl = document.getElementById('zoom-stage');
const btnZoomReset = document.getElementById('btn-zoom-reset');
const btnRun = document.getElementById('btn-run');
const btnStop = document.getElementById('btn-stop');
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

document.getElementById('btn-zoom-in').addEventListener('click', () => setZoom(zoomLevel + 0.15));
document.getElementById('btn-zoom-out').addEventListener('click', () => setZoom(zoomLevel - 0.15));
btnZoomReset.addEventListener('click', () => { zoomLevel = 0.85; panX = 0; panY = 0; updateStageTransform(); });

canvasContainerEl.addEventListener('pointerdown', e => {
  if (e.target.closest('.circuit-node') || e.target.closest('.wire-hit') || e.target.closest('button')) return;
  if (pendingPin) { pendingPin = null; appendLog('info', 'Pin cancelled.'); renderWorkspace(); }
  const startX = e.clientX, startY = e.clientY, origPanX = panX, origPanY = panY;
  const onMove = ev => { panX = origPanX + (ev.clientX - startX); panY = origPanY + (ev.clientY - startY); updateStageTransform(); };
  const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
});

function renderPalette(filter = '') {
  componentListEl.innerHTML = '';
  Object.values(COMPONENT_CATALOG)
    .filter(c => c.name.toLowerCase().includes(filter.toLowerCase()))
    .forEach(comp => {
      const card = document.createElement('div');
      card.className = 'p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 cursor-pointer flex items-center justify-between';
      card.innerHTML = `<div><div class="text-xs font-bold text-slate-100">${comp.name}</div><div class="text-[10px] text-slate-400">${comp.category}</div></div><span class="text-cyan-400 text-lg font-bold">+</span>`;
      card.addEventListener('click', () => {
        spawnComponent(comp.type, (-panX + 70) / zoomLevel, (-panY + 110) / zoomLevel);
        document.getElementById('palette-drawer').classList.add('-translate-x-full');
      });
      componentListEl.appendChild(card);
    });
}

function spawnComponent(type, x, y, extra = {}) {
  if (!COMPONENT_CATALOG[type]) return null;
  const instance = { id: `comp_${idCounter++}`, type, x: Math.round(x), y: Math.round(y), closed: false, ...extra };
  instances.push(instance);
  renderWorkspace();
  if (isRunning) evaluateCircuit();
  return instance;
}

function renderWorkspace(simResult = null) {
  componentLayerEl.innerHTML = '';
  instances.forEach(inst => {
    const spec = COMPONENT_CATALOG[inst.type];
    const state = simResult?.componentStates?.[inst.id];
    const el = document.createElement('div');
    el.className = `circuit-node pointer-events-auto ${selectedInstanceId === inst.id ? 'selected' : ''}`;
    el.style.cssText = `left:${inst.x}px; top:${inst.y}px; width:${spec.width}px; height:${spec.height}px;`;
    el.innerHTML = getComponentGraphic(inst, state, gpioStates);

    spec.pins.forEach(pin => {
      const pinEl = document.createElement('div');
      const isPending = pendingPin && pendingPin.instanceId === inst.id && pendingPin.pinId === pin.id;
      pinEl.className = `pin-dot absolute -translate-x-1/2 -translate-y-1/2 ${isPending ? 'active-pin' : ''}`;
      pinEl.style.cssText = `left:${pin.x}px; top:${pin.y}px; background-color:${pin.color};`;
      pinEl.addEventListener('pointerdown', e => { e.stopPropagation(); handlePinClick(inst.id, pin.id); });
      el.appendChild(pinEl);
    });

    let startX, startY, origX, origY, moved = false;
    el.addEventListener('pointerdown', e => {
      if (e.target.classList.contains('pin-dot')) return;
      e.stopPropagation();
      selectedInstanceId = inst.id;
      updateInspector(inst, state);
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

function renderWires(simResult = null) {
  wireLayerEl.innerHTML = '';
  wires.forEach(w => {
    const f = instances.find(i => i.id === w.from.instanceId), t = instances.find(i => i.id === w.to.instanceId);
    if (!f || !t) return;
    const fp = COMPONENT_CATALOG[f.type].pins.find(p => p.id === w.from.pinId);
    const tp = COMPONENT_CATALOG[t.type].pins.find(p => p.id === w.to.pinId);
    const x1 = f.x + fp.x, y1 = f.y + fp.y, x2 = t.x + tp.x, y2 = t.y + tp.y;
    const d = `M ${x1} ${y1} C ${x1 + (x2 - x1) * 0.4} ${y1 + 18}, ${x2 - (x2 - x1) * 0.4} ${y2 + 18}, ${x2} ${y2}`;

    const vis = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    vis.setAttribute('d', d); vis.setAttribute('fill', 'none'); vis.setAttribute('stroke', w.color);
    vis.setAttribute('stroke-width', '4'); vis.setAttribute('stroke-linecap', 'round');
    vis.style.pointerEvents = 'none';
    if (isRunning && simResult?.activeWires?.has(w.id)) vis.classList.add('wire-energized');

    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hit.setAttribute('d', d); hit.setAttribute('fill', 'none'); hit.setAttribute('stroke', 'rgba(255,255,255,0.001)');
    hit.setAttribute('stroke-width', '28'); hit.setAttribute('class', 'wire-hit');
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
  const sleepMatch = code.match(/time\.sleep\(([\d.]+)\)/);
  const delayMatch = code.match(/delay\((\d+)\)/);
  const intervalMs = sleepMatch ? parseFloat(sleepMatch[1]) * 1000 : delayMatch ? parseInt(delayMatch[1], 10) : 800;
  const pinMatch = code.match(/Pin\((\d+)/) || code.match(/digitalWrite\((\d+)/);
  const pinNum = pinMatch ? pinMatch[1] : '15';

  let toggleState = true;
  serialOutputEl.innerHTML = '';
  appendSerial('Firmware running...');
  const tick = () => {
    mcus.forEach(mcu => {
      if (!gpioStates[mcu.id]) gpioStates[mcu.id] = {};
      const pinKey = mcu.type === 'pico_rp2040' ? `GP${pinNum}` : `D${pinNum}`;
      gpioStates[mcu.id][pinKey] = toggleState;
      appendSerial(`${pinKey} = ${toggleState ? 'HIGH' : 'LOW'}`);
    });
    evaluateCircuit();
    toggleState = !toggleState;
  };
  tick();
  codeTimers.push(setInterval(tick, Math.max(250, intervalMs)));
}

function evaluateCircuit() {
  const result = engine.evaluate(instances, wires, gpioStates);
  renderWorkspace(result);
  renderLogs(result.logs);
  const activeLed = Object.values(result.componentStates).find(s => s.lit);
  mobileReadingsEl.textContent = result.shortCircuit ? 'SHORT CIRCUIT!' : activeLed ? `${activeLed.voltage}V | ${activeLed.currentMa}mA` : '0.00V | 0.0mA';
}

function runSimulation() {
  isRunning = true;
  btnRun.classList.add('hidden'); btnStop.classList.remove('hidden');
  statusDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-ping';
  statusText.textContent = 'LIVE';
  startMcuExecution();
  evaluateCircuit();
}

function stopSimulation() {
  isRunning = false; stopCodeTimers(); gpioStates = {};
  btnStop.classList.add('hidden'); btnRun.classList.remove('hidden');
  statusDot.className = 'w-2 h-2 rounded-full bg-slate-500';
  statusText.textContent = 'STOPPED';
  renderWorkspace(null);
}

function renderLogs(logs) {
  const colors = { error: 'text-rose-400', warn: 'text-amber-300', success: 'text-emerald-400', info: 'text-cyan-300' };
  const html = logs.map(l => `<div class="${colors[l.type] || 'text-slate-300'}">[${l.time}] ${l.message}</div>`).join('');
  consoleLogEl.innerHTML = html; mobileLogEl.innerHTML = html;
}

function appendLog(type, message) { renderLogs([{ type, message, time: new Date().toLocaleTimeString() }]); }

function updateInspector(inst, state) {
  const spec = COMPONENT_CATALOG[inst.type];
  selectedInfoEl.innerHTML = `<div class="font-bold text-cyan-300">${spec.name}</div><div class="text-slate-400 text-[11px]">${spec.description}</div><button id="btn-del-comp" class="mt-2 w-full py-1 rounded bg-rose-500/20 border border-rose-500/50 text-rose-300 text-[11px]">Delete</button>`;
  document.getElementById('btn-del-comp')?.addEventListener('click', () => {
    instances = instances.filter(i => i.id !== inst.id);
    wires = wires.filter(w => w.from.instanceId !== inst.id && w.to.instanceId !== inst.id);
    isRunning ? evaluateCircuit() : renderWorkspace();
  });
}

function loadLedDemo() {
  stopSimulation(); instances = []; wires = []; idCounter = 1; panX = 0; panY = 0; zoomLevel = 0.85; updateStageTransform();
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
  stopSimulation(); instances = []; wires = []; idCounter = 1; panX = 0; panY = 0; zoomLevel = 0.85; updateStageTransform();
  codePresetEl.value = 'pico_blink'; codeEditorEl.value = CODE_PRESETS.pico_blink;
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

btnRun.addEventListener('click', runSimulation);
btnStop.addEventListener('click', stopSimulation);
btnClear.addEventListener('click', () => { stopSimulation(); instances = []; wires = []; renderWorkspace(); appendLog('info', 'Workspace cleared.'); });
btnDemo.addEventListener('click', loadLedDemo);
btnPicoDemo.addEventListener('click', loadPicoBlinkDemo);
document.getElementById('btn-toggle-code').addEventListener('click', () => codeDrawerEl.classList.toggle('hidden'));
document.getElementById('btn-close-code').addEventListener('click', () => codeDrawerEl.classList.add('hidden'));
document.getElementById('btn-code-run').addEventListener('click', runSimulation);
document.getElementById('btn-clear-serial').addEventListener('click', () => { serialOutputEl.innerHTML = ''; });
codePresetEl.addEventListener('change', e => { codeEditorEl.value = CODE_PRESETS[e.target.value] || ''; if (isRunning) runSimulation(); });

document.querySelectorAll('.wire-color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.wire-color-btn').forEach(b => b.classList.remove('ring-2', 'ring-white', 'scale-110', 'opacity-100'));
    btn.classList.add('ring-2', 'ring-white', 'scale-110', 'opacity-100');
    selectedWireColor = btn.dataset.color;
  });
});

document.getElementById('open-palette').addEventListener('click', () => document.getElementById('palette-drawer').classList.remove('-translate-x-full'));
document.getElementById('close-palette').addEventListener('click', () => document.getElementById('palette-drawer').classList.add('-translate-x-full'));
document.getElementById('search-comp').addEventListener('input', e => renderPalette(e.target.value));

renderPalette();
loadPicoBlinkDemo();
      
