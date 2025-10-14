import { io, Socket } from 'socket.io-client';
import { Device } from '../../../shared/src/types/Device';
import { Notification } from '../../../shared/src/types/Notification';

/**
 * WebSocket event types
 */
export interface WebSocketEvents {
  'device-update': (device: Device) => void;
  'device-added': (device: Device) => void;
  'device-removed': (deviceId: string) => void;
  'notification': (notification: Notification) => void;
  'connection-status': (status: { connected: boolean; deviceCount: number }) => void;
}

/**
 * WebSocket service for real-time communication with the backend
 */
export class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isConnecting = false;

  /**
   * Connect to the WebSocket server
   */
  connect(url: string = 'http://localhost:3001'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected || this.isConnecting) {
        resolve();
        return;
      }

      this.isConnecting = true;

      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.isConnecting = false;
        
        // Attempt reconnection for certain disconnect reasons
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, don't reconnect automatically
          return;
        }
        
        this.attemptReconnection();
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.isConnecting = false;
        reject(error);
        this.attemptReconnection();
      });
    });
  } 
 /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      if (!this.socket?.connected && !this.isConnecting) {
        this.connect().catch(console.error);
      }
    }, delay);
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Subscribe to device updates
   */
  onDeviceUpdate(callback: (device: Device) => void): void {
    this.socket?.on('device-update', callback);
  }

  /**
   * Subscribe to device additions
   */
  onDeviceAdded(callback: (device: Device) => void): void {
    this.socket?.on('device-added', callback);
  }

  /**
   * Subscribe to device removals
   */
  onDeviceRemoved(callback: (deviceId: string) => void): void {
    this.socket?.on('device-removed', callback);
  }

  /**
   * Subscribe to notifications
   */
  onNotification(callback: (notification: Notification) => void): void {
    this.socket?.on('notification', callback);
  }

  /**
   * Subscribe to connection status updates
   */
  onConnectionStatus(callback: (status: { connected: boolean; deviceCount: number }) => void): void {
    this.socket?.on('connection-status', callback);
  }

  /**
   * Send device command
   */
  sendDeviceCommand(deviceId: string, controlKey: string, value: any): void {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('device-command', {
      deviceId,
      controlKey,
      value,
      timestamp: new Date(),
    });
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.socket?.removeAllListeners();
  }

  /**
   * Remove specific event listener
   */
  removeListener(event: keyof WebSocketEvents, callback?: (...args: any[]) => void): void {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.removeAllListeners(event);
    }
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();