import mqtt, { MqttClient } from 'mqtt';
import { EventEmitter } from 'events';

/**
 * Simulated device configuration
 */
export interface SimulatedDeviceConfig {
  deviceId: string;
  name: string;
  type: 'sensor' | 'switch' | 'dimmer' | 'thermostat' | 'camera' | 'lock';
  room: string;
  capabilities: string[];
  properties: Array<{
    key: string;
    type: 'number' | 'boolean' | 'string';
    unit?: string;
    min?: number;
    max?: number;
    options?: string[];
  }>;
  controls: Array<{
    key: string;
    type: 'switch' | 'slider' | 'input' | 'select';
    label: string;
    options?: string[];
    min?: number;
    max?: number;
  }>;
  updateInterval?: number; // milliseconds between property updates
  offlineProbability?: number; // 0-1 probability of going offline
}

/**
 * Device Simulator for testing MQTT integration
 * Simulates real IoT devices by publishing data and responding to commands
 */
export class DeviceSimulator extends EventEmitter {
  private client: MqttClient | null = null;
  private config: SimulatedDeviceConfig;
  private isOnline = false;
  private propertyValues: Map<string, any> = new Map();
  private updateTimer?: NodeJS.Timeout;
  private offlineTimer?: NodeJS.Timeout;

  constructor(
    config: SimulatedDeviceConfig,
    private brokerUrl: string = 'mqtt://localhost:1883'
  ) {
    super();
    this.config = config;
    this.initializePropertyValues();
  }

  /**
   * Start the device simulator
   */
  public async start(): Promise<void> {
    try {
      console.log(`Starting device simulator: ${this.config.name} (${this.config.deviceId})`);
      
      this.client = mqtt.connect(this.brokerUrl, {
        clientId: `simulator_${this.config.deviceId}`,
        clean: true,
      });

      this.client.on('connect', () => {
        console.log(`Device simulator connected: ${this.config.deviceId}`);
        this.isOnline = true;
        this.setupCommandSubscription();
        this.publishDiscovery();
        this.publishStatus('online');
        this.startPropertyUpdates();
        this.scheduleRandomOffline();
        this.emit('connected');
      });

      this.client.on('message', (topic, message) => {
        this.handleCommand(topic, message);
      });

      this.client.on('error', (error) => {
        console.error(`Device simulator error (${this.config.deviceId}):`, error);
        this.emit('error', error);
      });

      this.client.on('close', () => {
        console.log(`Device simulator disconnected: ${this.config.deviceId}`);
        this.isOnline = false;
        this.stopPropertyUpdates();
        this.emit('disconnected');
      });

    } catch (error) {
      console.error(`Failed to start device simulator (${this.config.deviceId}):`, error);
      throw error;
    }
  }

  /**
   * Stop the device simulator
   */
  public async stop(): Promise<void> {
    console.log(`Stopping device simulator: ${this.config.deviceId}`);
    
    this.stopPropertyUpdates();
    this.clearOfflineTimer();
    
    if (this.client) {
      this.publishStatus('offline');
      await new Promise<void>((resolve) => {
        this.client!.end(false, {}, () => {
          this.isOnline = false;
          resolve();
        });
      });
    }
  }

  /**
   * Check if simulator is online
   */
  public isDeviceOnline(): boolean {
    return this.isOnline && this.client?.connected === true;
  }

  /**
   * Manually trigger device to go offline
   */
  public goOffline(): void {
    if (this.isOnline) {
      console.log(`Device ${this.config.deviceId} going offline`);
      this.publishStatus('offline');
      this.stopPropertyUpdates();
      this.isOnline = false;
      
      // Reconnect after a random delay (5-30 seconds)
      const reconnectDelay = 5000 + Math.random() * 25000;
      setTimeout(() => {
        if (this.client) {
          console.log(`Device ${this.config.deviceId} coming back online`);
          this.isOnline = true;
          this.publishStatus('online');
          this.startPropertyUpdates();
        }
      }, reconnectDelay);
    }
  }

  // Private methods

