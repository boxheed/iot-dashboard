/**
 * Device data transformation utilities for the IoT Dashboard
 * Provides functions for converting, formatting, and transforming device data
 */

import {
  Device,
  DeviceProperty,
  DeviceControl,
  DeviceType,
  DeviceCommand,
} from '../types/Device';
import { DEVICE_TYPE_CONFIGS } from './deviceValidation';

/**
 * Formats a device property value for display
 */
export function formatPropertyValue(property: DeviceProperty): string {
  const { value, unit } = property;

  // Handle different value types
  if (typeof value === 'boolean') {
    return value ? 'On' : 'Off';
  }

  if (typeof value === 'number') {
    // Round to 2 decimal places for display
    const rounded = Math.round(value * 100) / 100;
    return unit ? `${rounded} ${unit}` : rounded.toString();
  }

  if (typeof value === 'string') {
    return unit ? `${value} ${unit}` : value;
  }

  // Fallback for other types
  return String(value);
}

/**
 * Gets the display name for a device type
 */
export function getDeviceTypeName(type: DeviceType): string {
  return DEVICE_TYPE_CONFIGS[type]?.name || type;
}

/**
 * Gets the icon name for a device type
 */
export function getDeviceTypeIcon(type: DeviceType): string {
  return DEVICE_TYPE_CONFIGS[type]?.icon || 'device_unknown';
}

/**
 * Gets common properties for a device type
 */
export function getCommonPropertiesForType(type: DeviceType): string[] {
  return [...(DEVICE_TYPE_CONFIGS[type]?.commonProperties || [])];
}

/**
 * Gets common controls for a device type
 */
export function getCommonControlsForType(type: DeviceType): string[] {
  return [...(DEVICE_TYPE_CONFIGS[type]?.commonControls || [])];
}

/**
 * Transforms raw device data into a standardized Device object
 */
export function transformRawDeviceData(rawData: any): Partial<Device> {
  const transformed: Partial<Device> = {};

  // Basic device information
  if (rawData.id) transformed.id = String(rawData.id);
  if (rawData.name) transformed.name = String(rawData.name);
  if (rawData.type) transformed.type = rawData.type as DeviceType;
  if (rawData.room) transformed.room = String(rawData.room);
  if (rawData.status) transformed.status = rawData.status;

  // Handle timestamps
  if (rawData.lastSeen) {
    transformed.lastSeen = new Date(rawData.lastSeen);
  }

  // Transform properties
  if (Array.isArray(rawData.properties)) {
    transformed.properties = rawData.properties.map((prop: any) => ({
      key: String(prop.key),
      value: prop.value,
      unit: prop.unit ? String(prop.unit) : undefined,
      timestamp: new Date(prop.timestamp || Date.now()),
    }));
  }

  // Transform controls
  if (Array.isArray(rawData.controls)) {
    transformed.controls = rawData.controls.map((control: any) => ({
      key: String(control.key),
      type: control.type,
      label: String(control.label),
      options: control.options,
      min: control.min,
      max: control.max,
    }));
  }

  // Transform thresholds
  if (Array.isArray(rawData.thresholds)) {
    transformed.thresholds = rawData.thresholds.map((threshold: any) => ({
      propertyKey: String(threshold.propertyKey),
      min: threshold.min,
      max: threshold.max,
      enabled: Boolean(threshold.enabled),
    }));
  }

  return transformed;
}

/**
 * Creates a device property object with current timestamp
 */
export function createDeviceProperty(
  key: string,
  value: any,
  unit?: string
): DeviceProperty {
  return {
    key,
    value,
    unit,
    timestamp: new Date(),
  };
}

/**
 * Creates a device control object
 */
export function createDeviceControl(
  key: string,
  type: DeviceControl['type'],
  label: string,
  options?: {
    min?: number;
    max?: number;
    options?: string[];
  }
): DeviceControl {
  const control: DeviceControl = {
    key,
    type,
    label,
  };

  if (options?.min !== undefined) control.min = options.min;
  if (options?.max !== undefined) control.max = options.max;
  if (options?.options) control.options = options.options;

  return control;
}

/**
 * Updates a device property value while preserving other properties
 */
