import { render, screen, act } from '@testing-library/react';
import { vi } from 'vitest';
import { AppProvider, useAppContext } from './AppContext';
import { Device } from '../../../shared/src/types/Device';


// Test component to access context
function TestComponent() {
  const { state, dispatch } = useAppContext();
  
  return (
    <div>
      <div data-testid="device-count">{state.devices.length}</div>
      <div data-testid="notification-count">{state.notifications.length}</div>
      <div data-testid="connection-status">{state.isConnected ? 'connected' : 'disconnected'}</div>
      <button
        data-testid="add-device"
        onClick={() => dispatch({
          type: 'ADD_DEVICE',
          payload: {
            id: 'test-device',
            name: 'Test Device',
            type: 'switch',
            room: 'Living Room',
            status: 'online',
            lastSeen: new Date(),
            properties: [],
            controls: [],
          } as Device
        })}
      >
        Add Device
      </button>
      <button
        data-testid="set-connected"
        onClick={() => dispatch({ type: 'SET_CONNECTION_STATUS', payload: true })}
      >
        Connect
      </button>
    </div>
  );
}

describe('AppContext', () => {
  it('provides initial state', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    expect(screen.getByTestId('device-count')).toHaveTextContent('0');
    expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
    expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected');
  });

  it('handles ADD_DEVICE action', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    act(() => {
      screen.getByTestId('add-device').click();
    });

    expect(screen.getByTestId('device-count')).toHaveTextContent('1');
  });

  it('handles SET_CONNECTION_STATUS action', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    act(() => {
      screen.getByTestId('set-connected').click();
    });

    expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
  });

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAppContext must be used within an AppProvider');

    consoleSpy.mockRestore();
  });
});