import { Server, Socket } from 'socket.io';
import { Device } from '@shared/types/Device';
import { Notification } from '@shared/types/Notification';

export interface ClientInfo {
  id: string;
  socket: Socket;
  connectedAt: Date;
  subscribedDevices: Set<string>;
}

export class WebSocketHandler {
  private io: Server;
  private clients: Map<string, ClientInfo> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.setupConnectionHandling();
  }

  private setupConnectionHandling(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleClientConnection(socket);
    });
  }

  private handleClientConnection(socket: Socket): void {
    const clientInfo: ClientInfo = {
      id: socket.id,
      socket,
      connectedAt: new Date(),
      subscribedDevices: new Set(),
    };

    this.clients.set(socket.id, clientInfo);
    console.log(`Client connected: ${socket.id} (Total: ${this.clients.size})`);

    // Send welcome message with connection info
    socket.emit('connection-established', {
      clientId: socket.id,
      timestamp: new Date().toISOString(),
      connectedClients: this.clients.size,
    });

    // Handle device subscription
    socket.on('subscribe-device', (deviceId: string) => {
      this.handleDeviceSubscription(socket.id, deviceId);
    });

    // Handle device unsubscription
    socket.on('unsubscribe-device', (deviceId: string) => {
      this.handleDeviceUnsubscription(socket.id, deviceId);
    });

    // Handle device command from client
    socket.on('device-command', (data: { deviceId: string; command: any }) => {
      this.handleDeviceCommand(socket.id, data);
    });

    // Handle client disconnect
    socket.on('disconnect', (reason: string) => {
      this.handleClientDisconnection(socket.id, reason);
    });

    // Handle connection errors
    socket.on('error', (error: Error) => {
      console.error(`Socket error for client ${socket.id}:`, error);
    });
  }

  private handleDeviceSubscription(clientId: string, deviceId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscribedDevices.add(deviceId);
      console.log(`Client ${clientId} subscribed to device ${deviceId}`);
      
      // Join socket room for device updates
      client.socket.join(`device:${deviceId}`);
      
      // Acknowledge subscription
      client.socket.emit('device-subscribed', { deviceId, timestamp: new Date().toISOString() });
    }
  }

  private handleDeviceUnsubscription(clientId: string, deviceId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscribedDevices.delete(deviceId);
      console.log(`Client ${clientId} unsubscribed from device ${deviceId}`);
      
      // Leave socket room
      client.socket.leave(`device:${deviceId}`);
      
      // Acknowledge unsubscription
      client.socket.emit('device-unsubscribed', { deviceId, timestamp: new Date().toISOString() });
    }
  }

  private handleDeviceCommand(clientId: string, data: { deviceId: string; command: any }): void {
    console.log(`Device command from client ${clientId}:`, data);
    
    // Emit to device command handlers (will be handled by DeviceManager)
    this.io.emit('internal-device-command', {
      clientId,
      deviceId: data.deviceId,
      command: data.command,
      timestamp: new Date().toISOString(),
    });
  }

  private handleClientDisconnection(clientId: string, reason: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      console.log(`Client disconnected: ${clientId} (Reason: ${reason})`);
      this.clients.delete(clientId);
    }
  }

  // Public methods for broadcasting updates

  /**
   * Broadcast device update to all subscribed clients
   */
  public broadcastDeviceUpdate(device: Device): void {
    const updateData = {
      device,
      timestamp: new Date().toISOString(),
    };

    // Send to all clients subscribed to this device
    this.io.to(`device:${device.id}`).emit('device-update', updateData);
    
    console.log(`Broadcasted update for device ${device.id} to subscribed clients`);
  }

  /**
   * Broadcast device status change to all clients
   */
  public broadcastDeviceStatus(deviceId: string, status: 'online' | 'offline' | 'error'): void {
    const statusData = {
      deviceId,
      status,
      timestamp: new Date().toISOString(),
    };

    this.io.to(`device:${deviceId}`).emit('device-status', statusData);
    console.log(`Broadcasted status change for device ${deviceId}: ${status}`);
  }

  /**
   * Broadcast notification to all connected clients
   */
  public broadcastNotification(notification: Notification): void {
    this.io.emit('notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });
    
    console.log(`Broadcasted notification to all clients:`, notification);
  }

  /**
   * Broadcast notification update (e.g., when marked as read)
   */
  public broadcastNotificationUpdate(notificationId: string, updates: { isRead?: boolean }): void {
    this.io.emit('notification-update', {
      notificationId,
      updates,
      timestamp: new Date().toISOString(),
    });
    
    console.log(`Broadcasted notification update for ${notificationId}:`, updates);
  }

  /**
   * Broadcast that all notifications for a device have been marked as read
   */
  public broadcastDeviceNotificationsRead(deviceId: string): void {
    this.io.emit('device-notifications-read', {
      deviceId,
      timestamp: new Date().toISOString(),
    });
    
    console.log(`Broadcasted device notifications read for device ${deviceId}`);
  }

  /**
   * Send device command response back to specific client
   */
  public sendCommandResponse(clientId: string, response: { deviceId: string; success: boolean; message?: string; data?: any }): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.socket.emit('device-command-response', {
        ...response,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats(): { totalClients: number; clientsPerDevice: Record<string, number> } {
    const clientsPerDevice: Record<string, number> = {};
    
    this.clients.forEach((client) => {
      client.subscribedDevices.forEach((deviceId) => {
        clientsPerDevice[deviceId] = (clientsPerDevice[deviceId] || 0) + 1;
      });
    });

    return {
      totalClients: this.clients.size,
      clientsPerDevice,
    };
  }

  /**
   * Disconnect all clients (for graceful shutdown)
   */
  public disconnectAllClients(): void {
    this.clients.forEach((client) => {
      client.socket.disconnect(true);
    });
    this.clients.clear();
  }
}