import { Router } from 'express';
import deviceRoutes, { initializeDeviceRoutes } from './devices';
import { DeviceManager } from '../services/DeviceManager';
import { DataStorageService } from '../services/DataStorage';

const router = Router();

// Initialize routes with dependencies
export const initializeRoutes = (deviceManager: DeviceManager, dataStorage: DataStorageService) => {
  initializeDeviceRoutes(deviceManager, dataStorage);
};

// Mount route modules
router.use('/devices', deviceRoutes);

export default router;
