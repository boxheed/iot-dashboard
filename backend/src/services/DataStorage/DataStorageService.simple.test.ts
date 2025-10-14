/**
 * Simplified integration tests for DataStorageService
 * Tests core functionality with a more reliable setup
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DataStorageService } from './DataStorageService.js';
import { Database } from '../../utils/database.js';
import { Device } from '../../../../shared/src/types/Device.js';
import { CreateNotificationRequest } from '../../../../shared/src/types/Notification.js';
import fs from 'fs/promises';
import path from 'path';

describe('DataStorageService Core Tests', () => {
  let db: Database;
  let dataStorage: DataStorageService;
  const testDbPath = path.join(process.cwd(), 'backend', 'database', 'simple-test.db');

  beforeAll(async () => {
    // Create a simple database instance
    db = new Database({ filename: testDbPath });
    await db.connect();
    
    // Create tables manually for testing
    await db.run(`
      CREATE TABLE IF NOT EXISTS devices (
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
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS historical_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        property TEXT NOT NULL,
        value TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        device_id TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_read BOOLEAN DEFAULT FALSE,
        priority TEXT NOT NULL DEFAULT 'medium'
      )
    `);

    dataStorage = new DataStorageService(db);
  }, 10000);

  afterAll(async () => {
    if (db && db.isOpen()) {
      await db.close();
    }
    try {
      await fs.unlink(testDbPath);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Device Operations', () => {
    const mockDevice: Device = {
      id: 'test-device-1',
      name: 'Test Smart Switch',
      type: 'switch',
      room: 'Living Room',
      status: 'online',
      lastSeen: new Date('2023-01-01T12:00:00Z'),
      properties: [
        {
          key: 'power',
          value: true,
          timestamp: new Date('2023-01-01T12:00:00Z')
        }
      ],
      controls: [
        {
          key: 'power',
          type: 'switch',
          label: 'Power'
        }
      ]
    };

    it('should save and retrieve a device', async () => {
      await dataStorage.saveDevice(mockDevice);
      
      const retrieved = await dataStorage.getDevice(mockDevice.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(mockDevice.id);
      expect(retrieved!.name).toBe(mockDevice.name);
      expect(retrieved!.type).toBe(mockDevice.type);
      expect(retrieved!.properties).toHaveLength(1);
      expect(retrieved!.controls).toHaveLength(1);
    });

    it('should retrieve all devices', async () => {
      const device2 = { ...mockDevice, id: 'device-2', name: 'Device 2' };
      await dataStorage.saveDevice(device2);
      
      const devices = await dataStorage.getAllDevices();
      
      expect(devices.length).toBeGreaterThanOrEqual(2);
    });

    it('should update device status', async () => {
      await dataStorage.updateDeviceStatus(mockDevice.id, 'error');
      
      const retrieved = await dataStorage.getDevice(mockDevice.id);
      expect(retrieved!.status).toBe('error');
    });
  });

  describe('Historical Data Operations', () => {
    it('should save and retrieve historical data', async () => {
      const deviceId = 'test-device-1';
      const property = 'temperature';
      const testValue = 23.5;
      
      await dataStorage.saveDeviceData(deviceId, property, testValue);
      
      const query = {
        deviceId,
        property,
        startDate: new Date(Date.now() - 3600000), // 1 hour ago
        endDate: new Date()
      };
      
      const response = await dataStorage.getHistoricalData(query);
      
      expect(response.data).toHaveLength(1);
      expect(response.data[0].deviceId).toBe(deviceId);
      expect(response.data[0].property).toBe(property);
      expect(response.data[0].value).toBe(testValue);
    });
  });

  describe('Notification Operations', () => {
    it('should create and retrieve notifications', async () => {
      const request: CreateNotificationRequest = {
        type: 'alert',
        title: 'Test Alert',
        message: 'This is a test notification',
        deviceId: 'test-device-1',
        priority: 'high'
      };
      
      const notification = await dataStorage.createNotification(request);
      
      expect(notification.id).toBeDefined();
      expect(notification.type).toBe(request.type);
      expect(notification.title).toBe(request.title);
      expect(notification.isRead).toBe(false);
      
      const notifications = await dataStorage.getNotifications();
      expect(notifications.length).toBeGreaterThanOrEqual(1);
    });

    it('should mark notification as read', async () => {
      const request: CreateNotificationRequest = {
        type: 'info',
        title: 'Test Info',
        message: 'Test message',
        priority: 'low'
      };
      
      const notification = await dataStorage.createNotification(request);
      await dataStorage.markNotificationAsRead(notification.id);
      
      const notifications = await dataStorage.getNotifications({ isRead: true });
      const readNotification = notifications.find(n => n.id === notification.id);
      
      expect(readNotification).toBeDefined();
      expect(readNotification!.isRead).toBe(true);
    });
  });
});