import React from 'react';
import { useWebSocket } from '../../hooks';

/**
 * WebSocket provider props
 */
interface WebSocketProviderProps {
  children: React.ReactNode;
}

/**
 * WebSocket provider component that initializes and manages WebSocket connection
 */
export function WebSocketProvider({ children }: WebSocketProviderProps) {
  // Initialize WebSocket connection
  useWebSocket();

  return <>{children}</>;
}