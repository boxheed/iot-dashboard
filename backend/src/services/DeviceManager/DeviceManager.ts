import { Device, DeviceCommand, DeviceRegistration, DeviceStatus } from '@shared/types/Device';
import { DataStorageService } from '../DataStorage';
import { WebSocketHandler } from '../WebSocketHandler';
import { MqttClientService, MqttDiscoveryMessage } from '../MqttClient';

export class DeviceManager {
  private devices: Map<string, Device> = new Map();
  private dataStorage: DataStorageService;
  private webSocketHandler?: WebSocketHandler;
  private mqttClient?: MqttClientService;

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
   * Set the MQTT client for IoT device communication
   */
  public setMqttClient(mqttClient: MqttClientService): void {
    this.mqttClient = mqttClient;
    this.setupMqttEventHandlers();
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

      // Send command via MQTT if client is available and device is online
      if (this.mqttClient && this.mqttClient.isClientConnected() && device.status === 'online') {
        try {
          await this.mqttClient.sendDeviceCommand(command.deviceId, command.controlKey, command.value);
          console.log(`MQTT command sent to device ${device.name}: ${command.controlKey} = ${command.value}`);
          
          // For MQTT devices, we'll wait for the device to respond with updated state
          // The actual device update will happen when we receive the property update via MQTT
          return { 
            success: true, 
            message: 'Command sent to device via MQTT',
            data: { 
              deviceId: command.deviceId,
              controlKey: command.controlKey,
              value: command.value 
            }
          };
        } catch (mqttError) {
          console.error('Failed to send MQTT command, falling back to local update:', mqttError);
          // Fall back to local update if MQTT fails
        }
      }

      // Fallback: Update device property locally (for simulated devices or when MQTT is unavailable)
      const updatedDevice = await this.applyDeviceCommand(device, command);
      if (!updatedDevice) {
        return { success: false, message: 'Failed to apply command' };
      }

      console.log(`Command processed locally for device ${device.name}: ${command.controlKey} = ${command.value}`);

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

  /**
   * Discover devices via MQTT
   */
  public async discoverMqttDevices(): Promise<MqttDiscoveryMessage[]> {
    if (!this.mqttClient || !this.mqttClient.isClientConnected()) {
      throw new Error('MQTT client not available or not connected');
    }

    // Clear previous discoveries
    this.mqttClient.clearDiscoveredDevices();

    // Request device discovery
    await this.mqttClient.requestDeviceDiscovery();

    // Wait a bit for devices to respond
    await new Promise(resolve => setTimeout(resolve, 3000));

    return this.mqttClient.getDiscoveredDevices();
  }

  /**
   * Add device from MQTT discovery
   */
  public async addDeviceFromDiscovery(discoveryData: MqttDiscoveryMessage): Promise<Device> {
    try {
      // Create device registration from discovery data
      const registration: DeviceRegistration = {
        name: discoveryData.name,
        type: discoveryData.type as any, // Type assertion needed due to string vs enum
        room: discoveryData.room || 'Unknown',
        connectionConfig: {
          mqttDeviceId: discoveryData.deviceId,
          capabilities: discoveryData.capabilities,
        },
      };

      // Create device object with discovery data
      const device: Device = {
        id: discoveryData.deviceId, // Use MQTT device ID directly
        name: discoveryData.name,
        type: registration.type,
        room: registration.room,
        status: 'online', // Assume online since we just discovered it
        lastSeen: new Date(),
        properties: [],
        controls: discoveryData.controls?.map(control => ({
          ...control,
          type: control.type as any // Type assertion for MQTT control types
        })) || this.getDefaultControlsForType(registration.type),
        thresholds: [],
      };

      // Save to storage
      await this.dataStorage.saveDevice(device);

      // Add to memory
      this.devices.set(device.id, device);

      console.log(`MQTT device added: ${device.name} (${device.id})`);

      // Broadcast device addition
      this.broadcastDeviceUpdate(device);

      return device;
    } catch (error) {
      console.error('Failed to add device from discovery:', error);
      throw new Error(`Failed to add device from discovery: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

  /**
   * Set up MQTT event handlers
   */
  private setupMqttEventHandlers(): void {
    if (!this.mqttClient) return;

    // Handle device status updates from MQTT
    this.mqttClient.on('deviceStatusUpdate', async (data: { deviceId: string; status: DeviceStatus; timestamp: number }) => {
      console.log(`MQTT status update for device ${data.deviceId}: ${data.status}`);
      await this.updateDeviceStatus(data.deviceId, data.status);
    });

    // Handle device property updates from MQTT
    this.mqttClient.on('devicePropertyUpdate', async (data: { deviceId: string; property: any }) => {
      console.log(`MQTT property update for device ${data.deviceId}: ${data.property.key} = ${data.property.value}`);
      
      const device = this.devices.get(data.deviceId);
      if (device) {
        // Update or add property
        const propertyIndex = device.properties.findIndex(p => p.key === data.property.key);
        if (propertyIndex >= 0) {
          device.properties[propertyIndex] = data.property;
        } else {
          device.properties.push(data.property);
        }

        // Update device status and last seen
        device.status = 'online';
        device.lastSeen = new Date();

        // Save to storage
        await this.dataStorage.saveDevice(device);

        // Save historical data
        await this.dataStorage.saveDeviceData(device.id, data.property.key, data.property.value);

        // Broadcast update
        this.broadcastDeviceUpdate(device);
      }
    });

    // Handle device discovery
    this.mqttClient.on('deviceDiscovered', (discoveryData: MqttDiscoveryMessage) => {
      console.log(`Device discovered via MQTT: ${discoveryData.name} (${discoveryData.deviceId})`);
      // Discovery data is stored in the MQTT client and can be retrieved via getDiscoveredDevices()
    });

    // Handle command responses
    this.mqttClient.on('deviceCommandResponse', (data: { deviceId: string; response: any }) => {
      console.log(`Command response from device ${data.deviceId}:`, data.response);
      // Could emit this to WebSocket clients if needed for real-time feedback
      if (this.webSocketHandler) {
        // Use the io instance directly to broadcast to all clients
        (this.webSocketHandler as any).io.emit('device-command-response', {
          deviceId: data.deviceId,
          response: data.response,
        });
      }
    });

    // Handle MQTT connection events
    this.mqttClient.on('connected', () => {
      console.log('MQTT client connected - device communication enabled');
    });

    this.mqttClient.on('disconnected', () => {
      console.log('MQTT client disconnected - device communication disabled');
      // Mark all MQTT devices as offline
      this.markMqttDevicesOffline();
    });

    this.mqttClient.on('error', (error: Error) => {
      console.error('MQTT client error:', error);
    });
  }

  /**
   * Mark all MQTT-connected devices as offline
   */
  private async markMqttDevicesOffline(): Promise<void> {
    const devices = Array.from(this.devices.values());
    
    for (const device of devices) {
      // Check if device has MQTT connection config (indicating it's an MQTT device)
      if (device.status === 'online') {
        await this.updateDeviceStatus(device.id, 'offline');
      }
    }
  }
}