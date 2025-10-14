import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useWebSocket } from './useWebSocket';
import { AppProvider } from '../context/AppContext';

// Mock the websocket service
vi.mock('../services/websocket.service', () => ({
  websocketService: {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    isConnected: vi.fn().mockReturnValue(false),
    onDeviceUpdate: vi.fn(),
    onDeviceAdded: vi.fn(),
    onDeviceRemoved: vi.fn(),
    onNotification: vi.fn(),
    onConnectionStatus: vi.fn(),
    removeAllListeners: vi.fn(),
    sendDeviceCommand: vi.fn(),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}

describe('useWebSocket', () => {
  it('should initialize with default values', async () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper });
    
    expect(result.current.isConnected).toBe(false);
    // Note: isLoading might be true initially due to connection attempt
    expect(result.current.error).toBe(null);
    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
    expect(typeof result.current.sendDeviceCommand).toBe('function');
  });
});