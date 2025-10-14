/**
 * Device-related type definitions for the IoT Dashboard
 * These interfaces define the structure for smart home devices,
 * their properties, controls, and related data models.
 */

/**
 * Supported device types in the IoT Dashboard
 */
export type DeviceType = 'sensor' | 'switch' | 'dimmer' | 'thermostat' | 'camera' | 'lock';

/**
 * Device connection status
 */
export type DeviceStatus = 'online' | 'offline' | 'error';

/**
 * Device control input types
 */
export type DeviceControlType = 'switch' | 'slider' | 'input' | 'select';

/**
 * Represents a property of a device (sensor reading, current state, etc.)
 */
export interface DeviceProperty {
  /** Unique identifier for the property */
  key: string;
  /** Current value of the property */
  value: any;
  /** Unit of measurement (e.g., "°C", "%", "W") */
  unit?: string;
  /** Timestamp when this value was last updated */
  timestamp: Date;
}

/**
 * Represents a controllable aspect of a device
 */
export interface DeviceControl {
  /** Unique identifier for the control */
  key: string;
  /** Type of control interface to display */
  type: DeviceControlType;
  /** Human-readable label for the control */
  label: string;
  /** Available options for select-type controls */
  options?: string[];
  /** Minimum value for slider-type controls */
  min?: number;
  /** Maximum value for slider-type controls */
  max?: number;
}

/**
 * Threshold configuration for monitoring device values
 */
export interface Threshold {
  /** Property key to monitor */
  propertyKey: string;
  /** Minimum acceptable value */
  min?: number;
  /** Maximum acceptable value */
  max?: number;
  /** Whether this threshold is currently enabled */
  enabled: boolean;
}

/**
 * Main device interface representing a smart home device
 */
export interface Device {
  /** Unique identifier for the device */
  id: string;
  /** User-friendly name for the device */
  name: string;
  /** Type of device (determines available controls and display) */
  type: DeviceType;
  /** Room or location where the device is installed */
  room: string;
  /** Current connection status */
  status: DeviceStatus;
  /** Timestamp of last communication with the device */
  lastSeen: Date;
  /** Current properties and sensor readings */
  properties: DeviceProperty[];
  /** Available controls for this device */
  controls: DeviceControl[];
  /** Optional threshold monitoring configuration */
  thresholds?: Threshold[];
}

/**
 * Device command for sending control instructions
 */
export interface DeviceCommand {
  /** Target device ID */
  deviceId: string;
  /** Control key to modify */
  controlKey: string;
  /** New value to set */
  value: any;
  /** Timestamp when command was issued */
  timestamp: Date;
}

/**
 * Device registration information for adding new devices
 */
export interface DeviceRegistration {
  /** Device name provided by user */
  name: string;
  /** Device type */
  type: DeviceType;
  /** Room assignment */
  room: string;
  /** Connection configuration (MQTT topic, IP address, etc.) */
  connectionConfig: Record<string, any>;
}