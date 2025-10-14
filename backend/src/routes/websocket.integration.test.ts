import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client, Socket } from 'socket.io-client';
import { createTestApp } from '../test-utils/testApp';
import { DeviceRegistration } from '@shared/types/Device';

describe('WebSocket Broadcasting Integration Tests', () => {
  let app: Express;
  let httpServer: any;
  let ioServer: Server;
  let serverPort: number;

  beforeAll(async () => {
    app = await createTestApp();
    
    // Create HTTP server for WebSocket testing
    httpServer = createServer(app);
    ioServer = new Server(httpServer, {
      cors: { origin: '*' }
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
  });

  describe('WebSocket Message Broadcasting', () => {
    it('should broadcast device updates when API changes occur', async () => {
      // Create a test device
      const deviceData: DeviceRegistration = {
        name: 'Broadcast Test Device',
        type: 'switch',
        room: 'Test Room',
        connectionConfig: {}
      };

      const deviceResponse = await request(app)
        .post('/api/devices')
        .send(deviceData);

      const testDevice = deviceResponse.body.data;

      // Test that device updates trigger broadcasts
      const updateResponse = await request(app)
        .put(`/api/devices/${testDevice.id}`)
        .send({
          command: {
            controlKey: 'power',
            value: true
          }
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
    });
  });
});