  private initializePropertyValues(): void {
    this.config.properties.forEach(prop => {
      let initialValue: any;
      
      switch (prop.type) {
        case 'number':
          const min = prop.min ?? 0;
          const max = prop.max ?? 100;
          initialValue = min + Math.random() * (max - min);
          if (prop.key === 'temperature') {
            initialValue = Math.round(initialValue * 10) / 10; // 1 decimal place
          } else {
            initialValue = Math.round(initialValue);
          }
          break;
        case 'boolean':
          initialValue = Math.random() > 0.5;
          break;
        case 'string':
          if (prop.options && prop.options.length > 0) {
            initialValue = prop.options[Math.floor(Math.random() * prop.options.length)];
          } else {
            initialValue = 'default';
          }
          break;
        default:
          initialValue = null;
      }
      
      this.propertyValues.set(prop.key, initialValue);
    });

    // Initialize control values
    this.config.controls.forEach(control => {
      if (!this.propertyValues.has(control.key)) {
        let initialValue: any;
        
        switch (control.type) {
          case 'switch':
            initialValue = false;
            break;
          case 'slider':
            const min = control.min ?? 0;
            const max = control.max ?? 100;
            initialValue = min + Math.random() * (max - min);
            break;
          case 'select':
            if (control.options && control.options.length > 0) {
              initialValue = control.options[0];
            } else {
              initialValue = 'default';
            }
            break;
          default:
            initialValue = '';
        }
        
        this.propertyValues.set(control.key, initialValue);
      }
    });
  }

  private setupCommandSubscription(): void {
    if (!this.client) return;

    const commandTopic = `iot-dashboard/device/${this.config.deviceId}/command`;
    this.client.subscribe(commandTopic, { qos: 1 }, (error) => {
      if (error) {
        console.error(`Failed to subscribe to commands for ${this.config.deviceId}:`, error);
      } else {
        console.log(`Subscribed to commands: ${commandTopic}`);
      }
    });
  }

  private publishDiscovery(): void {
    if (!this.client) return;

    const discoveryTopic = `iot-dashboard/discovery/${this.config.deviceId}`;
    const discoveryMessage = {
      deviceId: this.config.deviceId,
      name: this.config.name,
      type: this.config.type,
      room: this.config.room,
      capabilities: this.config.capabilities,
      properties: this.config.properties,
      controls: this.config.controls,
    };

    this.client.publish(discoveryTopic, JSON.stringify(discoveryMessage), { qos: 1 }, (error) => {
      if (error) {
        console.error(`Failed to publish discovery for ${this.config.deviceId}:`, error);
      } else {
        console.log(`Published discovery for device: ${this.config.deviceId}`);
      }
    });
  }

  private publishStatus(status: 'online' | 'offline' | 'error'): void {
    if (!this.client) return;

    const statusTopic = `iot-dashboard/device/${this.config.deviceId}/status`;
    const statusMessage = {
      status,
      timestamp: Date.now(),
    };

    this.client.publish(statusTopic, JSON.stringify(statusMessage), { qos: 1 }, (error) => {
      if (error) {
        console.error(`Failed to publish status for ${this.config.deviceId}:`, error);
      } else {
        console.log(`Published status for ${this.config.deviceId}: ${status}`);
      }
    });
  }

  private publishProperty(key: string, value: any): void {
    if (!this.client || !this.isOnline) return;

    const propertyTopic = `iot-dashboard/device/${this.config.deviceId}/property/${key}`;
    const property = this.config.properties.find(p => p.key === key);
    
    const propertyMessage = {
      value,
      unit: property?.unit,
      timestamp: Date.now(),
    };

    this.client.publish(propertyTopic, JSON.stringify(propertyMessage), { qos: 1 }, (error) => {
      if (error) {
        console.error(`Failed to publish property ${key} for ${this.config.deviceId}:`, error);
      } else {
        console.log(`Published property for ${this.config.deviceId}: ${key} = ${value}${property?.unit || ''}`);
      }
    });
  }

  private startPropertyUpdates(): void {
    if (this.updateTimer) return;

    const interval = this.config.updateInterval || 10000; // Default 10 seconds
    
    this.updateTimer = setInterval(() => {
      if (this.isOnline) {
        this.updateProperties();
      }
    }, interval);
  }

