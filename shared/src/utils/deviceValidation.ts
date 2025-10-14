/**
 * Device validation utilities for the IoT Dashboard
 * Provides validation functions for device data, controls, and properties
 */

import {
  Device,
  DeviceType,
  DeviceStatus,
  DeviceProperty,
  DeviceControl,
  DeviceCommand,
  DeviceRegistration,
  Threshold,
} from '../types/Device';

/**
 * Device type configurations defining available properties and controls
 */
export const DEVICE_TYPE_CONFIGS = {
  sensor: {
    name: 'Sensor',
    description: 'Environmental or motion sensor',
    commonProperties: ['temperature', 'humidity', 'motion', 'light', 'battery'],
    commonControls: [],
    icon: 'sensors',
  },
  switch: {
    name: 'Smart Switch',
    description: 'On/off controllable switch',
    commonProperties: ['state', 'power'],
    commonControls: ['power'],
    icon: 'toggle_on',
  },
  dimmer: {
    name: 'Dimmer Switch',
    description: 'Dimmable light control',
    commonProperties: ['state', 'brightness', 'power'],
    commonControls: ['power', 'brightness'],
    icon: 'tune',
  },
  thermostat: {
    name: 'Thermostat',
    description: 'Temperature control system',
    commonProperties: ['temperature', 'humidity', 'targetTemperature', 'mode'],
    commonControls: ['targetTemperature', 'mode'],
    icon: 'thermostat',
  },
  camera: {
    name: 'Security Camera',
    description: 'Video surveillance device',
    commonProperties: ['status', 'recording', 'motion'],
    commonControls: ['recording'],
    icon: 'videocam',
  },
  lock: {
    name: 'Smart Lock',
    description: 'Electronic door lock',
    commonProperties: ['locked', 'battery'],
    commonControls: ['locked'],
    icon: 'lock',
  },
} as const;

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates if a string is a valid device type
 */
export function isValidDeviceType(type: string): type is DeviceType {
  return Object.keys(DEVICE_TYPE_CONFIGS).includes(type);
}

/**
 * Validates if a string is a valid device status
 */
export function isValidDeviceStatus(status: string): status is DeviceStatus {
  return ['online', 'offline', 'error'].includes(status);
}

/**
 * Validates a device property object
 */
