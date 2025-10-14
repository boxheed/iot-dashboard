/**
 * Data Storage Service for IoT Dashboard
 * Handles all database operations for devices, historical data, and notifications
 */

import { Database } from '../../utils/database.js';
import { 
  Device, 
  DeviceProperty, 
  DeviceControl, 
  Threshold 
} from '../../../../shared/src/types/Device.js';
import { 
  Notification, 
  CreateNotificationRequest, 
  NotificationFilter 
} from '../../../../shared/src/types/Notification.js';
import { 
  HistoricalData, 
  HistoricalDataQuery, 
  HistoricalDataResponse, 
  AggregatedDataPoint,
  AggregationMethod 
} from '../../../../shared/src/types/HistoricalData.js';

/**
 * Database row interfaces for type safety
 */
interface DeviceRow {
  id: string;
  name: string;
  type: string;
  room: string;
  status: string;
  last_seen: string;
  properties: string | null;
  controls: string | null;
  thresholds: string | null;
  created_at: string;
  updated_at: string;
}

interface HistoricalDataRow {
  id: number;
  device_id: string;
  property: string;
  value: string;
  timestamp: string;
}

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  device_id: string | null;
  timestamp: string;
  is_read: number; // SQLite boolean as integer
  priority: string;
}

/**
 * Data Storage Service class
 */
export class DataStorageService {
  constructor(private db: Database) {}

  // ===== DEVICE OPERATIONS =====

  /**
   * Save or update a device in the database
   */
  async saveDevice(device: Device): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO devices (
        id, name, type, room, status, last_seen, properties, controls, thresholds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      device.id,
      device.name,
      device.type,
      device.room,
      device.status,
      device.lastSeen.toISOString(),
      JSON.stringify(device.properties),
      JSON.stringify(device.controls),
      device.thresholds ? JSON.stringify(device.thresholds) : null
    ];

