import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketService } from './websocket.service';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
  })),
}));

describe('WebSocketService', () => {
  let service: WebSocketService;

  beforeEach(() => {
    service = new WebSocketService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.disconnect();
  });

  it('should create instance', () => {
    expect(service).toBeInstanceOf(WebSocketService);
  });

  it('should return false for isConnected when not connected', () => {
    expect(service.isConnected()).toBe(false);
  });

  it('should handle disconnect', () => {
    service.disconnect();
    expect(service.isConnected()).toBe(false);
  });

  it('should throw error when sending command without connection', () => {
    expect(() => {
      service.sendDeviceCommand('device1', 'switch', true);
    }).toThrow('WebSocket not connected');
  });
});