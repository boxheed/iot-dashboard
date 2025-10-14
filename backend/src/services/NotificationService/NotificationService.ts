/**
 * Notification Service for IoT Dashboard
 * Handles notification creation, threshold monitoring, and alert management
 */

import { 
  Notification, 
  CreateNotificationRequest, 
  NotificationFilter,
  NotificationType,
  NotificationPriority
} from '../../../../shared/src/types/Notification.js';
import { 
  Device, 
  DeviceProperty, 
  Threshold 
} from '../../../../shared/src/types/Device.js';
import { DataStorageService } from '../DataStorage/DataStorageService.js';
import { WebSocketHandler } from '../WebSocketHandler/WebSocketHandler.js';

/**
 * Threshold violation information
 */
interface ThresholdViolation {
  device: Device;
  property: DeviceProperty;
  threshold: Threshold;
  violationType: 'min' | 'max';
  currentValue: number;
  thresholdValue: number;
}

/**
 * Notification Service class
 */
export class NotificationService {
  constructor(
    private dataStorage: DataStorageService,
    private webSocketHandler: WebSocketHandler
  ) {}

  /**
   * Create a new notification and broadcast it
   */
  async createNotification(request: CreateNotificationRequest): Promise<Notification> {
    // Create notification in database
    const notification = await this.dataStorage.createNotification(request);

    // Broadcast notification to connected clients
    this.webSocketHandler.broadcastNotification(notification);

    console.log(`Notification created: ${notification.type} - ${notification.title}`);
    return notification;
  }

  /**
   * Get notifications with optional filtering
   */
  async getNotifications(filter: NotificationFilter = {}): Promise<Notification[]> {
    return await this.dataStorage.getNotifications(filter);
  }

  /**
   * Mark a notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    await this.dataStorage.markNotificationAsRead(notificationId);
    
    // Broadcast notification update to clients
    this.webSocketHandler.broadcastNotificationUpdate(notificationId, { isRead: true });
  }

  /**
   * Mark all notifications for a device as read
   */
  async markDeviceNotificationsAsRead(deviceId: string): Promise<void> {
    await this.dataStorage.markDeviceNotificationsAsRead(deviceId);
    
    // Broadcast bulk notification update
    this.webSocketHandler.broadcastDeviceNotificationsRead(deviceId);
  }

  /**
   * Check device thresholds and generate notifications if needed
   */
  async checkDeviceThresholds(device: Device): Promise<Notification[]> {
    if (!device.thresholds || device.thresholds.length === 0) {
      return [];
    }

    const violations: ThresholdViolation[] = [];
    const notifications: Notification[] = [];

    // Check each threshold against current device properties
    for (const threshold of device.thresholds) {
      if (!threshold.enabled) {
        continue;
      }

      const property = device.properties.find(p => p.key === threshold.propertyKey);
      if (!property) {
        continue;
      }

      const violation = this.checkThresholdViolation(device, property, threshold);
      if (violation) {
        violations.push(violation);
      }
    }

    // Generate notifications for violations
    for (const violation of violations) {
      const notification = await this.createThresholdNotification(violation);
      notifications.push(notification);
    }

    return notifications;
  }

  /**
   * Generate security alert notification
   */
  async createSecurityAlert(deviceId: string, message: string): Promise<Notification> {
    const device = await this.dataStorage.getDevice(deviceId);
    const deviceName = device ? device.name : `Device ${deviceId}`;

    return await this.createNotification({
      type: 'alert',
      title: 'Security Alert',
      message: `${deviceName}: ${message}`,
      deviceId,
      priority: 'high'
    });
  }

  /**
   * Generate low battery warning
   */
  async createLowBatteryWarning(deviceId: string, batteryLevel: number): Promise<Notification> {
    const device = await this.dataStorage.getDevice(deviceId);
    const deviceName = device ? device.name : `Device ${deviceId}`;

    return await this.createNotification({
      type: 'warning',
      title: 'Low Battery',
      message: `${deviceName} battery is low (${batteryLevel}%). Please replace or recharge.`,
      deviceId,
      priority: 'medium'
    });
  }

  /**
   * Generate device offline notification
   */
  async createDeviceOfflineNotification(deviceId: string): Promise<Notification> {
    const device = await this.dataStorage.getDevice(deviceId);
    const deviceName = device ? device.name : `Device ${deviceId}`;

    return await this.createNotification({
      type: 'warning',
      title: 'Device Offline',
      message: `${deviceName} has gone offline and is no longer responding.`,
      deviceId,
      priority: 'medium'
    });
  }

  /**
   * Generate device online notification
   */
  async createDeviceOnlineNotification(deviceId: string): Promise<Notification> {
    const device = await this.dataStorage.getDevice(deviceId);
    const deviceName = device ? device.name : `Device ${deviceId}`;

    return await this.createNotification({
      type: 'info',
      title: 'Device Online',
      message: `${deviceName} is now online and responding.`,
      deviceId,
      priority: 'low'
    });
  }

