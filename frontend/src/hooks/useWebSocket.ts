import { useEffect, useCallback } from 'react';
import { websocketService } from '../services/websocket.service';
import { useAppContext } from '../context/AppContext';
import { Device } from '../../../shared/src/types/Device';
import { Notification } from '../../../shared/src/types/Notification';

/**
 * Hook for managing WebSocket connection and real-time updates
 */
export function useWebSocket() {
  const { state, dispatch } = useAppContext();

  /**
   * Handle device updates from WebSocket
   */
  const handleDeviceUpdate = useCallback((device: Device) => {
    dispatch({ type: 'UPDATE_DEVICE', payload: device });
  }, [dispatch]);

  /**
   * Handle device additions from WebSocket
   */
  const handleDeviceAdded = useCallback((device: Device) => {
    dispatch({ type: 'ADD_DEVICE', payload: device });
  }, [dispatch]);

  /**
   * Handle device removals from WebSocket
   */
  const handleDeviceRemoved = useCallback((deviceId: string) => {
    dispatch({ type: 'REMOVE_DEVICE', payload: deviceId });
  }, [dispatch]);

  /**
   * Handle notifications from WebSocket
   */
  const handleNotification = useCallback((notification: Notification) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
  }, [dispatch]);

  /**
   * Handle connection status updates
   */
  const handleConnectionStatus = useCallback((status: { connected: boolean; deviceCount: number }) => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: status.connected });
  }, [dispatch]);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });
      
      await websocketService.connect();
      
      // Set up event listeners
      websocketService.onDeviceUpdate(handleDeviceUpdate);
      websocketService.onDeviceAdded(handleDeviceAdded);
      websocketService.onDeviceRemoved(handleDeviceRemoved);
      websocketService.onNotification(handleNotification);
      websocketService.onConnectionStatus(handleConnectionStatus);
      
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to connect to server' });
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [handleDeviceUpdate, handleDeviceAdded, handleDeviceRemoved, handleNotification, handleConnectionStatus, dispatch]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    websocketService.removeAllListeners();
    websocketService.disconnect();
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
  }, [dispatch]);

  /**
   * Send device command
   */
  const sendDeviceCommand = useCallback(async (deviceId: string, controlKey: string, value: any) => {
    try {
      if (!websocketService.isConnected()) {
        throw new Error('Not connected to server');
      }
      
      websocketService.sendDeviceCommand(deviceId, controlKey, value);
    } catch (error) {
      console.error('Failed to send device command:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to send command to device' });
      throw error;
    }
  }, [dispatch]);

  /**
   * Initialize WebSocket connection on mount
   */
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    error: state.error,
    connect,
    disconnect,
    sendDeviceCommand,
  };
}