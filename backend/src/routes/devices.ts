import { Router, Request, Response } from 'express';
import { DeviceManager } from '../services/DeviceManager';
import { DataStorageService } from '../services/DataStorage';
import { createError } from '../middleware/errorHandler';
import { DeviceRegistration, DeviceCommand } from '@shared/types/Device';

const router = Router();

// Initialize services (will be injected from main server)
let deviceManager: DeviceManager;
let dataStorage: DataStorageService;

// Dependency injection function
export const initializeDeviceRoutes = (dm: DeviceManager, ds: DataStorageService) => {
  deviceManager = dm;
  dataStorage = ds;
};

/**
 * GET /api/devices
 * Get all devices
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const devices = deviceManager.getAllDevices();
    res.json({
      success: true,
      data: devices,
      count: devices.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    throw createError('Failed to fetch devices', 500);
  }
});

/**
 * GET /api/devices/:id
 * Get a specific device by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const device = deviceManager.getDevice(id);
    
    if (!device) {
      throw createError('Device not found', 404);
    }

    res.json({
      success: true,
      data: device,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && (error as any).statusCode) {
      throw error;
    }
    console.error('Error fetching device:', error);
    throw createError('Failed to fetch device', 500);
  }
});

/**
 * POST /api/devices
 * Register a new device
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const registration: DeviceRegistration = req.body;

    // Validate required fields
    if (!registration.name || !registration.type || !registration.room) {
      throw createError('Missing required fields: name, type, room', 400);
    }

    // Validate device type
    const validTypes = ['sensor', 'switch', 'dimmer', 'thermostat', 'camera', 'lock'];
    if (!validTypes.includes(registration.type)) {
      throw createError(`Invalid device type. Must be one of: ${validTypes.join(', ')}`, 400);
    }

    const device = await deviceManager.addDevice(registration);

    res.status(201).json({
      success: true,
      data: device,
      message: 'Device registered successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && (error as any).statusCode) {
      throw error;
    }
    console.error('Error registering device:', error);
    throw createError('Failed to register device', 500);
  }
});

/**
 * PUT /api/devices/:id
 * Update device information or send control commands
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if this is a control command
    if (updates.command) {
      const command: DeviceCommand = {
        deviceId: id,
        controlKey: updates.command.controlKey,
        value: updates.command.value,
        timestamp: new Date(),
      };

      const result = await deviceManager.processDeviceCommand(command);
      
      if (!result.success) {
        throw createError(result.message || 'Command failed', 400);
      }

      res.json({
        success: true,
        data: result.data,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Regular device update
      const device = await deviceManager.updateDevice(id, updates);
      
      if (!device) {
        throw createError('Device not found', 404);
      }

      res.json({
        success: true,
        data: device,
        message: 'Device updated successfully',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    if (error instanceof Error && (error as any).statusCode) {
      throw error;
    }
    console.error('Error updating device:', error);
    throw createError('Failed to update device', 500);
  }
});

/**
 * DELETE /api/devices/:id
 * Remove a device
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await deviceManager.removeDevice(id);
    
    if (!success) {
      throw createError('Device not found', 404);
    }

    res.json({
      success: true,
      message: 'Device removed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && (error as any).statusCode) {
      throw error;
    }
    console.error('Error removing device:', error);
    throw createError('Failed to remove device', 500);
  }
});

/**
 * GET /api/devices/:id/history
 * Get historical data for a device
 */
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { property, startDate, endDate, limit } = req.query;

    // Validate device exists
    const device = deviceManager.getDevice(id);
    if (!device) {
      throw createError('Device not found', 404);
    }

    // Build query parameters with required dates
    const now = new Date();
    const defaultStartDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    const query = {
      deviceId: id,
      property: property as string || 'value',
      startDate: startDate ? new Date(startDate as string) : defaultStartDate,
      endDate: endDate ? new Date(endDate as string) : now,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    };

    const historicalData = await dataStorage.getHistoricalData(query);

    res.json({
      success: true,
      data: historicalData.data,
      count: historicalData.totalCount,
      query: historicalData.query,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && (error as any).statusCode) {
      throw error;
    }
    console.error('Error fetching device history:', error);
    throw createError('Failed to fetch device history', 500);
  }
});

/**
 * GET /api/devices/room/:room
 * Get devices by room
 */
router.get('/room/:room', async (req: Request, res: Response) => {
  try {
    const { room } = req.params;
    const devices = deviceManager.getDevicesByRoom(room);

    res.json({
      success: true,
      data: devices,
      count: devices.length,
      room,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching devices by room:', error);
    throw createError('Failed to fetch devices by room', 500);
  }
});

/**
 * GET /api/devices/type/:type
 * Get devices by type
 */
router.get('/type/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const devices = deviceManager.getDevicesByType(type);

    res.json({
      success: true,
      data: devices,
      count: devices.length,
      type,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching devices by type:', error);
    throw createError('Failed to fetch devices by type', 500);
  }
});

export default router;