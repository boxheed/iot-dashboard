#!/usr/bin/env node

import dotenv from 'dotenv';
import { SimulatorManager } from '../simulators';

// Load environment variables
dotenv.config();

/**
 * CLI script to run device simulators for development and testing
 */
class SimulatorCLI {
  private simulatorManager: SimulatorManager;

  constructor() {
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    this.simulatorManager = new SimulatorManager(brokerUrl);
  }

  public async run(): Promise<void> {
    console.log('🚀 Starting IoT Device Simulators');
    console.log('================================');

    try {
      // Create default test devices
      this.simulatorManager.createDefaultTestDevices();
      
      console.log(`📱 Created ${this.simulatorManager.getSimulatorCount()} device simulators`);
      console.log('');

      // Start all simulators
      await this.simulatorManager.startAll();
      
      console.log('✅ All simulators are running');
      console.log('');
      console.log('Device Status:');
      this.printSimulatorStatus();
      
      console.log('');
      console.log('💡 Tips:');
      console.log('- Use the IoT Dashboard to discover and control these devices');
      console.log('- Devices will occasionally go offline to simulate real-world scenarios');
      console.log('- Press Ctrl+C to stop all simulators');
      console.log('');

      // Handle graceful shutdown
      this.setupGracefulShutdown();

      // Periodically print status
      this.startStatusUpdates();

    } catch (error) {
      console.error('❌ Failed to start simulators:', error);
      process.exit(1);
    }
  }

  private printSimulatorStatus(): void {
    const statuses = this.simulatorManager.getAllSimulatorStatuses();
    
    statuses.forEach(status => {
      const indicator = status.online ? '🟢' : '🔴';
      const statusText = status.online ? 'Online' : 'Offline';
      console.log(`  ${indicator} ${status.deviceId}: ${statusText}`);
    });
  }

  private startStatusUpdates(): void {
    setInterval(() => {
      const onlineCount = this.simulatorManager.getAllSimulatorStatuses()
        .filter(s => s.online).length;
      const totalCount = this.simulatorManager.getSimulatorCount();
      
      console.log(`📊 Status Update: ${onlineCount}/${totalCount} devices online`);
    }, 60000); // Every minute
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}, shutting down simulators...`);
      
      try {
        await this.simulatorManager.stopAll();
        console.log('✅ All simulators stopped gracefully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught exception:', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  }
}

// Run the CLI if this file is executed directly
if (require.main === module) {
  const cli = new SimulatorCLI();
  cli.run().catch(error => {
    console.error('❌ Failed to run simulators:', error);
    process.exit(1);
  });
}

export { SimulatorCLI };