/**
 * Unit tests for device validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  DEVICE_TYPE_CONFIGS,
  isValidDeviceType,
  isValidDeviceStatus,
  validateDeviceProperty,
  validateDeviceControl,
  validateDevice,
  validateThreshold,
  validateDeviceCommand,
  validateDeviceRegistration,
} from './deviceValidation';
import { Device, DeviceProperty, DeviceControl } from '../types/Device';

describe('Device Validation Utilities', () => {
  describe('isValidDeviceType', () => {
    it('should return true for valid device types', () => {
      expect(isValidDeviceType('sensor')).toBe(true);
      expect(isValidDeviceType('switch')).toBe(true);
      expect(isValidDeviceType('dimmer')).toBe(true);
      expect(isValidDeviceType('thermostat')).toBe(true);
      expect(isValidDeviceType('camera')).toBe(true);
      expect(isValidDeviceType('lock')).toBe(true);
    });

    it('should return false for invalid device types', () => {
      expect(isValidDeviceType('invalid')).toBe(false);
      expect(isValidDeviceType('')).toBe(false);
      expect(isValidDeviceType('SENSOR')).toBe(false);
    });
  });

  describe('isValidDeviceStatus', () => {
    it('should return true for valid device statuses', () => {
      expect(isValidDeviceStatus('online')).toBe(true);
      expect(isValidDeviceStatus('offline')).toBe(true);
      expect(isValidDeviceStatus('error')).toBe(true);
    });

    it('should return false for invalid device statuses', () => {
      expect(isValidDeviceStatus('invalid')).toBe(false);
      expect(isValidDeviceStatus('')).toBe(false);
      expect(isValidDeviceStatus('ONLINE')).toBe(false);
    });
  });

  describe('validateDeviceProperty', () => {
    it('should validate a correct device property', () => {
      const property: DeviceProperty = {
        key: 'temperature',
        value: 25.5,
        unit: '°C',
        timestamp: new Date(),
      };

      const result = validateDeviceProperty(property);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject property without key', () => {
      const property = {
        value: 25.5,
        timestamp: new Date(),
      };

      const result = validateDeviceProperty(property);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Property key is required and must be a string');
    });

    it('should reject property without value', () => {
      const property = {
        key: 'temperature',
        timestamp: new Date(),
      };

      const result = validateDeviceProperty(property);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Property value is required');
    });

    it('should reject property without timestamp', () => {
      const property = {
        key: 'temperature',
        value: 25.5,
      };

      const result = validateDeviceProperty(property);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Property timestamp is required and must be a Date');
    });

    it('should accept property without unit', () => {
      const property: DeviceProperty = {
        key: 'motion',
        value: true,
        timestamp: new Date(),
      };

      const result = validateDeviceProperty(property);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateDeviceControl', () => {
    it('should validate a switch control', () => {
      const control: DeviceControl = {
        key: 'power',
        type: 'switch',
        label: 'Power',
      };

      const result = validateDeviceControl(control);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a slider control with min/max', () => {
      const control: DeviceControl = {
        key: 'brightness',
        type: 'slider',
        label: 'Brightness',
        min: 0,
        max: 100,
      };

      const result = validateDeviceControl(control);
      expect(result.isValid).toBe(true);
    });

    it('should validate a select control with options', () => {
      const control: DeviceControl = {
        key: 'mode',
        type: 'select',
        label: 'Mode',
        options: ['heat', 'cool', 'auto'],
      };

      const result = validateDeviceControl(control);
      expect(result.isValid).toBe(true);
    });

    it('should reject slider without min/max values', () => {
      const control = {
        key: 'brightness',
        type: 'slider',
        label: 'Brightness',
      };

      const result = validateDeviceControl(control);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Slider controls must have a numeric min value');
      expect(result.errors).toContain('Slider controls must have a numeric max value');
    });

    it('should reject select without options', () => {
      const control = {
        key: 'mode',
        type: 'select',
        label: 'Mode',
      };

      const result = validateDeviceControl(control);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Select controls must have an options array');
    });

    it('should reject slider with invalid min/max range', () => {
      const control = {
        key: 'brightness',
        type: 'slider',
        label: 'Brightness',
        min: 100,
        max: 0,
      };

      const result = validateDeviceControl(control);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Slider min value must be less than max value');
    });
  });

  describe('validateDevice', () => {
    const validDevice: Device = {
      id: 'device-1',
      name: 'Living Room Light',
      type: 'switch',
      room: 'Living Room',
      status: 'online',
      lastSeen: new Date(),
      properties: [
        {
          key: 'state',
          value: true,
          timestamp: new Date(),
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

    it('should validate a complete device', () => {
      const result = validateDevice(validDevice);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject device without required fields', () => {
      const incompleteDevice = {
        name: 'Test Device',
      };

      const result = validateDevice(incompleteDevice);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject device with invalid type', () => {
      const deviceWithInvalidType = {
        ...validDevice,
        type: 'invalid-type',
      };

      const result = validateDevice(deviceWithInvalidType);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Device type must be one of: sensor, switch, dimmer, thermostat, camera, lock');
    });

    it('should reject device with invalid properties', () => {
      const deviceWithInvalidProperties = {
        ...validDevice,
        properties: [
          {
            key: 'state',
            // missing value and timestamp
          },
        ],
      };

      const result = validateDevice(deviceWithInvalidProperties);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Property 0:'))).toBe(true);
    });
  });

  describe('validateThreshold', () => {
    it('should validate a threshold with min and max', () => {
      const threshold = {
        propertyKey: 'temperature',
        min: 18,
        max: 25,
        enabled: true,
      };

      const result = validateThreshold(threshold);
      expect(result.isValid).toBe(true);
    });

    it('should validate a threshold with only min', () => {
      const threshold = {
        propertyKey: 'battery',
        min: 20,
        enabled: true,
      };

      const result = validateThreshold(threshold);
      expect(result.isValid).toBe(true);
    });

    it('should reject threshold with invalid range', () => {
      const threshold = {
        propertyKey: 'temperature',
        min: 25,
        max: 18,
        enabled: true,
      };

      const result = validateThreshold(threshold);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Threshold min value must be less than max value');
    });

    it('should reject threshold without propertyKey', () => {
      const threshold = {
        min: 18,
        max: 25,
        enabled: true,
      };

      const result = validateThreshold(threshold);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Threshold propertyKey is required and must be a string');
    });
  });

  describe('validateDeviceCommand', () => {
    it('should validate a device command', () => {
      const command = {
        deviceId: 'device-1',
        controlKey: 'power',
        value: true,
        timestamp: new Date(),
      };

      const result = validateDeviceCommand(command);
      expect(result.isValid).toBe(true);
    });

    it('should reject command without required fields', () => {
      const incompleteCommand = {
        deviceId: 'device-1',
      };

      const result = validateDeviceCommand(incompleteCommand);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateDeviceRegistration', () => {
    it('should validate a device registration', () => {
      const registration = {
        name: 'New Device',
        type: 'sensor',
        room: 'Kitchen',
        connectionConfig: {
          mqttTopic: 'devices/sensor1',
        },
      };

      const result = validateDeviceRegistration(registration);
      expect(result.isValid).toBe(true);
    });

    it('should reject registration with invalid type', () => {
      const registration = {
        name: 'New Device',
        type: 'invalid',
        room: 'Kitchen',
        connectionConfig: {},
      };

      const result = validateDeviceRegistration(registration);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Registration type must be one of: sensor, switch, dimmer, thermostat, camera, lock');
    });
  });

  describe('DEVICE_TYPE_CONFIGS', () => {
    it('should have configurations for all device types', () => {
      const expectedTypes = ['sensor', 'switch', 'dimmer', 'thermostat', 'camera', 'lock'];
      
      expectedTypes.forEach(type => {
        expect(DEVICE_TYPE_CONFIGS[type as keyof typeof DEVICE_TYPE_CONFIGS]).toBeDefined();
        expect(DEVICE_TYPE_CONFIGS[type as keyof typeof DEVICE_TYPE_CONFIGS].name).toBeTruthy();
        expect(DEVICE_TYPE_CONFIGS[type as keyof typeof DEVICE_TYPE_CONFIGS].description).toBeTruthy();
        expect(Array.isArray(DEVICE_TYPE_CONFIGS[type as keyof typeof DEVICE_TYPE_CONFIGS].commonProperties)).toBe(true);
        expect(Array.isArray(DEVICE_TYPE_CONFIGS[type as keyof typeof DEVICE_TYPE_CONFIGS].commonControls)).toBe(true);
      });
    });
  });
});