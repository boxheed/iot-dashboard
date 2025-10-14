import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { DeviceProperty, DeviceStatus } from '@shared/types/Device';
import { EventEmitter } from 'events';

/**
 * MQTT message structure for device communication
 */
export interface MqttDeviceMessage {
  deviceId: string;
  type: 'status' | 'property' | 'command_response' | 'discovery';
  data: any;
  timestamp: number;
}

/**
 * MQTT device discovery message
 */
export interface MqttDiscoveryMessage {
  deviceId: string;
  name: string;
  type: string;
  room?: string;
  capabilities: string[];
  properties: Array<{
    key: string;
    type: string;
    unit?: string;
  }>;
  controls: Array<{
    key: string;
    type: string;
    label: string;
    options?: string[];
    min?: number;
    max?: number;
  }>;
}

/**
 * MQTT Client Service for IoT device communication
 * Handles connection management, device discovery, and message routing
 */
export class MqttClientService extends EventEmitter {
  private client: MqttClient | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectInterval = 5000; // 5 seconds
  private discoveredDevices = new Map<string, MqttDiscoveryMessage>();

  // MQTT topic structure
  private readonly topics = {
    discovery: 'iot-dashboard/discovery/+',
    deviceStatus: 'iot-dashboard/device/+/status',
    deviceProperty: 'iot-dashboard/device/+/property/+',
    deviceCommand: 'iot-dashboard/device/+/command',
    deviceCommandResponse: 'iot-dashboard/device/+/command/response',
  };

  constructor(
    private brokerUrl: string = 'mqtt://localhost:1883',
    private options: IClientOptions = {}
  ) {
    super();
    this.setupDefaultOptions();
  }

  /**
   * Initialize MQTT connection
   */
  public async connect(): Promise<void> {
    try {
      console.log(`Connecting to MQTT broker: ${this.brokerUrl}`);
      
      this.client = mqtt.connect(this.brokerUrl, this.options);
      
      this.client.on('connect', () => {
        console.log('MQTT client connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.subscribeToTopics();
        this.emit('connected');
      });

      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });

      this.client.on('error', (error) => {
        console.error('MQTT connection error:', error);
        this.emit('error', error);
      });

      this.client.on('close', () => {
        console.log('MQTT connection closed');
        this.isConnected = false;
        this.emit('disconnected');
        this.handleReconnection();
      });

      this.client.on('offline', () => {
        console.log('MQTT client offline');
        this.isConnected = false;
        this.emit('offline');
      });

    } catch (error) {
      console.error('Failed to connect to MQTT broker:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MQTT broker
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      console.log('Disconnecting from MQTT broker');
      await new Promise<void>((resolve) => {
        this.client!.end(false, {}, () => {
          this.isConnected = false;
          resolve();
        });
      });
    }
  }

  /**
   * Check if client is connected
   */
  public isClientConnected(): boolean {
    return this.isConnected && this.client?.connected === true;
  }

  /**
   * Send command to device via MQTT
   */
  public async sendDeviceCommand(deviceId: string, controlKey: string, value: any): Promise<void> {
    if (!this.isClientConnected()) {
      throw new Error('MQTT client not connected');
    }

    const topic = `iot-dashboard/device/${deviceId}/command`;
    const message = {
      controlKey,
      value,
      timestamp: Date.now(),
    };

    console.log(`Sending command to device ${deviceId}: ${controlKey} = ${value}`);
    
    return new Promise((resolve, reject) => {
      this.client!.publish(topic, JSON.stringify(message), { qos: 1 }, (error) => {
        if (error) {
          console.error(`Failed to send command to device ${deviceId}:`, error);
          reject(error);
        } else {
          console.log(`Command sent successfully to device ${deviceId}`);
          resolve();
        }
      });
    });
  }

  /**
   * Request device discovery
   */
  public async requestDeviceDiscovery(): Promise<void> {
    if (!this.isClientConnected()) {
      throw new Error('MQTT client not connected');
    }

    const topic = 'iot-dashboard/discovery/request';
    const message = {
      timestamp: Date.now(),
      requestId: `discovery_${Date.now()}`,
    };

    console.log('Requesting device discovery');
    
    return new Promise((resolve, reject) => {
      this.client!.publish(topic, JSON.stringify(message), { qos: 1 }, (error) => {
        if (error) {
          console.error('Failed to request device discovery:', error);
          reject(error);
        } else {
          console.log('Device discovery request sent');
          resolve();
        }
      });
    });
  }

  /**
   * Get discovered devices
   */
  public getDiscoveredDevices(): MqttDiscoveryMessage[] {
    return Array.from(this.discoveredDevices.values());
  }

  /**
   * Clear discovered devices cache
   */
  public clearDiscoveredDevices(): void {
    this.discoveredDevices.clear();
  }

