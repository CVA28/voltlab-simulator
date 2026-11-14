export const COMPONENT_CATALOG = {
  battery_9v: {
    type: 'battery_9v',
    name: '9V Alkaline Battery',
    category: 'Power',
    voltage: 9.0,
    maxCurrent: 500,
    width: 130,
    height: 76,
    description: 'Realistic 9V PP3 battery with snap terminals (+9V / GND).',
    pins: [
      { id: 'VCC', label: '+9V', type: 'POWER_POS', x: 130, y: 24, color: '#ef4444' },
      { id: 'GND', label: 'GND', type: 'POWER_NEG', x: 130, y: 52, color: '#3b82f6' }
    ]
  },
  battery_1v5: {
    type: 'battery_1v5',
    name: '1.5V AA Cell',
    category: 'Power',
    voltage: 1.5,
    maxCurrent: 1000,
    width: 140,
    height: 54,
    description: '1.5V cylindrical alkaline cell. Safe for bulbs without a resistor.',
    pins: [
      { id: 'GND', label: '- (GND)', type: 'POWER_NEG', x: 0, y: 27, color: '#3b82f6' },
      { id: 'VCC', label: '+1.5V', type: 'POWER_POS', x: 140, y: 27, color: '#ef4444' }
    ]
  },
  regulator_3v3: {
    type: 'regulator_3v3',
    name: '3.3V AMS1117 Module',
    category: 'Power',
    outputVoltage: 3.3,
    maxInputVoltage: 15.0,
    width: 132,
    height: 82,
    description: 'Step-down voltage regulator module with onboard power LED.',
    pins: [
      { id: 'VIN', label: 'VIN', type: 'INPUT', x: 0, y: 24, color: '#ef4444' },
      { id: 'GND', label: 'GND', type: 'GROUND', x: 0, y: 58, color: '#3b82f6' },
      { id: 'VOUT', label: '3.3V', type: 'POWER_POS', x: 132, y: 41, color: '#f59e0b' }
    ]
  },
  resistor_220: {
    type: 'resistor_220',
    name: '220Ω Axial Resistor',
    category: 'Passive',
    resistance: 220,
    width: 130,
    height: 46,
    description: '220Ω 1/4W carbon-film resistor (Red-Red-Brown-Gold).',
    pins: [
      { id: 'P1', label: 'Lead 1', type: 'PASSIVE', x: 0, y: 23, color: '#94a3b8' },
      { id: 'P2', label: 'Lead 2', type: 'PASSIVE', x: 130, y: 23, color: '#94a3b8' }
    ]
  },
  switch_toggle: {
    type: 'switch_toggle',
    name: 'Knife Switch (SPST)',
    category: 'Control',
    width: 124,
    height: 68,
    description: 'Mechanical copper knife switch. Tap to physically swing blade open/closed!',
    pins: [
      { id: 'IN', label: 'Terminal 1', type: 'PASSIVE', x: 0, y: 42, color: '#eab308' },
      { id: 'OUT', label: 'Terminal 2', type: 'PASSIVE', x: 124, y: 42, color: '#eab308' }
    ]
  },
  bulb_lamp: {
    type: 'bulb_lamp',
    name: 'Filament Lamp (3V)',
    category: 'Output',
    forwardVoltage: 1.2,
    maxCurrentMa: 500,
    ledColor: '#fbbf24',
    width: 105,
    height: 92,
    description: 'Glass miniature incandescent bulb with glowing tungsten filament.',
    pins: [
      { id: 'ANODE', label: 'Base (+)', type: 'ANODE', x: 0, y: 68, color: '#ef4444' },
      { id: 'CATHODE', label: 'Shell (-)', type: 'CATHODE', x: 105, y: 68, color: '#3b82f6' }
    ]
  },
  led_red: {
    type: 'led_red',
    name: '5mm Red LED (2.0V)',
    category: 'Output',
    forwardVoltage: 2.0,
    maxCurrentMa: 30,
    ledColor: '#ef4444',
    width: 110,
    height: 70,
    description: 'Realistic 5mm domed Red LED with bent anode (+) and straight cathode (-).',
    pins: [
      { id: 'ANODE', label: '+ Anode', type: 'ANODE', x: 0, y: 22, color: '#ef4444' },
      { id: 'CATHODE', label: '- Cathode', type: 'CATHODE', x: 0, y: 48, color: '#3b82f6' }
    ]
  },
  led_cyan: {
    type: 'led_cyan',
    name: '5mm Cyan LED (3.2V)',
    category: 'Output',
    forwardVoltage: 3.2,
    maxCurrentMa: 30,
    ledColor: '#22d3ee',
    width: 110,
    height: 70,
    description: 'Realistic 5mm domed Cyan LED with radial light bloom.',
    pins: [
      { id: 'ANODE', label: '+ Anode', type: 'ANODE', x: 0, y: 22, color: '#ef4444' },
      { id: 'CATHODE', label: '- Cathode', type: 'CATHODE', x: 0, y: 48, color: '#3b82f6' }
    ]
  }
};
