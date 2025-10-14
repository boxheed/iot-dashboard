import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../test-utils/testApp';
import { DeviceRegistration } from '@shared/types/Device';

describe('API Integration Tests - Core Functionality', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    // Clean up devices before each test
    const response = await request(app).get('/api/devices');
    const devices = response.body.data;
    
    for (const device of devices) {
      await request(app).delete(`/api/devices/${device.id}`);
    }
  });

  describe('Health and Status Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'OK',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: expect.any(String),
      });
    });

    it('should return system status', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.body).toMatchObject({
        server: {
          status: 'running',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          environment: expect.any(String),
          version: expect.any(String),
        },
        websocket: {
          connected_clients: expect.any(Number),
        },
        devices: {
          total: expect.any(Number),
          online: expect.any(Number),
        },
      });
    });
  });

  describe('Device CRUD Operations', () => {
    it('should create, read, update, and delete devices', async () => {
      // Create device
      const deviceData: DeviceRegistration = {
        name: 'Test Device',
        type: 'switch',
        room: 'Test Room',
        connectionConfig: {}
      };

      const createResponse = await request(app)
        .post('/api/devices')
        .send(deviceData)
        .expect(201);

      const deviceId = createResponse.body.data.id;
      expect(createResponse.body.data.name).toBe('Test Device');

      // Read device
      const readResponse = await request(app)
        .get(`/api/devices/${deviceId}`)
        .expect(200);

      expect(readResponse.body.data.name).toBe('Test Device');

      // Update device
      const updateResponse = await request(app)
        .put(`/api/devices/${deviceId}`)
        .send({ name: 'Updated Device' })
        .expect(200);

      expect(updateResponse.body.data.name).toBe('Updated Device');

      // Delete device
      await request(app)
        .delete(`/api/devices/${deviceId}`)
        .expect(200);

      // Verify deletion
      await request(app)
        .get(`/api/devices/${deviceId}`)
        .expect(404);
    });

    it('should handle device commands', async () => {
      // Create device
      const deviceData: DeviceRegistration = {
        name: 'Test Switch',
        type: 'switch',
        room: 'Test Room',
        connectionConfig: {}
      };

      const createResponse = await request(app)
        .post('/api/devices')
        .send(deviceData);

      const deviceId = createResponse.body.data.id;

      // Send command
      const commandResponse = await request(app)
        .put(`/api/devices/${deviceId}`)
        .send({
          command: {
            controlKey: 'power',
            value: true
          }
        })
        .expect(200);

      expect(commandResponse.body.success).toBe(true);
    });
  });

  describe('Device Filtering', () => {
    beforeEach(async () => {
      // Create test devices
      const devices = [
        { name: 'Living Room Switch', type: 'switch', room: 'Living Room' },
        { name: 'Kitchen Sensor', type: 'sensor', room: 'Kitchen' },
        { name: 'Bedroom Switch', type: 'switch', room: 'Bedroom' },
      ];

      for (const device of devices) {
        await request(app)
          .post('/api/devices')
          .send({ ...device, connectionConfig: {} });
      }
    });

    it('should filter devices by room', async () => {
      const response = await request(app)
        .get('/api/devices/room/Kitchen')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].room).toBe('Kitchen');
    });

    it('should filter devices by type', async () => {
      const response = await request(app)
        .get('/api/devices/type/switch')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      response.body.data.forEach((device: any) => {
        expect(device.type).toBe('switch');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid device creation', async () => {
      const response = await request(app)
        .post('/api/devices')
        .send({
          name: 'Invalid Device',
          type: 'invalid_type',
          room: 'Test Room',
          connectionConfig: {}
        })
        .expect(400);

      expect(response.body.error.message).toContain('Invalid device type');
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/devices')
        .send({
          name: 'Incomplete Device'
          // Missing type and room
        })
        .expect(400);

      expect(response.body.error.message).toContain('Missing required fields');
    });

    it('should handle non-existent device operations', async () => {
      await request(app)
        .get('/api/devices/non-existent-id')
        .expect(404);

      await request(app)
        .put('/api/devices/non-existent-id')
        .send({ name: 'Updated' })
        .expect(404);

      await request(app)
        .delete('/api/devices/non-existent-id')
        .expect(404);
    });

    it('should handle invalid commands', async () => {
      // Create device first
      const deviceData: DeviceRegistration = {
        name: 'Test Device',
        type: 'switch',
        room: 'Test Room',
        connectionConfig: {}
      };

      const createResponse = await request(app)
        .post('/api/devices')
        .send(deviceData);

      const deviceId = createResponse.body.data.id;

      // Send invalid command
      const response = await request(app)
        .put(`/api/devices/${deviceId}`)
        .send({
          command: {
            controlKey: 'invalid_control',
            value: true
          }
        })
        .expect(400);

      expect(response.body.error.message).toContain('not found on device');
    });
  });

  describe('Historical Data', () => {
    it('should handle historical data requests', async () => {
      // Create device
      const deviceData: DeviceRegistration = {
        name: 'Test Sensor',
        type: 'sensor',
        room: 'Test Room',
        connectionConfig: {}
      };

      const createResponse = await request(app)
        .post('/api/devices')
        .send(deviceData);

      const deviceId = createResponse.body.data.id;

      // Request historical data
      const response = await request(app)
        .get(`/api/devices/${deviceId}/history`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        count: expect.any(Number),
        timestamp: expect.any(String),
      });
    });

    it('should handle historical data for non-existent device', async () => {
      await request(app)
        .get('/api/devices/non-existent-id/history')
        .expect(404);
    });
  });
});