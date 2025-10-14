/**
 * Input validation utilities for device controls and user inputs
 * Provides validation functions for various input types and formats
 */

import { DeviceControl } from '../types/Device';

/**
 * Validation result for input validation
 */
export interface InputValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: any;
}

/**
 * Validates and sanitizes a control input value
 */
export function validateControlInput(
  control: DeviceControl,
  value: any
): InputValidationResult {
  switch (control.type) {
    case 'switch':
      return validateSwitchInput(value);
    case 'slider':
      return validateSliderInput(value, control.min, control.max);
    case 'select':
      return validateSelectInput(value, control.options);
    case 'input':
      return validateTextInput(value);
    default:
      return {
        isValid: false,
        error: `Unknown control type: ${control.type}`,
      };
  }
}

/**
 * Validates switch (boolean) input
 */
export function validateSwitchInput(value: any): InputValidationResult {
  if (typeof value === 'boolean') {
    return { isValid: true, sanitizedValue: value };
  }

  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase();
    if (lowerValue === 'true' || lowerValue === 'on' || lowerValue === '1') {
      return { isValid: true, sanitizedValue: true };
    }
    if (lowerValue === 'false' || lowerValue === 'off' || lowerValue === '0') {
      return { isValid: true, sanitizedValue: false };
    }
  }

  if (typeof value === 'number') {
    return { isValid: true, sanitizedValue: value !== 0 };
  }

  return {
    isValid: false,
    error: 'Switch value must be true/false, on/off, or 1/0',
  };
}

/**
 * Validates slider (numeric) input with range checking
 */
export function validateSliderInput(
  value: any,
  min: number = 0,
  max: number = 100
): InputValidationResult {
  let numericValue: number;

  if (typeof value === 'number') {
    numericValue = value;
  } else if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      return {
        isValid: false,
        error: 'Slider value must be a valid number',
      };
    }
    numericValue = parsed;
  } else {
    return {
      isValid: false,
      error: 'Slider value must be a number',
    };
  }

  if (numericValue < min) {
    return {
      isValid: false,
      error: `Value must be at least ${min}`,
    };
  }

  if (numericValue > max) {
    return {
      isValid: false,
      error: `Value must be at most ${max}`,
    };
  }

  return { isValid: true, sanitizedValue: numericValue };
}

/**
 * Validates select input against available options
 */
export function validateSelectInput(
  value: any,
  options: string[] = []
): InputValidationResult {
  const stringValue = String(value);

  if (options.length === 0) {
    return {
      isValid: false,
      error: 'No options available for selection',
    };
  }

  if (!options.includes(stringValue)) {
    return {
      isValid: false,
      error: `Value must be one of: ${options.join(', ')}`,
    };
  }

  return { isValid: true, sanitizedValue: stringValue };
}

/**
 * Validates text input with basic sanitization
 */
export function validateTextInput(value: any): InputValidationResult {
  if (value === null || value === undefined) {
    return {
      isValid: false,
      error: 'Value is required',
    };
  }

  const stringValue = String(value).trim();

  if (stringValue.length === 0) {
    return {
      isValid: false,
      error: 'Value cannot be empty',
    };
  }

  // Basic sanitization - remove potentially harmful characters
  const sanitized = stringValue.replace(/[<>\"'&]/g, '');

  return { isValid: true, sanitizedValue: sanitized };
}

/**
 * Validates device name input
 */
export function validateDeviceName(name: any): InputValidationResult {
  const textResult = validateTextInput(name);
  if (!textResult.isValid) {
    return textResult;
  }

  const sanitizedName = textResult.sanitizedValue as string;

  if (sanitizedName.length < 2) {
    return {
      isValid: false,
      error: 'Device name must be at least 2 characters long',
    };
  }

  if (sanitizedName.length > 50) {
    return {
      isValid: false,
      error: 'Device name must be 50 characters or less',
    };
  }

  // Check for valid characters (letters, numbers, spaces, hyphens, underscores)
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(sanitizedName)) {
    return {
      isValid: false,
      error: 'Device name can only contain letters, numbers, spaces, hyphens, and underscores',
    };
  }

  return { isValid: true, sanitizedValue: sanitizedName };
}

/**
 * Validates room name input
 */
export function validateRoomName(room: any): InputValidationResult {
  const textResult = validateTextInput(room);
  if (!textResult.isValid) {
    return textResult;
  }

  const sanitizedRoom = textResult.sanitizedValue as string;

  if (sanitizedRoom.length < 2) {
    return {
      isValid: false,
      error: 'Room name must be at least 2 characters long',
    };
  }

  if (sanitizedRoom.length > 30) {
    return {
      isValid: false,
      error: 'Room name must be 30 characters or less',
    };
  }

  // Check for valid characters
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(sanitizedRoom)) {
    return {
      isValid: false,
      error: 'Room name can only contain letters, numbers, spaces, hyphens, and underscores',
    };
  }

  return { isValid: true, sanitizedValue: sanitizedRoom };
}

