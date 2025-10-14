/**
 * Database connection utilities and configuration for SQLite
 * Provides connection management, initialization, and migration support
 */

import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  /** Path to the SQLite database file */
  filename: string;
  /** Whether to enable verbose logging */
  verbose?: boolean;
  /** Connection timeout in milliseconds */
  timeout?: number;
}

/**
 * Database connection wrapper with promisified methods
 */
export class Database {
  private db: sqlite3.Database;
  private isConnected: boolean = false;

  constructor(private config: DatabaseConfig) {
    // Enable verbose mode if requested
    const sqlite = config.verbose ? sqlite3.verbose() : sqlite3;
    this.db = new sqlite.Database(config.filename);
  }

  /**
   * Initialize the database connection and run initial setup
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // SQLite opens synchronously, so we can resolve immediately if no error
      this.db.on('error', (error) => {
        this.isConnected = false;
        console.error('Database connection error:', error);
        reject(error);
      });

      // For SQLite, the database is ready immediately after construction
      // We'll test the connection with a simple query
      this.db.get('SELECT 1', (error) => {
        if (error) {
          this.isConnected = false;
          reject(error);
        } else {
          this.isConnected = true;
          console.log(`Connected to SQLite database: ${this.config.filename}`);
          resolve();
        }
      });
    });
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((error) => {
        if (error) {
          console.error('Error closing database:', error);
          reject(error);
        } else {
          this.isConnected = false;
          console.log('Database connection closed');
          resolve();
        }
      });
    });
  }

  /**
   * Execute a SQL query that returns rows
   */
  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (error, rows) => {
        if (error) {
          console.error('Database query error:', error);
          reject(error);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  /**
   * Execute a SQL query that returns a single row
   */
  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (error, row) => {
        if (error) {
          console.error('Database query error:', error);
          reject(error);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  /**
   * Execute a SQL query that modifies data (INSERT, UPDATE, DELETE)
   */
  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(error) {
        if (error) {
          console.error('Database query error:', error);
          reject(error);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Execute multiple SQL statements in a transaction
   */
  async transaction(queries: Array<{ sql: string; params?: any[] }>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        try {
          for (const query of queries) {
            this.db.run(query.sql, query.params || []);
          }
          
          this.db.run('COMMIT', (error) => {
            if (error) {
              this.db.run('ROLLBACK');
              reject(error);
            } else {
              resolve();
            }
          });
        } catch (error) {
          this.db.run('ROLLBACK');
          reject(error);
        }
      });
    });
  }

  /**
   * Check if the database connection is active
   */
  isOpen(): boolean {
    return this.isConnected;
  }
}

/**
 * Default database configuration
 */
const defaultConfig: DatabaseConfig = {
  filename: path.join(process.cwd(), 'backend', 'database', 'iot-dashboard.db'),
  verbose: process.env.NODE_ENV === 'development',
  timeout: 5000
};

/**
 * Singleton database instance
 */
let dbInstance: Database | null = null;

/**
 * Get the database instance (creates if not exists)
 */
export function getDatabase(config: DatabaseConfig = defaultConfig): Database {
  if (!dbInstance) {
    dbInstance = new Database(config);
  }
  return dbInstance;
}

/**
 * Initialize the database with schema and migrations
 */
export async function initializeDatabase(config: DatabaseConfig = defaultConfig): Promise<Database> {
  const db = getDatabase(config);
  
  // Ensure database directory exists
  const dbDir = path.dirname(config.filename);
  await fs.mkdir(dbDir, { recursive: true });
  
  // Connect to database
  await db.connect();
  
  // Run migrations
  await runMigrations(db);
  
  return db;
}

/**
 * Run database migrations
 */
async function runMigrations(db: Database): Promise<void> {
  // Create migrations table if it doesn't exist
  await db.run(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get list of applied migrations
  const appliedMigrations = await db.all<{ filename: string }>('SELECT filename FROM migrations ORDER BY id');
  const appliedSet = new Set(appliedMigrations.map(m => m.filename));

  // Get available migration files
  const migrationsDir = path.join(process.cwd(), 'backend', 'database', 'migrations');
  
  try {
    await fs.access(migrationsDir);
    const migrationFiles = await fs.readdir(migrationsDir);
    const sqlFiles = migrationFiles
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Run pending migrations
    for (const filename of sqlFiles) {
      if (!appliedSet.has(filename)) {
        console.log(`Running migration: ${filename}`);
        
        const migrationPath = path.join(migrationsDir, filename);
        const migrationSQL = await fs.readFile(migrationPath, 'utf-8');
        
        // Split migration into individual statements
        const statements = migrationSQL
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);

        // Execute migration in transaction
        await db.transaction([
          ...statements.map(sql => ({ sql })),
          { sql: 'INSERT INTO migrations (filename) VALUES (?)', params: [filename] }
        ]);

        console.log(`Migration completed: ${filename}`);
      }
    }
  } catch (error) {
    // Migrations directory doesn't exist, create initial schema
    console.log('No migrations directory found, creating initial schema');
    await createInitialSchema(db);
  }
}

/**
 * Create the initial database schema
 */
async function createInitialSchema(db: Database): Promise<void> {
  const initialSchema = `
    -- Devices table
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

    -- Historical data table
    CREATE TABLE IF NOT EXISTS historical_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      property TEXT NOT NULL,
      value TEXT NOT NULL, -- Store as TEXT to handle any data type
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES devices (id) ON DELETE CASCADE
    );

    -- Notifications table
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
    CREATE INDEX IF NOT EXISTS idx_historical_data_device_property ON historical_data (device_id, property);
    CREATE INDEX IF NOT EXISTS idx_historical_data_timestamp ON historical_data (timestamp);
    CREATE INDEX IF NOT EXISTS idx_notifications_device_id ON notifications (device_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_timestamp ON notifications (timestamp);
    CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications (is_read);

    -- Triggers to update updated_at timestamp
    CREATE TRIGGER IF NOT EXISTS update_devices_timestamp 
      AFTER UPDATE ON devices
      BEGIN
        UPDATE devices SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
  `;

  // Split into individual statements and execute
  const statements = initialSchema
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  for (const statement of statements) {
    await db.run(statement);
  }

  console.log('Initial database schema created');
}