export function validateDeviceProperty(property: any): ValidationResult {
  const errors: string[] = [];

  if (!property || typeof property !== 'object') {
    errors.push('Property must be an object');
    return { isValid: false, errors };
  }

  if (!property.key || typeof property.key !== 'string') {
    errors.push('Property key is required and must be a string');
  }

  if (property.value === undefined || property.value === null) {
    errors.push('Property value is required');
  }

  if (property.unit && typeof property.unit !== 'string') {
    errors.push('Property unit must be a string');
  }

  if (!property.timestamp || !(property.timestamp instanceof Date)) {
    errors.push('Property timestamp is required and must be a Date');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates a device control object
 */
export function validateDeviceControl(control: any): ValidationResult {
  const errors: string[] = [];

  if (!control || typeof control !== 'object') {
    errors.push('Control must be an object');
    return { isValid: false, errors };
  }

  if (!control.key || typeof control.key !== 'string') {
    errors.push('Control key is required and must be a string');
  }

  if (!control.type || !['switch', 'slider', 'input', 'select'].includes(control.type)) {
    errors.push('Control type must be one of: switch, slider, input, select');
  }

  if (!control.label || typeof control.label !== 'string') {
    errors.push('Control label is required and must be a string');
  }

  // Validate type-specific properties
  if (control.type === 'select' && (!control.options || !Array.isArray(control.options))) {
    errors.push('Select controls must have an options array');
  }

  if (control.type === 'slider') {
    if (typeof control.min !== 'number') {
      errors.push('Slider controls must have a numeric min value');
    }
    if (typeof control.max !== 'number') {
      errors.push('Slider controls must have a numeric max value');
    }
    if (control.min >= control.max) {
      errors.push('Slider min value must be less than max value');
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates a complete device object
 */
export function validateDevice(device: any): ValidationResult {
  const errors: string[] = [];

  if (!device || typeof device !== 'object') {
    errors.push('Device must be an object');
    return { isValid: false, errors };
  }

  // Required fields
  if (!device.id || typeof device.id !== 'string') {
    errors.push('Device ID is required and must be a string');
  }

  if (!device.name || typeof device.name !== 'string') {
    errors.push('Device name is required and must be a string');
  }

  if (!isValidDeviceType(device.type)) {
    errors.push(`Device type must be one of: ${Object.keys(DEVICE_TYPE_CONFIGS).join(', ')}`);
  }

  if (!device.room || typeof device.room !== 'string') {
    errors.push('Device room is required and must be a string');
  }

  if (!isValidDeviceStatus(device.status)) {
    errors.push('Device status must be one of: online, offline, error');
  }

  if (!device.lastSeen || !(device.lastSeen instanceof Date)) {
    errors.push('Device lastSeen is required and must be a Date');
  }

  // Validate properties array
  if (!Array.isArray(device.properties)) {
    errors.push('Device properties must be an array');
  } else {
    device.properties.forEach((property: any, index: number) => {
      const propertyValidation = validateDeviceProperty(property);
      if (!propertyValidation.isValid) {
        errors.push(`Property ${index}: ${propertyValidation.errors.join(', ')}`);
      }
    });
  }

  // Validate controls array
  if (!Array.isArray(device.controls)) {
    errors.push('Device controls must be an array');
  } else {
    device.controls.forEach((control: any, index: number) => {
      const controlValidation = validateDeviceControl(control);
      if (!controlValidation.isValid) {
        errors.push(`Control ${index}: ${controlValidation.errors.join(', ')}`);
      }
    });
  }

  // Validate optional thresholds
  if (device.thresholds && Array.isArray(device.thresholds)) {
    device.thresholds.forEach((threshold: any, index: number) => {
      const thresholdValidation = validateThreshold(threshold);
      if (!thresholdValidation.isValid) {
        errors.push(`Threshold ${index}: ${thresholdValidation.errors.join(', ')}`);
      }
    });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates a threshold object
 */
export function validateThreshold(threshold: any): ValidationResult {
  const errors: string[] = [];

  if (!threshold || typeof threshold !== 'object') {
    errors.push('Threshold must be an object');
    return { isValid: false, errors };
  }

  if (!threshold.propertyKey || typeof threshold.propertyKey !== 'string') {
    errors.push('Threshold propertyKey is required and must be a string');
  }

  if (threshold.min !== undefined && typeof threshold.min !== 'number') {
    errors.push('Threshold min must be a number');
  }

  if (threshold.max !== undefined && typeof threshold.max !== 'number') {
    errors.push('Threshold max must be a number');
  }

  if (threshold.min !== undefined && threshold.max !== undefined && threshold.min >= threshold.max) {
    errors.push('Threshold min value must be less than max value');
  }

  if (typeof threshold.enabled !== 'boolean') {
    errors.push('Threshold enabled must be a boolean');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates a device command
 */
export function validateDeviceCommand(command: any): ValidationResult {
  const errors: string[] = [];

  if (!command || typeof command !== 'object') {
    errors.push('Command must be an object');
    return { isValid: false, errors };
  }

  if (!command.deviceId || typeof command.deviceId !== 'string') {
    errors.push('Command deviceId is required and must be a string');
  }

  if (!command.controlKey || typeof command.controlKey !== 'string') {
    errors.push('Command controlKey is required and must be a string');
  }

  if (command.value === undefined || command.value === null) {
    errors.push('Command value is required');
  }

  if (!command.timestamp || !(command.timestamp instanceof Date)) {
    errors.push('Command timestamp is required and must be a Date');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates a device registration request
 */
export function validateDeviceRegistration(registration: any): ValidationResult {
  const errors: string[] = [];

  if (!registration || typeof registration !== 'object') {
    errors.push('Registration must be an object');
    return { isValid: false, errors };
  }

  if (!registration.name || typeof registration.name !== 'string') {
    errors.push('Registration name is required and must be a string');
  }

  if (!isValidDeviceType(registration.type)) {
    errors.push(`Registration type must be one of: ${Object.keys(DEVICE_TYPE_CONFIGS).join(', ')}`);
  }

  if (!registration.room || typeof registration.room !== 'string') {
    errors.push('Registration room is required and must be a string');
  }

  if (!registration.connectionConfig || typeof registration.connectionConfig !== 'object') {
    errors.push('Registration connectionConfig is required and must be an object');
  }

  return { isValid: errors.length === 0, errors };
}