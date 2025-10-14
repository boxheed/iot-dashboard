import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/NotificationService';
import { createError } from '../middleware/errorHandler';
import { 
  CreateNotificationRequest, 
  NotificationFilter,
  UpdateNotificationRequest 
} from '@shared/types/Notification';

const router = Router();

// Initialize service (will be injected from main server)
let notificationService: NotificationService;

// Dependency injection function
export const initializeNotificationRoutes = (ns: NotificationService) => {
  notificationService = ns;
};

/**
 * GET /api/notifications
 * Get notifications with optional filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filter: NotificationFilter = {};

    // Parse query parameters
    if (req.query.type) {
      filter.type = req.query.type as any;
    }
    if (req.query.deviceId) {
      filter.deviceId = req.query.deviceId as string;
    }
    if (req.query.isRead !== undefined) {
      filter.isRead = req.query.isRead === 'true';
    }
    if (req.query.priority) {
      filter.priority = req.query.priority as any;
    }
    if (req.query.startDate) {
      filter.startDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      filter.endDate = new Date(req.query.endDate as string);
    }
    if (req.query.limit) {
      filter.limit = parseInt(req.query.limit as string, 10);
    }

    const notifications = await notificationService.getNotifications(filter);

    res.json({
      success: true,
      data: notifications,
      count: notifications.length,
      filter,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw createError('Failed to fetch notifications', 500);
  }
});

/**
 * POST /api/notifications
 * Create a new notification
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const request: CreateNotificationRequest = req.body;

    // Validate required fields
    if (!request.type || !request.title || !request.message || !request.priority) {
      throw createError('Missing required fields: type, title, message, priority', 400);
    }

    // Validate notification type
    const validTypes = ['alert', 'warning', 'info', 'error'];
    if (!validTypes.includes(request.type)) {
      throw createError(`Invalid notification type. Must be one of: ${validTypes.join(', ')}`, 400);
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(request.priority)) {
      throw createError(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`, 400);
    }

    const notification = await notificationService.createNotification(request);

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notification created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && (error as any).statusCode) {
      throw error;
    }
    console.error('Error creating notification:', error);
    throw createError('Failed to create notification', 500);
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a notification as read
 */
router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await notificationService.markNotificationAsRead(id);

    res.json({
      success: true,
      message: 'Notification marked as read',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw createError('Failed to mark notification as read', 500);
  }
});

/**
 * PUT /api/notifications/:id
 * Update a notification (general update endpoint)
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates: UpdateNotificationRequest = req.body;

    // Currently only supports marking as read
    if (updates.isRead !== undefined) {
      if (updates.isRead) {
        await notificationService.markNotificationAsRead(id);
      }
      // Note: We don't support marking as unread in this implementation
    }

    res.json({
      success: true,
      message: 'Notification updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    throw createError('Failed to update notification', 500);
  }
});

/**
 * PUT /api/notifications/device/:deviceId/read
 * Mark all notifications for a device as read
 */
router.put('/device/:deviceId/read', async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;

    await notificationService.markDeviceNotificationsAsRead(deviceId);

    res.json({
      success: true,
      message: 'All device notifications marked as read',
      deviceId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error marking device notifications as read:', error);
    throw createError('Failed to mark device notifications as read', 500);
  }
});

/**
 * GET /api/notifications/stats
 * Get notification statistics
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await notificationService.getNotificationStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    throw createError('Failed to fetch notification stats', 500);
  }
});

/**
 * GET /api/notifications/device/:deviceId
 * Get notifications for a specific device
 */
router.get('/device/:deviceId', async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { isRead, limit } = req.query;

    const filter: NotificationFilter = {
      deviceId,
    };

    if (isRead !== undefined) {
      filter.isRead = isRead === 'true';
    }
    if (limit) {
      filter.limit = parseInt(limit as string, 10);
    }

    const notifications = await notificationService.getNotifications(filter);

    res.json({
      success: true,
      data: notifications,
      count: notifications.length,
      deviceId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching device notifications:', error);
    throw createError('Failed to fetch device notifications', 500);
  }
});

/**
 * DELETE /api/notifications/cleanup
 * Clean up old notifications
 */
router.delete('/cleanup', async (req: Request, res: Response) => {
  try {
    const { olderThanDays } = req.query;
    const days = olderThanDays ? parseInt(olderThanDays as string, 10) : 30;

    if (days < 1) {
      throw createError('olderThanDays must be at least 1', 400);
    }

    const deletedCount = await notificationService.cleanupOldNotifications(days);

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old notifications`,
      deletedCount,
      olderThanDays: days,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && (error as any).statusCode) {
      throw error;
    }
    console.error('Error cleaning up notifications:', error);
    throw createError('Failed to clean up notifications', 500);
  }
});

export default router;