import { COMPONENT_CATALOG } from './components.js';
import { SimulationEngine } from './engine.js';

const engine = new SimulationEngine();

// Application State
let instances = [];
let wires = [];
let selectedWireColor = '#ef4444';
let pendingPin = null; // { instanceId, pinId }
let selectedInstanceId = null;
let isRunning = false;
let idCounter = 1;
let zoomLevel = 1.0;

// DOM Elements
const componentListEl = document.getElementById('component-list');
const componentLayerEl = document.getElementById('component-layer');
const wireLayerEl = document.getElementById('wire-layer');
const zoomStageEl = document.getElementById('zoom-stage');
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnZoomReset = document.getElementById('btn-zoom-reset');
const btnRun = document.getElementById('btn-run');
const btnStop = document.getElementById('btn-stop');
const btnClear = document.getElementById('btn-clear');
const btnDemo = document.getElementById('btn-demo');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const consoleLogEl = document.getElementById('console-log');
const mobileLogEl = document.getElementById('mobile-log');
const mobileReadingsEl = document.getElementById('mobile-readings');
const selectedInfoEl = document.getElementById('selected-info');

// Zoom Controls
function setZoom(newZoom) {
  zoomLevel = Math.min(1.6, Math.max(0.5, Number(newZoom.toFixed(2))));
  zoomStageEl.style.transform = `scale(${zoomLevel})`;
  btnZoomReset.textContent = `${Math.round(zoomLevel * 100)}%`;
}

btnZoomIn.addEventListener('click', () => setZoom(zoomLevel + 0.15));
btnZoomOut.addEventListener('click', () => setZoom(zoomLevel - 0.15));
btnZoomReset.addEventListener('click', () => setZoom(1.0));

// 1. Render Left Component Palette
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
        spawnComponent(comp.type, 60 + Math.random() * 100, 90 + Math.random() * 120);
        document.getElementById('palette-drawer').classList.add('-translate-x-full');
      });
      componentListEl.appendChild(card);
    });
}

// 2. Spawn a Component onto Workspace
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
  if (isRunning) runSimulation();
  return instance;
}

// 3. Generate Visual HTML for Each Component Type
function getComponentGraphic(inst, state) {
  const spec = COMPONENT_CATALOG[inst.type];
  const isLit = state?.lit;
  const isBlown = state?.blown;

  if (inst.type === 'battery_9v') {
    return `
      <div class="w-full h-full rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 border-2 border-amber-500/80 shadow-lg flex flex-col justify-between p-2">
        <div class="flex justify-between items-center">
          <span class="text-[10px] font-bold text-amber-400 tracking-wider">9V DC</span>
          <span class="text-[9px] text-slate-400">ALKALINE</span>
        </div>
        <div class="text-xs font-extrabold text-white tracking-tight">VOLTCELL</div>
      </div>
    `;
  }

  if (inst.type === 'regulator_3v3') {
    return `
      <div class="w-full h-full rounded-lg bg-slate-900 border-2 border-indigo-500/80 shadow-lg flex flex-col justify-center items-center p-2">
        <div class="text-[10px] font-mono text-indigo-300">AMS1117</div>
        <div class="text-xs font-bold text-white">3.3V REG</div>
        <div class="text-[9px] text-emerald-400 mt-0.5">${state?.status === 'REGULATING 3.3V' ? '● ACTIVE' : 'STANDBY'}</div>
      </div>
    `;
  }

  if (inst.type === 'resistor_220') {
    return `
      <div class="w-full h-full flex items-center justify-center">
        <div class="w-full h-2 bg-slate-500 rounded-full relative flex items-center justify-center">
          <div class="w-16 h-6 rounded-md bg-amber-200 border border-amber-600 flex items-center justify-evenly px-1 shadow">
            <span class="w-1.5 h-full bg-red-600"></span>
            <span class="w-1.5 h-full bg-red-600"></span>
            <span class="w-1.5 h-full bg-amber-800"></span>
            <span class="w-1 h-full bg-yellow-500"></span>
          </div>
        </div>
        <span class="absolute -top-4 text-[10px] font-mono text-slate-300">220Ω</span>
      </div>
    `;
  }

  if (inst.type === 'switch_toggle') {
    return `
      <div data-action="toggle-switch" class="w-full h-full rounded-lg bg-slate-800 border-2 ${inst.closed ? 'border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]' : 'border-slate-600'} flex flex-col items-center justify-center p-1.5 cursor-pointer">
        <div class="text-[9px] font-bold text-slate-400">SWITCH</div>
        <div class="mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${inst.closed ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'}">
          ${inst.closed ? 'CLOSED' : 'OPEN'}
        </div>
      </div>
    `;
  }

  if (inst.type.startsWith('led_')) {
    const glowStyle = isLit
      ? `background-color: ${spec.ledColor}; box-shadow: 0 0 28px 8px ${spec.ledColor}, inset 0 0 8px #fff;`
      : isBlown
      ? `background-color: #1e293b; border-color: #ef4444;`
      : `background-color: ${spec.ledColor}33;`;

    return `
      <div class="w-full h-full rounded-lg bg-slate-900/90 border border-slate-700 flex items-center justify-end pr-3 relative ${isBlown ? 'component-blown' : ''}">
        <div class="w-9 h-9 rounded-full border-2 border-white/40 transition-all duration-150 flex items-center justify-center" style="${glowStyle}">
          ${isBlown ? '<span class="text-xs">💥</span>' : ''}
        </div>
        <span class="absolute -top-4 right-1 text-[10px] font-mono text-slate-300">${spec.name.split(' ')[0]} LED</span>
      </div>
    `;
  }

  return '';
}

