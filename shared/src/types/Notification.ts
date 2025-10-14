/**
 * Notification-related type definitions for the IoT Dashboard
 * These interfaces define the structure for alerts, warnings,
 * and informational messages in the system.
 */

/**
 * Types of notifications that can be generated
 */
export type NotificationType = 'alert' | 'warning' | 'info' | 'error';

/**
 * Priority levels for notifications
 */
export type NotificationPriority = 'low' | 'medium' | 'high';

/**
 * Main notification interface
 */
export interface Notification {
  /** Unique identifier for the notification */
  id: string;
  /** Type of notification (determines icon and styling) */
  type: NotificationType;
  /** Brief title or subject of the notification */
  title: string;
  /** Detailed message content */
  message: string;
  /** ID of the device that triggered this notification (optional) */
  deviceId?: string;
  /** When the notification was created */
  timestamp: Date;
  /** Whether the user has viewed this notification */
  isRead: boolean;
  /** Priority level for sorting and display */
  priority: NotificationPriority;
}

/**
 * Notification creation request (used when generating new notifications)
 */
export interface CreateNotificationRequest {
  /** Type of notification */
  type: NotificationType;
  /** Notification title */
  title: string;
  /** Notification message */
  message: string;
  /** Optional device ID if related to a specific device */
  deviceId?: string;
  /** Priority level */
  priority: NotificationPriority;
}

/**
 * Notification filter options for querying notifications
 */
export interface NotificationFilter {
  /** Filter by notification type */
  type?: NotificationType;
  /** Filter by device ID */
  deviceId?: string;
  /** Filter by read status */
  isRead?: boolean;
  /** Filter by priority */
  priority?: NotificationPriority;
  /** Start date for time range filtering */
  startDate?: Date;
  /** End date for time range filtering */
  endDate?: Date;
  /** Maximum number of notifications to return */
  limit?: number;
}

/**
 * Notification update request (for marking as read, etc.)
 */
export interface UpdateNotificationRequest {
  /** Whether to mark as read */
  isRead?: boolean;
}