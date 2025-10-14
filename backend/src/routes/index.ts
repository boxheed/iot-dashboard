import { Router } from 'express';
import deviceRoutes, { initializeDeviceRoutes } from './devices';
import notificationRoutes, { initializeNotificationRoutes } from './notifications';
import { DeviceManager } from '../services/DeviceManager';
import { DataStorageService } from '../services/DataStorage';
import { NotificationService } from '../services/NotificationService';

const router = Router();

// Initialize routes with dependencies
export const initializeRoutes = (
  deviceManager: DeviceManager, 
  dataStorage: DataStorageService,
  notificationService: NotificationService
) => {
  initializeDeviceRoutes(deviceManager, dataStorage);
  initializeNotificationRoutes(notificationService);
};

// Mount route modules
router.use('/devices', deviceRoutes);
router.use('/notifications', notificationRoutes);

export default router;
