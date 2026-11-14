import { COMPONENT_CATALOG } from './components.js';

export class SimulationEngine {
  constructor() {
    this.logs = [];
  }

  log(type, message) {
    this.logs.push({ type, message, time: new Date().toLocaleTimeString() });
  }

  /**
   * Evaluates the entire circuit graph and computes electrical state
   * @param {Array} instances - Placed components on canvas
   * @param {Array} wires - Connected wires [{ from: {instanceId, pinId}, to: {instanceId, pinId} }]
   */
  evaluate(instances, wires) {
    this.logs = [];
    const results = {
      valid: true,
      shortCircuit: false,
      activeWires: new Set(),
      componentStates: {}, // instanceId -> { lit, brightness, blown, voltage, currentMa, status }
      logs: this.logs
    };

    // Initialize default off states
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

    // Build adjacency list of pin-to-pin connections
    // Node key format: `${instanceId}:${pinId}`
    const adj = new Map();
    const addEdge = (a, b, wireId = null) => {
      if (!adj.has(a)) adj.set(a, []);
      if (!adj.has(b)) adj.set(b, []);
      adj.get(a).push({ node: b, wireId });
      adj.get(b).push({ node: a, wireId });
    };

    // 1. Add external wire connections
    wires.forEach(w => {
      const a = `${w.from.instanceId}:${w.from.pinId}`;
      const b = `${w.to.instanceId}:${w.to.pinId}`;
      addEdge(a, b, w.id);
    });

    // 2. Add internal component conduction paths (closed switches, resistors, regulators)
    instances.forEach(inst => {
      if (inst.type === 'switch_toggle' && inst.closed) {
        addEdge(`${inst.id}:IN`, `${inst.id}:OUT`, null);
      }
      if (inst.type === 'resistor_220') {
        addEdge(`${inst.id}:P1`, `${inst.id}:P2`, null);
      }
    });

    // Helper: BFS to find all reachable nodes & total series resistance from a start pin
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

          const [nextInstId, nextPinId] = edge.node.split(':');
          const nextInst = instances.find(i => i.id === nextInstId);
          let addedR = 0;

          // If crossing inside a resistor, add its Ohms
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

    // 3. Find Power Sources (9V Batteries and active 3.3V Regulators)
    const powerSources = [];

    instances.filter(i => i.type === 'battery_9v').forEach(bat => {
      powerSources.push({
        id: bat.id,
        name: '9V Battery',
        vccNode: `${bat.id}:VCC`,
        gndNode: `${bat.id}:GND`,
        voltage: 9.0
      });
    });

    // Check if any 3.3V Regulator is properly powered by a battery
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
        this.log('info', `3.3V Regulator active (stepping down to 3.3V DC).`);
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
      this.log('warn', 'No power source detected. Add a 9V Battery.');
      return results;
    }

    // 4. Check for Direct Short Circuits (VCC directly connected to GND with 0Ω)
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

    // 5. Evaluate All LEDs
    const leds = instances.filter(i => i.type.startsWith('led_'));
    leds.forEach(led => {
      const spec = COMPONENT_CATALOG[led.type];
      const anode = `${led.id}:ANODE`;
      const cathode = `${led.id}:CATHODE`;
      let energized = false;

      for (const src of powerSources) {
        // Check forward bias: Source VCC -> Anode AND Cathode -> Source GND
        const posPaths = tracePaths(src.vccNode, anode);
        const negPaths = tracePaths(cathode, src.gndNode);

        if (posPaths.length > 0 && negPaths.length > 0) {
          energized = true;
          const totalR = posPaths[0].resistance + negPaths[0].resistance;
          const vDiff = src.voltage - spec.forwardVoltage;

          // Mark wires as carrying current
          posPaths[0].wireIds.forEach(id => results.activeWires.add(id));
          negPaths[0].wireIds.forEach(id => results.activeWires.add(id));

          if (vDiff <= 0) {
            this.log('warn', `${spec.name}: Supply (${src.voltage}V) below forward voltage (${spec.forwardVoltage}V).`);
            results.componentStates[led.id].status = 'UNDERVOLTAGE';
          } else if (totalR === 0 && src.voltage > spec.forwardVoltage + 0.3) {
            // Overcurrent! LED Blows up
            results.componentStates[led.id] = {
              lit: false,
              brightness: 0,
              blown: true,
              voltage: src.voltage,
              currentMa: 999,
              status: 'BLOWN (NO RESISTOR)'
            };
            this.log('error', `💥 ${spec.name} BURNED OUT! ${src.voltage}V connected without a resistor.`);
          } else {
            // Valid Ohm's law calculation
            const effectiveR = Math.max(totalR, 10);
            const currentMa = ((vDiff / effectiveR) * 1000).toFixed(1);
            const brightness = Math.min(1, Math.max(0.25, currentMa / 20));

            results.componentStates[led.id] = {
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

        // Check Reverse Polarity (User wired + to Cathode and - to Anode)
        const revPos = tracePaths(src.vccNode, cathode);
        const revNeg = tracePaths(anode, src.gndNode);
        if (revPos.length > 0 && revNeg.length > 0) {
          this.log('warn', `⚠️ Reverse Polarity on ${spec.name}! Swap Anode (+) and Cathode (-).`);
          results.componentStates[led.id].status = 'REVERSE POLARITY';
        }
      }

      if (!energized && results.componentStates[led.id].status === 'IDLE') {
        this.log('info', `${spec.name}: Open circuit (check wires or press switch).`);
      }
    });

    return results;
  }
          }
                                    
