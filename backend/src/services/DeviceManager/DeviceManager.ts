import { Device, DeviceCommand, DeviceRegistration, DeviceStatus } from '@shared/types/Device';
import { DataStorageService } from '../DataStorage';
import { WebSocketHandler } from '../WebSocketHandler';

export class DeviceManager {
  private devices: Map<string, Device> = new Map();
  private dataStorage: DataStorageService;
  private webSocketHandler?: WebSocketHandler;

  constructor(dataStorage: DataStorageService) {
    this.dataStorage = dataStorage;
  }

  /**
   * Set the WebSocket handler for real-time updates
   */
  public setWebSocketHandler(webSocketHandler: WebSocketHandler): void {
    this.webSocketHandler = webSocketHandler;
  }

  /**
   * Initialize the device manager by loading existing devices
   */
  public async initialize(): Promise<void> {
    try {
      const savedDevices = await this.dataStorage.getAllDevices();
      savedDevices.forEach(device => {
        this.devices.set(device.id, device);
      });
      console.log(`Loaded ${savedDevices.length} devices from storage`);
    } catch (error) {
      console.error('Failed to initialize device manager:', error);
      throw error;
    }
  }

  /**
   * Get all registered devices
   */
  public getAllDevices(): Device[] {
    return Array.from(this.devices.values());
  }

  /**
   * Get a specific device by ID
   */
  public getDevice(deviceId: string): Device | undefined {
    return this.devices.get(deviceId);
  }

