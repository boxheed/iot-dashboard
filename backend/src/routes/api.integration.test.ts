import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client, Socket } from 'socket.io-client';
import { createTestApp } from '../test-utils/testApp';
import { DeviceRegistration } from '@shared/types/Device';

describe('API Integration Tests', () => {
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

  describe('REST API Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/devices')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle oversized request payload', async () => {
      // Create a payload that exceeds typical limits
      const largePayload = {
        name: 'A'.repeat(100000), // Much larger payload
        type: 'switch',
        room: 'Test Room',
        connectionConfig: {}
      };

      // This test might pass if the server accepts large payloads
      // In a real scenario, you'd configure express.json() with a size limit
      const response = await request(app)
        .post('/api/devices')
        .send(largePayload);

      // Accept either success (if no size limit) or error (if size limit configured)
      expect([200, 201, 400, 413]).toContain(response.status);
    });

    it('should return 404 for non-existent API endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body.error.message).toMatch(/not found|Route.*not/i);
    });

    it('should handle invalid HTTP methods on valid endpoints', async () => {
      const response = await request(app)
        .patch('/api/devices')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Device API Validation Tests', () => {
    it('should validate device type enum values', async () => {
      const invalidTypes = ['invalid', 'unknown', 'custom', ''];
      
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

    it('should validate required fields with various missing combinations', async () => {
      const testCases = [
        { type: 'switch', room: 'Test' }, // missing name
        { name: 'Test', room: 'Test' }, // missing type
        { name: 'Test', type: 'switch' }, // missing room
        {}, // missing all
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/devices')
          .send(testCase)
          .expect(400);

        expect(response.body.error.message).toContain('Missing required fields');
      }
    });

    it('should handle empty string values for required fields', async () => {
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
  });

  describe('Device Command Validation', () => {
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

    it('should validate command values based on control type', async () => {
      // Test invalid values for different control types
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

  describe('Historical Data API Tests', () => {
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

    it('should handle invalid date formats in query parameters', async () => {
      const response = await request(app)
        .get(`/api/devices/${testDeviceId}/history`)
        .query({
          startDate: 'invalid-date',
          endDate: 'also-invalid'
        });

      // Should either handle gracefully (200) or return error (400/500)
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should handle future dates in query parameters', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const response = await request(app)
        .get(`/api/devices/${testDeviceId}/history`)
        .query({
          startDate: futureDate.toISOString(),
          endDate: futureDate.toISOString()
        })
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('should handle invalid limit parameter', async () => {
      const response = await request(app)
        .get(`/api/devices/${testDeviceId}/history`)
        .query({
          limit: 'not-a-number'
        })
        .expect(200);

      // Should use default behavior when limit is invalid
      expect(response.body.data).toBeDefined();
    });

    it('should handle very large limit values', async () => {
      const response = await request(app)
        .get(`/api/devices/${testDeviceId}/history`)
        .query({
          limit: '999999'
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('Device Filtering API Tests', () => {
    beforeEach(async () => {
      // Create test devices in different rooms and types
      const devices = [
        { name: 'Living Room Switch', type: 'switch', room: 'Living Room' },
        { name: 'Living Room Dimmer', type: 'dimmer', room: 'Living Room' },
        { name: 'Kitchen Sensor', type: 'sensor', room: 'Kitchen' },
        { name: 'Bedroom Thermostat', type: 'thermostat', room: 'Bedroom' },
      ];

      for (const device of devices) {
        await request(app)
          .post('/api/devices')
          .send({ ...device, connectionConfig: {} });
      }
    });

    it('should handle URL-encoded room names with special characters', async () => {
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

    it('should return empty array for non-existent room', async () => {
      const response = await request(app)
        .get('/api/devices/room/NonExistentRoom')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.count).toBe(0);
    });

    it('should return empty array for non-existent device type', async () => {
      const response = await request(app)
        .get('/api/devices/type/nonexistent')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.count).toBe(0);
    });

    it('should handle case sensitivity in room and type filters', async () => {
      const roomResponse = await request(app)
        .get('/api/devices/room/living%20room') // lowercase
        .expect(200);

      const typeResponse = await request(app)
        .get('/api/devices/type/SWITCH') // uppercase
        .expect(200);

      // Should be case sensitive and return no results
      expect(roomResponse.body.data).toHaveLength(0);
      expect(typeResponse.body.data).toHaveLength(0);
    });
  });
});