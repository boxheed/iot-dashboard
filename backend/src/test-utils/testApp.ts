import express, { Express } from 'express';
import cors from 'cors';
import { Database } from '../utils/database';
import { DataStorageService, DeviceManager, WebSocketHandler, NotificationService } from '../services';
import { errorHandler, notFoundHandler } from '../middleware';
import apiRoutes, { initializeRoutes } from '../routes';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs/promises';
import path from 'path';

/**
 * Run database migrations for testing
 */
async function runMigrations(database: Database): Promise<void> {
  // Create tables directly for testing
  const createTables = [
    `CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('sensor', 'switch', 'dimmer', 'thermostat', 'camera', 'lock')),
      room TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'error')) DEFAULT 'offline',
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      properties TEXT,
      controls TEXT,
      thresholds TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS historical_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      property TEXT NOT NULL,
      value TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES devices (id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('alert', 'warning', 'info', 'error')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      device_id TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_read BOOLEAN DEFAULT FALSE,
      priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
      FOREIGN KEY (device_id) REFERENCES devices (id) ON DELETE SET NULL
    )`
  ];

  for (const sql of createTables) {
    await database.run(sql);
  }
}

/**
 * Create a test Express app with all services initialized
 */
export async function createTestApp(): Promise<Express> {
  const app = express();
  
  // Create HTTP server and Socket.io for testing
  const server = createServer(app);
  const io = new Server(server);

  // Basic middleware
  app.use(cors());
  app.use(express.json());

  // Initialize test database (in-memory)
  const database = new Database({
    filename: ':memory:', // Use in-memory SQLite for tests
    verbose: false,
  });

  await database.connect();
  
  // Run database migrations for test
  await runMigrations(database);

  // Initialize services
  const dataStorage = new DataStorageService(database);
  const webSocketHandler = new WebSocketHandler(io);
  const notificationService = new NotificationService(dataStorage, webSocketHandler);
  const deviceManager = new DeviceManager(dataStorage);

  // Connect services
  deviceManager.setWebSocketHandler(webSocketHandler);

  // Initialize device manager
  await deviceManager.initialize();

  // Initialize routes
  initializeRoutes(deviceManager, dataStorage, notificationService);

  // Mount API routes
  app.use('/api', apiRoutes);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'test'
    });
  });

  // Status endpoint
  app.get('/api/status', (_req, res) => {
    res.json({
      server: {
        status: 'running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'test',
        version: '1.0.0',
      },
      websocket: {
        connected_clients: 0, // Mock value for tests
      },
      devices: {
        total: deviceManager.getAllDevices().length,
        online: deviceManager.getOnlineDevices().length,
      },
    });
  });

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}