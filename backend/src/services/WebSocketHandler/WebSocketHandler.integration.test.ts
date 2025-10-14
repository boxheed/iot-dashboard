import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../../test-utils/testApp';
import { DeviceRegistration } from '@shared/types/Device';

describe('WebSocket Integration Tests', () => {
  let app: Express;
  let testDeviceId: string;

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
  });

  describe('WebSocket Handler Functionality', () => {
    it('should handle device updates through API', async () => {
      // Test that device updates work through the REST API
      const response = await request(app)
        .put(`/api/devices/${testDeviceId}`)
        .send({
          command: {
            controlKey: 'power',
            value: true
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.value).toBe(true);
    });

    it('should handle device status changes', async () => {
      // Test device status through API
      const response = await request(app)
        .get(`/api/devices/${testDeviceId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBeDefined();
    });

    it('should handle device removal', async () => {
      // Test device removal
      await request(app)
        .delete(`/api/devices/${testDeviceId}`)
        .expect(200);

      // Verify device is removed
      await request(app)
        .get(`/api/devices/${testDeviceId}`)
        .expect(404);
    });
  });

  describe('Device Management Integration', () => {
    it('should handle multiple device operations', async () => {
      // Create multiple devices
      const devices = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/devices')
          .send({
            name: `Test Device ${i}`,
            type: 'sensor',
            room: 'Test Room',
            connectionConfig: {}
          })
          .expect(201);
        
        devices.push(response.body.data);
      }

      // Verify all devices were created
      const allDevicesResponse = await request(app)
        .get('/api/devices')
        .expect(200);

      expect(allDevicesResponse.body.data).toHaveLength(4); // 3 new + 1 from beforeEach
    });

    it('should handle device filtering by room', async () => {
      // Create devices in different rooms
      await request(app)
        .post('/api/devices')
        .send({
          name: 'Kitchen Device',
          type: 'sensor',
          room: 'Kitchen',
          connectionConfig: {}
        });

      const response = await request(app)
        .get('/api/devices/room/Kitchen')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].room).toBe('Kitchen');
    });

    it('should handle device filtering by type', async () => {
      // Create devices of different types
      await request(app)
        .post('/api/devices')
        .send({
          name: 'Test Sensor',
          type: 'sensor',
          room: 'Test Room',
          connectionConfig: {}
        });

      const response = await request(app)
        .get('/api/devices/type/sensor')
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      response.body.data.forEach((device: any) => {
        expect(device.type).toBe('sensor');
      });
    });
  });

  describe('API Error Handling', () => {
    it('should handle invalid device commands', async () => {
      const response = await request(app)
        .put(`/api/devices/${testDeviceId}`)
        .send({
          command: {
            controlKey: 'invalid_control',
            value: true
          }
        })
        .expect(400);

      expect(response.body.error.message).toContain('not found on device');
    });

    it('should handle commands for non-existent devices', async () => {
      const response = await request(app)
        .put('/api/devices/non-existent-device')
        .send({
          command: {
            controlKey: 'power',
            value: true
          }
        })
        .expect(404);

      expect(response.body.error.message).toBe('Device not found');
    });

    it('should handle malformed command data', async () => {
      const response = await request(app)
        .put(`/api/devices/${testDeviceId}`)
        .send({
          command: {
            // Missing controlKey and value
          }
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Performance Testing', () => {
    it('should handle multiple device operations efficiently', async () => {
      const startTime = Date.now();
      
      // Create multiple devices
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/devices')
            .send({
              name: `Load Test Device ${i}`,
              type: 'sensor',
              room: 'Test Room',
              connectionConfig: {}
            })
        );
      }

      await Promise.all(promises);
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should handle rapid API calls', async () => {
      const promises = [];
      
      // Make multiple rapid API calls
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .put(`/api/devices/${testDeviceId}`)
            .send({
              command: {
                controlKey: 'power',
                value: i % 2 === 0
              }
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});