  // Private methods

  private setupDefaultOptions(): void {
    this.options = {
      clientId: `iot-dashboard-${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      connectTimeout: 30000,
      keepalive: 60,
      reconnectPeriod: 0, // We handle reconnection manually
      ...this.options,
    };
  }

  private subscribeToTopics(): void {
    if (!this.client) return;

    const topicsToSubscribe = Object.values(this.topics);
    
    topicsToSubscribe.forEach(topic => {
      this.client!.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          console.error(`Failed to subscribe to topic ${topic}:`, error);
        } else {
          console.log(`Subscribed to topic: ${topic}`);
        }
      });
    });
  }

  private handleMessage(topic: string, message: Buffer): void {
    try {
      const messageStr = message.toString();
      console.log(`Received MQTT message on topic ${topic}: ${messageStr}`);

      // Parse device discovery messages
      if (topic.startsWith('iot-dashboard/discovery/')) {
        this.handleDiscoveryMessage(topic, messageStr);
        return;
      }

      // Parse device status messages
      if (topic.includes('/status')) {
        this.handleStatusMessage(topic, messageStr);
        return;
      }

      // Parse device property messages
      if (topic.includes('/property/')) {
        this.handlePropertyMessage(topic, messageStr);
        return;
      }

      // Parse command response messages
      if (topic.includes('/command/response')) {
        this.handleCommandResponseMessage(topic, messageStr);
        return;
      }

    } catch (error) {
      console.error(`Failed to handle MQTT message on topic ${topic}:`, error);
    }
  }

  private handleDiscoveryMessage(_topic: string, message: string): void {
    try {
      const discoveryData: MqttDiscoveryMessage = JSON.parse(message);
      
      // Validate discovery message
      if (!discoveryData.deviceId || !discoveryData.name || !discoveryData.type) {
        console.error('Invalid discovery message format:', discoveryData);
        return;
      }

      console.log(`Device discovered: ${discoveryData.name} (${discoveryData.deviceId})`);
      
      // Store discovered device
      this.discoveredDevices.set(discoveryData.deviceId, discoveryData);
      
      // Emit discovery event
      this.emit('deviceDiscovered', discoveryData);
      
    } catch (error) {
      console.error('Failed to parse discovery message:', error);
    }
  }

  private handleStatusMessage(topic: string, message: string): void {
    try {
      const deviceId = this.extractDeviceIdFromTopic(topic);
      if (!deviceId) return;

      const statusData = JSON.parse(message);
      const status: DeviceStatus = statusData.status || 'offline';
      
      console.log(`Device ${deviceId} status: ${status}`);
      
      // Emit status update event
      this.emit('deviceStatusUpdate', { deviceId, status, timestamp: statusData.timestamp || Date.now() });
      
    } catch (error) {
      console.error('Failed to parse status message:', error);
    }
  }

  private handlePropertyMessage(topic: string, message: string): void {
    try {
      const deviceId = this.extractDeviceIdFromTopic(topic);
      const propertyKey = this.extractPropertyKeyFromTopic(topic);
      
      if (!deviceId || !propertyKey) return;

      const propertyData = JSON.parse(message);
      
      const property: DeviceProperty = {
        key: propertyKey,
        value: propertyData.value,
        unit: propertyData.unit,
        timestamp: new Date(propertyData.timestamp || Date.now()),
      };
      
      console.log(`Device ${deviceId} property update: ${propertyKey} = ${property.value}${property.unit || ''}`);
      
      // Emit property update event
      this.emit('devicePropertyUpdate', { deviceId, property });
      
    } catch (error) {
      console.error('Failed to parse property message:', error);
    }
  }

  private handleCommandResponseMessage(topic: string, message: string): void {
    try {
      const deviceId = this.extractDeviceIdFromTopic(topic);
      if (!deviceId) return;

      const responseData = JSON.parse(message);
      
      console.log(`Command response from device ${deviceId}:`, responseData);
      
      // Emit command response event
      this.emit('deviceCommandResponse', { deviceId, response: responseData });
      
    } catch (error) {
      console.error('Failed to parse command response message:', error);
    }
  }

  private extractDeviceIdFromTopic(topic: string): string | null {
    const match = topic.match(/iot-dashboard\/device\/([^\/]+)/);
    return match ? match[1] : null;
  }

  private extractPropertyKeyFromTopic(topic: string): string | null {
    const match = topic.match(/iot-dashboard\/device\/[^\/]+\/property\/([^\/]+)/);
    return match ? match[1] : null;
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached. Giving up.');
      this.emit('reconnectionFailed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.isConnected) {
        this.connect().catch(error => {
          console.error('Reconnection attempt failed:', error);
        });
      }
    }, delay);
  }
}