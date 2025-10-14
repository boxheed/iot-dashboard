/**
 * Unit tests for device transformation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  formatPropertyValue,
  getDeviceTypeName,
  getDeviceTypeIcon,
  getCommonPropertiesForType,
  getCommonControlsForType,
  transformRawDeviceData,
  createDeviceProperty,
  createDeviceControl,
  updateDeviceProperty,
  getDevicePropertyValue,
  getDeviceControl,
  validateControlValue,
  deviceCommandToMqttMessage,
  parseMqttToDeviceProperty,
  calculateDeviceHealthScore,
  groupDevicesByRoom,
  filterDevicesByType,
  sortDevices,
} from './deviceTransform';
import { Device, DeviceProperty, DeviceControl, DeviceCommand } from '../types/Device';

describe('Device Transform Utilities', () => {
  describe('formatPropertyValue', () => {
    it('should format boolean values', () => {
      const property: DeviceProperty = {
        key: 'state',
        value: true,
        timestamp: new Date(),
      };
      expect(formatPropertyValue(property)).toBe('On');

      property.value = false;
      expect(formatPropertyValue(property)).toBe('Off');
    });

    it('should format numeric values with units', () => {
      const property: DeviceProperty = {
        key: 'temperature',
        value: 25.567,
        unit: '°C',
        timestamp: new Date(),
      };
      expect(formatPropertyValue(property)).toBe('25.57 °C');
    });

    it('should format numeric values without units', () => {
      const property: DeviceProperty = {
        key: 'brightness',
        value: 75,
        timestamp: new Date(),
      };
      expect(formatPropertyValue(property)).toBe('75');
    });

    it('should format string values', () => {
      const property: DeviceProperty = {
        key: 'mode',
        value: 'auto',
        unit: 'mode',
        timestamp: new Date(),
      };
      expect(formatPropertyValue(property)).toBe('auto mode');
    });
  });

  describe('getDeviceTypeName', () => {
    it('should return correct names for device types', () => {
      expect(getDeviceTypeName('sensor')).toBe('Sensor');
      expect(getDeviceTypeName('switch')).toBe('Smart Switch');
      expect(getDeviceTypeName('thermostat')).toBe('Thermostat');
    });
  });

  describe('getDeviceTypeIcon', () => {
    it('should return correct icons for device types', () => {
      expect(getDeviceTypeIcon('sensor')).toBe('sensors');
      expect(getDeviceTypeIcon('switch')).toBe('toggle_on');
      expect(getDeviceTypeIcon('lock')).toBe('lock');
    });
  });

  describe('getCommonPropertiesForType', () => {
    it('should return common properties for device types', () => {
      const sensorProperties = getCommonPropertiesForType('sensor');
      expect(sensorProperties).toContain('temperature');
      expect(sensorProperties).toContain('humidity');

      const switchProperties = getCommonPropertiesForType('switch');
      expect(switchProperties).toContain('state');
      expect(switchProperties).toContain('power');
    });

    it('should return mutable arrays', () => {
      const properties = getCommonPropertiesForType('sensor');
      expect(() => properties.push('new-property')).not.toThrow();
    });
  });

  describe('getCommonControlsForType', () => {
    it('should return common controls for device types', () => {
      const switchControls = getCommonControlsForType('switch');
      expect(switchControls).toContain('power');

      const dimmerControls = getCommonControlsForType('dimmer');
      expect(dimmerControls).toContain('power');
      expect(dimmerControls).toContain('brightness');
    });
  });

  describe('transformRawDeviceData', () => {
    it('should transform raw device data correctly', () => {
      const rawData = {
        id: 'device-1',
        name: 'Test Device',
        type: 'sensor',
        room: 'Living Room',
        status: 'online',
        lastSeen: '2023-01-01T00:00:00Z',
        properties: [
          {
            key: 'temperature',
            value: 25,
            unit: '°C',
            timestamp: '2023-01-01T00:00:00Z',
          },
        ],
        controls: [
          {
            key: 'power',
            type: 'switch',
            label: 'Power',
          },
        ],
      };

      const transformed = transformRawDeviceData(rawData);
      
      expect(transformed.id).toBe('device-1');
      expect(transformed.name).toBe('Test Device');
      expect(transformed.type).toBe('sensor');
      expect(transformed.lastSeen).toBeInstanceOf(Date);
      expect(transformed.properties).toHaveLength(1);
      expect(transformed.properties![0].timestamp).toBeInstanceOf(Date);
    });

    it('should handle missing optional fields', () => {
      const rawData = {
        id: 'device-1',
        name: 'Test Device',
      };

      const transformed = transformRawDeviceData(rawData);
      expect(transformed.id).toBe('device-1');
      expect(transformed.name).toBe('Test Device');
      expect(transformed.properties).toBeUndefined();
    });
  });

  describe('createDeviceProperty', () => {
    it('should create a device property with current timestamp', () => {
      const property = createDeviceProperty('temperature', 25, '°C');
      
      expect(property.key).toBe('temperature');
      expect(property.value).toBe(25);
      expect(property.unit).toBe('°C');
      expect(property.timestamp).toBeInstanceOf(Date);
    });

    it('should create a property without unit', () => {
      const property = createDeviceProperty('motion', true);
      
      expect(property.key).toBe('motion');
      expect(property.value).toBe(true);
      expect(property.unit).toBeUndefined();
    });
  });

  describe('createDeviceControl', () => {
    it('should create a switch control', () => {
      const control = createDeviceControl('power', 'switch', 'Power');
      
      expect(control.key).toBe('power');
      expect(control.type).toBe('switch');
      expect(control.label).toBe('Power');
    });

    it('should create a slider control with min/max', () => {
      const control = createDeviceControl('brightness', 'slider', 'Brightness', {
        min: 0,
        max: 100,
      });
      
      expect(control.min).toBe(0);
      expect(control.max).toBe(100);
    });

    it('should create a select control with options', () => {
      const control = createDeviceControl('mode', 'select', 'Mode', {
        options: ['heat', 'cool', 'auto'],
      });
      
      expect(control.options).toEqual(['heat', 'cool', 'auto']);
    });
  });

  describe('updateDeviceProperty', () => {
    const mockDevice: Device = {
      id: 'device-1',
      name: 'Test Device',
      type: 'sensor',
      room: 'Living Room',
      status: 'online',
      lastSeen: new Date('2023-01-01'),
      properties: [
        {
          key: 'temperature',
          value: 20,
          unit: '°C',
          timestamp: new Date('2023-01-01'),
        },
      ],
      controls: [],
    };

    it('should update existing property value', () => {
      const updated = updateDeviceProperty(mockDevice, 'temperature', 25);
      
      expect(updated.properties[0].value).toBe(25);
      expect(updated.properties[0].timestamp.getTime()).toBeGreaterThan(mockDevice.properties[0].timestamp.getTime());
      expect(updated.lastSeen.getTime()).toBeGreaterThan(mockDevice.lastSeen.getTime());
    });

    it('should not modify original device', () => {
      updateDeviceProperty(mockDevice, 'temperature', 25);
      expect(mockDevice.properties[0].value).toBe(20);
    });
  });

  describe('getDevicePropertyValue', () => {
    const mockDevice: Device = {
      id: 'device-1',
      name: 'Test Device',
      type: 'sensor',
      room: 'Living Room',
      status: 'online',
      lastSeen: new Date(),
      properties: [
        { key: 'temperature', value: 25, timestamp: new Date() },
        { key: 'humidity', value: 60, unit: '%', timestamp: new Date() },
      ],
      controls: [],
    };

    it('should return property value if exists', () => {
      expect(getDevicePropertyValue(mockDevice, 'temperature')).toBe(25);
      expect(getDevicePropertyValue(mockDevice, 'humidity')).toBe(60);
    });

    it('should return undefined for non-existent property', () => {
      expect(getDevicePropertyValue(mockDevice, 'pressure')).toBeUndefined();
    });
  });

  describe('validateControlValue', () => {
    it('should validate switch control values', () => {
      const switchControl: DeviceControl = {
        key: 'power',
        type: 'switch',
        label: 'Power',
      };

      expect(validateControlValue(switchControl, true)).toBe(true);
      expect(validateControlValue(switchControl, false)).toBe(true);
      expect(validateControlValue(switchControl, 'invalid')).toBe(false);
    });

    it('should validate slider control values', () => {
      const sliderControl: DeviceControl = {
        key: 'brightness',
        type: 'slider',
        label: 'Brightness',
        min: 0,
        max: 100,
      };

      expect(validateControlValue(sliderControl, 50)).toBe(true);
      expect(validateControlValue(sliderControl, 0)).toBe(true);
      expect(validateControlValue(sliderControl, 100)).toBe(true);
      expect(validateControlValue(sliderControl, -10)).toBe(false);
      expect(validateControlValue(sliderControl, 150)).toBe(false);
    });

    it('should validate select control values', () => {
      const selectControl: DeviceControl = {
        key: 'mode',
        type: 'select',
        label: 'Mode',
        options: ['heat', 'cool', 'auto'],
      };

      expect(validateControlValue(selectControl, 'heat')).toBe(true);
      expect(validateControlValue(selectControl, 'invalid')).toBe(false);
    });
  });

  describe('deviceCommandToMqttMessage', () => {
    it('should convert device command to MQTT message', () => {
      const command: DeviceCommand = {
        deviceId: 'device-1',
        controlKey: 'power',
        value: true,
        timestamp: new Date('2023-01-01T00:00:00Z'),
      };

      const mqttMessage = deviceCommandToMqttMessage(command);
      
      expect(mqttMessage.topic).toBe('devices/device-1/controls/power');
      expect(JSON.parse(mqttMessage.payload)).toEqual({
        value: true,
        timestamp: '2023-01-01T00:00:00.000Z',
      });
    });
  });

  describe('parseMqttToDeviceProperty', () => {
    it('should parse valid MQTT message to device property', () => {
      const topic = 'devices/device-1/properties/temperature';
      const payload = JSON.stringify({
        value: 25,
        unit: '°C',
        timestamp: '2023-01-01T00:00:00Z',
      });

      const result = parseMqttToDeviceProperty(topic, payload);
      
      expect(result).not.toBeNull();
      expect(result!.deviceId).toBe('device-1');
      expect(result!.property.key).toBe('temperature');
      expect(result!.property.value).toBe(25);
      expect(result!.property.unit).toBe('°C');
    });

    it('should return null for invalid topic format', () => {
      const topic = 'invalid/topic/format';
      const payload = '{"value": 25}';

      const result = parseMqttToDeviceProperty(topic, payload);
      expect(result).toBeNull();
    });

    it('should return null for invalid JSON payload', () => {
      const topic = 'devices/device-1/properties/temperature';
      const payload = 'invalid json';

      const result = parseMqttToDeviceProperty(topic, payload);
      expect(result).toBeNull();
    });
  });

  describe('calculateDeviceHealthScore', () => {
    it('should return 0 for error status', () => {
      const device: Device = {
        id: 'device-1',
        name: 'Test Device',
        type: 'sensor',
        room: 'Living Room',
        status: 'error',
        lastSeen: new Date(),
        properties: [],
        controls: [],
      };

      expect(calculateDeviceHealthScore(device)).toBe(0);
    });

    it('should return 25 for offline status', () => {
      const device: Device = {
        id: 'device-1',
        name: 'Test Device',
        type: 'sensor',
        room: 'Living Room',
        status: 'offline',
        lastSeen: new Date(),
        properties: [],
        controls: [],
      };

      expect(calculateDeviceHealthScore(device)).toBe(25);
    });

    it('should return 100 for recently seen online device', () => {
      const device: Device = {
        id: 'device-1',
        name: 'Test Device',
        type: 'sensor',
        room: 'Living Room',
        status: 'online',
        lastSeen: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        properties: [],
        controls: [],
      };

      expect(calculateDeviceHealthScore(device)).toBe(100);
    });
  });

  describe('groupDevicesByRoom', () => {
    const devices: Device[] = [
      {
        id: 'device-1',
        name: 'Living Room Light',
        type: 'switch',
        room: 'Living Room',
        status: 'online',
        lastSeen: new Date(),
        properties: [],
        controls: [],
      },
      {
        id: 'device-2',
        name: 'Kitchen Sensor',
        type: 'sensor',
        room: 'Kitchen',
        status: 'online',
        lastSeen: new Date(),
        properties: [],
        controls: [],
      },
      {
        id: 'device-3',
        name: 'Another Living Room Device',
        type: 'dimmer',
        room: 'Living Room',
        status: 'online',
        lastSeen: new Date(),
        properties: [],
        controls: [],
      },
    ];

    it('should group devices by room', () => {
      const grouped = groupDevicesByRoom(devices);
      
      expect(grouped['Living Room']).toHaveLength(2);
      expect(grouped['Kitchen']).toHaveLength(1);
      expect(grouped['Living Room'][0].name).toBe('Living Room Light');
      expect(grouped['Kitchen'][0].name).toBe('Kitchen Sensor');
    });
  });

  describe('filterDevicesByType', () => {
    const devices: Device[] = [
      {
        id: 'device-1',
        name: 'Light Switch',
        type: 'switch',
        room: 'Living Room',
        status: 'online',
        lastSeen: new Date(),
        properties: [],
        controls: [],
      },
      {
        id: 'device-2',
        name: 'Temperature Sensor',
        type: 'sensor',
        room: 'Kitchen',
        status: 'online',
        lastSeen: new Date(),
        properties: [],
        controls: [],
      },
    ];

    it('should filter devices by type', () => {
      const switches = filterDevicesByType(devices, 'switch');
      const sensors = filterDevicesByType(devices, 'sensor');
      
      expect(switches).toHaveLength(1);
      expect(switches[0].name).toBe('Light Switch');
      expect(sensors).toHaveLength(1);
      expect(sensors[0].name).toBe('Temperature Sensor');
    });
  });

  describe('sortDevices', () => {
    const devices: Device[] = [
      {
        id: 'device-1',
        name: 'Z Device',
        type: 'switch',
        room: 'Kitchen',
        status: 'offline',
        lastSeen: new Date('2023-01-01'),
        properties: [],
        controls: [],
      },
      {
        id: 'device-2',
        name: 'A Device',
        type: 'sensor',
        room: 'Living Room',
        status: 'online',
        lastSeen: new Date('2023-01-02'),
        properties: [],
        controls: [],
      },
    ];

    it('should sort devices by name', () => {
      const sorted = sortDevices(devices, 'name');
      expect(sorted[0].name).toBe('A Device');
      expect(sorted[1].name).toBe('Z Device');
    });

    it('should sort devices by room', () => {
      const sorted = sortDevices(devices, 'room');
      expect(sorted[0].room).toBe('Kitchen');
      expect(sorted[1].room).toBe('Living Room');
    });

    it('should sort devices by status', () => {
      const sorted = sortDevices(devices, 'status');
      expect(sorted[0].status).toBe('online');
      expect(sorted[1].status).toBe('offline');
    });

    it('should not modify original array', () => {
      const originalOrder = devices.map(d => d.name);
      sortDevices(devices, 'name');
      expect(devices.map(d => d.name)).toEqual(originalOrder);
    });
  });
});