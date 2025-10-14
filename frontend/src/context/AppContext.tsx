import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Device } from '../../../shared/src/types/Device';
import { Notification } from '../../../shared/src/types/Notification';

/**
 * Global application state interface
 */
export interface AppState {
  devices: Device[];
  notifications: Notification[];
  selectedDevice: Device | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Action types for state management
 */
export type AppAction =
  | { type: 'SET_DEVICES'; payload: Device[] }
  | { type: 'UPDATE_DEVICE'; payload: Device }
  | { type: 'ADD_DEVICE'; payload: Device }
  | { type: 'REMOVE_DEVICE'; payload: string }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'UPDATE_NOTIFICATION'; payload: { id: string; updates: Partial<Notification> } }
  | { type: 'SET_SELECTED_DEVICE'; payload: Device | null }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

/**
 * Initial application state
 */
const initialState: AppState = {
  devices: [],
  notifications: [],
  selectedDevice: null,
  isConnected: false,
  isLoading: false,
  error: null,
};

/**
 * State reducer function
 */
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_DEVICES':
      return { ...state, devices: action.payload };
    
    case 'UPDATE_DEVICE':
      return {
        ...state,
        devices: state.devices.map(device =>
          device.id === action.payload.id ? action.payload : device
        ),
      };
    
    case 'ADD_DEVICE':
      return {
        ...state,
        devices: [...state.devices, action.payload],
      };
    
    case 'REMOVE_DEVICE':
      return {
        ...state,
        devices: state.devices.filter(device => device.id !== action.payload),
        selectedDevice: state.selectedDevice?.id === action.payload ? null : state.selectedDevice,
      };
    
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.payload };
    
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      };
    
    case 'UPDATE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload.id
            ? { ...notification, ...action.payload.updates }
            : notification
        ),
      };
    
    case 'SET_SELECTED_DEVICE':
      return { ...state, selectedDevice: action.payload };
    
    case 'SET_CONNECTION_STATUS':
      return { ...state, isConnected: action.payload };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    default:
      return state;
  }
}

/**
 * Context interface
 */
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

/**
 * App context
 */
const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * App context provider props
 */
interface AppProviderProps {
  children: ReactNode;
}

/**
 * App context provider component
 */
export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Hook to use app context
 */
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}