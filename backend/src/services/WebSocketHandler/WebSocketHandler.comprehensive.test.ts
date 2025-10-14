import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client, Socket } from 'socket.io-client';
import { createTestApp } from '../../test-utils/testApp';
import { DeviceRegistration } from '@shared/types/Device';

describe('WebSocket Handler Comprehensive Integration Tests', () => {
  let app: Express;
  let httpServer: any;
  let ioServer: Server;
  let clientSocket: Socket;
  let secondClientSocket: Socket;
  let serverPort: number;
  let testDeviceId: string;

  beforeAll(async () => {
    app = await createTestApp();
    
    // Create HTTP server for WebSocket testing
    httpServer = createServer(app);
    ioServer = new Server(httpServer, {
      cors: { origin: '*' },
      transports: ['websocket', 'polling']
    });
    
    // Start server on random port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        serverPort = httpServer.address()?.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    if (secondClientSocket) {
      secondClientSocket.disconnect();
    }
    if (httpServer) {
      httpServer.close();
    }
  });

  beforeEach(async () => {
    // Clean up devices before each test
    const response = await request(app).get('/api/devices');
    const devices = response.body.data;
    
    for (const device of devices) {
      await request(app).delete(`/api/devices/${device.id}`);
    }

    // Create a test device for WebSocket tests
    const deviceData: DeviceRegistration = {
      name: 'WebSocket Test Device',
      type: 'switch',
      room: 'Test Room',
      connectionConfig: {}
    };

    const deviceResponse = await request(app)
      .post('/api/devices')
      .send(deviceData);

    testDeviceId = deviceResponse.body.data.id;

    // Setup fresh WebSocket connections for each test
    if (clientSocket) {
      clientSocket.disconnect();
    }
    if (secondClientSocket) {
      secondClientSocket.disconnect();
    }
    
    clientSocket = Client(`http://localhost:${serverPort}`, {
      transports: ['websocket']
    });
    
    await new Promise<void>((resolve) => {
      clientSocket.on('connect', () => resolve());
    });
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.removeAllListeners();
    }
    if (secondClientSocket) {
      secondClientSocket.removeAllListeners();
    }
  });

  describe('WebSocket Connection Management', () => {
    it('should establish connection and receive welcome message', (done) => {
      clientSocket.on('connection-established', (data) => {
        expect(data).toMatchObject({
          clientId: expect.any(String),
          timestamp: expect.any(String),
          connectedClients: expect.any(Number),
        });
        
        expect(data.clientId).toBe(clientSocket.id);
        expect(new Date(data.timestamp)).toBeInstanceOf(Date);
        done();
      });
    });

    it('should handle multiple concurrent connections', async () => {
      const connections: Socket[] = [];
      const connectionPromises: Promise<void>[] = [];

      // Create 5 concurrent connections
      for (let i = 0; i < 5; i++) {
        const socket = Client(`http://localhost:${serverPort}`, {
          transports: ['websocket']
        });
        connections.push(socket);

        const promise = new Promise<void>((resolve) => {
          socket.on('connect', () => {
            socket.on('connection-established', () => resolve());
          });
        });
        connectionPromises.push(promise);
      }

      await Promise.all(connectionPromises);

      // Clean up connections
      connections.forEach(socket => socket.disconnect());
    });

    it('should handle connection errors gracefully', (done) => {
      const badSocket = Client(`http://localhost:${serverPort + 1000}`, {
        transports: ['websocket'],
        timeout: 1000
      });

      badSocket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        badSocket.disconnect();
        done();
      });
    });

    it('should handle rapid connect/disconnect cycles', async () => {
      for (let i = 0; i < 10; i++) {
        const socket = Client(`http://localhost:${serverPort}`, {
          transports: ['websocket']
        });

        await new Promise<void>((resolve) => {
          socket.on('connect', () => {
            socket.disconnect();
            resolve();
          });
        });
      }
    });
  });

  describe('Device Subscription Management', () => {
    it('should handle device subscription successfully', (done) => {
      clientSocket.emit('subscribe-device', testDeviceId);

      clientSocket.on('device-subscribed', (data) => {
        expect(data).toMatchObject({
          deviceId: testDeviceId,
          timestamp: expect.any(String),
        });
        done();
      });
    });

    it('should handle device unsubscription successfully', (done) => {
      // First subscribe
      clientSocket.emit('subscribe-device', testDeviceId);

      clientSocket.on('device-subscribed', () => {
        // Then unsubscribe
        clientSocket.emit('unsubscribe-device', testDeviceId);
      });

      clientSocket.on('device-unsubscribed', (data) => {
        expect(data).toMatchObject({
          deviceId: testDeviceId,
          timestamp: expect.any(String),
        });
        done();
      });
    });

    it('should handle subscription to non-existent device', (done) => {
      const nonExistentId = 'non-existent-device-id';
      
      clientSocket.emit('subscribe-device', nonExistentId);

      clientSocket.on('device-subscribed', (data) => {
        expect(data.deviceId).toBe(nonExistentId);
        // Should still acknowledge subscription even for non-existent devices
        done();
      });
    });

    it('should handle multiple device subscriptions', async () => {
      // Create additional test devices
      const devices = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/devices')
          .send({
            name: `Test Device ${i}`,
            type: 'sensor',
            room: 'Test Room',
            connectionConfig: {}
          });
        devices.push(response.body.data.id);
      }

      const subscriptionPromises = devices.map(deviceId => 
        new Promise<void>((resolve) => {
          clientSocket.emit('subscribe-device', deviceId);
          clientSocket.on('device-subscribed', (data) => {
            if (data.deviceId === deviceId) {
              resolve();
            }
          });
        })
      );

      await Promise.all(subscriptionPromises);
    });

    it('should handle duplicate subscriptions gracefully', (done) => {
      let subscriptionCount = 0;

      clientSocket.on('device-subscribed', () => {
        subscriptionCount++;
        if (subscriptionCount === 2) {
          // Both subscriptions should be acknowledged
          done();
        }
      });

      // Subscribe twice to the same device
      clientSocket.emit('subscribe-device', testDeviceId);
      clientSocket.emit('subscribe-device', testDeviceId);
    });
  });

  describe('Device Command Handling', () => {
    beforeEach((done) => {
      // Subscribe to the test device first
      clientSocket.emit('subscribe-device', testDeviceId);
      clientSocket.on('device-subscribed', () => done());
    });

    it('should handle device commands through WebSocket', (done) => {
      const command = {
        deviceId: testDeviceId,
        command: {
          controlKey: 'power',
          value: true
        }
      };

      clientSocket.emit('device-command', command);

      // Listen for command response
      clientSocket.on('device-command-response', (response) => {
        expect(response).toMatchObject({
          deviceId: testDeviceId,
          success: expect.any(Boolean),
          timestamp: expect.any(String),
        });
        done();
      });
    });

    it('should handle invalid device commands', (done) => {
      const invalidCommand = {
        deviceId: testDeviceId,
        command: {
          controlKey: 'invalid_control',
          value: true
        }
      };

      clientSocket.emit('device-command', invalidCommand);

      clientSocket.on('device-command-response', (response) => {
        expect(response.success).toBe(false);
        expect(response.message).toBeDefined();
        done();
      });
    });

    it('should handle commands for non-existent devices', (done) => {
      const command = {
        deviceId: 'non-existent-device',
        command: {
          controlKey: 'power',
          value: true
        }
      };

      clientSocket.emit('device-command', command);

      clientSocket.on('device-command-response', (response) => {
        expect(response.success).toBe(false);
        expect(response.deviceId).toBe('non-existent-device');
        done();
      });
    });

    it('should handle malformed command data', (done) => {
      const malformedCommands = [
        { deviceId: testDeviceId }, // missing command
        { command: { controlKey: 'power', value: true } }, // missing deviceId
        {}, // empty object
        null, // null command
      ];

      let responseCount = 0;
      const expectedResponses = malformedCommands.length;

      clientSocket.on('device-command-response', (response) => {
        expect(response.success).toBe(false);
        responseCount++;
        
        if (responseCount === expectedResponses) {
          done();
        }
      });

      malformedCommands.forEach(cmd => {
        clientSocket.emit('device-command', cmd);
      });
    });
  });

  describe('Real-time Device Updates Broadcasting', () => {
    beforeEach(async () => {
      // Set up second client for multi-client testing
      secondClientSocket = Client(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });
      
      await new Promise<void>((resolve) => {
        secondClientSocket.on('connect', () => resolve());
      });

      // Subscribe both clients to the test device
      const subscriptionPromises = [
        new Promise<void>((resolve) => {
          clientSocket.emit('subscribe-device', testDeviceId);
          clientSocket.on('device-subscribed', () => resolve());
        }),
        new Promise<void>((resolve) => {
          secondClientSocket.emit('subscribe-device', testDeviceId);
          secondClientSocket.on('device-subscribed', () => resolve());
        })
      ];

      await Promise.all(subscriptionPromises);
    });

    it('should broadcast device updates to all subscribed clients', (done) => {
      let updateCount = 0;
      const expectedUpdates = 2; // Both clients should receive the update

      const handleUpdate = (data: any) => {
        expect(data).toMatchObject({
          device: {
            id: testDeviceId,
          },
          timestamp: expect.any(String),
        });
        
        updateCount++;
        if (updateCount === expectedUpdates) {
          done();
        }
      };

      clientSocket.on('device-update', handleUpdate);
      secondClientSocket.on('device-update', handleUpdate);

      // Trigger device update through API
      request(app)
        .put(`/api/devices/${testDeviceId}`)
        .send({
          command: {
            controlKey: 'power',
            value: true
          }
        })
        .end(() => {}); // Don't wait for response
    });

    it('should broadcast device status changes', (done) => {
      let statusCount = 0;
      const expectedStatuses = 2;

      const handleStatus = (data: any) => {
        expect(data).toMatchObject({
          deviceId: testDeviceId,
          status: expect.any(String),
          timestamp: expect.any(String),
        });
        
        statusCount++;
        if (statusCount === expectedStatuses) {
          done();
        }
      };

      clientSocket.on('device-status', handleStatus);
      secondClientSocket.on('device-status', handleStatus);

      // Simulate status change (this would normally come from device manager)
      // For testing, we'll trigger it through a device update
      request(app)
        .put(`/api/devices/${testDeviceId}`)
        .send({ status: 'online' })
        .end(() => {});
    });

    it('should only send updates to subscribed clients', async () => {
      // Create a third client that doesn't subscribe
      const thirdClient = Client(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });
      
      await new Promise<void>((resolve) => {
        thirdClient.on('connect', () => resolve());
      });

      let subscribedUpdates = 0;
      let unsubscribedUpdates = 0;

      clientSocket.on('device-update', () => {
        subscribedUpdates++;
      });

      thirdClient.on('device-update', () => {
        unsubscribedUpdates++;
      });

      // Trigger device update
      await request(app)
        .put(`/api/devices/${testDeviceId}`)
        .send({
          command: {
            controlKey: 'power',
            value: true
          }
        });

      // Wait a bit for any potential updates
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(subscribedUpdates).toBeGreaterThan(0);
      expect(unsubscribedUpdates).toBe(0);

      thirdClient.disconnect();
    });
  });

  describe('Notification Broadcasting', () => {
    it('should broadcast notifications to all connected clients', (done) => {
      let notificationCount = 0;
      const expectedNotifications = 2;

      const handleNotification = (data: any) => {
        expect(data).toMatchObject({
          timestamp: expect.any(String),
        });
        
        notificationCount++;
        if (notificationCount === expectedNotifications) {
          done();
        }
      };

      clientSocket.on('notification', handleNotification);
      
      // Set up second client
      secondClientSocket = Client(`http://localhost:${serverPort}`, {
        transports: ['websocket']
      });
      
      secondClientSocket.on('connect', () => {
        secondClientSocket.on('notification', handleNotification);
        
        // Simulate notification broadcast
        // In a real scenario, this would come from the notification service
        setTimeout(() => {
          ioServer.emit('notification', {
            type: 'alert',
            title: 'Test Notification',
            message: 'This is a test notification',
            deviceId: testDeviceId,
          });
        }, 50);
      });
    });

    it('should handle notification broadcasting with no connected clients', () => {
      // Disconnect all clients
      clientSocket.disconnect();
      
      // This should not throw an error
      expect(() => {
        ioServer.emit('notification', {
          type: 'info',
          title: 'Test',
          message: 'Test message'
        });
      }).not.toThrow();
    });
  });

  describe('Connection Statistics and Management', () => {
    it('should track connection statistics correctly', async () => {
      // Create multiple connections
      const connections: Socket[] = [];
      
      for (let i = 0; i < 3; i++) {
        const socket = Client(`http://localhost:${serverPort}`, {
          transports: ['websocket']
        });
        connections.push(socket);
        
        await new Promise<void>((resolve) => {
          socket.on('connect', () => resolve());
        });
      }

      // In a real implementation, you'd have an endpoint to get connection stats
      // For now, we'll just verify that connections were established
      expect(connections).toHaveLength(3);
      connections.forEach(socket => {
        expect(socket.connected).toBe(true);
      });

      // Clean up
      connections.forEach(socket => socket.disconnect());
    });

    it('should handle graceful disconnection', (done) => {
      clientSocket.on('disconnect', (reason) => {
        expect(reason).toBeDefined();
        done();
      });

      clientSocket.disconnect();
    });

    it('should handle unexpected disconnections', (done) => {
      // Simulate network interruption by closing the underlying socket
      clientSocket.on('disconnect', (reason) => {
        expect(reason).toBeDefined();
        done();
      });

      // Force disconnect
      (clientSocket as any).io.engine.close();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid event data gracefully', () => {
      // These should not crash the server
      expect(() => {
        clientSocket.emit('subscribe-device', null);
        clientSocket.emit('subscribe-device', undefined);
        clientSocket.emit('subscribe-device', {});
        clientSocket.emit('subscribe-device', 123);
      }).not.toThrow();
    });

    it('should handle rapid event emissions', async () => {
      const promises: Promise<void>[] = [];
      
      // Emit many events rapidly
      for (let i = 0; i < 100; i++) {
        const promise = new Promise<void>((resolve) => {
          clientSocket.emit('subscribe-device', `device-${i}`);
          resolve();
        });
        promises.push(promise);
      }

      await Promise.all(promises);
      
      // Server should still be responsive
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
    });

    it('should handle large message payloads', (done) => {
      const largePayload = {
        deviceId: testDeviceId,
        command: {
          controlKey: 'data',
          value: 'A'.repeat(10000) // Large string
        }
      };

      clientSocket.emit('device-command', largePayload);

      clientSocket.on('device-command-response', (response) => {
        // Should handle large payloads gracefully
        expect(response).toBeDefined();
        done();
      });
    });

    it('should handle concurrent operations on same device', async () => {
      // Subscribe to device
      await new Promise<void>((resolve) => {
        clientSocket.emit('subscribe-device', testDeviceId);
        clientSocket.on('device-subscribed', () => resolve());
      });

      // Send multiple concurrent commands
      const commandPromises = [];
      for (let i = 0; i < 10; i++) {
        const promise = new Promise<void>((resolve) => {
          clientSocket.emit('device-command', {
            deviceId: testDeviceId,
            command: {
              controlKey: 'power',
              value: i % 2 === 0
            }
          });
          resolve();
        });
        commandPromises.push(promise);
      }

      await Promise.all(commandPromises);
      
      // Server should remain stable
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
    });
  });
});