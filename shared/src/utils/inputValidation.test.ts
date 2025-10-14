/**
 * Unit tests for input validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  validateControlInput,
  validateSwitchInput,
  validateSliderInput,
  validateSelectInput,
  validateTextInput,
  validateDeviceName,
  validateRoomName,
  validateTemperature,
  validatePercentage,
  validateBrightness,
  validateMqttTopic,
  validateIpAddress,
  validatePort,
} from './inputValidation';
import { DeviceControl } from '../types/Device';

describe('Input Validation Utilities', () => {
  describe('validateSwitchInput', () => {
    it('should validate boolean values', () => {
      expect(validateSwitchInput(true)).toEqual({
        isValid: true,
        sanitizedValue: true,
      });
      expect(validateSwitchInput(false)).toEqual({
        isValid: true,
        sanitizedValue: false,
      });
    });

    it('should validate string representations', () => {
      expect(validateSwitchInput('true')).toEqual({
        isValid: true,
        sanitizedValue: true,
      });
      expect(validateSwitchInput('false')).toEqual({
        isValid: true,
        sanitizedValue: false,
      });
      expect(validateSwitchInput('on')).toEqual({
        isValid: true,
        sanitizedValue: true,
      });
      expect(validateSwitchInput('off')).toEqual({
        isValid: true,
        sanitizedValue: false,
      });
      expect(validateSwitchInput('1')).toEqual({
        isValid: true,
        sanitizedValue: true,
      });
      expect(validateSwitchInput('0')).toEqual({
        isValid: true,
        sanitizedValue: false,
      });
    });

    it('should validate numeric values', () => {
      expect(validateSwitchInput(1)).toEqual({
        isValid: true,
        sanitizedValue: true,
      });
      expect(validateSwitchInput(0)).toEqual({
        isValid: true,
        sanitizedValue: false,
      });
    });

    it('should reject invalid values', () => {
      const result = validateSwitchInput('invalid');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Switch value must be true/false, on/off, or 1/0');
    });
  });

  describe('validateSliderInput', () => {
    it('should validate numeric values within range', () => {
      expect(validateSliderInput(50, 0, 100)).toEqual({
        isValid: true,
        sanitizedValue: 50,
      });
      expect(validateSliderInput(0, 0, 100)).toEqual({
        isValid: true,
        sanitizedValue: 0,
      });
      expect(validateSliderInput(100, 0, 100)).toEqual({
        isValid: true,
        sanitizedValue: 100,
      });
    });

    it('should validate string numbers within range', () => {
      expect(validateSliderInput('75', 0, 100)).toEqual({
        isValid: true,
        sanitizedValue: 75,
      });
    });

    it('should reject values below minimum', () => {
      const result = validateSliderInput(-10, 0, 100);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Value must be at least 0');
    });

    it('should reject values above maximum', () => {
      const result = validateSliderInput(150, 0, 100);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Value must be at most 100');
    });

    it('should reject non-numeric strings', () => {
      const result = validateSliderInput('invalid', 0, 100);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Slider value must be a valid number');
    });

    it('should reject non-numeric values', () => {
      const result = validateSliderInput({}, 0, 100);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Slider value must be a number');
    });
  });

  describe('validateSelectInput', () => {
    const options = ['option1', 'option2', 'option3'];

    it('should validate values in options', () => {
      expect(validateSelectInput('option1', options)).toEqual({
        isValid: true,
        sanitizedValue: 'option1',
      });
    });

    it('should convert non-string values to strings', () => {
      expect(validateSelectInput(123, ['123', 'other'])).toEqual({
        isValid: true,
        sanitizedValue: '123',
      });
    });

    it('should reject values not in options', () => {
      const result = validateSelectInput('invalid', options);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Value must be one of: option1, option2, option3');
    });

    it('should reject when no options provided', () => {
      const result = validateSelectInput('value', []);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('No options available for selection');
    });
  });

  describe('validateTextInput', () => {
    it('should validate non-empty strings', () => {
      expect(validateTextInput('valid text')).toEqual({
        isValid: true,
        sanitizedValue: 'valid text',
      });
    });

    it('should trim whitespace', () => {
      expect(validateTextInput('  text with spaces  ')).toEqual({
        isValid: true,
        sanitizedValue: 'text with spaces',
      });
    });

    it('should sanitize harmful characters', () => {
      expect(validateTextInput('text<script>alert("xss")</script>')).toEqual({
        isValid: true,
        sanitizedValue: 'textscriptalert(xss)/script',
      });
    });

    it('should reject null and undefined', () => {
      expect(validateTextInput(null).isValid).toBe(false);
      expect(validateTextInput(undefined).isValid).toBe(false);
    });

    it('should reject empty strings after trimming', () => {
      const result = validateTextInput('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Value cannot be empty');
    });
  });

  describe('validateControlInput', () => {
    it('should validate switch control', () => {
      const control: DeviceControl = {
        key: 'power',
        type: 'switch',
        label: 'Power',
      };

      expect(validateControlInput(control, true)).toEqual({
        isValid: true,
        sanitizedValue: true,
      });
    });

    it('should validate slider control', () => {
      const control: DeviceControl = {
        key: 'brightness',
        type: 'slider',
        label: 'Brightness',
        min: 0,
        max: 100,
      };

      expect(validateControlInput(control, 50)).toEqual({
        isValid: true,
        sanitizedValue: 50,
      });
    });

    it('should validate select control', () => {
      const control: DeviceControl = {
        key: 'mode',
        type: 'select',
        label: 'Mode',
        options: ['heat', 'cool', 'auto'],
      };

      expect(validateControlInput(control, 'heat')).toEqual({
        isValid: true,
        sanitizedValue: 'heat',
      });
    });

    it('should validate input control', () => {
      const control: DeviceControl = {
        key: 'name',
        type: 'input',
        label: 'Name',
      };

      expect(validateControlInput(control, 'device name')).toEqual({
        isValid: true,
        sanitizedValue: 'device name',
      });
    });

    it('should reject unknown control type', () => {
      const control = {
        key: 'unknown',
        type: 'unknown',
        label: 'Unknown',
      } as any;

      const result = validateControlInput(control, 'value');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Unknown control type: unknown');
    });
  });

  describe('validateDeviceName', () => {
    it('should validate proper device names', () => {
      expect(validateDeviceName('Living Room Light')).toEqual({
        isValid: true,
        sanitizedValue: 'Living Room Light',
      });
      expect(validateDeviceName('Sensor_01')).toEqual({
        isValid: true,
        sanitizedValue: 'Sensor_01',
      });
      expect(validateDeviceName('Kitchen-Thermostat')).toEqual({
        isValid: true,
        sanitizedValue: 'Kitchen-Thermostat',
      });
    });

    it('should reject names that are too short', () => {
      const result = validateDeviceName('A');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Device name must be at least 2 characters long');
    });

    it('should reject names that are too long', () => {
      const longName = 'A'.repeat(51);
      const result = validateDeviceName(longName);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Device name must be 50 characters or less');
    });

    it('should reject names with invalid characters', () => {
      const result = validateDeviceName('Device@Name!');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Device name can only contain letters, numbers, spaces, hyphens, and underscores');
    });
  });

  describe('validateRoomName', () => {
    it('should validate proper room names', () => {
      expect(validateRoomName('Living Room')).toEqual({
        isValid: true,
        sanitizedValue: 'Living Room',
      });
    });

    it('should reject room names that are too short', () => {
      const result = validateRoomName('A');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Room name must be at least 2 characters long');
    });

    it('should reject room names that are too long', () => {
      const longName = 'A'.repeat(31);
      const result = validateRoomName(longName);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Room name must be 30 characters or less');
    });
  });

  describe('validateTemperature', () => {
    it('should validate celsius temperatures', () => {
      expect(validateTemperature(25, 'celsius')).toEqual({
        isValid: true,
        sanitizedValue: 25,
      });
    });

    it('should validate fahrenheit temperatures', () => {
      expect(validateTemperature(75, 'fahrenheit')).toEqual({
        isValid: true,
        sanitizedValue: 75,
      });
    });

    it('should reject temperatures outside reasonable range', () => {
      const result = validateTemperature(200, 'celsius');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Temperature');
    });
  });

  describe('validatePercentage', () => {
    it('should validate percentages within 0-100', () => {
      expect(validatePercentage(50)).toEqual({
        isValid: true,
        sanitizedValue: 50,
      });
      expect(validatePercentage(0)).toEqual({
        isValid: true,
        sanitizedValue: 0,
      });
      expect(validatePercentage(100)).toEqual({
        isValid: true,
        sanitizedValue: 100,
      });
    });

    it('should reject percentages outside 0-100', () => {
      expect(validatePercentage(-10).isValid).toBe(false);
      expect(validatePercentage(150).isValid).toBe(false);
    });
  });

  describe('validateBrightness', () => {
    it('should validate brightness values', () => {
      expect(validateBrightness(75)).toEqual({
        isValid: true,
        sanitizedValue: 75,
      });
    });

    it('should reject invalid brightness values', () => {
      expect(validateBrightness(-10).isValid).toBe(false);
      expect(validateBrightness(150).isValid).toBe(false);
    });
  });

  describe('validateMqttTopic', () => {
    it('should validate proper MQTT topics', () => {
      expect(validateMqttTopic('devices/sensor1/temperature')).toEqual({
        isValid: true,
        sanitizedValue: 'devices/sensor1/temperature',
      });
    });

    it('should validate wildcard topics', () => {
      expect(validateMqttTopic('devices/+/temperature')).toEqual({
        isValid: true,
        sanitizedValue: 'devices/+/temperature',
      });
      expect(validateMqttTopic('devices/#')).toEqual({
        isValid: true,
        sanitizedValue: 'devices/#',
      });
    });

    it('should reject invalid wildcard usage', () => {
      const result1 = validateMqttTopic('devices/#/temperature');
      expect(result1.isValid).toBe(false);
      expect(result1.error).toBe('MQTT wildcard # can only be used at the end of a topic');
    });

    it('should reject topics that are too long', () => {
      const longTopic = 'a'.repeat(65536);
      const result = validateMqttTopic(longTopic);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('MQTT topic must be 65535 characters or less');
    });
  });

  describe('validateIpAddress', () => {
    it('should validate proper IPv4 addresses', () => {
      expect(validateIpAddress('192.168.1.1')).toEqual({
        isValid: true,
        sanitizedValue: '192.168.1.1',
      });
      expect(validateIpAddress('127.0.0.1')).toEqual({
        isValid: true,
        sanitizedValue: '127.0.0.1',
      });
    });

    it('should reject invalid IP formats', () => {
      expect(validateIpAddress('192.168.1').isValid).toBe(false);
      expect(validateIpAddress('192.168.1.1.1').isValid).toBe(false);
      expect(validateIpAddress('not.an.ip.address').isValid).toBe(false);
    });

    it('should reject octets outside 0-255 range', () => {
      expect(validateIpAddress('192.168.1.256').isValid).toBe(false);
      expect(validateIpAddress('300.168.1.1').isValid).toBe(false);
    });
  });

  describe('validatePort', () => {
    it('should validate proper port numbers', () => {
      expect(validatePort(80)).toEqual({
        isValid: true,
        sanitizedValue: 80,
      });
      expect(validatePort(8080)).toEqual({
        isValid: true,
        sanitizedValue: 8080,
      });
      expect(validatePort('443')).toEqual({
        isValid: true,
        sanitizedValue: 443,
      });
    });

    it('should convert decimal numbers to integers', () => {
      expect(validatePort(80.7)).toEqual({
        isValid: true,
        sanitizedValue: 80,
      });
    });

    it('should reject ports outside valid range', () => {
      expect(validatePort(0).isValid).toBe(false);
      expect(validatePort(65536).isValid).toBe(false);
      expect(validatePort(-1).isValid).toBe(false);
    });
  });
});