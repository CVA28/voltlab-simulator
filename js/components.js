export const COMPONENT_CATALOG = {
  arduino_uno: {
    type: 'arduino_uno',
    name: 'Arduino Uno R3',
    category: 'Microcontrollers',
    logicVoltage: 5.0,
    width: 220,
    height: 150,
    description: 'ATmega328P board with top digital headers & bottom power pins.',
    pins: [
      { id: 'D13', label: 'D13', type: 'GPIO', x: 96, y: 0, color: '#16a34a' },
      { id: 'D12', label: 'D12', type: 'GPIO', x: 120, y: 0, color: '#16a34a' },
      { id: 'D11', label: 'D11', type: 'GPIO', x: 144, y: 0, color: '#eab308' },
      { id: 'D10', label: 'D10', type: 'GPIO', x: 168, y: 0, color: '#2563eb' },
      { id: 'D9', label: 'D9 (PWM)', type: 'GPIO', x: 192, y: 0, color: '#f97316' },
      { id: '5V', label: '5V', type: 'POWER_POS', x: 118, y: 150, color: '#dc2626' },
      { id: 'GND', label: 'GND', type: 'POWER_NEG', x: 148, y: 150, color: '#1e293b' },
      { id: 'A4', label: 'A4 (SDA)', type: 'I2C', x: 180, y: 150, color: '#16a34a' },
      { id: 'A5', label: 'A5 (SCL)', type: 'I2C', x: 204, y: 150, color: '#eab308' }
    ]
  },
  pico_rp2040: {
    type: 'pico_rp2040',
    name: 'Raspberry Pi Pico',
    category: 'Microcontrollers',
    logicVoltage: 3.3,
    width: 185,
    height: 96,
    description: 'RP2040 microcontroller (3.3V logic, I2C0 on GP14/GP15).',
    pins: [
      { id: '3V3', label: '3V3 OUT', type: 'POWER_POS', x: 185, y: 20, color: '#dc2626' },
      { id: 'GP15', label: 'GP15 (SCL)', type: 'GPIO', x: 185, y: 48, color: '#eab308' },
      { id: 'GP14', label: 'GP14 (SDA)', type: 'GPIO', x: 185, y: 76, color: '#16a34a' },
      { id: 'GND', label: 'GND', type: 'POWER_NEG', x: 0, y: 76, color: '#1e293b' }
    ]
  },
  lcd_16x2: {
    type: 'lcd_16x2',
    name: '16x2 Green LCD (I2C)',
    category: 'Displays',
    width: 210,
    height: 110,
    description: '16x2 character LCD module with green backlight & I2C backpack.',
    pins: [
      { id: 'GND', label: 'GND', type: 'POWER_NEG', x: 32, y: 0, color: '#1e293b' },
      { id: 'VCC', label: 'VCC', type: 'POWER_POS', x: 64, y: 0, color: '#dc2626' },
      { id: 'SDA', label: 'SDA', type: 'I2C', x: 96, y: 0, color: '#16a34a' },
      { id: 'SCL', label: 'SCL', type: 'I2C', x: 128, y: 0, color: '#eab308' }
    ]
  },
  keypad_4x4: {
    type: 'keypad_4x4',
    name: '4x4 Matrix Keypad',
    category: 'Input',
    width: 124,
    height: 148,
    description: 'Interactive 16-key membrane keypad. Tap buttons directly!',
    pins: [
      { id: 'ROW', label: 'ROWS', type: 'GPIO', x: 42, y: 148, color: '#2563eb' },
      { id: 'COL', label: 'COLS', type: 'GPIO', x: 82, y: 148, color: '#16a34a' }
    ]
  },
  servo_sg90: {
    type: 'servo_sg90',
    name: 'SG90 Servo Motor',
    category: 'Outputs',
    width: 128,
    height: 82,
    description: 'Micro 180° PWM servo motor with animated horn.',
    pins: [
      { id: 'PWM', label: 'PWM', type: 'GPIO', x: 0, y: 22, color: '#f97316' },
      { id: 'VCC', label: 'VCC', type: 'POWER_POS', x: 0, y: 44, color: '#dc2626' },
      { id: 'GND', label: 'GND', type: 'POWER_NEG', x: 0, y: 66, color: '#1e293b' }
    ]
  },
  oled_ssd1306: {
    type: 'oled_ssd1306',
    name: 'OLED Display (128x64)',
    category: 'Displays',
    width: 156,
    height: 108,
    description: '0.96" I2C OLED screen (VCC, GND, SCL, SDA).',
    pins: [
      { id: 'GND', label: 'GND', type: 'POWER_NEG', x: 30, y: 0, color: '#1e293b' },
      { id: 'VCC', label: 'VCC', type: 'POWER_POS', x: 62, y: 0, color: '#dc2626' },
      { id: 'SCL', label: 'SCL', type: 'I2C', x: 94, y: 0, color: '#eab308' },
      { id: 'SDA', label: 'SDA', type: 'I2C', x: 126, y: 0, color: '#16a34a' }
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
      { id: 'VCC', label: 'VCC', type: 'POWER_POS', x: 24, y: 92, color: '#dc2626' },
      { id: 'DATA', label: 'DATA', type: 'GPIO', x: 48, y: 92, color: '#16a34a' },
      { id: 'GND', label: 'GND', type: 'POWER_NEG', x: 72, y: 92, color: '#1e293b' }
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
      { id: 'VCC', label: '+9V', type: 'POWER_POS', x: 130, y: 24, color: '#dc2626' },
      { id: 'GND', label: 'GND', type: 'POWER_NEG', x: 130, y: 52, color: '#1e293b' }
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
      { id: 'P1', label: 'Lead 1', type: 'PASSIVE', x: 0, y: 23, color: '#64748b' },
      { id: 'P2', label: 'Lead 2', type: 'PASSIVE', x: 130, y: 23, color: '#64748b' }
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
      { id: 'ANODE', label: '+ Anode', type: 'ANODE', x: 0, y: 22, color: '#dc2626' },
      { id: 'CATHODE', label: '- Cathode', type: 'CATHODE', x: 0, y: 48, color: '#1e293b' }
    ]
  }
};
    
