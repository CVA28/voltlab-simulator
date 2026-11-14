export const COMPONENT_CATALOG = {
  battery_9v: {
    type: 'battery_9v',
    name: '9V Battery',
    category: 'Power',
    voltage: 9.0,
    maxCurrent: 500, // mA
    width: 110,
    height: 70,
    description: 'Standard 9V DC alkaline power source.',
    pins: [
      { id: 'VCC', label: '+9V', type: 'POWER_POS', x: 110, y: 22, color: '#ef4444' },
      { id: 'GND', label: 'GND', type: 'POWER_NEG', x: 110, y: 48, color: '#3b82f6' }
    ]
  },
  regulator_3v3: {
    type: 'regulator_3v3',
    name: '3.3V Regulator',
    category: 'Power',
    outputVoltage: 3.3,
    maxInputVoltage: 15.0,
    width: 120,
    height: 75,
    description: 'AMS1117 Linear Step-Down Regulator (3.3V Output).',
    pins: [
      { id: 'VIN', label: 'VIN', type: 'INPUT', x: 0, y: 22, color: '#ef4444' },
      { id: 'GND', label: 'GND', type: 'GROUND', x: 0, y: 52, color: '#3b82f6' },
      { id: 'VOUT', label: '3.3V', type: 'POWER_POS', x: 120, y: 37, color: '#f59e0b' }
    ]
  },
  resistor_220: {
    type: 'resistor_220',
    name: '220Ω Resistor',
    category: 'Passive',
    resistance: 220, // Ohms
    width: 110,
    height: 46,
    description: 'Current-limiting resistor (Red-Red-Brown). Protects LEDs.',
    pins: [
      { id: 'P1', label: 'A', type: 'PASSIVE', x: 0, y: 23, color: '#94a3b8' },
      { id: 'P2', label: 'B', type: 'PASSIVE', x: 110, y: 23, color: '#94a3b8' }
    ]
  },
  switch_toggle: {
    type: 'switch_toggle',
    name: 'Push Switch',
    category: 'Control',
    width: 96,
    height: 54,
    description: 'Interactive SPST tactile switch. Tap during simulation to toggle!',
    pins: [
      { id: 'IN', label: '1', type: 'PASSIVE', x: 0, y: 27, color: '#22d3ee' },
      { id: 'OUT', label: '2', type: 'PASSIVE', x: 96, y: 27, color: '#22d3ee' }
    ]
  },
  led_red: {
    type: 'led_red',
    name: 'Red LED (2.0V)',
    category: 'Output',
    forwardVoltage: 2.0,
    maxCurrentMa: 30,
    ledColor: '#ef4444',
    width: 95,
    height: 64,
    description: 'Standard 5mm Red LED. Requires resistor above 2.2V.',
    pins: [
      { id: 'ANODE', label: '+ (A)', type: 'ANODE', x: 0, y: 20, color: '#ef4444' },
      { id: 'CATHODE', label: '- (K)', type: 'CATHODE', x: 0, y: 44, color: '#3b82f6' }
    ]
  },
  led_cyan: {
    type: 'led_cyan',
    name: 'Cyan LED (3.2V)',
    category: 'Output',
    forwardVoltage: 3.2,
    maxCurrentMa: 30,
    ledColor: '#22d3ee',
    width: 95,
    height: 64,
    description: 'High-brightness Cyan LED (3.2V forward drop).',
    pins: [
      { id: 'ANODE', label: '+ (A)', type: 'ANODE', x: 0, y: 20, color: '#ef4444' },
      { id: 'CATHODE', label: '- (K)', type: 'CATHODE', x: 0, y: 44, color: '#3b82f6' }
    ]
  }
};