/**
 * Validates temperature input (for thermostats)
 */
export function validateTemperature(
  value: any,
  unit: 'celsius' | 'fahrenheit' = 'celsius'
): InputValidationResult {
  const numericResult = validateSliderInput(
    value,
    unit === 'celsius' ? -50 : -58,  // Reasonable temperature ranges
    unit === 'celsius' ? 50 : 122
  );

  if (!numericResult.isValid) {
    return {
      isValid: false,
      error: `Temperature ${numericResult.error}`,
    };
  }

  return numericResult;
}

/**
 * Validates percentage input (0-100)
 */
export function validatePercentage(value: any): InputValidationResult {
  const result = validateSliderInput(value, 0, 100);
  if (!result.isValid) {
    return {
      isValid: false,
      error: `Percentage ${result.error}`,
    };
  }
  return result;
}

/**
 * Validates brightness input (0-100)
 */
export function validateBrightness(value: any): InputValidationResult {
  return validatePercentage(value);
}

/**
 * Validates MQTT topic format
 */
export function validateMqttTopic(topic: any): InputValidationResult {
  const textResult = validateTextInput(topic);
  if (!textResult.isValid) {
    return textResult;
  }

  const sanitizedTopic = textResult.sanitizedValue as string;

  // MQTT topic validation rules
  if (sanitizedTopic.includes('#') && !sanitizedTopic.endsWith('#')) {
    return {
      isValid: false,
      error: 'MQTT wildcard # can only be used at the end of a topic',
    };
  }

  if (sanitizedTopic.includes('+') && !/^[^+]*(\+\/)*[^+]*$/.test(sanitizedTopic)) {
    return {
      isValid: false,
      error: 'MQTT wildcard + must be used as a complete topic level',
    };
  }

  if (sanitizedTopic.length > 65535) {
    return {
      isValid: false,
      error: 'MQTT topic must be 65535 characters or less',
    };
  }

  return { isValid: true, sanitizedValue: sanitizedTopic };
}

/**
 * Validates IP address format
 */
export function validateIpAddress(ip: any): InputValidationResult {
  const textResult = validateTextInput(ip);
  if (!textResult.isValid) {
    return textResult;
  }

  const sanitizedIp = textResult.sanitizedValue as string;

  // Basic IPv4 validation
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = sanitizedIp.match(ipv4Regex);

  if (!match) {
    return {
      isValid: false,
      error: 'Invalid IP address format',
    };
  }

  // Check each octet is 0-255
  for (let i = 1; i <= 4; i++) {
    const octet = parseInt(match[i], 10);
    if (octet < 0 || octet > 255) {
      return {
        isValid: false,
        error: 'IP address octets must be between 0 and 255',
      };
    }
  }

  return { isValid: true, sanitizedValue: sanitizedIp };
}

/**
 * Validates port number
 */
export function validatePort(port: any): InputValidationResult {
  const numericResult = validateSliderInput(port, 1, 65535);
  if (!numericResult.isValid) {
    return {
      isValid: false,
      error: 'Port must be a number between 1 and 65535',
    };
  }

  // Ensure it's an integer
  const intValue = Math.floor(numericResult.sanitizedValue as number);
  return { isValid: true, sanitizedValue: intValue };
}