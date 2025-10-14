import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client, Socket } from 'socket.io-client';
import { createTestApp } from '../test-utils/testApp';
import { DeviceRegistration, DeviceCommand } from '@shared/types/Device';

describe('Device API Integration Tests', () => {
  let app: Express;
  let httpServer: any;
  let ioServer: Server;
  let clientSocket: Socket;
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
    if (clientSocket) {
      clientSocket.disconnect();
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

    // Setup fresh WebSocket connection for each test
    if (clientSocket) {
      clientSocket.disconnect();
    }
    
    clientSocket = Client(`http://localhost:${serverPort}`);
    await new Promise<void>((resolve) => {
      clientSocket.on('connect', () => resolve());
    });
  });

  describe('GET /api/devices - List all devices', () => {
    it('should return empty array when no devices exist', async () => {
      const response = await request(app)
        .get('/api/devices')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: [],
        count: 0,
        timestamp: expect.any(String),
      });
    });

    it('should return all devices with correct structure', async () => {
      // Create test devices
      const devices = [
        { name: 'Living Room Light', type: 'switch', room: 'Living Room' },
        { name: 'Kitchen Sensor', type: 'sensor', room: 'Kitchen' },
      ];

      for (const device of devices) {
        await request(app)
          .post('/api/devices')
          .send({ ...device, connectionConfig: {} });
      }

      const response = await request(app)
        .get('/api/devices')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);
      
      response.body.data.forEach((device: any) => {
        expect(device).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          type: expect.any(String),
          room: expect.any(String),
          status: expect.any(String),
          lastSeen: expect.any(String),
          properties: expect.any(Array),
          controls: expect.any(Array),
        });
      });
    });

    it('should handle concurrent requests correctly', async () => {
      const promises = Array(10).fill(null).map(() =>
        request(app).get('/api/devices')
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('GET /api/devices/:id - Get specific device', () => {
    let testDeviceId: string;

    beforeEach(async () => {
      const deviceData: DeviceRegistration = {
        name: 'Test Device',
        type: 'switch',
        room: 'Test Room',
        connectionConfig: {}
      };

      const response = await request(app)
        .post('/api/devices')
        .send(deviceData);

      testDeviceId = response.body.data.id;
    });

    it('should return device by ID successfully', async () => {
      const response = await request(app)
        .get(`/api/devices/${testDeviceId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: testDeviceId,
          name: 'Test Device',
          type: 'switch',
          room: 'Test Room',
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 404 for non-existent device', async () => {
      const response = await request(app)
        .get('/api/devices/non-existent-id')
        .expect(404);

      expect(response.body.error.message).toBe('Device not found');
    });

    it('should handle malformed device IDs', async () => {
      const malformedIds = ['', '   ', 'null', 'undefined', '{}'];

      for (const id of malformedIds) {
        const response = await request(app)
          .get(`/api/devices/${encodeURIComponent(id)}`)
          .expect(404);

        expect(response.body.error).toBeDefined();
      }
    });
  });

  describe('POST /api/devices - Register new device', () => {
    it('should create device with valid data', async () => {
      const deviceData: DeviceRegistration = {
        name: 'New Switch',
        type: 'switch',
        room: 'Living Room',
        connectionConfig: { topic: 'home/switch/1' }
      };

      const response = await request(app)
        .post('/api/devices')
        .send(deviceData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          name: 'New Switch',
          type: 'switch',
          room: 'Living Room',
          status: 'offline',
        },
        message: 'Device registered successfully',
        timestamp: expect.any(String),
      });
    });

    it('should validate required fields', async () => {
      const testCases = [
        { type: 'switch', room: 'Test' }, // missing name
        { name: 'Test', room: 'Test' }, // missing type
        { name: 'Test', type: 'switch' }, // missing room
        {}, // missing all
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/devices')
          .send({ ...testCase, connectionConfig: {} })
          .expect(400);

        expect(response.body.error.message).toContain('Missing required fields');
      }
    });

    it('should validate device type enum', async () => {
      const invalidTypes = ['invalid', 'unknown', 'custom', '', null, undefined];

      for (const type of invalidTypes) {
        const response = await request(app)
          .post('/api/devices')
          .send({
            name: 'Test Device',
            type,
            room: 'Test Room',
            connectionConfig: {}
          })
          .expect(400);

        expect(response.body.error.message).toContain('Invalid device type');
      }
    });

    it('should handle empty string values', async () => {
      const response = await request(app)
        .post('/api/devices')
        .send({
          name: '',
          type: 'switch',
          room: 'Test Room',
          connectionConfig: {}
        })
        .expect(400);

      expect(response.body.error.message).toContain('Missing required fields');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/devices')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should create devices with all valid types', async () => {
      const validTypes = ['sensor', 'switch', 'dimmer', 'thermostat', 'camera', 'lock'];

      for (const type of validTypes) {
        const response = await request(app)
          .post('/api/devices')
          .send({
            name: `Test ${type}`,
            type,
            room: 'Test Room',
            connectionConfig: {}
          })
          .expect(201);

        expect(response.body.data.type).toBe(type);
      }
    });
  });

  describe('PUT /api/devices/:id - Update device or send commands', () => {
    let testDeviceId: string;

    beforeEach(async () => {
      const deviceData: DeviceRegistration = {
        name: 'Test Switch',
        type: 'switch',
        room: 'Test Room',
        connectionConfig: {}
      };

      const response = await request(app)
        .post('/api/devices')
        .send(deviceData);

      testDeviceId = response.body.data.id;
    });

    it('should send device command successfully', async () => {
      const command = {
        command: {
          controlKey: 'power',
          value: true
        }
      };

      const response = await request(app)
        .put(`/api/devices/${testDeviceId}`)
        .send(command)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.value).toBe(true);
    });

    it('should update device information', async () => {
      const updates = {
        name: 'Updated Device Name',
        room: 'Updated Room'
      };

      const response = await request(app)
        .put(`/api/devices/${testDeviceId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Device Name');
      expect(response.body.data.room).toBe('Updated Room');
    });

    it('should validate command structure', async () => {
      const invalidCommands = [
        { command: {} }, // missing controlKey and value
        { command: { controlKey: 'power' } }, // missing value
        { command: { value: true } }, // missing controlKey
        { command: { controlKey: '', value: true } }, // empty controlKey
      ];

      for (const cmd of invalidCommands) {
        const response = await request(app)
          .put(`/api/devices/${testDeviceId}`)
          .send(cmd)
          .expect(400);

        expect(response.body.error).toBeDefined();
      }
    });

    it('should reject commands for non-existent controls', async () => {
      const response = await request(app)
        .put(`/api/devices/${testDeviceId}`)
        .send({
          command: {
            controlKey: 'non_existent_control',
            value: true
          }
        })
        .expect(400);

      expect(response.body.error.message).toContain('not found on device');
    });

    it('should return 404 for non-existent device', async () => {
      const response = await request(app)
        .put('/api/devices/non-existent-id')
        .send({
          command: {
            controlKey: 'power',
            value: true
          }
        })
        .expect(404);

      expect(response.body.error.message).toBe('Device not found');
    });

    it('should validate command values based on control type', async () => {
      const response = await request(app)
        .put(`/api/devices/${testDeviceId}`)
        .send({
          command: {
            controlKey: 'power',
            value: 'invalid_boolean_value'
          }
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/devices/:id - Remove device', () => {
    let testDeviceId: string;

    beforeEach(async () => {
      const deviceData: DeviceRegistration = {
        name: 'Test Device',
        type: 'switch',
        room: 'Test Room',
        connectionConfig: {}
      };

      const response = await request(app)
        .post('/api/devices')
        .send(deviceData);

      testDeviceId = response.body.data.id;
    });

    it('should remove device successfully', async () => {
      const response = await request(app)
        .delete(`/api/devices/${testDeviceId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Device removed successfully',
        timestamp: expect.any(String),
      });

      // Verify device is removed
      await request(app)
        .get(`/api/devices/${testDeviceId}`)
        .expect(404);
    });

    it('should return 404 for non-existent device', async () => {
      const response = await request(app)
        .delete('/api/devices/non-existent-id')
        .expect(404);

      expect(response.body.error.message).toBe('Device not found');
    });

    it('should handle multiple deletion attempts', async () => {
      // First deletion should succeed
      await request(app)
        .delete(`/api/devices/${testDeviceId}`)
        .expect(200);

      // Second deletion should fail
      await request(app)
        .delete(`/api/devices/${testDeviceId}`)
        .expect(404);
    });
  });

  describe('GET /api/devices/:id/history - Get device history', () => {
    let testDeviceId: string;

    beforeEach(async () => {
      const deviceData: DeviceRegistration = {
        name: 'Test Sensor',
        type: 'sensor',
        room: 'Test Room',
        connectionConfig: {}
      };

      const response = await request(app)
        .post('/api/devices')
        .send(deviceData);

      testDeviceId = response.body.data.id;
    });

    it('should return historical data with default parameters', async () => {
      const response = await request(app)
        .get(`/api/devices/${testDeviceId}/history`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        count: expect.any(Number),
        query: expect.any(Object),
        timestamp: expect.any(String),
      });
    });

    it('should handle custom date ranges', async () => {
      const startDate = new Date('2023-01-01').toISOString();
      const endDate = new Date('2023-01-02').toISOString();

      const response = await request(app)
        .get(`/api/devices/${testDeviceId}/history`)
        .query({
          startDate,
          endDate,
          property: 'temperature'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.query.startDate).toBeDefined();
      expect(response.body.query.endDate).toBeDefined();
    });

    it('should handle invalid date formats', async () => {
      const response = await request(app)
        .get(`/api/devices/${testDeviceId}/history`)
        .query({
          startDate: 'invalid-date',
          endDate: 'also-invalid'
        });

      // Should either handle gracefully (200) or return error (400/500)
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle limit parameter', async () => {
      const response = await request(app)
        .get(`/api/devices/${testDeviceId}/history`)
        .query({ limit: '10' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent device', async () => {
      const response = await request(app)
        .get('/api/devices/non-existent-id/history')
        .expect(404);

      expect(response.body.error.message).toBe('Device not found');
    });
  });

  describe('GET /api/devices/room/:room - Filter by room', () => {
    beforeEach(async () => {
      // Create test devices in different rooms
      const devices = [
        { name: 'Living Room Switch', type: 'switch', room: 'Living Room' },
        { name: 'Living Room Dimmer', type: 'dimmer', room: 'Living Room' },
        { name: 'Kitchen Sensor', type: 'sensor', room: 'Kitchen' },
      ];

      for (const device of devices) {
        await request(app)
          .post('/api/devices')
          .send({ ...device, connectionConfig: {} });
      }
    });

    it('should return devices filtered by room', async () => {
      const response = await request(app)
        .get('/api/devices/room/Living%20Room')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.room).toBe('Living Room');
      
      response.body.data.forEach((device: any) => {
        expect(device.room).toBe('Living Room');
      });
    });

    it('should return empty array for non-existent room', async () => {
      const response = await request(app)
        .get('/api/devices/room/NonExistentRoom')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.count).toBe(0);
    });

    it('should handle URL-encoded room names', async () => {
      // Create device with special characters in room name
      await request(app)
        .post('/api/devices')
        .send({
          name: 'Special Room Device',
          type: 'switch',
          room: 'Room & Kitchen',
          connectionConfig: {}
        });

      const response = await request(app)
        .get('/api/devices/room/Room%20%26%20Kitchen')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].room).toBe('Room & Kitchen');
    });

    it('should be case sensitive', async () => {
      const response = await request(app)
        .get('/api/devices/room/living%20room') // lowercase
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/devices/type/:type - Filter by type', () => {
    beforeEach(async () => {
      // Create test devices of different types
      const devices = [
        { name: 'Switch 1', type: 'switch', room: 'Living Room' },
        { name: 'Switch 2', type: 'switch', room: 'Kitchen' },
        { name: 'Sensor 1', type: 'sensor', room: 'Living Room' },
      ];

      for (const device of devices) {
        await request(app)
          .post('/api/devices')
          .send({ ...device, connectionConfig: {} });
      }
    });

    it('should return devices filtered by type', async () => {
      const response = await request(app)
        .get('/api/devices/type/switch')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.type).toBe('switch');
      
      response.body.data.forEach((device: any) => {
        expect(device.type).toBe('switch');
      });
    });

    it('should return empty array for non-existent type', async () => {
      const response = await request(app)
        .get('/api/devices/type/nonexistent')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.count).toBe(0);
    });

    it('should be case sensitive', async () => {
      const response = await request(app)
        .get('/api/devices/type/SWITCH') // uppercase
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });
});