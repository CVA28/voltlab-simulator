export const COMPONENT_CATALOG = {
  pico_rp2040: {
    type: 'pico_rp2040',
    name: 'Raspberry Pi Pico',
    category: 'Microcontrollers',
    logicVoltage: 3.3,
    width: 165,
    height: 86,
    description: 'RP2040 microcontroller (3.3V logic, I2C0 on GP14/GP15).',
    pins: [
      { id: '3V3', label: '3V3 OUT', type: 'POWER_POS', x: 165, y: 18, color: '#f59e0b' },
      { id: 'GP15', label: 'GP15 (SCL)', type: 'GPIO', x: 165, y: 43, color: '#22c55e' },
      { id: 'GP14', label: 'GP14 (SDA)', type: 'GPIO', x: 165, y: 68, color: '#22c55e' },
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
  oled_ssd1306: {
    type: 'oled_ssd1306',
    name: 'OLED Display (128x64)',
    category: 'Displays',
    width: 150,
    height: 105,
    description: '0.96" I2C OLED screen. Requires VCC, GND, SCL, and SDA.',
    pins: [
      { id: 'GND', label: 'GND', type: 'POWER_NEG', x: 30, y: 0, color: '#3b82f6' },
      { id: 'VCC', label: 'VCC', type: 'POWER_POS', x: 60, y: 0, color: '#ef4444' },
      { id: 'SCL', label: 'SCL', type: 'I2C', x: 90, y: 0, color: '#eab308' },
      { id: 'SDA', label: 'SDA', type: 'I2C', x: 120, y: 0, color: '#22c55e' }
    ]
  },
  dht22_sensor: {
    type: 'dht22_sensor',
    name: 'DHT22 Temp/Humidity',
    category: 'Sensors',
    width: 96,
    height: 92,
    description: 'Digital temperature & humidity sensor. Tap to adjust sliders!',
    pins: [
      { id: 'VCC', label: 'VCC', type: 'POWER_POS', x: 24, y: 92, color: '#ef4444' },
      { id: 'DATA', label: 'DATA', type: 'GPIO', x: 48, y: 92, color: '#22c55e' },
      { id: 'GND', label: 'GND', type: 'POWER_NEG', x: 72, y: 92, color: '#3b82f6' }
    ]
  },
  servo_sg90: {
    type: 'servo_sg90',
    name: 'SG90 Servo Motor',
    category: 'Outputs',
    width: 120,
    height: 82,
    description: 'Micro 180° PWM servo motor with animated horn.',
    pins: [
      { id: 'PWM', label: 'PWM', type: 'GPIO', x: 0, y: 22, color: '#eab308' },
      { id: 'VCC', label: 'VCC', type: 'POWER_POS', x: 0, y: 44, color: '#ef4444' },
      { id: 'GND', label: 'GND', type: 'POWER_NEG', x: 0, y: 66, color: '#3b82f6' }
    ]
  },
  buzzer_piezo: {
    type: 'buzzer_piezo',
    name: 'Active Piezo Buzzer',
    category: 'Outputs',
    width: 84,
    height: 84,
    description: '5V/3.3V piezo buzzer with visual soundwave pulses.',
    pins: [
      { id: 'POS', label: '+ Signal', type: 'ANODE', x: 0, y: 28, color: '#ef4444' },
      { id: 'NEG', label: '- GND', type: 'CATHODE', x: 0, y: 56, color: '#3b82f6' }
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
  led_red: {
    type: 'led_red',
    name: '5mm Red LED (2.0V)',
    category: 'Outputs',
    forwardVoltage: 2.0,
    ledColor: '#ef4444',
    width: 110,
    height: 70,
    description: '5mm domed Red LED. Wire Anode (+) via resistor.',
    pins: [
      { id: 'ANODE', label: '+ Anode', type: 'ANODE', x: 0, y: 22, color: '#ef4444' },
      { id: 'CATHODE', label: '- Cathode', type: 'CATHODE', x: 0, y: 48, color: '#3b82f6' }
    ]
  },
  led_cyan: {
    type: 'led_cyan',
    name: '5mm Cyan LED (3.2V)',
    category: 'Outputs',
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