export function updateDeviceProperty(
  device: Device,
  propertyKey: string,
  newValue: any
): Device {
  const updatedProperties = device.properties.map(prop =>
    prop.key === propertyKey
      ? { ...prop, value: newValue, timestamp: new Date() }
      : prop
  );

  return {
    ...device,
    properties: updatedProperties,
    lastSeen: new Date(),
  };
}

/**
 * Gets a specific property value from a device
 */
export function getDevicePropertyValue(device: Device, propertyKey: string): any {
  const property = device.properties.find(prop => prop.key === propertyKey);
  return property?.value;
}

/**
 * Gets a specific control from a device
 */
export function getDeviceControl(device: Device, controlKey: string): DeviceControl | undefined {
  return device.controls.find(control => control.key === controlKey);
}

/**
 * Validates if a control value is within acceptable range
 */
export function validateControlValue(control: DeviceControl, value: any): boolean {
  switch (control.type) {
    case 'switch':
      return typeof value === 'boolean';
    
    case 'slider':
      return typeof value === 'number' && 
             value >= (control.min || 0) && 
             value <= (control.max || 100);
    
    case 'select':
      return control.options?.includes(String(value)) || false;
    
    case 'input':
      return value !== undefined && value !== null;
    
    default:
      return false;
  }
}

/**
 * Converts a device command to the appropriate format for MQTT or other protocols
 */
export function deviceCommandToMqttMessage(command: DeviceCommand): {
  topic: string;
  payload: string;
} {
  const topic = `devices/${command.deviceId}/controls/${command.controlKey}`;
  const payload = JSON.stringify({
    value: command.value,
    timestamp: command.timestamp.toISOString(),
  });

  return { topic, payload };
}

/**
 * Parses an MQTT message into device property updates
 */
export function parseMqttToDeviceProperty(
  topic: string,
  payload: string
): { deviceId: string; property: DeviceProperty } | null {
  try {
    // Expected topic format: devices/{deviceId}/properties/{propertyKey}
    const topicParts = topic.split('/');
    if (topicParts.length !== 4 || topicParts[0] !== 'devices' || topicParts[2] !== 'properties') {
      return null;
    }

    const deviceId = topicParts[1];
    const propertyKey = topicParts[3];
    const data = JSON.parse(payload);

    const property: DeviceProperty = {
      key: propertyKey,
      value: data.value,
      unit: data.unit,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
    };

    return { deviceId, property };
  } catch (error) {
    return null;
  }
}

/**
 * Calculates device health score based on last seen time and error status
 */
export function calculateDeviceHealthScore(device: Device): number {
  if (device.status === 'error') return 0;
  if (device.status === 'offline') return 25;

  const now = new Date();
  const lastSeenMs = now.getTime() - device.lastSeen.getTime();
  const minutesSinceLastSeen = lastSeenMs / (1000 * 60);

  // Full health if seen within 5 minutes
  if (minutesSinceLastSeen <= 5) return 100;
  
  // Degraded health based on time since last seen
  if (minutesSinceLastSeen <= 30) return 75;
  if (minutesSinceLastSeen <= 60) return 50;
  
  return 25;
}

/**
 * Groups devices by room for organized display
 */
export function groupDevicesByRoom(devices: Device[]): Record<string, Device[]> {
  return devices.reduce((groups, device) => {
    const room = device.room || 'Unassigned';
    if (!groups[room]) {
      groups[room] = [];
    }
    groups[room].push(device);
    return groups;
  }, {} as Record<string, Device[]>);
}

/**
 * Filters devices by type
 */
export function filterDevicesByType(devices: Device[], type: DeviceType): Device[] {
  return devices.filter(device => device.type === type);
}

/**
 * Sorts devices by various criteria
 */
export function sortDevices(
  devices: Device[],
  sortBy: 'name' | 'room' | 'type' | 'lastSeen' | 'status'
): Device[] {
  return [...devices].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'room':
        return a.room.localeCompare(b.room);
      case 'type':
        return a.type.localeCompare(b.type);
      case 'lastSeen':
        return b.lastSeen.getTime() - a.lastSeen.getTime();
      case 'status':
        const statusOrder = { online: 0, offline: 1, error: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      default:
        return 0;
    }
  });
}