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
      results.componentStates[inst.id] = {
        lit: false,
        powered: false,
        blown: false,
        voltage: 0,
        currentMa: 0,
        status: 'IDLE'
      };
    });

    if (instances.length === 0) {
      this.log('warn', 'Workspace is empty. Add components or load a demo.');
      return results;
    }

    const adj = new Map();
    const addEdge = (a, b, wireId = null) => {
      if (!adj.has(a)) adj.set(a, []);
      if (!adj.has(b)) adj.set(b, []);
      adj.get(a).push({ node: b, wireId });
      adj.get(b).push({ node: a, wireId });
    };

    wires.forEach(w => {
      addEdge(`${w.from.instanceId}:${w.from.pinId}`, `${w.to.instanceId}:${w.to.pinId}`, w.id);
    });

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
      powerSources.push({ id: mcu.id, name: `${spec.name} (${railPin})`, vccNode: `${mcu.id}:${railPin}`, gndNode: `${mcu.id}:GND`, voltage: spec.logicVoltage });
      Object.entries(gpioStates[mcu.id] || {}).forEach(([pinId, isHigh]) => {
        if (isHigh) {
          powerSources.push({ id: mcu.id, name: `${spec.name} [${pinId}]`, vccNode: `${mcu.id}:${pinId}`, gndNode: `${mcu.id}:GND`, voltage: spec.logicVoltage });
        }
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

    // Evaluate DHT22 Sensor
    let activeSensorData = null;
    instances.filter(i => i.type === 'dht22_sensor').forEach(dht => {
      for (const src of powerSources) {
        const vccP = tracePaths(src.vccNode, `${dht.id}:VCC`);
        const gndP = tracePaths(`${dht.id}:GND`, src.gndNode);
        if (vccP.length > 0 && gndP.length > 0) {
          vccP[0].wireIds.forEach(id => results.activeWires.add(id));
          gndP[0].wireIds.forEach(id => results.activeWires.add(id));
          const temp = dht.temp ?? 28.5;
          const hum = dht.hum ?? 62;
          activeSensorData = { temp, hum };
          results.componentStates[dht.id] = { powered: true, status: `${temp}°C | ${hum}%` };
          this.log('info', `🌡️ DHT22 Sensor active: ${temp}°C, ${hum}% RH`);
          break;
        }
      }
    });

    // Evaluate SSD1306 I2C OLED Display
    instances.filter(i => i.type === 'oled_ssd1306').forEach(oled => {
      let powered = false;
      let i2cReady = false;
      for (const src of powerSources) {
        const vccP = tracePaths(src.vccNode, `${oled.id}:VCC`);
        const gndP = tracePaths(`${oled.id}:GND`, src.gndNode);
        if (vccP.length > 0 && gndP.length > 0) {
          powered = true;
          vccP[0].wireIds.forEach(id => results.activeWires.add(id));
          gndP[0].wireIds.forEach(id => results.activeWires.add(id));

          // Check SCL & SDA connections to Pico (GP15/GP14) or Arduino (D13/D12)
          const sclP = tracePaths(`${src.id}:GP15`, `${oled.id}:SCL`).concat(tracePaths(`${src.id}:D13`, `${oled.id}:SCL`));
          const sdaP = tracePaths(`${src.id}:GP14`, `${oled.id}:SDA`).concat(tracePaths(`${src.id}:D12`, `${oled.id}:SDA`));
          if (sclP.length > 0 && sdaP.length > 0) {
            i2cReady = true;
            sclP[0].wireIds.forEach(id => results.activeWires.add(id));
            sdaP[0].wireIds.forEach(id => results.activeWires.add(id));
          }
          break;
        }
      }

      if (powered && i2cReady) {
        const lines = activeSensorData
          ? [`TEMP: ${activeSensorData.temp} C`, `HUM : ${activeSensorData.hum} %`, mcuState.oledText || 'I2C 0x3C OK']
          : [mcuState.oledText || 'HELLO VOLTLAB!', 'I2C ADDR: 0x3C', 'STATUS: ACTIVE'];
        const barWidth = activeSensorData ? Math.min(96, Math.round((activeSensorData.temp / 50) * 96)) : 72;
        results.componentStates[oled.id] = { powered: true, oledLines: lines, barWidth, status: 'I2C DISPLAY ON' };
        this.log('success', '🖥️ OLED 128x64 active over I2C (SCL/SDA validated).');
      } else if (powered) {
        results.componentStates[oled.id] = { powered: false, status: 'MISSING SCL/SDA' };
        this.log('warn', '⚠️ OLED has power, but SCL/SDA wires to Pico GP15/GP14 are missing.');
      }
    });

    // Evaluate Servo & Buzzer
    instances.filter(i => i.type === 'servo_sg90').forEach(srv => {
      for (const src of powerSources) {
        const vccP = tracePaths(src.vccNode, `${srv.id}:VCC`);
        const gndP = tracePaths(`${srv.id}:GND`, src.gndNode);
        if (vccP.length > 0 && gndP.length > 0) {
          vccP[0].wireIds.forEach(id => results.activeWires.add(id));
          gndP[0].wireIds.forEach(id => results.activeWires.add(id));
          const angle = mcuState.servoAngle ?? 90;
          results.componentStates[srv.id] = { powered: true, servoAngle: angle, status: `ANGLE: ${angle}°` };
          this.log('success', `⚙️ SG90 Servo positioned at ${angle}°.`);
          break;
        }
      }
    });

    instances.filter(i => i.type === 'buzzer_piezo').forEach(buz => {
      for (const src of powerSources) {
        const posP = tracePaths(src.vccNode, `${buz.id}:POS`);
        const negP = tracePaths(`${buz.id}:NEG`, src.gndNode);
        if (posP.length > 0 && negP.length > 0) {
          posP[0].wireIds.forEach(id => results.activeWires.add(id));
          negP[0].wireIds.forEach(id => results.activeWires.add(id));
          results.componentStates[buz.id] = { lit: true, status: 'BUZZING' };
          this.log('success', `🔊 Piezo Buzzer active via ${src.name}!`);
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
            results.componentStates[out.id] = { lit: false, blown: true, status: 'BLOWN (NO RESISTOR)' };
            this.log('error', `💥 ${spec.name} BURNED OUT! ${src.voltage}V without a resistor.`);
          } else if (vDiff > 0) {
            const currentMa = ((vDiff / Math.max(totalR, 10)) * 1000).toFixed(1);
            results.componentStates[out.id] = { lit: true, voltage: spec.forwardVoltage, currentMa: parseFloat(currentMa), status: `ON (${currentMa} mA)` };
            this.log('success', `✅ ${spec.name} LIT via ${src.name} (${currentMa} mA)`);
          }
          break;
        }
      }
    });

    return results;
  }
      }
        
