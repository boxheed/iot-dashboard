import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../test-utils/testApp';
import { DeviceRegistration } from '@shared/types/Device';

describe('API Error Handling Integration Tests', () => {
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

  describe('HTTP Method Validation', () => {
    it('should return 404 for unsupported HTTP methods', async () => {
      const endpoints = [
        '/api/devices',
        '/api/devices/test-id',
        '/api/health',
        '/api/status'
      ];

      const unsupportedMethods = ['PATCH', 'OPTIONS', 'HEAD'];

      for (const endpoint of endpoints) {
        for (const method of unsupportedMethods) {
          const response = await request(app)
            [method.toLowerCase() as keyof typeof request](en