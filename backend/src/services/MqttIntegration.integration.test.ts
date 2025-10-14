import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { MqttClientService } from './MqttClient';
import { DeviceManager } from './DeviceManager';
import { DataStorageService } from './DataStorage';
import { DeviceSimulator, SimulatorManager } from '../simulators';
import { Database } from '../utils/database';
import { EventEmitter } from 'events';

// Mock the mqtt module for controlled testing
vi.mock('mqtt', () => ({
  default: {
    connect: vi.fn(() => {
      const mockClient = new EventEmitter();
      (mockClient as any).connected = true;
      (mockClient as any).subscribe = vi.fn((_topic: string, _options: any, callback?: (error: Error | null) => void) => {
        if (callback) callback(null);
      });
      (mockClient as any).publish = vi.fn((topic: string, message: string, _options: any, callback?: (error: Error | null) => void) => {
        if (callback) callback(null);
        // Simulate message delivery by emitting it back
        setTimeout(() => {
          mockClient.emit('message', topic, Buffer.from(message));
        }, 10);
      });
      (mockClient as any).end = vi.fn((_force: boolean, _options: any, callback?: () => void) => {
        if (callback) callback();
      });
      return mockClient;
    }),
  },
}));

describe('MQTT Integration Tests', () => {
  let mqttClient: MqttClientService;
  let deviceManager: DeviceManager;
  let dataStorage: DataStorageService;
  let database: Database;
  let simulator: DeviceSimulator | undefined;
  let simulatorManager: SimulatorManager;

  beforeAll(async () => {
    // Set up test database
    database = new Database({ filename: ':memory:' });
    await database.connect();
    
    // Create tables manually for testing
    await database.run(`
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        room TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'offline',
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        properties TEXT,
        controls TEXT,
        thresholds TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await database.run(`
      CREATE TABLE IF NOT EXISTS historical_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        property TEXT NOT NULL,
        value TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await database.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        device_id TEXT,
        priority TEXT NOT NULL DEFAULT 'medium',
        is_read BOOLEAN NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    dataStorage = new DataStorageService(database);
    deviceManager = new DeviceManager(dataStorage);
    
    // Initialize device manager
    await deviceManager.initialize();
  });

  afterAll(async () => {
    if (database) {
      await database.close();
    }
  });

  beforeEach(async () => {
    // Create fresh MQTT client for each test
    mqttClient = new MqttClientService('mqtt://localhost:1883');
    deviceManager.setMqttClient(mqttClient);
    
    // Create simulator manager
    simulatorManager = new SimulatorManager('mqtt://localhost:1883');
  });

  afterEach(async () => {
    // Clean up
    if (simulator) {
      await simulator.stop();
      simulator = undefined;
    }
    if (simulatorManager) {
      await simulatorManager.stopAll();
    }
    if (mqttClient) {
      await mqttClient.disconnect();
    }
  });

  describe('MQTT Client Connection', () => {
    it('should connect to MQTT broker successfully', async () => {
      const connectPromise = new Promise<void>((resolve) => {
        mqttClient.on('connected', resolve);
      });

      await mqttClient.connect();
      
      // Simulate connection
      (mqttClient as any).client.emit('connect');
      
      await connectPromise;
      
      expect(mqttClient.isClientConnected()).toBe(true);
    });

    it('should handle connection errors gracefully', async () => {
      const errorPromise = new Promise<Error>((resolve) => {
        mqttClient.on('error', resolve);
      });

      await mqttClient.connect();
      
      const testError = new Error('Connection failed');
      (mqttClient as any).client.emit('error', testError);
      
      const receivedError = await errorPromise;
      expect(receivedError).toBe(testError);
    });

    it('should reconnect after disconnection', async () => {
      await mqttClient.connect();
      (mqttClient as any).client.emit('connect');
      
      expect(mqttClient.isClientConnected()).toBe(true);
      
      // Simulate disconnection
      (mqttClient as any).client.emit('close');
      
      expect(mqttClient.isClientConnected()).toBe(false);
    });
  });

  describe('Device Discovery', () => {
    it('should discover devices via MQTT', async () => {
      await mqttClient.connect();
      (mqttClient as any).client.emit('connect');

      // Manually simulate a device discovery response
      const discoveryData = {
        deviceId: 'test_sensor_001',
        name: 'Test Temperature Sensor',
        type: 'sensor',
        room: 'Test Room',
        capabilities: ['temperature'],
        properties: [
          { key: 'temperature', type: 'number', unit: '°C', min: 18, max: 28 }
        ],
        controls: []
      };

      // Simulate discovery message being received
      setTimeout(() => {
        (mqttClient as any).client.emit('message',
          'iot-dashboard/discovery/test_sensor_001',
          Buffer.from(JSON.stringify(discoveryData))
        );
      }, 100);

      // Wait for discovery
      const discoveredDevices = await deviceManager.discoverMqttDevices();
      
      expect(discoveredDevices).toHaveLength(1);
      expect(discoveredDevices[0].deviceId).toBe('test_sensor_001');
      expect(discoveredDevices[0].name).toBe('Test Temperature Sensor');
      expect(discoveredDevices[0].type).toBe('sensor');
    });

    it('should add discovered device to device manager', async () => {
      await mqttClient.connect();
      (mqttClient as any).client.emit('connect');

      const discoveryData = {
        deviceId: 'discovered_device_001',
        name: 'Discovered Device',
        type: 'switch',
        room: 'Living Room',
        capabilities: ['power'],
        properties: [{ key: 'power', type: 'boolean' }],
        controls: [{ key: 'power', type: 'switch', label: 'Power' }]
      };

      const device = await deviceManager.addDeviceFromDiscovery(discoveryData);
      
      expect(device.id).toBe('discovered_device_001');
      expect(device.name).toBe('Discovered Device');
      expect(device.type).toBe('switch');
      expect(device.room).toBe('Living Room');
      
      // Verify device is in manager
      const retrievedDevice = deviceManager.getDevice('discovered_device_001');
      expect(retrievedDevice).toBeDefined();
      expect(retrievedDevice?.name).toBe('Discovered Device');
    });
  });

  describe('Device Communication', () => {
    beforeEach(async () => {
      await mqttClient.connect();
      (mqttClient as any).client.emit('connect');
    });

    it('should send commands to devices via MQTT', async () => {
      const publishSpy = vi.spyOn((mqttClient as any).client, 'publish');
      
      await mqttClient.sendDeviceCommand('test_device_001', 'power', true);
      
      expect(publishSpy).toHaveBeenCalledWith(
        'iot-dashboard/device/test_device_001/command',
        expect.stringContaining('"controlKey":"power"'),
        { qos: 1 },
        expect.any(Function)
      );
    });

    it('should receive device status updates', async () => {
      const statusUpdatePromise = new Promise<any>((resolve) => {
        mqttClient.on('deviceStatusUpdate', resolve);
      });

      // Simulate status message from device
      const statusMessage = { status: 'online', timestamp: Date.now() };
      (mqttClient as any).client.emit('message', 
        'iot-dashboard/device/test_device_001/status',
        Buffer.from(JSON.stringify(statusMessage))
      );

      const statusUpdate = await statusUpdatePromise;
      
      expect(statusUpdate.deviceId).toBe('test_device_001');
      expect(statusUpdate.status).toBe('online');
    });

    it('should receive device property updates', async () => {
      const propertyUpdatePromise = new Promise<any>((resolve) => {
        mqttClient.on('devicePropertyUpdate', resolve);
      });

      // Simulate property message from device
      const propertyMessage = { value: 23.5, unit: '°C', timestamp: Date.now() };
      (mqttClient as any).client.emit('message',
        'iot-dashboard/device/sensor_001/property/temperature',
        Buffer.from(JSON.stringify(propertyMessage))
      );

      const propertyUpdate = await propertyUpdatePromise;
      
      expect(propertyUpdate.deviceId).toBe('sensor_001');
      expect(propertyUpdate.property.key).toBe('temperature');
      expect(propertyUpdate.property.value).toBe(23.5);
      expect(propertyUpdate.property.unit).toBe('°C');
    });

    it('should handle command responses from devices', async () => {
      const commandResponsePromise = new Promise<any>((resolve) => {
        mqttClient.on('deviceCommandResponse', resolve);
      });

      // Simulate command response from device
      const responseMessage = {
        controlKey: 'power',
        success: true,
        message: 'Command executed successfully',
        timestamp: Date.now()
      };
      
      (mqttClient as any).client.emit('message',
        'iot-dashboard/device/switch_001/command/response',
        Buffer.from(JSON.stringify(responseMessage))
      );

      const commandResponse = await commandResponsePromise;
      
      expect(commandResponse.deviceId).toBe('switch_001');
      expect(commandResponse.response.success).toBe(true);
      expect(commandResponse.response.controlKey).toBe('power');
    });
  });

  describe('End-to-End Device Control', () => {
    it('should complete full device control workflow', async () => {
      // Set up MQTT client and device manager
      await mqttClient.connect();
      (mqttClient as any).client.emit('connect');

      // Add a device to the manager
      const deviceRegistration = {
        name: 'Test Switch',
        type: 'switch' as const,
        room: 'Test Room',
        connectionConfig: { mqttDeviceId: 'test_switch_001' }
      };

      const device = await deviceManager.addDevice(deviceRegistration);
      expect(device).toBeDefined();

      // Process a command
      const command = {
        deviceId: device.id,
        controlKey: 'power',
        value: true,
        timestamp: new Date()
      };

      const result = await deviceManager.processDeviceCommand(command);
      
      expect(result.success).toBe(true);
      expect(result.data?.controlKey).toBe('power');
      expect(result.data?.value).toBe(true);
    });

    it('should update device state from MQTT property updates', async () => {
      await mqttClient.connect();
      (mqttClient as any).client.emit('connect');

      // Add a device
      const device = await deviceManager.addDevice({
        name: 'Test Sensor',
        type: 'sensor',
        room: 'Test Room',
        connectionConfig: { mqttDeviceId: 'test_sensor_001' }
      });

      // Simulate property update from MQTT
      const propertyMessage = { value: 25.0, unit: '°C', timestamp: Date.now() };
      (mqttClient as any).client.emit('message',
        `iot-dashboard/device/${device.id}/property/temperature`,
        Buffer.from(JSON.stringify(propertyMessage))
      );

      // Wait for update to be processed
      await new Promise(resolve => setTimeout(resolve, 50));

      // Check that device was updated
      const updatedDevice = deviceManager.getDevice(device.id);
      expect(updatedDevice).toBeDefined();
      
      const tempProperty = updatedDevice?.properties.find(p => p.key === 'temperature');
      expect(tempProperty).toBeDefined();
      expect(tempProperty?.value).toBe(25.0);
      expect(tempProperty?.unit).toBe('°C');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await mqttClient.connect();
      (mqttClient as any).client.emit('connect');
    });

    it('should handle malformed MQTT messages gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Send malformed message
      (mqttClient as any).client.emit('message',
        'iot-dashboard/device/test_device/status',
        Buffer.from('invalid json')
      );

      // Should not throw, just log error
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse status message'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle device command failures', async () => {
      // Try to send command when MQTT is disconnected
      await mqttClient.disconnect();
      
      await expect(
        mqttClient.sendDeviceCommand('test_device', 'power', true)
      ).rejects.toThrow('MQTT client not connected');
    });

    it('should handle device manager errors for unknown devices', async () => {
      const command = {
        deviceId: 'nonexistent_device',
        controlKey: 'power',
        value: true,
        timestamp: new Date()
      };

      const result = await deviceManager.processDeviceCommand(command);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Device not found');
    });
  });

  describe('Simulator Integration', () => {
    it('should work with device simulators', async () => {
      await mqttClient.connect();
      (mqttClient as any).client.emit('connect');

      // Create and start simulator
      simulatorManager.createDefaultTestDevices();
      await simulatorManager.startAll();

      // Simulate all devices connecting
      const statuses = simulatorManager.getAllSimulatorStatuses();
      statuses.forEach(status => {
        const mockClient = (simulatorManager as any).simulators.get(status.deviceId)?.client;
        if (mockClient) {
          mockClient.emit('connect');
        }
      });

      expect(simulatorManager.getSimulatorCount()).toBeGreaterThan(0);
      
      // Check that simulators are "online"
      const onlineCount = statuses.filter(s => s.online).length;
      expect(onlineCount).toBe(0); // They start offline until connect event
    });

    it('should handle simulator device discovery', async () => {
      await mqttClient.connect();
      (mqttClient as any).client.emit('connect');

      // Add a single test device
      const deviceConfig = {
        deviceId: 'sim_temp_001',
        name: 'Simulated Temperature Sensor',
        type: 'sensor' as const,
        room: 'Simulation Room',
        capabilities: ['temperature'],
        properties: [
          { key: 'temperature', type: 'number' as const, unit: '°C', min: 18, max: 28 }
        ],
        controls: []
      };

      simulatorManager.addSimulator(deviceConfig);
      await simulatorManager.startSimulator('sim_temp_001');
      
      // Simulate connection
      const mockClient = (simulatorManager as any).simulators.get('sim_temp_001')?.client;
      if (mockClient) {
        mockClient.emit('connect');
      }

      expect(simulatorManager.getSimulatorStatus('sim_temp_001').exists).toBe(true);
    });
  });
});