  /**
   * Generate system error notification
   */
  async createSystemErrorNotification(error: string, deviceId?: string): Promise<Notification> {
    return await this.createNotification({
      type: 'error',
      title: 'System Error',
      message: error,
      deviceId,
      priority: 'high'
    });
  }

  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications(olderThanDays: number = 30): Promise<number> {
    const deletedCount = await this.dataStorage.deleteOldNotifications(olderThanDays);
    
    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} old notifications`);
    }
    
    return deletedCount;
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(): Promise<{
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
    byPriority: Record<NotificationPriority, number>;
  }> {
    const allNotifications = await this.getNotifications();
    const unreadNotifications = await this.getNotifications({ isRead: false });

    const byType: Record<NotificationType, number> = {
      alert: 0,
      warning: 0,
      info: 0,
      error: 0
    };

    const byPriority: Record<NotificationPriority, number> = {
      low: 0,
      medium: 0,
      high: 0
    };

    // Count notifications by type and priority
    for (const notification of allNotifications) {
      byType[notification.type]++;
      byPriority[notification.priority]++;
    }

    return {
      total: allNotifications.length,
      unread: unreadNotifications.length,
      byType,
      byPriority
    };
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Check if a device property violates a threshold
   */
  private checkThresholdViolation(
    device: Device, 
    property: DeviceProperty, 
    threshold: Threshold
  ): ThresholdViolation | null {
    const value = parseFloat(property.value);
    
    // Skip if value is not a number
    if (isNaN(value)) {
      return null;
    }

    // Check minimum threshold
    if (threshold.min !== undefined && value < threshold.min) {
      return {
        device,
        property,
        threshold,
        violationType: 'min',
        currentValue: value,
        thresholdValue: threshold.min
      };
    }

    // Check maximum threshold
    if (threshold.max !== undefined && value > threshold.max) {
      return {
        device,
        property,
        threshold,
        violationType: 'max',
        currentValue: value,
        thresholdValue: threshold.max
      };
    }

    return null;
  }

  /**
   * Create a notification for a threshold violation
   */
  private async createThresholdNotification(violation: ThresholdViolation): Promise<Notification> {
    const { device, property, threshold, violationType, currentValue, thresholdValue } = violation;
    
    const direction = violationType === 'min' ? 'below' : 'above';
    const unit = property.unit || '';
    
    const title = this.getThresholdNotificationTitle(property.key, violationType);
    const message = `${device.name} ${property.key} is ${direction} threshold: ${currentValue}${unit} (limit: ${thresholdValue}${unit})`;

    // Determine priority based on how far the value is from threshold
    const priority = this.calculateThresholdPriority(currentValue, thresholdValue, violationType);

    return await this.createNotification({
      type: 'alert',
      title,
      message,
      deviceId: device.id,
      priority
    });
  }

  /**
   * Generate appropriate title for threshold notifications
   */
  private getThresholdNotificationTitle(propertyKey: string, violationType: 'min' | 'max'): string {
    const propertyTitles: Record<string, { min: string; max: string }> = {
      temperature: { min: 'Temperature Too Low', max: 'Temperature Too High' },
      humidity: { min: 'Humidity Too Low', max: 'Humidity Too High' },
      battery: { min: 'Low Battery', max: 'Battery Overcharge' },
      pressure: { min: 'Low Pressure', max: 'High Pressure' },
      light: { min: 'Low Light Level', max: 'High Light Level' },
      motion: { min: 'No Motion Detected', max: 'High Motion Activity' },
      sound: { min: 'Low Sound Level', max: 'High Sound Level' },
      power: { min: 'Low Power Usage', max: 'High Power Usage' },
      voltage: { min: 'Low Voltage', max: 'High Voltage' },
      current: { min: 'Low Current', max: 'High Current' }
    };

    const titles = propertyTitles[propertyKey.toLowerCase()];
    if (titles) {
      return titles[violationType];
    }

    // Fallback for unknown properties
    return violationType === 'min' 
      ? `${propertyKey} Below Threshold`
      : `${propertyKey} Above Threshold`;
  }

  /**
   * Calculate notification priority based on threshold violation severity
   */
  private calculateThresholdPriority(
    currentValue: number, 
    thresholdValue: number, 
    violationType: 'min' | 'max'
  ): NotificationPriority {
    const difference = Math.abs(currentValue - thresholdValue);
    const percentageDifference = (difference / Math.abs(thresholdValue)) * 100;

    // High priority if violation is severe (>50% difference)
    if (percentageDifference > 50) {
      return 'high';
    }

    // Medium priority if violation is moderate (>20% difference)
    if (percentageDifference > 20) {
      return 'medium';
    }

    // Low priority for minor violations
    return 'low';
  }
}