  private stopPropertyUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
  }

  private updateProperties(): void {
    this.config.properties.forEach(prop => {
      const currentValue = this.propertyValues.get(prop.key);
      let newValue = currentValue;

      // Simulate realistic property changes
      switch (prop.type) {
        case 'number':
          if (prop.key === 'temperature') {
            // Temperature changes slowly and realistically
            const change = (Math.random() - 0.5) * 2; // -1 to +1 degree change
            newValue = Math.max(prop.min || 10, Math.min(prop.max || 35, currentValue + change));
            newValue = Math.round(newValue * 10) / 10;
          } else if (prop.key === 'humidity') {
            // Humidity changes slowly
            const change = (Math.random() - 0.5) * 5; // -2.5 to +2.5% change
            newValue = Math.max(prop.min || 0, Math.min(prop.max || 100, currentValue + change));
            newValue = Math.round(newValue);
          } else if (prop.key === 'battery') {
            // Battery slowly decreases
            if (Math.random() < 0.1) { // 10% chance to decrease
              newValue = Math.max(0, currentValue - 1);
            }
          } else {
            // Other numeric values have small random changes
            const change = (Math.random() - 0.5) * 10;
            newValue = Math.max(prop.min || 0, Math.min(prop.max || 100, currentValue + change));
            newValue = Math.round(newValue);
          }
          break;
        case 'boolean':
          // Boolean values change occasionally
          if (Math.random() < 0.1) { // 10% chance to flip
            newValue = !currentValue;
          }
          break;
        case 'string':
          // String values change rarely
          if (Math.random() < 0.05 && prop.options) { // 5% chance to change
            newValue = prop.options[Math.floor(Math.random() * prop.options.length)];
          }
          break;
      }

      if (newValue !== currentValue) {
        this.propertyValues.set(prop.key, newValue);
        this.publishProperty(prop.key, newValue);
      }
    });
  }

  private handleCommand(_topic: string, message: Buffer): void {
    try {
      const commandData = JSON.parse(message.toString());
      const { controlKey, value } = commandData;

      console.log(`Device ${this.config.deviceId} received command: ${controlKey} = ${value}`);

      // Validate command
      const control = this.config.controls.find(c => c.key === controlKey);
      if (!control) {
        console.error(`Unknown control key: ${controlKey}`);
        this.publishCommandResponse(controlKey, false, 'Unknown control key');
        return;
      }

      // Apply command
      this.propertyValues.set(controlKey, value);
      
      // Publish updated property
      this.publishProperty(controlKey, value);
      
      // Send command response
      this.publishCommandResponse(controlKey, true, 'Command executed successfully');

      // Simulate side effects for certain device types
      this.simulateCommandSideEffects(controlKey, value);

    } catch (error) {
      console.error(`Failed to handle command for ${this.config.deviceId}:`, error);
      this.publishCommandResponse('unknown', false, 'Failed to parse command');
    }
  }

  private publishCommandResponse(controlKey: string, success: boolean, message: string): void {
    if (!this.client) return;

    const responseTopic = `iot-dashboard/device/${this.config.deviceId}/command/response`;
    const responseMessage = {
      controlKey,
      success,
      message,
      timestamp: Date.now(),
    };

    this.client.publish(responseTopic, JSON.stringify(responseMessage), { qos: 1 }, (error) => {
      if (error) {
        console.error(`Failed to publish command response for ${this.config.deviceId}:`, error);
      } else {
        console.log(`Published command response for ${this.config.deviceId}: ${controlKey} - ${success ? 'success' : 'failed'}`);
      }
    });
  }

  private simulateCommandSideEffects(controlKey: string, value: any): void {
    // Simulate realistic device behavior
    switch (this.config.type) {
      case 'thermostat':
        if (controlKey === 'temperature') {
          // Thermostat gradually changes temperature
          const targetTemp = value;
          const currentTemp = this.propertyValues.get('currentTemperature') || 20;
          
          // Simulate gradual temperature change
          const tempChangeInterval = setInterval(() => {
            const current = this.propertyValues.get('currentTemperature') || currentTemp;
            const diff = targetTemp - current;
            
            if (Math.abs(diff) < 0.5) {
              clearInterval(tempChangeInterval);
              return;
            }
            
            const change = diff > 0 ? 0.5 : -0.5;
            const newTemp = Math.round((current + change) * 10) / 10;
            this.propertyValues.set('currentTemperature', newTemp);
            this.publishProperty('currentTemperature', newTemp);
          }, 2000);
        }
        break;
      
      case 'dimmer':
        if (controlKey === 'power' && !value) {
          // When dimmer is turned off, set brightness to 0
          this.propertyValues.set('brightness', 0);
          this.publishProperty('brightness', 0);
        }
        break;
    }
  }

  private scheduleRandomOffline(): void {
    if (!this.config.offlineProbability || this.config.offlineProbability <= 0) {
      return;
    }

    const checkInterval = 30000 + Math.random() * 60000; // 30-90 seconds
    
    this.offlineTimer = setTimeout(() => {
      if (Math.random() < this.config.offlineProbability!) {
        this.goOffline();
      }
      
      // Schedule next check
      this.scheduleRandomOffline();
    }, checkInterval);
  }

  private clearOfflineTimer(): void {
    if (this.offlineTimer) {
      clearTimeout(this.offlineTimer);
      this.offlineTimer = undefined;
    }
  }
}