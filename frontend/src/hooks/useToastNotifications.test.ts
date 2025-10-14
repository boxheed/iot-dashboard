import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useToastNotifications } from './useToastNotifications';
import { Notification } from '../../../shared/src/types/Notification';

// Mock the AppContext
const mockDispatch = vi.fn();
const mockState = {
  notifications: [] as Notification[],
  devices: [],
  selectedDevice: null,
  isConnected: true,
  isLoading: false,
  error: null,
};

vi.mock('../context/AppContext', () => ({
  useAppContext: () => ({
    state: mockState,
    dispatch: mockDispatch,
  }),
}));

// Mock notifications
const createMockNotification = (
  id: string,
  type: 'alert' | 'warning' | 'info' | 'error',
  priority: 'high' | 'medium' | 'low'
): Notification => ({
  id,
  type,
  title: `Test ${type}`,
  message: `Test message for ${id}`,
  timestamp: new Date(),
  isRead: false,
  priority,
});

describe('useToastNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.notifications = [];
  });

  it('initializes with no current toast', () => {
    const { result } = renderHook(() => useToastNotifications());

    expect(result.current.currentToast).toBeNull();
    expect(result.current.hasQueuedToasts).toBe(false);
  });

  it('shows toast for high priority notifications', () => {
    const { result, rerender } = renderHook(() => useToastNotifications());

    // Add a high priority notification
    const highPriorityNotification = createMockNotification('1', 'info', 'high');
    act(() => {
      mockState.notifications = [highPriorityNotification];
    });

    rerender();

    expect(result.current.currentToast).toEqual(highPriorityNotification);
  });

  it('shows toast for alert notifications regardless of priority', () => {
    const { result, rerender } = renderHook(() => useToastNotifications());

    // Add an alert notification with low priority
    const alertNotification = createMockNotification('1', 'alert', 'low');
    act(() => {
      mockState.notifications = [alertNotification];
    });

    rerender();

    expect(result.current.currentToast).toEqual(alertNotification);
  });

  it('shows toast for error notifications regardless of priority', () => {
    const { result, rerender } = renderHook(() => useToastNotifications());

    // Add an error notification with low priority
    const errorNotification = createMockNotification('1', 'error', 'low');
    act(() => {
      mockState.notifications = [errorNotification];
    });

    rerender();

    expect(result.current.currentToast).toEqual(errorNotification);
  });

  it('does not show toast for low priority info/warning notifications', () => {
    const { result, rerender } = renderHook(() => useToastNotifications());

    // Add a low priority warning notification
    const lowPriorityNotification = createMockNotification('1', 'warning', 'low');
    act(() => {
      mockState.notifications = [lowPriorityNotification];
    });

    rerender();

    expect(result.current.currentToast).toBeNull();
  });

  it('queues multiple toast notifications', () => {
    const { result, rerender } = renderHook(() => useToastNotifications());

    // Add multiple high priority notifications
    const notification1 = createMockNotification('1', 'alert', 'high');
    const notification2 = createMockNotification('2', 'error', 'medium');
    
    act(() => {
      mockState.notifications = [notification1, notification2];
    });

    rerender();

    // First notification should be current
    expect(result.current.currentToast).toEqual(notification1);
    expect(result.current.hasQueuedToasts).toBe(true);
  });

  it('shows next toast when current is closed', () => {
    const { result, rerender } = renderHook(() => useToastNotifications());

    // Add multiple notifications
    const notification1 = createMockNotification('1', 'alert', 'high');
    const notification2 = createMockNotification('2', 'error', 'medium');
    
    act(() => {
      mockState.notifications = [notification1, notification2];
    });

    rerender();

    expect(result.current.currentToast).toEqual(notification1);

    // Close current toast
    act(() => {
      result.current.closeToast();
    });

    expect(result.current.currentToast).toEqual(notification2);
  });

  it('clears all toasts', () => {
    const { result, rerender } = renderHook(() => useToastNotifications());

    // Add multiple notifications
    const notification1 = createMockNotification('1', 'alert', 'high');
    const notification2 = createMockNotification('2', 'error', 'medium');
    
    act(() => {
      mockState.notifications = [notification1, notification2];
    });

    rerender();

    expect(result.current.currentToast).toEqual(notification1);
    expect(result.current.hasQueuedToasts).toBe(true);

    // Clear all toasts
    act(() => {
      result.current.clearAllToasts();
    });

    expect(result.current.currentToast).toBeNull();
    expect(result.current.hasQueuedToasts).toBe(false);
  });

  it('handles incremental notification additions', () => {
    const { result, rerender } = renderHook(() => useToastNotifications());

    // Start with one notification
    const notification1 = createMockNotification('1', 'alert', 'high');
    act(() => {
      mockState.notifications = [notification1];
    });

    rerender();

    expect(result.current.currentToast).toEqual(notification1);

    // Add another notification
    const notification2 = createMockNotification('2', 'error', 'medium');
    act(() => {
      mockState.notifications = [notification2, notification1]; // New notifications at the beginning
    });

    rerender();

    // Should still show first notification, but queue the second
    expect(result.current.currentToast).toEqual(notification1);
    expect(result.current.hasQueuedToasts).toBe(true);
  });

  it('ignores notifications that should not show as toasts', () => {
    const { result, rerender } = renderHook(() => useToastNotifications());

    // Add notifications that should not show as toasts
    const lowPriorityInfo = createMockNotification('1', 'info', 'low');
    const mediumPriorityWarning = createMockNotification('2', 'warning', 'medium');
    
    act(() => {
      mockState.notifications = [lowPriorityInfo, mediumPriorityWarning];
    });

    rerender();

    expect(result.current.currentToast).toBeNull();
    expect(result.current.hasQueuedToasts).toBe(false);
  });
});