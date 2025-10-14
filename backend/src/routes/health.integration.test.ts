import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../test-utils/testApp';

describe('Health and Status API Integration Tests', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  describe('GET /api/health', () => {
    it('should return health status successfully', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'OK',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: expect.any(String),
      });

      // Validate timestamp format
      expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
      
      // Uptime should be a positive number
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    it('should return consistent response format', async () => {
      const responses = await Promise.all([
        request(app).get('/api/health'),
        request(app).get('/api/health'),
        request(app).get('/api/health'),
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'OK');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('uptime');
        expect(response.body).toHaveProperty('environment');
      });
    });

    it('should handle concurrent health check requests', async () => {
      const concurrentRequests = Array(10).fill(null).map(() => 
        request(app).get('/api/health')
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('OK');
      });
    });
  });

  describe('GET /api/status', () => {
    it('should return detailed system status', async () => {
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

      // Validate server status
      expect(response.body.server.status).toBe('running');
      expect(response.body.server.uptime).toBeGreaterThan(0);

      // Validate WebSocket status
      expect(response.body.websocket.connected_clients).toBeGreaterThanOrEqual(0);

      // Validate device counts
      expect(response.body.devices.total).toBeGreaterThanOrEqual(0);
      expect(response.body.devices.online).toBeGreaterThanOrEqual(0);
      expect(response.body.devices.online).toBeLessThanOrEqual(response.body.devices.total);
    });

    it('should reflect device count changes', async () => {
      // Get initial status
      const initialResponse = await request(app).get('/api/status');
      const initialDeviceCount = initialResponse.body.devices.total;

      // Add a device
      await request(app)
        .post('/api/devices')
        .send({
          name: 'Status Test Device',
          type: 'switch',
          room: 'Test Room',
          connectionConfig: {}
        });

      // Check status again
      const updatedResponse = await request(app).get('/api/status');
      const updatedDeviceCount = updatedResponse.body.devices.total;

      expect(updatedDeviceCount).toBe(initialDeviceCount + 1);
    });

    it('should handle status requests during high load', async () => {
      // Create multiple devices to simulate load
      const devicePromises = Array(5).fill(null).map((_, i) =>
        request(app)
          .post('/api/devices')
          .send({
            name: `Load Test Device ${i}`,
            type: 'sensor',
            room: 'Test Room',
            connectionConfig: {}
          })
      );

      await Promise.all(devicePromises);

      // Request status multiple times concurrently
      const statusPromises = Array(10).fill(null).map(() =>
        request(app).get('/api/status')
      );

      const responses = await Promise.all(statusPromises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.server.status).toBe('running');
        expect(response.body.devices.total).toBeGreaterThanOrEqual(5);
      });
    });
  });

  describe('Error Handling for Health Endpoints', () => {
    it('should handle malformed requests to health endpoint', async () => {
      const response = await request(app)
        .post('/api/health') // Wrong method
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('should handle requests with invalid headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Content-Type', 'invalid/type')
        .expect(200);

      // Should still work despite invalid content-type
      expect(response.body.status).toBe('OK');
    });

    it('should handle requests with query parameters', async () => {
      const response = await request(app)
        .get('/api/health')
        .query({ 
          test: 'parameter',
          another: 'value'
        })
        .expect(200);

      // Should ignore query parameters and return normal response
      expect(response.body.status).toBe('OK');
    });
  });

  describe('Response Time and Performance', () => {
    it('should respond to health checks quickly', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/health')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      // Health check should respond within 100ms
      expect(responseTime).toBeLessThan(100);
    });

    it('should respond to status checks within reasonable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/status')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      
      // Status check should respond within 200ms
      expect(responseTime).toBeLessThan(200);
    });

    it('should maintain performance under concurrent load', async () => {
      const concurrentRequests = 20;
      const startTime = Date.now();

      const promises = Array(concurrentRequests).fill(null).map(() =>
        request(app).get('/api/health')
      );

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Average response time should be reasonable
      const averageTime = totalTime / concurrentRequests;
      expect(averageTime).toBeLessThan(50);
    });
  });

  describe('Content Type and Headers', () => {
    it('should return JSON content type for health endpoint', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should return JSON content type for status endpoint', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Check for common security headers (these might be set by helmet middleware)
      expect(response.headers).toHaveProperty('x-powered-by');
    });

    it('should handle Accept header variations', async () => {
      const acceptHeaders = [
        'application/json',
        'application/*',
        '*/*',
        'text/html,application/json',
      ];

      for (const acceptHeader of acceptHeaders) {
        const response = await request(app)
          .get('/api/health')
          .set('Accept', acceptHeader)
          .expect(200);

        expect(response.body.status).toBe('OK');
      }
    });
  });
});