/**
 * Integration tests for notification API endpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../test-utils/testApp.js';
import { Express } from 'express';
import { 
  CreateNotificationRequest, 
  Notification 
} from '../../../shared/src/types/Notification.js';

describe('Notification API Integration Tests', () => {
  let app: Express;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/notifications', () => {
    it('should create a new notification', async () => {
      const notificationRequest: CreateNotificationRequest = {
        type: 'alert',
        title: 'Test Alert',
        message: 'This is a test alert message',
        priority: 'high',
        deviceId: 'test-device-1'
      };

      const response = await request(app)
        .post('/api/notifications')
        .send(notificationRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        type: 'alert',
        title: 'Test Alert',
        message: 'This is a test alert message',
        priority: 'high',
        deviceId: 'test-device-1',
        isRead: false
      });
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        type: 'alert',
        // Missing title, message, priority
      };

      const response = await request(app)
        .post('/api/notifications')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should validate notification type', async () => {
      const invalidRequest = {
        type: 'invalid-type',
        title: 'Test',
        message: 'Test message',
        priority: 'high'
      };

      const response = await request(app)
        .post('/api/notifications')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid notification type');
    });

    it('should validate priority', async () => {
      const invalidRequest = {
        type: 'alert',
        title: 'Test',
        message: 'Test message',
        priority: 'invalid-priority'
      };

      const response = await request(app)
        .post('/api/notifications')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid priority');
    });
  });

  describe('GET /api/notifications', () => {
    beforeEach(async () => {
      // Create test notifications
      const notifications = [
        {
          type: 'alert',
          title: 'Security Alert',
          message: 'Motion detected',
          priority: 'high',
          deviceId: 'camera-1'
        },
        {
          type: 'warning',
          title: 'Low Battery',
          message: 'Battery at 15%',
          priority: 'medium',
          deviceId: 'sensor-1'
        },
        {
          type: 'info',
          title: 'Device Online',
          message: 'Device connected',
          priority: 'low',
          deviceId: 'switch-1'
        }
      ];

      for (const notification of notifications) {
        await request(app)
          .post('/api/notifications')
          .send(notification);
      }
    });

    it('should get all notifications', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.count).toBe(3);
    });

    it('should filter notifications by type', async () => {
      const response = await request(app)
        .get('/api/notifications?type=alert')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('alert');
    });

    it('should filter notifications by device', async () => {
      const response = await request(app)
        .get('/api/notifications?deviceId=camera-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].deviceId).toBe('camera-1');
    });

    it('should filter notifications by read status', async () => {
      const response = await request(app)
        .get('/api/notifications?isRead=false')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data.every((n: Notification) => !n.isRead)).toBe(true);
    });

    it('should limit number of notifications', async () => {
      const response = await request(app)
        .get('/api/notifications?limit=2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    let notificationId: string;

    beforeEach(async () => {
      // Create a test notification
      const createResponse = await request(app)
        .post('/api/notifications')
        .send({
          type: 'alert',
          title: 'Test Alert',
          message: 'Test message',
          priority: 'high'
        });

      notificationId = createResponse.body.data.id;
    });

    it('should mark notification as read', async () => {
      const response = await request(app)
        .put(`/api/notifications/${notificationId}/read`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('marked as read');
    });
  });

  describe('PUT /api/notifications/device/:deviceId/read', () => {
    beforeEach(async () => {
      // Create test notifications for a device
      const notifications = [
        {
          type: 'alert',
          title: 'Alert 1',
          message: 'Message 1',
          priority: 'high',
          deviceId: 'test-device'
        },
        {
          type: 'warning',
          title: 'Warning 1',
          message: 'Message 2',
          priority: 'medium',
          deviceId: 'test-device'
        }
      ];

      for (const notification of notifications) {
        await request(app)
          .post('/api/notifications')
          .send(notification);
      }
    });

    it('should mark all device notifications as read', async () => {
      const response = await request(app)
        .put('/api/notifications/device/test-device/read')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('All device notifications marked as read');
      expect(response.body.deviceId).toBe('test-device');
    });
  });

  describe('GET /api/notifications/stats', () => {
    beforeEach(async () => {
      // Create test notifications with different types and priorities
      const notifications = [
        { type: 'alert', title: 'Alert 1', message: 'Message 1', priority: 'high' },
        { type: 'warning', title: 'Warning 1', message: 'Message 2', priority: 'medium' },
        { type: 'info', title: 'Info 1', message: 'Message 3', priority: 'low' },
        { type: 'error', title: 'Error 1', message: 'Message 4', priority: 'high' }
      ];

      for (const notification of notifications) {
        await request(app)
          .post('/api/notifications')
          .send(notification);
      }
    });

    it('should return notification statistics', async () => {
      const response = await request(app)
        .get('/api/notifications/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        total: 4,
        unread: 4,
        byType: {
          alert: 1,
          warning: 1,
          info: 1,
          error: 1
        },
        byPriority: {
          high: 2,
          medium: 1,
          low: 1
        }
      });
    });
  });

  describe('GET /api/notifications/device/:deviceId', () => {
    beforeEach(async () => {
      // Create notifications for different devices
      const notifications = [
        {
          type: 'alert',
          title: 'Device 1 Alert',
          message: 'Message 1',
          priority: 'high',
          deviceId: 'device-1'
        },
        {
          type: 'warning',
          title: 'Device 1 Warning',
          message: 'Message 2',
          priority: 'medium',
          deviceId: 'device-1'
        },
        {
          type: 'info',
          title: 'Device 2 Info',
          message: 'Message 3',
          priority: 'low',
          deviceId: 'device-2'
        }
      ];

      for (const notification of notifications) {
        await request(app)
          .post('/api/notifications')
          .send(notification);
      }
    });

    it('should get notifications for specific device', async () => {
      const response = await request(app)
        .get('/api/notifications/device/device-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((n: Notification) => n.deviceId === 'device-1')).toBe(true);
      expect(response.body.deviceId).toBe('device-1');
    });

    it('should return empty array for device with no notifications', async () => {
      const response = await request(app)
        .get('/api/notifications/device/nonexistent-device')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('DELETE /api/notifications/cleanup', () => {
    it('should clean up old notifications', async () => {
      // Create a test notification first
      await request(app)
        .post('/api/notifications')
        .send({
          type: 'info',
          title: 'Old Notification',
          message: 'This will be cleaned up',
          priority: 'low'
        });

      const response = await request(app)
        .delete('/api/notifications/cleanup?olderThanDays=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Cleaned up');
      expect(response.body.olderThanDays).toBe(1);
      expect(typeof response.body.deletedCount).toBe('number');
    });

    it('should validate olderThanDays parameter', async () => {
      const response = await request(app)
        .delete('/api/notifications/cleanup?olderThanDays=0')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('olderThanDays must be at least 1');
    });

    it('should use default value when no parameter provided', async () => {
      const response = await request(app)
        .delete('/api/notifications/cleanup')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.olderThanDays).toBe(30);
    });
  });
});