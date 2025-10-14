/**
 * Integration tests for the complete notification system functionality
 * Tests threshold monitoring, real-time delivery, and read status management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationService } from './NotificationService.js';
import { DataStorageService } from '../DataStorage/DataStorageService.js';
import { WebSocketHandler } from '../WebSocketHandler/WebSocketHandler.js';
import { Database } from '../../utils/database.js';
import { 
  Device, 
  DeviceProperty, 
  Threshold 
} from '../../../../shared/src/types/Device.js';
import { 
  Notification 
} from '../../../../shared/src/types/Notification.js';

describe('Notification System Integration Tests', () => {
  let notificationService: NotificationService;
  let dataStorage: DataStorageService;
  let webSocketHandler: WebSocketHandler;
  let database: Database;

  beforeEach(async () => {
    // Create in-memory database for testing
    database = new Database({
      filename: ':memory:',
      verbose: false,
    });

    await database.connect();

    // Create tables
    const createTables = [
      `CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        room TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'offline',
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        properties TEXT,
        controls TEXT,
        thresholds TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        device_id TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_read BOOLEAN DEFAULT FALSE,
        priority TEXT NOT NULL DEFAULT 'medium'
      )`
    ];

    for (const sql of createTables) {
      await database.run(sql);
    }

    // Initialize services
    dataStorage = new DataStorageService(database);
    webSocketHandler = {
      broadcastNotification: vi.fn(),
      broadcastNotificationUpdate: vi.fn(),
      broadcastDeviceNotificationsRead: vi.fn(),
    } as any;

    notificationService = new NotificationService(dataStorage, webSocketHandler);
  });

  afterEach(async () => {
    await database.close();
    vi.clearAllMocks();
  });

  describe('Threshold Monitoring', () => {
    it('should detect temperature threshold violations and create notifications', async () => {
      // Create a device with temperature thresholds
      const device: Device = {
        id: 'temp-sensor-1',
        name: 'Living Room Temperature',
        type: 'sensor',
        room: 'Living Room',
        status: 'online',
        lastSeen: new Date(),
        properties: [
          {
            key: 'temperature',
            value: 35, // Above threshold
            unit: '°C',
            timestamp: new Date()
          }
        ],
        controls: [],
        thresholds: [
          {
            propertyKey: 'temperature',
            min: 18,
            max: 25,
            enabled: true
          }
        ]
      };

      // Save device to database
      await dataStorage.saveDevice(device);

      // Check thresholds
      const notifications = await notificationService.checkDeviceThresholds(device);

      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('alert');
      expect(notifications[0].title).toBe('Temperature Too High');
      expect(notifications[0].message).toContain('35°C');
      expect(notifications[0].message).toContain('25°C');
      expect(notifications[0].deviceId).toBe('temp-sensor-1');
      expect(notifications[0].priority).toBe('medium'); // 40% above threshold

      // Verify WebSocket broadcast was called
      expect(webSocketHandler.broadcastNotification).toHaveBeenCalledWith(notifications[0]);
    });

    it('should detect humidity threshold violations (minimum)', async () => {
      const device: Device = {
        id: 'humidity-sensor-1',
        name: 'Bedroom Humidity',
        type: 'sensor',
        room: 'Bedroom',
        status: 'online',
        lastSeen: new Date(),
        properties: [
          {
            key: 'humidity',
            value: 25, // Below threshold
            unit: '%',
            timestamp: new Date()
          }
        ],
        controls: [],
        thresholds: [
          {
            propertyKey: 'humidity',
            min: 40,
            max: 70,
            enabled: true
          }
        ]
      };

      await dataStorage.saveDevice(device);

      const notifications = await notificationService.checkDeviceThresholds(device);

      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('alert');
      expect(notifications[0].title).toBe('Humidity Too Low');
      expect(notifications[0].message).toContain('25%');
      expect(notifications[0].message).toContain('40%');
      expect(notifications[0].priority).toBe('medium'); // 37.5% below threshold
    });

    it('should not create notifications for disabled thresholds', async () => {
      const device: Device = {
        id: 'sensor-disabled',
        name: 'Disabled Sensor',
        type: 'sensor',
        room: 'Test Room',
        status: 'online',
        lastSeen: new Date(),
        properties: [
          {
            key: 'temperature',
            value: 50, // Way above threshold
            unit: '°C',
            timestamp: new Date()
          }
        ],
        controls: [],
        thresholds: [
          {
            propertyKey: 'temperature',
            max: 25,
            enabled: false // Disabled
          }
        ]
      };

      const notifications = await notificationService.checkDeviceThresholds(device);

      expect(notifications).toHaveLength(0);
      expect(webSocketHandler.broadcastNotification).not.toHaveBeenCalled();
    });

    it('should handle multiple threshold violations', async () => {
      const device: Device = {
        id: 'multi-sensor',
        name: 'Multi Sensor',
        type: 'sensor',
        room: 'Office',
        status: 'online',
        lastSeen: new Date(),
        properties: [
          {
            key: 'temperature',
            value: 35,
            unit: '°C',
            timestamp: new Date()
          },
          {
            key: 'humidity',
            value: 20,
            unit: '%',
            timestamp: new Date()
          }
        ],
        controls: [],
        thresholds: [
          {
            propertyKey: 'temperature',
            max: 25,
            enabled: true
          },
          {
            propertyKey: 'humidity',
            min: 30,
            enabled: true
          }
        ]
      };

      const notifications = await notificationService.checkDeviceThresholds(device);

      expect(notifications).toHaveLength(2);
      expect(notifications.find(n => n.title === 'Temperature Too High')).toBeDefined();
      expect(notifications.find(n => n.title === 'Humidity Too Low')).toBeDefined();
      expect(webSocketHandler.broadcastNotification).toHaveBeenCalledTimes(2);
    });
  });

  describe('Real-time Notification Delivery', () => {
    it('should broadcast security alerts immediately', async () => {
      const deviceId = 'security-camera-1';
      const device: Device = {
        id: deviceId,
        name: 'Front Door Camera',
        type: 'camera',
        room: 'Entrance',
        status: 'online',
        lastSeen: new Date(),
        properties: [],
        controls: []
      };

      await dataStorage.saveDevice(device);

      const notification = await notificationService.createSecurityAlert(deviceId, 'Motion detected at front door');

      expect(notification.type).toBe('alert');
      expect(notification.title).toBe('Security Alert');
      expect(notification.message).toContain('Front Door Camera');
      expect(notification.message).toContain('Motion detected at front door');
      expect(notification.priority).toBe('high');

      // Verify immediate WebSocket broadcast
      expect(webSocketHandler.broadcastNotification).toHaveBeenCalledWith(notification);
    });

    it('should broadcast low battery warnings', async () => {
      const deviceId = 'door-sensor-1';
      const device: Device = {
        id: deviceId,
        name: 'Main Door Sensor',
        type: 'sensor',
        room: 'Entrance',
        status: 'online',
        lastSeen: new Date(),
        properties: [],
        controls: []
      };

      await dataStorage.saveDevice(device);

      const notification = await notificationService.createLowBatteryWarning(deviceId, 10);

      expect(notification.type).toBe('warning');
      expect(notification.title).toBe('Low Battery');
      expect(notification.message).toContain('Main Door Sensor');
      expect(notification.message).toContain('10%');
      expect(notification.priority).toBe('medium');

      expect(webSocketHandler.broadcastNotification).toHaveBeenCalledWith(notification);
    });

    it('should broadcast device status changes', async () => {
      const deviceId = 'smart-switch-1';
      const device: Device = {
        id: deviceId,
        name: 'Living Room Switch',
        type: 'switch',
        room: 'Living Room',
        status: 'offline',
        lastSeen: new Date(),
        properties: [],
        controls: []
      };

      await dataStorage.saveDevice(device);

      // Test device going offline
      const offlineNotification = await notificationService.createDeviceOfflineNotification(deviceId);
      expect(offlineNotification.type).toBe('warning');
      expect(offlineNotification.title).toBe('Device Offline');
      expect(webSocketHandler.broadcastNotification).toHaveBeenCalledWith(offlineNotification);

      // Test device coming online
      const onlineNotification = await notificationService.createDeviceOnlineNotification(deviceId);
      expect(onlineNotification.type).toBe('info');
      expect(onlineNotification.title).toBe('Device Online');
      expect(webSocketHandler.broadcastNotification).toHaveBeenCalledWith(onlineNotification);
    });
  });

  describe('Notification Read Status Management', () => {
    let testNotifications: Notification[];

    beforeEach(async () => {
      // Create test notifications
      const requests = [
        {
          type: 'alert' as const,
          title: 'Test Alert 1',
          message: 'First test message',
          priority: 'high' as const,
          deviceId: 'device-1'
        },
        {
          type: 'warning' as const,
          title: 'Test Warning 1',
          message: 'Second test message',
          priority: 'medium' as const,
          deviceId: 'device-1'
        },
        {
          type: 'info' as const,
          title: 'Test Info 1',
          message: 'Third test message',
          priority: 'low' as const,
          deviceId: 'device-2'
        }
      ];

      testNotifications = [];
      for (const request of requests) {
        const notification = await notificationService.createNotification(request);
        testNotifications.push(notification);
      }

      // Clear the broadcast calls from creation
      vi.clearAllMocks();
    });

    it('should mark individual notifications as read', async () => {
      const notificationId = testNotifications[0].id;

      await notificationService.markNotificationAsRead(notificationId);

      // Verify WebSocket update broadcast
      expect(webSocketHandler.broadcastNotificationUpdate).toHaveBeenCalledWith(
        notificationId,
        { isRead: true }
      );

      // Verify notification is marked as read in database
      const notifications = await notificationService.getNotifications({ isRead: false });
      expect(notifications.find(n => n.id === notificationId)).toBeUndefined();

      const readNotifications = await notificationService.getNotifications({ isRead: true });
      expect(readNotifications.find(n => n.id === notificationId)).toBeDefined();
    });

    it('should mark all device notifications as read', async () => {
      const deviceId = 'device-1';

      await notificationService.markDeviceNotificationsAsRead(deviceId);

      // Verify WebSocket broadcast
      expect(webSocketHandler.broadcastDeviceNotificationsRead).toHaveBeenCalledWith(deviceId);

      // Verify all device-1 notifications are marked as read
      const unreadNotifications = await notificationService.getNotifications({ 
        deviceId: 'device-1', 
        isRead: false 
      });
      expect(unreadNotifications).toHaveLength(0);

      // Verify device-2 notifications are still unread
      const device2Unread = await notificationService.getNotifications({ 
        deviceId: 'device-2', 
        isRead: false 
      });
      expect(device2Unread).toHaveLength(1);
    });

    it('should provide accurate notification statistics', async () => {
      // Mark one notification as read
      await notificationService.markNotificationAsRead(testNotifications[0].id);

      const stats = await notificationService.getNotificationStats();

      expect(stats.total).toBe(3);
      expect(stats.unread).toBe(2);
      expect(stats.byType).toEqual({
        alert: 1,
        warning: 1,
        info: 1,
        error: 0
      });
      expect(stats.byPriority).toEqual({
        high: 1,
        medium: 1,
        low: 1
      });
    });
  });

  describe('System Error Notifications', () => {
    it('should create system error notifications', async () => {
      const errorMessage = 'Database connection failed';
      const deviceId = 'problematic-device';

      const notification = await notificationService.createSystemErrorNotification(errorMessage, deviceId);

      expect(notification.type).toBe('error');
      expect(notification.title).toBe('System Error');
      expect(notification.message).toBe(errorMessage);
      expect(notification.deviceId).toBe(deviceId);
      expect(notification.priority).toBe('high');

      expect(webSocketHandler.broadcastNotification).toHaveBeenCalledWith(notification);
    });

    it('should create system error notifications without device ID', async () => {
      const errorMessage = 'General system failure';

      const notification = await notificationService.createSystemErrorNotification(errorMessage);

      expect(notification.type).toBe('error');
      expect(notification.title).toBe('System Error');
      expect(notification.message).toBe(errorMessage);
      expect(notification.deviceId).toBeUndefined();
      expect(notification.priority).toBe('high');
    });
  });

  describe('Notification Cleanup', () => {
    it('should clean up old notifications', async () => {
      // Create some test notifications
      await notificationService.createNotification({
        type: 'info',
        title: 'Old Notification',
        message: 'This should be cleaned up',
        priority: 'low'
      });

      // Get initial count
      const initialNotifications = await notificationService.getNotifications();
      expect(initialNotifications.length).toBeGreaterThan(0);

      // Clean up notifications older than 0 days (should clean all)
      const deletedCount = await notificationService.cleanupOldNotifications(0);

      expect(deletedCount).toBeGreaterThan(0);

      // Verify notifications were cleaned up
      const remainingNotifications = await notificationService.getNotifications();
      expect(remainingNotifications).toHaveLength(0);
    });
  });

  describe('Priority Calculation', () => {
    it('should calculate high priority for severe threshold violations', async () => {
      const device: Device = {
        id: 'severe-sensor',
        name: 'Severe Test Sensor',
        type: 'sensor',
        room: 'Test',
        status: 'online',
        lastSeen: new Date(),
        properties: [
          {
            key: 'temperature',
            value: 50, // 100% above threshold (25)
            unit: '°C',
            timestamp: new Date()
          }
        ],
        controls: [],
        thresholds: [
          {
            propertyKey: 'temperature',
            max: 25,
            enabled: true
          }
        ]
      };

      const notifications = await notificationService.checkDeviceThresholds(device);

      expect(notifications).toHaveLength(1);
      expect(notifications[0].priority).toBe('high'); // >50% difference
    });

    it('should calculate medium priority for moderate threshold violations', async () => {
      const device: Device = {
        id: 'moderate-sensor',
        name: 'Moderate Test Sensor',
        type: 'sensor',
        room: 'Test',
        status: 'online',
        lastSeen: new Date(),
        properties: [
          {
            key: 'temperature',
            value: 32, // 28% above threshold (25)
            unit: '°C',
            timestamp: new Date()
          }
        ],
        controls: [],
        thresholds: [
          {
            propertyKey: 'temperature',
            max: 25,
            enabled: true
          }
        ]
      };

      const notifications = await notificationService.checkDeviceThresholds(device);

      expect(notifications).toHaveLength(1);
      expect(notifications[0].priority).toBe('medium'); // 20-50% difference
    });

    it('should calculate low priority for minor threshold violations', async () => {
      const device: Device = {
        id: 'minor-sensor',
        name: 'Minor Test Sensor',
        type: 'sensor',
        room: 'Test',
        status: 'online',
        lastSeen: new Date(),
        properties: [
          {
            key: 'temperature',
            value: 27, // 8% above threshold (25)
            unit: '°C',
            timestamp: new Date()
          }
        ],
        controls: [],
        thresholds: [
          {
            propertyKey: 'temperature',
            max: 25,
            enabled: true
          }
        ]
      };

      const notifications = await notificationService.checkDeviceThresholds(device);

      expect(notifications).toHaveLength(1);
      expect(notifications[0].priority).toBe('low'); // <20% difference
    });
  });
});