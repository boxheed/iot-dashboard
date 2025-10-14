import { DeviceSimulator, SimulatedDeviceConfig } from './DeviceSimulator';

/**
 * Manages multiple device simulators for testing
 */
export class SimulatorManager {
  private simulators: Map<string, DeviceSimulator> = new Map();
  private isRunning = false;

  constructor(private brokerUrl: string = 'mqtt://localhost:1883') {}

  /**
   * Add a device simulator
   */
  public addSimulator(config: SimulatedDeviceConfig): void {
    if (this.simulators.has(config.deviceId)) {
      throw new Error(`Simulator with ID ${config.deviceId} already exists`);
    }

    const simulator = new DeviceSimulator(config, this.brokerUrl);
    this.simulators.set(config.deviceId, simulator);
    
    console.log(`Added simulator: ${config.name} (${config.deviceId})`);
  }

  /**
   * Remove a device simulator
   */
  public async removeSimulator(deviceId: string): Promise<boolean> {
    const simulator = this.simulators.get(deviceId);
    if (!simulator) {
      return false;
    }

    await simulator.stop();
    this.simulators.delete(deviceId);
    
    console.log(`Removed simulator: ${deviceId}`);
    return true;
  }

  /**
   * Start all simulators
   */
  public async startAll(): Promise<void> {
    console.log(`Starting ${this.simulators.size} device simulators...`);
    
    const startPromises = Array.from(this.simulators.values()).map(simulator => 
      simulator.start().catch(error => {
        console.error('Failed to start simulator:', error);
      })
    );

    await Promise.all(startPromises);
    this.isRunning = true;
    
    console.log('All simulators started');
  }

  /**
   * Stop all simulators
   */
  public async stopAll(): Promise<void> {
    console.log('Stopping all device simulators...');
    
    const stopPromises = Array.from(this.simulators.values()).map(simulator => 
      simulator.stop().catch(error => {
        console.error('Failed to stop simulator:', error);
      })
    );

    await Promise.all(stopPromises);
    this.isRunning = false;
    
    console.log('All simulators stopped');
  }

  /**
   * Start a specific simulator
   */
  public async startSimulator(deviceId: string): Promise<boolean> {
    const simulator = this.simulators.get(deviceId);
    if (!simulator) {
      return false;
    }

    await simulator.start();
    console.log(`Started simulator: ${deviceId}`);
    return true;
  }

  /**
   * Stop a specific simulator
   */
  public async stopSimulator(deviceId: string): Promise<boolean> {
    const simulator = this.simulators.get(deviceId);
    if (!simulator) {
      return false;
    }

    await simulator.stop();
    console.log(`Stopped simulator: ${deviceId}`);
    return true;
  }

  /**
   * Get simulator status
   */
  public getSimulatorStatus(deviceId: string): { exists: boolean; online: boolean } {
    const simulator = this.simulators.get(deviceId);
    return {
      exists: !!simulator,
      online: simulator?.isDeviceOnline() || false,
    };
  }

  /**
   * Get all simulator statuses
   */
  public getAllSimulatorStatuses(): Array<{ deviceId: string; online: boolean }> {
    return Array.from(this.simulators.entries()).map(([deviceId, simulator]) => ({
      deviceId,
      online: simulator.isDeviceOnline(),
    }));
  }

  /**
   * Check if manager is running
   */
  public isManagerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get number of simulators
   */
  public getSimulatorCount(): number {
    return this.simulators.size;
  }

  /**
   * Create default test devices
   */
  public createDefaultTestDevices(): void {
    const defaultDevices: SimulatedDeviceConfig[] = [
      {
        deviceId: 'temp_sensor_001',
        name: 'Living Room Temperature Sensor',
        type: 'sensor',
        room: 'Living Room',
        capabilities: ['temperature', 'humidity'],
        properties: [
          { key: 'temperature', type: 'number', unit: '°C', min: 18, max: 28 },
          { key: 'humidity', type: 'number', unit: '%', min: 30, max: 70 },
          { key: 'battery', type: 'number', unit: '%', min: 0, max: 100 }
        ],
        controls: [],
        updateInterval: 15000, // 15 seconds
        offlineProbability: 0.02 // 2% chance to go offline
      },
      {
        deviceId: 'smart_switch_001',
        name: 'Kitchen Light Switch',
        type: 'switch',
        room: 'Kitchen',
        capabilities: ['power'],
        properties: [
          { key: 'power', type: 'boolean' }
        ],
        controls: [
          { key: 'power', type: 'switch', label: 'Power' }
        ],
        updateInterval: 30000, // 30 seconds
        offlineProbability: 0.01 // 1% chance to go offline
      },
      {
        deviceId: 'dimmer_001',
        name: 'Bedroom Dimmer',
        type: 'dimmer',
        room: 'Bedroom',
        capabilities: ['power', 'brightness'],
        properties: [
          { key: 'power', type: 'boolean' },
          { key: 'brightness', type: 'number', unit: '%', min: 0, max: 100 }
        ],
        controls: [
          { key: 'power', type: 'switch', label: 'Power' },
          { key: 'brightness', type: 'slider', label: 'Brightness', min: 0, max: 100 }
        ],
        updateInterval: 20000, // 20 seconds
        offlineProbability: 0.015 // 1.5% chance to go offline
      },
      {
        deviceId: 'thermostat_001',
        name: 'Main Thermostat',
        type: 'thermostat',
        room: 'Hallway',
        capabilities: ['temperature', 'mode'],
        properties: [
          { key: 'currentTemperature', type: 'number', unit: '°C', min: 15, max: 30 },
          { key: 'targetTemperature', type: 'number', unit: '°C', min: 10, max: 30 },
          { key: 'mode', type: 'string', options: ['off', 'heat', 'cool', 'auto'] }
        ],
        controls: [
          { key: 'targetTemperature', type: 'slider', label: 'Target Temperature', min: 10, max: 30 },
          { key: 'mode', type: 'select', label: 'Mode', options: ['off', 'heat', 'cool', 'auto'] }
        ],
        updateInterval: 25000, // 25 seconds
        offlineProbability: 0.005 // 0.5% chance to go offline
      },
      {
        deviceId: 'door_lock_001',
        name: 'Front Door Lock',
        type: 'lock',
        room: 'Entrance',
        capabilities: ['locked', 'battery'],
        properties: [
          { key: 'locked', type: 'boolean' },
          { key: 'battery', type: 'number', unit: '%', min: 0, max: 100 }
        ],
        controls: [
          { key: 'locked', type: 'switch', label: 'Locked' }
        ],
        updateInterval: 60000, // 60 seconds
        offlineProbability: 0.01 // 1% chance to go offline
      },
      {
        deviceId: 'motion_sensor_001',
        name: 'Hallway Motion Sensor',
        type: 'sensor',
        room: 'Hallway',
        capabilities: ['motion', 'battery'],
        properties: [
          { key: 'motion', type: 'boolean' },
          { key: 'battery', type: 'number', unit: '%', min: 0, max: 100 }
        ],
        controls: [],
        updateInterval: 10000, // 10 seconds
        offlineProbability: 0.02 // 2% chance to go offline
      }
    ];

    defaultDevices.forEach(device => {
      try {
        this.addSimulator(device);
      } catch (error) {
        console.error(`Failed to add default device ${device.deviceId}:`, error);
      }
    });

    console.log(`Created ${defaultDevices.length} default test devices`);
  }
}