import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MqttClientService } from './MqttClient';
import { EventEmitter } from 'events';

// Mock the mqtt module
vi.mock('mqtt', () => ({
  default: {
    connect: vi.fn(() => {
      const mockClient = new EventEmitter();
      (mockClient as any).connected = true;
      (mockClient as any).subscribe = vi.fn((topic, options, callback) => {
        if (callback) callback(null);
      });
      (mockClient as any).publish = vi.fn((topic, message, options, callback) => {
        if (callback) callback(null);
      });
      (mockClient as any).end = vi.fn((force, options, callback) => {
        if (callback) callback();
      });
      return mockClient;
    }),
  },
}));

describe('MqttClientService', () => {
  let mqttClient: MqttClientService;

  beforeEach(() => {
    mqttClient = new MqttClientService('mqtt://localhost:1883');
  });

  afterEach(async () => {
    if (mqttClient.isClientConnected()) {
      await mqttClient.disconnect();
    }
  });

  describe('Connection Management', () => {
    it('should initialize with default configuration', () => {
      expect(mqttClient).toBeDefined();
      expect(mqttClient.isClientConnected()).toBe(false);
    });

    it('should connect to MQTT broker', async () => {
      await mqttClient.connect();
      
      // Simulate connection event
      (mqttClient as any).client.emit('connect');
      
      expect(mqttClient.isClientConnected()).toBe(true);
    });

    it('should handle connection errors', async () => {
      const errorSpy = vi.fn();
      mqttClient.on('error', errorSpy);

      await mqttClient.connect();
      
      const testError = new Error('Connection failed');
      (mqttClient as any).client.emit('error', testError);
      
      expect(errorSpy).toHaveBeenCalledWith(testError);
    });

    it('should disconnect gracefully', async () => {
      await mqttClient.connect();
      (mqttClient as any).client.emit('connect');
      
      await mqttClient.disconnect();
      
      expect(mqttClient.isClientConnected()).toBe(false);
    });
  });

  describe('Device Communication', () => {
    beforeEach(async () => {
      await mqttClient.connect();
      (mqttClient as any).client.emit('connect');
    });

    it('should send device commands', async () => {
      const publishSpy = vi.spyOn((mqttClient as any).client, 'publish');
      
      await mqttClient.sendDeviceCommand('device123', 'power', true);
      
      expect(publishSpy).toHaveBeenCalledWith(
        'iot-dashboard/device/device123/command',
        expect.stringContaining('"controlKey":"power"'),
        { qos: 1 },
        expect.any(Function)
      );
    });

    it('should request device discovery', async () => {
      const publishSpy = vi.spyOn((mqttClient as any).client, 'publish');
      
      await mqttClient.requestDeviceDiscovery();
      
      expect(publishSpy).toHaveBeenCalledWith(
        'iot-dashboard/discovery/request',
        expect.stringContaining('"timestamp"'),
        { qos: 1 },
        expect.any(Function)
      );
    });

    it('should throw error when sending commands while disconnected', async () => {
      await mqttClient.disconnect();
      
      await expect(
        mqttClient.sendDeviceCommand('device123', 'power', true)
      ).rejects.toThrow('MQTT client not connected');
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await mqttClient.connect();
      (mqttClient as any).client.emit('connect');
    });

    it('should handle device discovery messages', () => {
      const discoveryData = {
        deviceId: 'sensor001',
        name: 'Temperature Sensor',
        type: 'sensor',
        room: 'Living Room',
        capabilities: ['temperature', 'humidity'],
        properties: [
          { key: 'temperature', type: 'number', unit: '°C' },
          { key: 'humidity', type: 'number', unit: '%' }
        ],
        controls: []
      };

      const discoverySpy = vi.fn();
      mqttClient.on('deviceDiscovered', discoverySpy);

      // Simulate discovery message
      (mqttClient as any).handleMessage(
        'iot-dashboard/discovery/sensor001',
        Buffer.from(JSON.stringify(discoveryData))
      );

      expect(discoverySpy).toHaveBeenCalledWith(discoveryData);
      expect(mqttClient.getDiscoveredDevices()).toHaveLength(1);
      expect(mqttClient.getDiscoveredDevices()[0]).toEqual(discoveryData);
    });

    it('should handle device status messages', () => {
      const statusSpy = vi.fn();
      mqttClient.on('deviceStatusUpdate', statusSpy);

      const statusData = { status: 'online', timestamp: Date.now() };

      // Simulate status message
      (mqttClient as any).handleMessage(
        'iot-dashboard/device/device123/status',
        Buffer.from(JSON.stringify(statusData))
      );

      expect(statusSpy).toHaveBeenCalledWith({
        deviceId: 'device123',
        status: 'online',
        timestamp: statusData.timestamp
      });
    });

    it('should handle device property messages', () => {
      const propertySpy = vi.fn();
      mqttClient.on('devicePropertyUpdate', propertySpy);

      const propertyData = { value: 23.5, unit: '°C', timestamp: Date.now() };

      // Simulate property message
      (mqttClient as any).handleMessage(
        'iot-dashboard/device/sensor001/property/temperature',
        Buffer.from(JSON.stringify(propertyData))
      );

      expect(propertySpy).toHaveBeenCalledWith({
        deviceId: 'sensor001',
        property: {
          key: 'temperature',
          value: 23.5,
          unit: '°C',
          timestamp: expect.any(Date)
        }
      });
    });

    it('should handle malformed messages gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Simulate malformed message
      (mqttClient as any).handleMessage(
        'iot-dashboard/device/device123/status',
        Buffer.from('invalid json')
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse status message'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Discovery Management', () => {
    it('should manage discovered devices', () => {
      const device1 = {
        deviceId: 'device1',
        name: 'Device 1',
        type: 'sensor',
        capabilities: [],
        properties: [],
        controls: []
      };

      const device2 = {
        deviceId: 'device2',
        name: 'Device 2',
        type: 'switch',
        capabilities: [],
        properties: [],
        controls: []
      };

      // Add devices to discovery cache
      (mqttClient as any).discoveredDevices.set('device1', device1);
      (mqttClient as any).discoveredDevices.set('device2', device2);

      expect(mqttClient.getDiscoveredDevices()).toHaveLength(2);
      expect(mqttClient.getDiscoveredDevices()).toContain(device1);
      expect(mqttClient.getDiscoveredDevices()).toContain(device2);

      // Clear discovery cache
      mqttClient.clearDiscoveredDevices();
      expect(mqttClient.getDiscoveredDevices()).toHaveLength(0);
    });
  });
});