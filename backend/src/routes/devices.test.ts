import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../test-utils/testApp';
import { DeviceRegistration } from '@shared/types/Device';

describe('Device API Integration Tests', () => {
  let app: Express;
  let testDeviceId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    // Clean up any existing test devices
    const response = await request(app).get('/api/devices');
    const devices = response.body.data;
    
    for (const device of devices) {
      if (device.name.includes('Test')) {
        await request(app).delete(`/api/devices/${device.id}`);
      }
    }
  });

  describe('GET /api/devices', () => {
    it('should return empty array when no devices exist', async () => {
      const response = await request(app)
        .get('/api/devices')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        count: expect.any(Number),
        timestamp: expect.any(String),
      });
    });

    it('should return devices when they exist', async () => {
      // First create a test device
      const deviceData: DeviceRegistration = {
        name: 'Test Switch',
        type: 'switch',
        room: 'Living Room',
        connectionConfig: {},
      };

      const createResponse = await request(app)
        .post('/api/devices')
        .send(deviceData)
        .expect(201);

      testDeviceId = createResponse.body.data.id;

      // Then get all devices
      const response = await request(app)
        .get('/api/devices')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        id: testDeviceId,
        name: 'Test Switch',
        type: 'switch',
        room: 'Living Room',
      });
    });
  });

  describe('POST /api/devices', () => {
    it('should create a new device successfully', async () => {
      const deviceData: DeviceRegistration = {
        name: 'Test Dimmer',
        type: 'dimmer',
        room: 'Bedroom',
        connectionConfig: { topic: 'test/dimmer' },
      };

      const response = await request(app)
        .post('/api/devices')
        .send(deviceData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Device registered successfully',
        data: {
          name: 'Test Dimmer',
          type: 'dimmer',
          room: 'Bedroom',
          status: 'offline',
          controls: expect.any(Array),
        },
        timestamp: expect.any(String),
      });

      testDeviceId = response.body.data.id;
    });

    it('should reject device with missing required fields', async () => {
      const invalidDevice = {
        name: 'Test Device',
        // Missing type and room
      };

      const response = await request(app)
        .post('/api/devices')
        .send(invalidDevice)
        .expect(400);

      expect(response.body.error.message).toContain('Missing required fields');
    });

    it('should reject device with invalid type', async () => {
      const invalidDevice = {
        name: 'Test Device',
        type: 'invalid_type',
        room: 'Test Room',
        connectionConfig: {},
      };

      const response = await request(app)
        .post('/api/devices')
        .send(invalidDevice)
        .expect(400);

      expect(response.body.error.message).toContain('Invalid device type');
    });
  });

  describe('GET /api/devices/:id', () => {
    beforeEach(async () => {
      // Create a test device
      const deviceData: DeviceRegistration = {
        name: 'Test Sensor',
        type: 'sensor',
        room: 'Kitchen',
        connectionConfig: {},
      };

      const response = await request(app)
        .post('/api/devices')
        .send(deviceData);

      testDeviceId = response.body.data.id;
    });

    it('should return device by ID', async () => {
      const response = await request(app)
        .get(`/api/devices/${testDeviceId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: testDeviceId,
          name: 'Test Sensor',
          type: 'sensor',
          room: 'Kitchen',
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
  });

  describe('PUT /api/devices/:id', () => {
    beforeEach(async () => {
      // Create a test device
      const deviceData: DeviceRegistration = {
        name: 'Test Switch',
        type: 'switch',
        room: 'Living Room',
        connectionConfig: {},
      };

      const response = await request(app)
        .post('/api/devices')
        .send(deviceData);

      testDeviceId = response.body.data.id;
    });

    it('should update device information', async () => {
      const updates = {
        name: 'Updated Switch',
        room: 'Updated Room',
      };

      const response = await request(app)
        .put(`/api/devices/${testDeviceId}`)
        .send(updates)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Device updated successfully',
        data: {
          id: testDeviceId,
          name: 'Updated Switch',
          room: 'Updated Room',
        },
      });
    });

    it('should process device command', async () => {
      const command = {
        command: {
          controlKey: 'power',
          value: true,
        },
      };

      const response = await request(app)
        .put(`/api/devices/${testDeviceId}`)
        .send(command)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Command executed successfully',
        data: {
          deviceId: testDeviceId,
          controlKey: 'power',
          value: true,
        },
      });
    });

    it('should reject invalid command', async () => {
      const invalidCommand = {
        command: {
          controlKey: 'invalid_control',
          value: true,
        },
      };

      const response = await request(app)
        .put(`/api/devices/${testDeviceId}`)
        .send(invalidCommand)
        .expect(400);

      expect(response.body.error.message).toContain('not found on device');
    });

    it('should return 404 for non-existent device', async () => {
      const updates = { name: 'Updated Name' };

      const response = await request(app)
        .put('/api/devices/non-existent-id')
        .send(updates)
        .expect(404);

      expect(response.body.error.message).toBe('Device not found');
    });
  });

  describe('DELETE /api/devices/:id', () => {
    beforeEach(async () => {
      // Create a test device
      const deviceData: DeviceRegistration = {
        name: 'Test Device to Delete',
        type: 'switch',
        room: 'Test Room',
        connectionConfig: {},
      };

      const response = await request(app)
        .post('/api/devices')
        .send(deviceData);

      testDeviceId = response.body.data.id;
    });

    it('should delete device successfully', async () => {
      const response = await request(app)
        .delete(`/api/devices/${testDeviceId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Device removed successfully',
        timestamp: expect.any(String),
      });

      // Verify device is deleted
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
  });

  describe('GET /api/devices/:id/history', () => {
    beforeEach(async () => {
      // Create a test device
      const deviceData: DeviceRegistration = {
        name: 'Test Sensor with History',
        type: 'sensor',
        room: 'Test Room',
        connectionConfig: {},
      };

      const response = await request(app)
        .post('/api/devices')
        .send(deviceData);

      testDeviceId = response.body.data.id;

      // Add some test data by sending commands
      await request(app)
        .put(`/api/devices/${testDeviceId}`)
        .send({
          command: {
            controlKey: 'value',
            value: 25.5,
          },
        });
    });

    it('should return historical data for device', async () => {
      const response = await request(app)
        .get(`/api/devices/${testDeviceId}/history`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        count: expect.any(Number),
        timestamp: expect.any(String),
      });
    });

    it('should return 404 for non-existent device', async () => {
      const response = await request(app)
        .get('/api/devices/non-existent-id/history')
        .expect(404);

      expect(response.body.error.message).toBe('Device not found');
    });
  });

  describe('GET /api/devices/room/:room', () => {
    beforeEach(async () => {
      // Create devices in different rooms
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

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        count: 2,
        room: 'Living Room',
      });

      expect(response.body.data.every((device: any) => device.room === 'Living Room')).toBe(true);
    });
  });

  describe('GET /api/devices/type/:type', () => {
    beforeEach(async () => {
      // Create devices of different types
      const devices = [
        { name: 'Switch 1', type: 'switch', room: 'Room 1' },
        { name: 'Switch 2', type: 'switch', room: 'Room 2' },
        { name: 'Sensor 1', type: 'sensor', room: 'Room 1' },
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

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        count: 2,
        type: 'switch',
      });

      expect(response.body.data.every((device: any) => device.type === 'switch')).toBe(true);
    });
  });
});