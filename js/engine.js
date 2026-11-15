import { COMPONENT_CATALOG } from './components.js';

export class SimulationEngine {
  constructor() {
    this.logs = [];
  }

  log(type, message) {
    this.logs.push({ type, message, time: new Date().toLocaleTimeString() });
  }

  evaluate(instances, wires, gpioStates = {}, mcuState = {}) {
    this.logs = [];
    const results = {
      valid: true,
      shortCircuit: false,
      activeWires: new Set(),
      componentStates: {},
      logs: this.logs
    };

    instances.forEach(inst => {
      results.componentStates[inst.id] = { lit: false, powered: false, blown: false, status: 'IDLE' };
    });

    if (instances.length === 0) {
      this.log('warn', 'Workspace is empty. Load a demo or add parts.');
      return results;
    }

    const adj = new Map();
    const addEdge = (a, b, wireId = null) => {
      if (!adj.has(a)) adj.set(a, []);
      if (!adj.has(b)) adj.set(b, []);
      adj.get(a).push({ node: b, wireId });
      adj.get(b).push({ node: a, wireId });
    };

    wires.forEach(w => addEdge(`${w.from.instanceId}:${w.from.pinId}`, `${w.to.instanceId}:${w.to.pinId}`, w.id));

    instances.forEach(inst => {
      if (inst.type === 'switch_toggle' && inst.closed) addEdge(`${inst.id}:IN`, `${inst.id}:OUT`, null);
      if (inst.type === 'resistor_220') addEdge(`${inst.id}:P1`, `${inst.id}:P2`, null);
    });

    const tracePaths = (startNode, targetNode) => {
      const queue = [{ node: startNode, resistance: 0, wireIds: [], visited: new Set([startNode]) }];
      const validPaths = [];
      while (queue.length > 0) {
        const curr = queue.shift();
        if (curr.node === targetNode) { validPaths.push(curr); continue; }
        for (const edge of (adj.get(curr.node) || [])) {
          if (curr.visited.has(edge.node)) continue;
          const [nextInstId] = edge.node.split(':');
          const nextInst = instances.find(i => i.id === nextInstId);
          const addedR = (nextInst?.type === 'resistor_220' && curr.node.startsWith(nextInstId)) ? 220 : 0;
          const nextVisited = new Set(curr.visited);
          nextVisited.add(edge.node);
          queue.push({
            node: edge.node,
            resistance: curr.resistance + addedR,
            wireIds: edge.wireId ? [...curr.wireIds, edge.wireId] : curr.wireIds,
            visited: nextVisited
          });
        }
      }
      return validPaths;
    };

    const powerSources = [];
    instances.filter(i => i.type === 'battery_9v').forEach(bat => {
      powerSources.push({ id: bat.id, name: '9V Battery', vccNode: `${bat.id}:VCC`, gndNode: `${bat.id}:GND`, voltage: 9.0 });
    });

    instances.filter(i => i.type === 'pico_rp2040' || i.type === 'arduino_uno').forEach(mcu => {
      const spec = COMPONENT_CATALOG[mcu.type];
      const railPin = mcu.type === 'pico_rp2040' ? '3V3' : '5V';
      results.componentStates[mcu.id].status = 'MCU RUNNING';
      powerSources.push({ id: mcu.id, name: spec.name, vccNode: `${mcu.id}:${railPin}`, gndNode: `${mcu.id}:GND`, voltage: spec.logicVoltage });
      Object.entries(gpioStates[mcu.id] || {}).forEach(([pinId, isHigh]) => {
        if (isHigh) powerSources.push({ id: mcu.id, name: `${spec.name} [${pinId}]`, vccNode: `${mcu.id}:${pinId}`, gndNode: `${mcu.id}:GND`, voltage: spec.logicVoltage });
      });
    });

    // Short-circuit check
    for (const src of powerSources) {
      const shorts = tracePaths(src.vccNode, src.gndNode).filter(p => p.resistance === 0);
      if (shorts.length > 0) {
        results.valid = false;
        results.shortCircuit = true;
        shorts[0].wireIds.forEach(id => results.activeWires.add(id));
        this.log('error', `CRITICAL SHORT CIRCUIT on ${src.name}!`);
        return results;
      }
    }

    // Evaluate 16x2 LCD Display
    instances.filter(i => i.type === 'lcd_16x2').forEach(lcd => {
      for (const src of powerSources) {
        const vccP = tracePaths(src.vccNode, `${lcd.id}:VCC`);
        const gndP = tracePaths(`${lcd.id}:GND`, src.gndNode);
        if (vccP.length > 0 && gndP.length > 0) {
          vccP[0].wireIds.forEach(id => results.activeWires.add(id));
          gndP[0].wireIds.forEach(id => results.activeWires.add(id));
          const sdaP = tracePaths(`${src.id}:A4`, `${lcd.id}:SDA`).concat(tracePaths(`${src.id}:GP14`, `${lcd.id}:SDA`));
          const sclP = tracePaths(`${src.id}:A5`, `${lcd.id}:SCL`).concat(tracePaths(`${src.id}:GP15`, `${lcd.id}:SCL`));
          if (sdaP.length > 0 && sclP.length > 0) {
            sdaP[0].wireIds.forEach(id => results.activeWires.add(id));
            sclP[0].wireIds.forEach(id => results.activeWires.add(id));
            results.componentStates[lcd.id] = {
              powered: true,
              lcdLine1: mcuState.lcdLine1 || 'Code to Lock',
              lcdLine2: mcuState.lcdLine2 || '',
              status: 'LCD1602 ACTIVE'
            };
            this.log('success', `📟 16x2 LCD active: "${mcuState.lcdLine1 || 'Code to Lock'}"`);
          } else {
            this.log('warn', '⚠️ 16x2 LCD has power, connect SDA & SCL.');
          }
          break;
        }
      }
    });

    // Evaluate Keypad connections
    instances.filter(i => i.type === 'keypad_4x4').forEach(kp => {
      wires.filter(w => w.from.instanceId === kp.id || w.to.instanceId === kp.id).forEach(w => results.activeWires.add(w.id));
    });

    // Evaluate DHT22 & OLED
    let activeSensorData = null;
    instances.filter(i => i.type === 'dht22_sensor').forEach(dht => {
      for (const src of powerSources) {
        const vccP = tracePaths(src.vccNode, `${dht.id}:VCC`);
        const gndP = tracePaths(`${dht.id}:GND`, src.gndNode);
        if (vccP.length > 0 && gndP.length > 0) {
          vccP[0].wireIds.forEach(id => results.activeWires.add(id));
          gndP[0].wireIds.forEach(id => results.activeWires.add(id));
          activeSensorData = { temp: dht.temp ?? 28.5, hum: dht.hum ?? 62 };
          results.componentStates[dht.id] = { powered: true };
          break;
        }
      }
    });

    instances.filter(i => i.type === 'oled_ssd1306').forEach(oled => {
      for (const src of powerSources) {
        const vccP = tracePaths(src.vccNode, `${oled.id}:VCC`);
        const gndP = tracePaths(`${oled.id}:GND`, src.gndNode);
        const sclP = tracePaths(`${src.id}:GP15`, `${oled.id}:SCL`);
        const sdaP = tracePaths(`${src.id}:GP14`, `${oled.id}:SDA`);
        if (vccP.length > 0 && gndP.length > 0 && sclP.length > 0 && sdaP.length > 0) {
          [vccP[0], gndP[0], sclP[0], sdaP[0]].forEach(p => p.wireIds.forEach(id => results.activeWires.add(id)));
          const lines = activeSensorData
            ? [`TEMP: ${activeSensorData.temp} C`, `HUM : ${activeSensorData.hum} %`, 'I2C 0x3C OK']
            : ['VOLTLAB OS', 'I2C ACTIVE'];
          results.componentStates[oled.id] = { powered: true, oledLines: lines };
          break;
        }
      }
    });

    // Evaluate Servo
    instances.filter(i => i.type === 'servo_sg90').forEach(srv => {
      for (const src of powerSources) {
        const vccP = tracePaths(src.vccNode, `${srv.id}:VCC`);
        const gndP = tracePaths(`${srv.id}:GND`, src.gndNode);
        if (vccP.length > 0 && gndP.length > 0) {
          vccP[0].wireIds.forEach(id => results.activeWires.add(id));
          gndP[0].wireIds.forEach(id => results.activeWires.add(id));
          wires.filter(w => w.from.instanceId === srv.id || w.to.instanceId === srv.id).forEach(w => results.activeWires.add(w.id));
          const angle = mcuState.servoAngle ?? 0;
          results.componentStates[srv.id] = { powered: true, servoAngle: angle };
          break;
        }
      }
    });

    // Evaluate LEDs
    instances.filter(i => i.type.startsWith('led_')).forEach(out => {
      const spec = COMPONENT_CATALOG[out.type];
      for (const src of powerSources) {
        const posPaths = tracePaths(src.vccNode, `${out.id}:ANODE`);
        const negPaths = tracePaths(`${out.id}:CATHODE`, src.gndNode);
        if (posPaths.length > 0 && negPaths.length > 0) {
          const totalR = posPaths[0].resistance + negPaths[0].resistance;
          const vDiff = src.voltage - spec.forwardVoltage;
          posPaths[0].wireIds.forEach(id => results.activeWires.add(id));
          negPaths[0].wireIds.forEach(id => results.activeWires.add(id));
          if (totalR === 0 && src.voltage > spec.forwardVoltage + 0.3) {
            results.componentStates[out.id] = { lit: false, blown: true };
            this.log('error', `💥 ${spec.name} BURNED OUT! ${src.voltage}V without a resistor.`);
          } else if (vDiff > 0) {
            const currentMa = ((vDiff / Math.max(totalR, 10)) * 1000).toFixed(1);
            results.componentStates[out.id] = { lit: true, voltage: spec.forwardVoltage, currentMa: parseFloat(currentMa) };
            this.log('success', `✅ ${spec.name} LIT (${currentMa} mA)`);
          }
          break;
        }
      }
    });

    return results;
  }
              }
              
