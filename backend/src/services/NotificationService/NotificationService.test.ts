/**
 * Unit tests for NotificationService
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { NotificationService } from './NotificationService.js';
import { DataStorageService } from '../DataStorage/DataStorageService.js';
import { WebSocketHandler } from '../WebSocketHandler/WebSocketHandler.js';
import { 
  Device, 
  DeviceProperty, 
  Threshold 
} from '../../../../shared/src/types/Device.js';
import { 
  Notification, 
  CreateNotificationRequest 
} from '../../../../shared/src/types/Notification.js';

// Mock dependencies
vi.mock('../DataStorage/DataStorageService.js');
vi.mock('../WebSocketHandler/WebSocketHandler.js');

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockDataStorage: vi.Mocked<DataStorageService>;
  let mockWebSocketHandler: vi.Mocked<WebSocketHandler>;

  beforeEach(() => {
    // Create mocked instances
    mockDataStorage = {
      createNotification: vi.fn(),
      getNotifications: vi.fn(),
      markNotificationAsRead: vi.fn(),
      markDeviceNotificationsAsRead: vi.fn(),
      deleteOldNotifications: vi.fn(),
      getDevice: vi.fn(),
    } as any;

    mockWebSocketHandler = {
      broadcastNotification: vi.fn(),
      broadcastNotificationUpdate: vi.fn(),
      broadcastDeviceNotificationsRead: vi.fn(),
    } as any;

    notificationService = new NotificationService(mockDataStorage, mockWebSocketHandler);
  });

  describe('createNotification', () => {
    it('should create notification and broadcast it', async () => {
      const request: CreateNotificationRequest = {
        type: 'alert',
        title: 'Test Alert',
        message: 'Test message',
        deviceId: 'device-1',
        priority: 'high'
      };

      const expectedNotification: Notification = {
        id: 'notification-1',
        type: 'alert',
        title: 'Test Alert',
        message: 'Test message',
        deviceId: 'device-1',
        timestamp: new Date(),
        isRead: false,
        priority: 'high'
      };

      mockDataStorage.createNotification.mockResolvedValue(expectedNotification);

      const result = await notificationService.createNotification(request);

      expect(mockDataStorage.createNotification).toHaveBeenCalledWith(request);
      expect(mockWebSocketHandler.broadcastNotification).toHaveBeenCalledWith(expectedNotification);
      expect(result).toEqual(expectedNotification);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read and broadcast update', async () => {
      const notificationId = 'notification-1';

      await notificationService.markNotificationAsRead(notificationId);

      expect(mockDataStorage.markNotificationAsRead).toHaveBeenCalledWith(notificationId);
      expect(mockWebSocketHandler.broadcastNotificationUpdate).toHaveBeenCalledWith(
        notificationId, 
        { isRead: true }
      );
    });
  });

  describe('markDeviceNotificationsAsRead', () => {
    it('should mark all device notifications as read and broadcast update', async () => {
      const deviceId = 'device-1';

      await notificationService.markDeviceNotificationsAsRead(deviceId);

      expect(mockDataStorage.markDeviceNotificationsAsRead).toHaveBeenCalledWith(deviceId);
      expect(mockWebSocketHandler.broadcastDeviceNotificationsRead).toHaveBeenCalledWith(deviceId);
    });
  });

  describe('checkDeviceThresholds', () => {
    it('should return empty array when device has no thresholds', async () => {
      const device: Device = {
        id: 'device-1',
        name: 'Test Device',
        type: 'sensor',
        room: 'Living Room',
        status: 'online',
        lastSeen: new Date(),
        properties: [],
        controls: [],
        thresholds: []
      };

      const result = await notificationService.checkDeviceThresholds(device);

      expect(result).toEqual([]);
    });

    it('should create notification for temperature threshold violation (max)', async () => {
      const device: Device = {
        id: 'device-1',
        name: 'Temperature Sensor',
        type: 'sensor',
        room: 'Living Room',
        status: 'online',
        lastSeen: new Date(),
        properties: [
          {
            key: 'temperature',
            value: 30,
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

      const expectedNotification: Notification = {
        id: 'notification-1',
        type: 'alert',
        title: 'Temperature Too High',
        message: 'Temperature Sensor temperature is above threshold: 30°C (limit: 25°C)',
        deviceId: 'device-1',
        timestamp: new Date(),
        isRead: false,
        priority: 'medium'
      };

      mockDataStorage.createNotification.mockResolvedValue(expectedNotification);

      const result = await notificationService.checkDeviceThresholds(device);

      expect(result).toHaveLength(1);
      expect(mockDataStorage.createNotification).toHaveBeenCalledWith({
        type: 'alert',
        title: 'Temperature Too High',
        message: 'Temperature Sensor temperature is above threshold: 30°C (limit: 25°C)',
        deviceId: 'device-1',
        priority: 'low'
      });
    });

    it('should create notification for humidity threshold violation (min)', async () => {
      const device: Device = {
        id: 'device-1',
        name: 'Humidity Sensor',
        type: 'sensor',
        room: 'Bedroom',
        status: 'online',
        lastSeen: new Date(),
        properties: [
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
            propertyKey: 'humidity',
            min: 30,
            enabled: true
          }
        ]
      };

      const expectedNotification: Notification = {
        id: 'notification-1',
        type: 'alert',
        title: 'Humidity Too Low',
        message: 'Humidity Sensor humidity is below threshold: 20% (limit: 30%)',
        deviceId: 'device-1',
        timestamp: new Date(),
        isRead: false,
        priority: 'low'
      };

      mockDataStorage.createNotification.mockResolvedValue(expectedNotification);

      const result = await notificationService.checkDeviceThresholds(device);

      expect(result).toHaveLength(1);
      expect(mockDataStorage.createNotification).toHaveBeenCalledWith({
        type: 'alert',
        title: 'Humidity Too Low',
        message: 'Humidity Sensor humidity is below threshold: 20% (limit: 30%)',
        deviceId: 'device-1',
        priority: 'medium'
      });
    });

    it('should skip disabled thresholds', async () => {
      const device: Device = {
        id: 'device-1',
        name: 'Test Device',
        type: 'sensor',
        room: 'Living Room',
        status: 'online',
        lastSeen: new Date(),
        properties: [
          {
            key: 'temperature',
            value: 30,
            unit: '°C',
            timestamp: new Date()
          }
        ],
        controls: [],
        thresholds: [
          {
            propertyKey: 'temperature',
            max: 25,
            enabled: false // Disabled threshold
          }
        ]
      };

      const result = await notificationService.checkDeviceThresholds(device);

      expect(result).toEqual([]);
      expect(mockDataStorage.createNotification).not.toHaveBeenCalled();
    });

    it('should skip thresholds for non-existent properties', async () => {
      const device: Device = {
        id: 'device-1',
        name: 'Test Device',
        type: 'sensor',
        room: 'Living Room',
        status: 'online',
        lastSeen: new Date(),
        properties: [], // No properties
        controls: [],
        thresholds: [
          {
            propertyKey: 'temperature',
            max: 25,
            enabled: true
          }
        ]
      };

      const result = await notificationService.checkDeviceThresholds(device);

      expect(result).toEqual([]);
      expect(mockDataStorage.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('createSecurityAlert', () => {
    it('should create security alert notification', async () => {
      const deviceId = 'device-1';
      const message = 'Motion detected';
      const device: Device = {
        id: deviceId,
        name: 'Security Camera',
        type: 'camera',
        room: 'Front Door',
        status: 'online',
        lastSeen: new Date(),
        properties: [],
        controls: []
      };

      const expectedNotification: Notification = {
        id: 'notification-1',
        type: 'alert',
        title: 'Security Alert',
        message: 'Security Camera: Motion detected',
        deviceId,
        timestamp: new Date(),
        isRead: false,
        priority: 'high'
      };

      mockDataStorage.getDevice.mockResolvedValue(device);
      mockDataStorage.createNotification.mockResolvedValue(expectedNotification);

      const result = await notificationService.createSecurityAlert(deviceId, message);

      expect(mockDataStorage.createNotification).toHaveBeenCalledWith({
        type: 'alert',
        title: 'Security Alert',
        message: 'Security Camera: Motion detected',
        deviceId,
        priority: 'high'
      });
      expect(result).toEqual(expectedNotification);
    });
  });

  describe('createLowBatteryWarning', () => {
    it('should create low battery warning notification', async () => {
      const deviceId = 'device-1';
      const batteryLevel = 15;
      const device: Device = {
        id: deviceId,
        name: 'Door Sensor',
        type: 'sensor',
        room: 'Front Door',
        status: 'online',
        lastSeen: new Date(),
        properties: [],
        controls: []
      };

      const expectedNotification: Notification = {
        id: 'notification-1',
        type: 'warning',
        title: 'Low Battery',
        message: 'Door Sensor battery is low (15%). Please replace or recharge.',
        deviceId,
        timestamp: new Date(),
        isRead: false,
        priority: 'medium'
      };

      mockDataStorage.getDevice.mockResolvedValue(device);
      mockDataStorage.createNotification.mockResolvedValue(expectedNotification);

      const result = await notificationService.createLowBatteryWarning(deviceId, batteryLevel);

      expect(mockDataStorage.createNotification).toHaveBeenCalledWith({
        type: 'warning',
        title: 'Low Battery',
        message: 'Door Sensor battery is low (15%). Please replace or recharge.',
        deviceId,
        priority: 'medium'
      });
      expect(result).toEqual(expectedNotification);
    });
  });

  describe('getNotificationStats', () => {
    it('should return notification statistics', async () => {
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'alert',
          title: 'Alert 1',
          message: 'Message 1',
          timestamp: new Date(),
          isRead: false,
          priority: 'high'
        },
        {
          id: '2',
          type: 'warning',
          title: 'Warning 1',
          message: 'Message 2',
          timestamp: new Date(),
          isRead: true,
          priority: 'medium'
        },
        {
          id: '3',
          type: 'info',
          title: 'Info 1',
          message: 'Message 3',
          timestamp: new Date(),
          isRead: false,
          priority: 'low'
        }
      ];

      const mockUnreadNotifications = mockNotifications.filter(n => !n.isRead);

      mockDataStorage.getNotifications
        .mockResolvedValueOnce(mockNotifications) // All notifications
        .mockResolvedValueOnce(mockUnreadNotifications); // Unread notifications

      const result = await notificationService.getNotificationStats();

      expect(result).toEqual({
        total: 3,
        unread: 2,
        byType: {
          alert: 1,
          warning: 1,
          info: 1,
          error: 0
        },
        byPriority: {
          high: 1,
          medium: 1,
          low: 1
        }
      });
    });
  });
});