    await this.db.run(sql, params);
  }

  /**
   * Retrieve a device by ID
   */
  async getDevice(deviceId: string): Promise<Device | null> {
    const sql = 'SELECT * FROM devices WHERE id = ?';
    const row = await this.db.get<DeviceRow>(sql, [deviceId]);
    
    return row ? this.mapRowToDevice(row) : null;
  }

  /**
   * Retrieve all devices
   */
  async getAllDevices(): Promise<Device[]> {
    const sql = 'SELECT * FROM devices ORDER BY name';
    const rows = await this.db.all<DeviceRow>(sql);
    
    return rows.map(row => this.mapRowToDevice(row));
  }

  /**
   * Retrieve devices by status
   */
  async getDevicesByStatus(status: string): Promise<Device[]> {
    const sql = 'SELECT * FROM devices WHERE status = ? ORDER BY name';
    const rows = await this.db.all<DeviceRow>(sql, [status]);
    
    return rows.map(row => this.mapRowToDevice(row));
  }

  /**
   * Retrieve devices by room
   */
  async getDevicesByRoom(room: string): Promise<Device[]> {
    const sql = 'SELECT * FROM devices WHERE room = ? ORDER BY name';
    const rows = await this.db.all<DeviceRow>(sql, [room]);
    
    return rows.map(row => this.mapRowToDevice(row));
  }

  /**
   * Update device status and last seen timestamp
   */
  async updateDeviceStatus(deviceId: string, status: string): Promise<void> {
    const sql = 'UPDATE devices SET status = ?, last_seen = ? WHERE id = ?';
    await this.db.run(sql, [status, new Date().toISOString(), deviceId]);
  }

  /**
   * Delete a device and all its historical data
   */
  async deleteDevice(deviceId: string): Promise<void> {
    // Foreign key constraints will handle cascading deletes
    const sql = 'DELETE FROM devices WHERE id = ?';
    await this.db.run(sql, [deviceId]);
  }

  // ===== HISTORICAL DATA OPERATIONS =====

  /**
   * Save device data point to historical data
   */
  async saveDeviceData(deviceId: string, property: string, value: any): Promise<void> {
    const sql = `
      INSERT INTO historical_data (device_id, property, value, timestamp)
      VALUES (?, ?, ?, ?)
    `;

    await this.db.run(sql, [
      deviceId,
      property,
      JSON.stringify(value),
      new Date().toISOString()
    ]);
  }

  /**
   * Save multiple device data points in a batch
   */
  async saveDeviceDataBatch(data: HistoricalData[]): Promise<void> {
    const queries = data.map(point => ({
      sql: 'INSERT INTO historical_data (device_id, property, value, timestamp) VALUES (?, ?, ?, ?)',
      params: [
        point.deviceId,
        point.property,
        JSON.stringify(point.value),
        point.timestamp.toISOString()
      ]
    }));

    await this.db.transaction(queries);
  }

  /**
   * Retrieve historical data with filtering and aggregation
   */
  async getHistoricalData(query: HistoricalDataQuery): Promise<HistoricalDataResponse> {
    const { deviceId, property, startDate, endDate, aggregation, intervalMinutes, limit } = query;

    let sql: string;
    let params: any[];

    if (aggregation && intervalMinutes) {
      // Aggregated query
      sql = this.buildAggregatedQuery(aggregation, intervalMinutes);
      params = [deviceId, property, startDate.toISOString(), endDate.toISOString()];
    } else {
      // Raw data query
      sql = `
        SELECT device_id, property, value, timestamp
        FROM historical_data
        WHERE device_id = ? AND property = ? 
        AND timestamp BETWEEN ? AND ?
        ORDER BY timestamp DESC
        ${limit ? `LIMIT ${limit}` : ''}
      `;
      params = [deviceId, property, startDate.toISOString(), endDate.toISOString()];
    }

    const rows = await this.db.all<HistoricalDataRow>(sql, params);

    // Get total count for metadata
    const countSql = `
      SELECT COUNT(*) as count
      FROM historical_data
      WHERE device_id = ? AND property = ?
      AND timestamp BETWEEN ? AND ?
    `;
    const countResult = await this.db.get<{ count: number }>(countSql, params);

    const data = aggregation && intervalMinutes 
      ? rows.map(row => this.mapRowToAggregatedDataPoint(row))
      : rows.map(row => this.mapRowToHistoricalData(row));

    return {
      deviceId,
      property,
      query,
      data,
      totalCount: countResult?.count || 0,
      isAggregated: !!(aggregation && intervalMinutes)
    };
  }

  /**
   * Get historical data for time range (24h, 7d, 30d)
   */
  async getHistoricalDataByTimeRange(
    deviceId: string, 
    property: string, 
    timeRange: '24h' | '7d' | '30d'
  ): Promise<HistoricalData[]> {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
    }

    const query: HistoricalDataQuery = {
      deviceId,
      property,
      startDate,
      endDate,
      limit: 1000 // Reasonable limit for charts
    };

    const response = await this.getHistoricalData(query);
    return response.data as HistoricalData[];
  }

  /**
   * Delete old historical data (for cleanup)
   */
  async deleteOldHistoricalData(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const sql = 'DELETE FROM historical_data WHERE timestamp < ?';
    const result = await this.db.run(sql, [cutoffDate.toISOString()]);
    
    return result.changes;
  }

  // ===== NOTIFICATION OPERATIONS =====

  /**
   * Create a new notification
   */
  async createNotification(request: CreateNotificationRequest): Promise<Notification> {
    const notification: Notification = {
      id: this.generateId(),
      type: request.type,
      title: request.title,
      message: request.message,
      deviceId: request.deviceId,
      timestamp: new Date(),
      isRead: false,
      priority: request.priority
    };

    const sql = `
      INSERT INTO notifications (id, type, title, message, device_id, timestamp, is_read, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.run(sql, [
      notification.id,
      notification.type,
      notification.title,
      notification.message,
      notification.deviceId || null,
      notification.timestamp.toISOString(),
      notification.isRead ? 1 : 0,
      notification.priority
    ]);

    return notification;
  }

  /**
   * Retrieve notifications with filtering
   */
  async getNotifications(filter: NotificationFilter = {}): Promise<Notification[]> {
    let sql = 'SELECT * FROM notifications WHERE 1=1';
    const params: any[] = [];

    if (filter.type) {
      sql += ' AND type = ?';
      params.push(filter.type);
    }

    if (filter.deviceId) {
      sql += ' AND device_id = ?';
      params.push(filter.deviceId);
    }

    if (filter.isRead !== undefined) {
      sql += ' AND is_read = ?';
      params.push(filter.isRead ? 1 : 0);
    }

    if (filter.priority) {
      sql += ' AND priority = ?';
      params.push(filter.priority);
    }

    if (filter.startDate) {
      sql += ' AND timestamp >= ?';
      params.push(filter.startDate.toISOString());
    }

    if (filter.endDate) {
      sql += ' AND timestamp <= ?';
      params.push(filter.endDate.toISOString());
    }

    sql += ' ORDER BY timestamp DESC';

    if (filter.limit) {
      sql += ` LIMIT ${filter.limit}`;
    }

    const rows = await this.db.all<NotificationRow>(sql, params);
    return rows.map(row => this.mapRowToNotification(row));
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    const sql = 'UPDATE notifications SET is_read = 1 WHERE id = ?';
    await this.db.run(sql, [notificationId]);
  }

  /**
   * Mark all notifications as read for a device
   */
  async markDeviceNotificationsAsRead(deviceId: string): Promise<void> {
    const sql = 'UPDATE notifications SET is_read = 1 WHERE device_id = ?';
    await this.db.run(sql, [deviceId]);
  }

  /**
   * Delete old notifications
   */
  async deleteOldNotifications(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const sql = 'DELETE FROM notifications WHERE timestamp < ?';
    const result = await this.db.run(sql, [cutoffDate.toISOString()]);
    
    return result.changes;
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Map database row to Device object
   */
  private mapRowToDevice(row: DeviceRow): Device {
    return {
      id: row.id,
      name: row.name,
      type: row.type as any,
      room: row.room,
      status: row.status as any,
      lastSeen: new Date(row.last_seen),
      properties: row.properties ? JSON.parse(row.properties) : [],
      controls: row.controls ? JSON.parse(row.controls) : [],
      thresholds: row.thresholds ? JSON.parse(row.thresholds) : undefined
    };
  }

  /**
   * Map database row to HistoricalData object
   */
  private mapRowToHistoricalData(row: HistoricalDataRow): HistoricalData {
    return {
      deviceId: row.device_id,
      property: row.property,
      value: JSON.parse(row.value),
      timestamp: new Date(row.timestamp)
    };
  }

  /**
   * Map database row to AggregatedDataPoint object
   */
  private mapRowToAggregatedDataPoint(row: any): AggregatedDataPoint {
    return {
      timestamp: new Date(row.timestamp),
      value: parseFloat(row.value),
      count: parseInt(row.count)
    };
  }

  /**
   * Map database row to Notification object
   */
  private mapRowToNotification(row: NotificationRow): Notification {
    return {
      id: row.id,
      type: row.type as any,
      title: row.title,
      message: row.message,
      deviceId: row.device_id || undefined,
      timestamp: new Date(row.timestamp),
      isRead: row.is_read === 1,
      priority: row.priority as any
    };
  }

  /**
   * Build aggregated query SQL
   */
  private buildAggregatedQuery(aggregation: AggregationMethod, intervalMinutes: number): string {
    const aggregateFunction = this.getAggregateFunction(aggregation);
    
    return `
      SELECT 
        datetime(
          (strftime('%s', timestamp) / (${intervalMinutes} * 60)) * (${intervalMinutes} * 60),
          'unixepoch'
        ) as timestamp,
        ${aggregateFunction}(CAST(value as REAL)) as value,
        COUNT(*) as count
      FROM historical_data
      WHERE device_id = ? AND property = ?
      AND timestamp BETWEEN ? AND ?
      GROUP BY datetime(
        (strftime('%s', timestamp) / (${intervalMinutes} * 60)) * (${intervalMinutes} * 60),
        'unixepoch'
      )
      ORDER BY timestamp
    `;
  }

  /**
   * Get SQL aggregate function for aggregation method
   */
  private getAggregateFunction(method: AggregationMethod): string {
    switch (method) {
      case 'avg': return 'AVG';
      case 'min': return 'MIN';
      case 'max': return 'MAX';
      case 'sum': return 'SUM';
      case 'count': return 'COUNT';
      default: return 'AVG';
    }
  }

  /**
   * Generate unique ID for notifications
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}