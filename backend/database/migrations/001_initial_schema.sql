-- Initial database schema for IoT Dashboard
-- This migration creates the core tables for devices, historical data, and notifications

-- Devices table - stores device registry and configuration
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sensor', 'switch', 'dimmer', 'thermostat', 'camera', 'lock')),
  room TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('online', 'offline', 'error')) DEFAULT 'offline',
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  properties TEXT, -- JSON string of DeviceProperty[]
  controls TEXT,   -- JSON string of DeviceControl[]
  thresholds TEXT, -- JSON string of Threshold[]
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Historical data table - stores time-series device readings
CREATE TABLE IF NOT EXISTS historical_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  property TEXT NOT NULL,
  value TEXT NOT NULL, -- Store as TEXT to handle any data type
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices (id) ON DELETE CASCADE
);

-- Notifications table - stores alerts and system messages
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('alert', 'warning', 'info', 'error')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  device_id TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_read BOOLEAN DEFAULT FALSE,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  FOREIGN KEY (device_id) REFERENCES devices (id) ON DELETE SET NULL
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices (status);
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices (type);
CREATE INDEX IF NOT EXISTS idx_devices_room ON devices (room);
CREATE INDEX IF NOT EXISTS idx_historical_data_device_property ON historical_data (device_id, property);
CREATE INDEX IF NOT EXISTS idx_historical_data_timestamp ON historical_data (timestamp);
CREATE INDEX IF NOT EXISTS idx_historical_data_device_timestamp ON historical_data (device_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_notifications_device_id ON notifications (device_id);
CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications (timestamp);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications (priority);

-- Triggers to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_devices_timestamp 
  AFTER UPDATE ON devices
  BEGIN
    UPDATE devices SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;