// 4. Render All Components & Pins
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

    // Render Pins
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

    // Dragging & Tapping Component (scaled by zoomLevel)
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
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
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
          if (isRunning) runSimulation();
          else renderWorkspace();
        } else {
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
    appendLog('info', `Pin selected. Tap a destination pin to complete wire...`);
    renderWorkspace();
    return;
  }

  if (pendingPin.instanceId === instanceId && pendingPin.pinId === pinId) {
    pendingPin = null;
    renderWorkspace();
    return;
  }

  if (pendingPin.instanceId === instanceId) {
    appendLog('warn', `Cannot connect a component to itself.`);
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
  if (isRunning) runSimulation();
  else renderWorkspace();
}

// 6. Render Curved SVG Wires with Wide Tap-to-Delete Hitboxes
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
    const cy1 = y1;
    const cx2 = x2 - (x2 - x1) * 0.4;
    const cy2 = y2;
    const d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

    // Visible colored wire
    const visiblePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    visiblePath.setAttribute('d', d);
    visiblePath.setAttribute('fill', 'none');
    visiblePath.setAttribute('stroke', w.color);
    visiblePath.setAttribute('stroke-width', '3.5');
    visiblePath.setAttribute('stroke-linecap', 'round');
    visiblePath.style.pointerEvents = 'none';

    if (isRunning && simResult?.activeWires?.has(w.id)) {
      visiblePath.classList.add('wire-energized');
    }

    // Invisible 24px wide touch hitbox for easy finger tapping
    const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitPath.setAttribute('d', d);
    hitPath.setAttribute('fill', 'none');
    hitPath.setAttribute('stroke', 'transparent');
    hitPath.setAttribute('stroke-width', '24');
    hitPath.style.cursor = 'pointer';
    hitPath.style.pointerEvents = 'stroke';

    hitPath.addEventListener('pointerdown', e => {
      e.stopPropagation();
      wires = wires.filter(item => item.id !== w.id);
      appendLog('warn', 'Wire removed.');
      if (isRunning) runSimulation();
      else renderWorkspace();
    });

    wireLayerEl.appendChild(visiblePath);
    wireLayerEl.appendChild(hitPath);
  });
}

// 7. Execute Simulation & Update Logs
function runSimulation() {
  isRunning = true;
  btnRun.classList.add('hidden');
  btnStop.classList.remove('hidden');
  statusDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-ping';
  statusText.textContent = 'LIVE';
  statusText.className = 'text-emerald-400 font-bold';

  const result = engine.evaluate(instances, wires);
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

function stopSimulation() {
  isRunning = false;
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
    if (isRunning) runSimulation();
    else renderWorkspace();
  });
}

// 8. Built-in Demo Circuit (Battery -> Switch -> Resistor -> LED)
function loadDemoCircuit() {
  stopSimulation();
  instances = [];
  wires = [];
  idCounter = 1;

  const bat = spawnComponent('battery_9v', 25, 110);
  const sw = spawnComponent('switch_toggle', 175, 75, { closed: true });
  const res = spawnComponent('resistor_220', 175, 175);
  const led = spawnComponent('led_cyan', 315, 115);

  wires.push(
    { id: 'w1', from: { instanceId: bat.id, pinId: 'VCC' }, to: { instanceId: sw.id, pinId: 'IN' }, color: '#ef4444' },
    { id: 'w2', from: { instanceId: sw.id, pinId: 'OUT' }, to: { instanceId: led.id, pinId: 'ANODE' }, color: '#eab308' },
    { id: 'w3', from: { instanceId: led.id, pinId: 'CATHODE' }, to: { instanceId: res.id, pinId: 'P2' }, color: '#22c55e' },
    { id: 'w4', from: { instanceId: res.id, pinId: 'P1' }, to: { instanceId: bat.id, pinId: 'GND' }, color: '#3b82f6' }
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
btnDemo.addEventListener('click', loadDemoCircuit);

// Wire Color Selector
document.querySelectorAll('.wire-color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.wire-color-btn').forEach(b => b.classList.remove('ring-2', 'ring-white', 'scale-110', 'opacity-100'));
    btn.classList.add('ring-2', 'ring-white', 'scale-110', 'opacity-100');
    selectedWireColor = btn.dataset.color;
  });
});

// Mobile Drawer Toggles
document.getElementById('open-palette').addEventListener('click', () => {
  document.getElementById('palette-drawer').classList.remove('-translate-x-full');
});
document.getElementById('close-palette').addEventListener('click', () => {
  document.getElementById('palette-drawer').classList.add('-translate-x-full');
});
document.getElementById('search-comp').addEventListener('input', e => renderPalette(e.target.value));

// Initialize
renderPalette();
loadDemoCircuit();
                         
