import { COMPONENT_CATALOG } from './components.js';

export class SimulationEngine {
  constructor() {
    this.logs = [];
  }

  log(type, message) {
    this.logs.push({ type, message, time: new Date().toLocaleTimeString() });
  }

  evaluate(instances, wires) {
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
        brightness: 0,
        blown: false,
        voltage: 0,
        currentMa: 0,
        status: 'IDLE'
      };
    });

    if (instances.length === 0) {
      this.log('warn', 'Workspace is empty. Add components to simulate.');
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
      const a = `${w.from.instanceId}:${w.from.pinId}`;
      const b = `${w.to.instanceId}:${w.to.pinId}`;
      addEdge(a, b, w.id);
    });

    instances.forEach(inst => {
      if (inst.type === 'switch_toggle' && inst.closed) {
        addEdge(`${inst.id}:IN`, `${inst.id}:OUT`, null);
      }
      if (inst.type === 'resistor_220') {
        addEdge(`${inst.id}:P1`, `${inst.id}:P2`, null);
      }
    });

    const tracePaths = (startNode, targetNode) => {
      const queue = [{ node: startNode, resistance: 0, wireIds: [], visited: new Set([startNode]) }];
      const validPaths = [];

      while (queue.length > 0) {
        const curr = queue.shift();
        if (curr.node === targetNode) {
          validPaths.push(curr);
          continue;
        }

        const neighbors = adj.get(curr.node) || [];
        for (const edge of neighbors) {
          if (curr.visited.has(edge.node)) continue;

          const [nextInstId] = edge.node.split(':');
          const nextInst = instances.find(i => i.id === nextInstId);
          let addedR = 0;

          if (nextInst && nextInst.type === 'resistor_220' && curr.node.startsWith(nextInstId)) {
            addedR = COMPONENT_CATALOG.resistor_220.resistance;
          }

          const nextVisited = new Set(curr.visited);
          nextVisited.add(edge.node);
          const nextWires = edge.wireId ? [...curr.wireIds, edge.wireId] : curr.wireIds;

          queue.push({
            node: edge.node,
            resistance: curr.resistance + addedR,
            wireIds: nextWires,
            visited: nextVisited
          });
        }
      }
      return validPaths;
    };

    const powerSources = [];

    instances.filter(i => i.type === 'battery_9v' || i.type === 'battery_1v5').forEach(bat => {
      const spec = COMPONENT_CATALOG[bat.type];
      powerSources.push({
        id: bat.id,
        name: spec.name,
        vccNode: `${bat.id}:VCC`,
        gndNode: `${bat.id}:GND`,
        voltage: spec.voltage
      });
    });

    instances.filter(i => i.type === 'regulator_3v3').forEach(reg => {
      const regGndPin = `${reg.id}:GND`;
      const regVinPin = `${reg.id}:VIN`;
      let powered = false;

      powerSources.forEach(src => {
        const vinPaths = tracePaths(src.vccNode, regVinPin);
        const gndPaths = tracePaths(regGndPin, src.gndNode);
        if (vinPaths.length > 0 && gndPaths.length > 0) {
          powered = true;
          vinPaths[0].wireIds.forEach(id => results.activeWires.add(id));
          gndPaths[0].wireIds.forEach(id => results.activeWires.add(id));
        }
      });

      if (powered) {
        results.componentStates[reg.id].status = 'REGULATING 3.3V';
        results.componentStates[reg.id].voltage = 3.3;
        this.log('info', '3.3V Regulator active (stepping down to 3.3V DC).');
        powerSources.push({
          id: reg.id,
          name: '3.3V Regulator',
          vccNode: `${reg.id}:VOUT`,
          gndNode: `${reg.id}:GND`,
          voltage: 3.3
        });
      }
    });

    if (powerSources.length === 0) {
      this.log('warn', 'No power source detected. Add a Battery.');
      return results;
    }

    for (const src of powerSources) {
      const shorts = tracePaths(src.vccNode, src.gndNode).filter(p => p.resistance === 0);
      if (shorts.length > 0) {
        results.valid = false;
        results.shortCircuit = true;
        shorts[0].wireIds.forEach(id => results.activeWires.add(id));
        this.log('error', `CRITICAL SHORT CIRCUIT across ${src.name}! Remove direct VCC-to-GND wire.`);
        return results;
      }
    }

    const outputs = instances.filter(i => i.type.startsWith('led_') || i.type === 'bulb_lamp');
    outputs.forEach(out => {
      const spec = COMPONENT_CATALOG[out.type];
      const anode = `${out.id}:ANODE`;
      const cathode = `${out.id}:CATHODE`;
      let energized = false;

      for (const src of powerSources) {
        const posPaths = tracePaths(src.vccNode, anode);
        const negPaths = tracePaths(cathode, src.gndNode);

        if (posPaths.length > 0 && negPaths.length > 0) {
          energized = true;
          const totalR = posPaths[0].resistance + negPaths[0].resistance;
          const vDiff = src.voltage - spec.forwardVoltage;

          posPaths[0].wireIds.forEach(id => results.activeWires.add(id));
          negPaths[0].wireIds.forEach(id => results.activeWires.add(id));

          if (vDiff <= 0) {
            this.log('warn', `${spec.name}: Supply (${src.voltage}V) below forward voltage (${spec.forwardVoltage}V).`);
            results.componentStates[out.id].status = 'UNDERVOLTAGE';
          } else if (out.type !== 'bulb_lamp' && totalR === 0 && src.voltage > spec.forwardVoltage + 0.3) {
            results.componentStates[out.id] = {
              lit: false,
              brightness: 0,
              blown: true,
              voltage: src.voltage,
              currentMa: 999,
              status: 'BLOWN (NO RESISTOR)'
            };
            this.log('error', `💥 ${spec.name} BURNED OUT! ${src.voltage}V connected without a resistor.`);
          } else {
            const effectiveR = Math.max(totalR, out.type === 'bulb_lamp' ? 15 : 10);
            const currentMa = ((vDiff / effectiveR) * 1000).toFixed(1);
            const brightness = Math.min(1, Math.max(0.25, currentMa / 20));

            results.componentStates[out.id] = {
              lit: true,
              brightness,
              blown: false,
              voltage: spec.forwardVoltage,
              currentMa: parseFloat(currentMa),
              status: `ON (${currentMa} mA)`
            };
            this.log('success', `✅ ${spec.name} LIT! Current: ${currentMa} mA (Series R: ${totalR}Ω)`);
          }
          break;
        }

        const revPos = tracePaths(src.vccNode, cathode);
        const revNeg = tracePaths(anode, src.gndNode);
        if (revPos.length > 0 && revNeg.length > 0 && out.type !== 'bulb_lamp') {
          this.log('warn', `⚠️ Reverse Polarity on ${spec.name}! Swap Anode (+) and Cathode (-).`);
          results.componentStates[out.id].status = 'REVERSE POLARITY';
        }
      }

      if (!energized && results.componentStates[out.id].status === 'IDLE') {
        this.log('info', `${spec.name}: Open circuit (check wires or tap switch).`);
      }
    });

    return results;
  }
              }
