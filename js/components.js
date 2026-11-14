export const COMPONENT_CATALOG = {
  pico_rp2040: {
    type: 'pico_rp2040',
    name: 'Raspberry Pi Pico',
    category: 'Microcontrollers',
    logicVoltage: 3.3,
    width: 165,
    height: 86,
    description: 'RP2040 microcontroller (3.3V logic). Program with MicroPython.',
    pins: [
      { id: '3V3', label: '3V3 OUT', type: 'POWER_POS', x: 165, y: 18, color: '#f59e0b' },
      { id: 'GP15', label: 'GP15', type: 'GPIO', x: 165, y: 43, color: '#22c55e' },
      { id: 'GP14', label: 'GP14', type: 'GPIO', x: 165, y: 68, color: '#22c55e' },
      { id: 'GND', label: 'GND', type: 'POWER_NEG', x: 0, y: 68, color: '#3b82f6' }
    ]
  },
  arduino_uno: {
    type: 'arduino_uno',
    name: 'Arduino Uno R3',
    category: 'Microcontrollers',
    logicVoltage: 5.0,
    width: 180,
    height: 115,
    description: 'ATmega328P board (5V logic). Program with Arduino C++.',
    pins: [
      { id: 'D13', label: 'D13', type: 'GPIO', x: 125, y: 0, color: '#22c55e' },
      { id: 'D12', label: 'D12', type: 'GPIO', x: 155, y: 0, color: '#22c55e' },
      { id: '5V', label: '5V', type: 'POWER_POS', x: 95, y: 115, color: '#ef4444' },
      { id: 'GND', label: 'GND', type: 'POWER_NEG', x: 130, y: 115, color: '#3b82f6' }
    ]
  },
  battery_9v: {
    type: 'battery_9v',
    name: '9V Alkaline Battery',
    category: 'Power',
    voltage: 9.0,
    width: 130,
    height: 76,
    description: '9V DC battery with snap terminals (+9V / GND).',
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
    width: 140,
    height: 54,
    description: '1.5V cylindrical alkaline cell.',
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
    width: 132,
    height: 82,
    description: 'Step-down voltage regulator module (3.3V output).',
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
    description: '220Ω current-limiting resistor (Red-Red-Brown-Gold).',
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
    description: 'Mechanical copper knife switch. Tap to open/close.',
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
    ledColor: '#fbbf24',
    width: 105,
    height: 92,
    description: 'Glass miniature incandescent bulb with glowing filament.',
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
    ledColor: '#ef4444',
    width: 110,
    height: 70,
    description: '5mm domed Red LED. Wire Anode (+) to GPIO/VCC via resistor.',
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
    ledColor: '#22d3ee',
    width: 110,
    height: 70,
    description: '5mm domed Cyan LED with radial light bloom.',
    pins: [
      { id: 'ANODE', label: '+ Anode', type: 'ANODE', x: 0, y: 22, color: '#ef4444' },
      { id: 'CATHODE', label: '- Cathode', type: 'CATHODE', x: 0, y: 48, color: '#3b82f6' }
    ]
  }
};
