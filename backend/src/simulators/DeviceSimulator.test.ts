import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DeviceSimulator, SimulatedDeviceConfig } from './DeviceSimulator';
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

describe('DeviceSimulator', () => {
  let simulator: DeviceSimulator;
  let mockConfig: SimulatedDeviceConfig;

  beforeEach(() => {
    mockConfig = {
      deviceId: 'test_sensor_001',
      name: 'Test Temperature Sensor',
      type: 'sensor',
      room: 'Test Room',
      capabilities: ['temperature', 'humidity'],
      properties: [
        { key: 'temperature', type: 'number', unit: '°C', min: 18, max: 28 },
        { key: 'humidity', type: 'number', unit: '%', min: 30, max: 70 }
      ],
      controls: [],
      updateInterval: 1000, // 1 second for testing
      offlineProbability: 0
    };

    simulator = new DeviceSimulator(mockConfig, 'mqtt://localhost:1883');
  });

  afterEach(async () => {
    if (simulator.isDeviceOnline()) {
      await simulator.stop();
    }
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(simulator).toBeDefined();
      expect(simulator.isDeviceOnline()).toBe(false);
    });

    it('should initialize property values within specified ranges', async () => {
      await simulator.start();
      
      // Simulate connection event
      (simulator as any).client.emit('connect');
      
      expect(simulator.isDeviceOnline()).toBe(true);
      
      // Check that property values are initialized
      const temperature = (simulator as any).propertyValues.get('temperature');
      const humidity = (simulator as any).propertyValues.get('humidity');
      
      expect(temperature).toBeGreaterThanOrEqual(18);
      expect(temperature).toBeLessThanOrEqual(28);
      expect(humidity).toBeGreaterThanOrEqual(30);
      expect(humidity).toBeLessThanOrEqual(70);
    });
  });

  describe('Connection Management', () => {
    it('should connect to MQTT broker', async () => {
      const connectSpy = vi.fn();
      simulator.on('connected', connectSpy);

      await simulator.start();
      
      // Simulate connection event
      (simulator as any).client.emit('connect');
      
      expect(simulator.isDeviceOnline()).toBe(true);
      expect(connectSpy).toHaveBeenCalled();
    });

    it('should disconnect gracefully', async () => {
      const disconnectSpy = vi.fn();
      simulator.on('disconnected', disconnectSpy);

      await simulator.start();
      (simulator as any).client.emit('connect');
      
      await simulator.stop();
      
      expect(simulator.isDeviceOnline()).toBe(false);
    });

    it('should handle connection errors', async () => {
      const errorSpy = vi.fn();
      simulator.on('error', errorSpy);

      await simulator.start();
      
      const testError = new Error('Connection failed');
      (simulator as any).client.emit('error', testError);
      
      expect(errorSpy).toHaveBeenCalledWith(testError);
    });
  });

  describe('Device Discovery', () => {
    it('should publish discovery message on connection', async () => {
      await simulator.start();
      
      const publishSpy = vi.spyOn((simulator as any).client, 'publish');
      
      // Simulate connection event
      (simulator as any).client.emit('connect');
      
      expect(publishSpy).toHaveBeenCalledWith(
        'iot-dashboard/discovery/test_sensor_001',
        expect.stringContaining('"deviceId":"test_sensor_001"'),
        { qos: 1 },
        expect.any(Function)
      );
    });

    it('should include correct device information in discovery', async () => {
      await simulator.start();
      
      const publishSpy = vi.spyOn((simulator as any).client, 'publish');
      
      (simulator as any).client.emit('connect');
      
      const discoveryCall = publishSpy.mock.calls.find(call => 
        call[0] === 'iot-dashboard/discovery/test_sensor_001'
      );
      
      expect(discoveryCall).toBeDefined();
      
      const discoveryMessage = JSON.parse(discoveryCall![1] as string);
      expect(discoveryMessage).toEqual({
        deviceId: 'test_sensor_001',
        name: 'Test Temperature Sensor',
        type: 'sensor',
        room: 'Test Room',
        capabilities: ['temperature', 'humidity'],
        properties: mockConfig.properties,
        controls: mockConfig.controls
      });
    });
  });

  describe('Status Publishing', () => {
    it('should publish online status on connection', async () => {
      await simulator.start();
      
      const publishSpy = vi.spyOn((simulator as any).client, 'publish');
      
      (simulator as any).client.emit('connect');
      
      expect(publishSpy).toHaveBeenCalledWith(
        'iot-dashboard/device/test_sensor_001/status',
        expect.stringContaining('"status":"online"'),
        { qos: 1 },
        expect.any(Function)
      );
    });

    it('should publish offline status on disconnect', async () => {
      await simulator.start();
      (simulator as any).client.emit('connect');
      
      const publishSpy = vi.spyOn((simulator as any).client, 'publish');
      publishSpy.mockClear(); // Clear previous calls
      
      await simulator.stop();
      
      expect(publishSpy).toHaveBeenCalledWith(
        'iot-dashboard/device/test_sensor_001/status',
        expect.stringContaining('"status":"offline"'),
        { qos: 1 },
        expect.any(Function)
      );
    });
  });

  describe('Property Updates', () => {
    it('should publish property updates periodically', async () => {
      // Use a shorter update interval for testing
      const fastConfig = { ...mockConfig, updateInterval: 100 };
      const fastSimulator = new DeviceSimulator(fastConfig);
      
      await fastSimulator.start();
      (fastSimulator as any).client.emit('connect');
      
      const publishSpy = vi.spyOn((fastSimulator as any).client, 'publish');
      
      // Wait for property updates
      await new Promise(resolve => setTimeout(resolve, 250));
      
      // Should have published property updates
      const propertyUpdates = publishSpy.mock.calls.filter(call => 
        (call[0] as string).includes('/property/')
      );
      
      expect(propertyUpdates.length).toBeGreaterThan(0);
      
      await fastSimulator.stop();
    });

    it('should publish properties with correct format', async () => {
      await simulator.start();
      (simulator as any).client.emit('connect');
      
      // Manually trigger property update
      (simulator as any).publishProperty('temperature', 23.5);
      
      const publishSpy = vi.spyOn((simulator as any).client, 'publish');
      (simulator as any).publishProperty('temperature', 24.0);
      
      expect(publishSpy).toHaveBeenCalledWith(
        'iot-dashboard/device/test_sensor_001/property/temperature',
        expect.stringContaining('"value":24'),
        { qos: 1 },
        expect.any(Function)
      );
    });
  });

  describe('Command Handling', () => {
    beforeEach(async () => {
      // Add a control to the config for command testing
      mockConfig.controls = [
        { key: 'power', type: 'switch', label: 'Power' }
      ];
      mockConfig.properties.push({ key: 'power', type: 'boolean' });
      
      simulator = new DeviceSimulator(mockConfig);
      await simulator.start();
      (simulator as any).client.emit('connect');
    });

    it('should handle valid commands', () => {
      const publishSpy = vi.spyOn((simulator as any).client, 'publish');
      
      const commandMessage = JSON.stringify({
        controlKey: 'power',
        value: true,
        timestamp: Date.now()
      });
      
      // Simulate command reception
      (simulator as any).handleCommand(
        'iot-dashboard/device/test_sensor_001/command',
        Buffer.from(commandMessage)
      );
      
      // Should publish command response
      const responseCall = publishSpy.mock.calls.find(call => 
        (call[0] as string).includes('/command/response')
      );
      
      expect(responseCall).toBeDefined();
      
      const response = JSON.parse(responseCall![1] as string);
      expect(response.success).toBe(true);
      expect(response.controlKey).toBe('power');
    });

    it('should reject invalid commands', () => {
      const publishSpy = vi.spyOn((simulator as any).client, 'publish');
      
      const commandMessage = JSON.stringify({
        controlKey: 'invalid_control',
        value: true,
        timestamp: Date.now()
      });
      
      (simulator as any).handleCommand(
        'iot-dashboard/device/test_sensor_001/command',
        Buffer.from(commandMessage)
      );
      
      const responseCall = publishSpy.mock.calls.find(call => 
        (call[0] as string).includes('/command/response')
      );
      
      expect(responseCall).toBeDefined();
      
      const response = JSON.parse(responseCall![1] as string);
      expect(response.success).toBe(false);
      expect(response.message).toContain('Unknown control key');
    });

    it('should handle malformed command messages', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Simulate malformed command
      (simulator as any).handleCommand(
        'iot-dashboard/device/test_sensor_001/command',
        Buffer.from('invalid json')
      );
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to handle command'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Offline Simulation', () => {
    it('should support manual offline mode', async () => {
      await simulator.start();
      (simulator as any).client.emit('connect');
      
      expect(simulator.isDeviceOnline()).toBe(true);
      
      simulator.goOffline();
      
      expect(simulator.isDeviceOnline()).toBe(false);
    });

    it('should not schedule random offline when probability is 0', async () => {
      const config = { ...mockConfig, offlineProbability: 0 };
      const testSimulator = new DeviceSimulator(config);
      
      await testSimulator.start();
      (testSimulator as any).client.emit('connect');
      
      // Check that no offline timer is set
      expect((testSimulator as any).offlineTimer).toBeUndefined();
      
      await testSimulator.stop();
    });
  });
});