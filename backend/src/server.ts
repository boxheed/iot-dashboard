import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler, notFoundHandler, requestLogger } from './middleware';
import { WebSocketHandler, DataStorageService, DeviceManager, NotificationService, MqttClientService } from './services';
import apiRoutes, { initializeRoutes } from './routes';
import { Database } from './utils/database';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use(requestLogger);
}

// Health check endpoints
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Initialize database and services
const database = new Database({
  filename: process.env.DATABASE_PATH || './database/iot_dashboard.db',
  verbose: process.env.NODE_ENV === 'development',
});

const dataStorage = new DataStorageService(database);
const webSocketHandler = new WebSocketHandler(io);
const notificationService = new NotificationService(dataStorage, webSocketHandler);
const deviceManager = new DeviceManager(dataStorage);

// Initialize MQTT client
const mqttBrokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const mqttClient = new MqttClientService(mqttBrokerUrl, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
});

// Connect services
deviceManager.setWebSocketHandler(webSocketHandler);
deviceManager.setMqttClient(mqttClient);

// Initialize routes with dependencies
initializeRoutes(deviceManager, dataStorage, notificationService);

// Mount API routes
app.use('/api', apiRoutes);

// Status endpoint for more detailed system information
app.get('/api/status', (_req, res) => {
  res.json({
    server: {
      status: 'running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    },
    websocket: {
      connected_clients: io.engine.clientsCount,
    },
    devices: {
      total: deviceManager.getAllDevices().length,
      online: deviceManager.getOnlineDevices().length,
    },
  });
});

// Initialize services on startup
const initializeServices = async () => {
  try {
    await database.connect();
    await deviceManager.initialize();
    
    // Initialize MQTT client (non-blocking)
    try {
      await mqttClient.connect();
      console.log('MQTT client connected successfully');
    } catch (mqttError) {
      console.warn('MQTT client connection failed, continuing without MQTT:', mqttError);
      // Continue without MQTT - the system should work with simulated devices
    }
    
    console.log('All services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    process.exit(1);
  }
};

// Make services available globally for other modules
export { webSocketHandler, deviceManager, dataStorage, notificationService, mqttClient };

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await mqttClient.disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await mqttClient.disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server with service initialization
const startServer = async () => {
  try {
    await initializeServices();
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Export for testing
export { app, server, io };