  /**
   * Register a new device
   */
  public async addDevice(registration: DeviceRegistration): Promise<Device> {
    try {
      // Generate unique device ID
      const deviceId = this.generateDeviceId();

      // Create device object
      const device: Device = {
        id: deviceId,
        name: registration.name,
        type: registration.type,
        room: registration.room,
        status: 'offline',
        lastSeen: new Date(),
        properties: [],
        controls: this.getDefaultControlsForType(registration.type),
        thresholds: [],
      };

      // Save to storage
      await this.dataStorage.saveDevice(device);

      // Add to memory
      this.devices.set(deviceId, device);

      console.log(`Device added: ${device.name} (${deviceId})`);

      // Broadcast device addition
      this.broadcastDeviceUpdate(device);

      return device;
    } catch (error) {
      console.error('Failed to add device:', error);
      throw new Error(`Failed to add device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove a device
   */
  public async removeDevice(deviceId: string): Promise<boolean> {
    try {
      const device = this.devices.get(deviceId);
      if (!device) {
        return false;
      }

      // Remove from storage
      await this.dataStorage.deleteDevice(deviceId);

      // Remove from memory
      this.devices.delete(deviceId);

      console.log(`Device removed: ${device.name} (${deviceId})`);

      // Broadcast device removal
      if (this.webSocketHandler) {
        this.webSocketHandler.broadcastDeviceStatus(deviceId, 'offline');
      }

      return true;
    } catch (error) {
      console.error('Failed to remove device:', error);
      throw new Error(`Failed to remove device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update device information
   */
  public async updateDevice(deviceId: string, updates: Partial<Device>): Promise<Device | null> {
    try {
      const device = this.devices.get(deviceId);
      if (!device) {
        return null;
      }

      // Apply updates
      const updatedDevice: Device = {
        ...device,
        ...updates,
        id: deviceId, // Ensure ID cannot be changed
        lastSeen: new Date(),
      };

      // Save to storage
      await this.dataStorage.saveDevice(updatedDevice);

      // Update in memory
      this.devices.set(deviceId, updatedDevice);

      console.log(`Device updated: ${updatedDevice.name} (${deviceId})`);

      // Broadcast device update
      this.broadcastDeviceUpdate(updatedDevice);

      return updatedDevice;
    } catch (error) {
      console.error('Failed to update device:', error);
      throw new Error(`Failed to update device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a device command
   */
  public async processDeviceCommand(command: DeviceCommand): Promise<{ success: boolean; message?: string; data?: any }> {
    try {
      const device = this.devices.get(command.deviceId);
      if (!device) {
        return { success: false, message: 'Device not found' };
      }

      // Validate command
      const validationResult = this.validateDeviceCommand(device, command);
      if (!validationResult.valid) {
        return { success: false, message: validationResult.message };
      }

      // Update device property based on command
      const updatedDevice = await this.applyDeviceCommand(device, command);
      if (!updatedDevice) {
        return { success: false, message: 'Failed to apply command' };
      }

      console.log(`Command processed for device ${device.name}: ${command.controlKey} = ${command.value}`);

      return { 
        success: true, 
        message: 'Command executed successfully',
        data: { 
          deviceId: command.deviceId,
          controlKey: command.controlKey,
          value: command.value 
        }
      };
    } catch (error) {
      console.error('Failed to process device command:', error);
      return { 
        success: false, 
        message: `Command failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Update device status (online/offline/error)
   */
  public async updateDeviceStatus(deviceId: string, status: DeviceStatus): Promise<void> {
    const device = this.devices.get(deviceId);
    if (device) {
      device.status = status;
      device.lastSeen = new Date();

      // Save to storage
      await this.dataStorage.saveDevice(device);

      // Broadcast status change
      if (this.webSocketHandler) {
        this.webSocketHandler.broadcastDeviceStatus(deviceId, status);
      }

      console.log(`Device status updated: ${device.name} is now ${status}`);
    }
  }

  /**
   * Get devices by room
   */
  public getDevicesByRoom(room: string): Device[] {
    return Array.from(this.devices.values()).filter(device => device.room === room);
  }

  /**
   * Get devices by type
   */
  public getDevicesByType(type: string): Device[] {
    return Array.from(this.devices.values()).filter(device => device.type === type);
  }

  /**
   * Get online devices
   */
  public getOnlineDevices(): Device[] {
    return Array.from(this.devices.values()).filter(device => device.status === 'online');
  }

  // Private helper methods

  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultControlsForType(type: string) {
    switch (type) {
      case 'switch':
        return [
          { key: 'power', type: 'switch' as const, label: 'Power' }
        ];
      case 'dimmer':
        return [
          { key: 'power', type: 'switch' as const, label: 'Power' },
          { key: 'brightness', type: 'slider' as const, label: 'Brightness', min: 0, max: 100 }
        ];
      case 'thermostat':
        return [
          { key: 'temperature', type: 'slider' as const, label: 'Target Temperature', min: 10, max: 30 },
          { key: 'mode', type: 'select' as const, label: 'Mode', options: ['off', 'heat', 'cool', 'auto'] }
        ];
      case 'lock':
        return [
          { key: 'locked', type: 'switch' as const, label: 'Locked' }
        ];
      default:
        return [];
    }
  }

  private validateDeviceCommand(device: Device, command: DeviceCommand): { valid: boolean; message?: string } {
    // Check if control exists
    const control = device.controls.find(c => c.key === command.controlKey);
    if (!control) {
      return { valid: false, message: `Control '${command.controlKey}' not found on device` };
    }

    // Validate value based on control type
    switch (control.type) {
      case 'switch':
        if (typeof command.value !== 'boolean') {
          return { valid: false, message: 'Switch control requires boolean value' };
        }
        break;
      case 'slider':
        if (typeof command.value !== 'number') {
          return { valid: false, message: 'Slider control requires numeric value' };
        }
        if (control.min !== undefined && command.value < control.min) {
          return { valid: false, message: `Value below minimum (${control.min})` };
        }
        if (control.max !== undefined && command.value > control.max) {
          return { valid: false, message: `Value above maximum (${control.max})` };
        }
        break;
      case 'select':
        if (control.options && !control.options.includes(command.value)) {
          return { valid: false, message: `Invalid option. Must be one of: ${control.options.join(', ')}` };
        }
        break;
    }

    return { valid: true };
  }

  private async applyDeviceCommand(device: Device, command: DeviceCommand): Promise<Device | null> {
    try {
      // Update or add property
      const propertyIndex = device.properties.findIndex(p => p.key === command.controlKey);
      const newProperty = {
        key: command.controlKey,
        value: command.value,
        timestamp: new Date(),
      };

      if (propertyIndex >= 0) {
        device.properties[propertyIndex] = newProperty;
      } else {
        device.properties.push(newProperty);
      }

      // Update device status and last seen
      device.status = 'online';
      device.lastSeen = new Date();

      // Save to storage
      await this.dataStorage.saveDevice(device);

      // Save historical data
      await this.dataStorage.saveDeviceData(device.id, command.controlKey, command.value);

      // Broadcast update
      this.broadcastDeviceUpdate(device);

      return device;
    } catch (error) {
      console.error('Failed to apply device command:', error);
      return null;
    }
  }

  private broadcastDeviceUpdate(device: Device): void {
    if (this.webSocketHandler) {
      this.webSocketHandler.broadcastDeviceUpdate(device);
    }
  }
}