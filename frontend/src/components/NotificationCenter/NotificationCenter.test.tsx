import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { vi } from 'vitest';
import { NotificationCenter } from './NotificationCenter';
import { AppProvider } from '../../context/AppContext';
import { Notification } from '../../../../shared/src/types/Notification';

// Mock theme
const theme = createTheme();

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    <AppProvider>
      {children}
    </AppProvider>
  </ThemeProvider>
);

// Mock notifications
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'alert',
    title: 'Security Alert',
    message: 'Motion detected at front door',
    timestamp: new Date('2023-01-01T10:00:00Z'),
    isRead: false,
    priority: 'high',
    deviceId: 'device-1',
  },
  {
    id: '2',
    type: 'warning',
    title: 'Low Battery',
    message: 'Smoke detector battery is low',
    timestamp: new Date('2023-01-01T09:00:00Z'),
    isRead: true,
    priority: 'medium',
    deviceId: 'device-2',
  },
  {
    id: '3',
    type: 'info',
    title: 'Device Connected',
    message: 'Smart thermostat is now online',
    timestamp: new Date('2023-01-01T08:00:00Z'),
    isRead: false,
    priority: 'low',
    deviceId: 'device-3',
  },
];

// Mock the AppContext with notifications
vi.mock('../../context/AppContext', async () => {
  const actual = await vi.importActual('../../context/AppContext');
  return {
    ...actual,
    useAppContext: () => ({
      state: {
        notifications: mockNotifications,
        devices: [],
        selectedDevice: null,
        isConnected: true,
        isLoading: false,
        error: null,
      },
      dispatch: vi.fn(),
    }),
  };
});

describe('NotificationCenter', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    render(
      <TestWrapper>
        <NotificationCenter {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Security Alert')).toBeInTheDocument();
    expect(screen.getByText('Low Battery')).toBeInTheDocument();
    expect(screen.getByText('Device Connected')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <TestWrapper>
        <NotificationCenter {...defaultProps} isOpen={false} />
      </TestWrapper>
    );

    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
  });

  it('displays unread count badge', () => {
    render(
      <TestWrapper>
        <NotificationCenter {...defaultProps} />
      </TestWrapper>
    );

    // Should show badge with count of unread notifications (2 in mock data)
    const badge = screen.getByText('2');
    expect(badge).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <TestWrapper>
        <NotificationCenter {...defaultProps} onClose={onClose} />
      </TestWrapper>
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('filters notifications by type', async () => {
    render(
      <TestWrapper>
        <NotificationCenter {...defaultProps} />
      </TestWrapper>
    );

    // Open type filter
    const typeSelect = screen.getByLabelText('Type');
    fireEvent.mouseDown(typeSelect);

    // Select 'alert' type
    const alertOption = screen.getByText('Alert');
    fireEvent.click(alertOption);

    await waitFor(() => {
      expect(screen.getByText('Security Alert')).toBeInTheDocument();
      expect(screen.queryByText('Low Battery')).not.toBeInTheDocument();
      expect(screen.queryByText('Device Connected')).not.toBeInTheDocument();
    });
  });

  it('filters notifications by priority', async () => {
    render(
      <TestWrapper>
        <NotificationCenter {...defaultProps} />
      </TestWrapper>
    );

    // Open priority filter
    const prioritySelect = screen.getByLabelText('Priority');
    fireEvent.mouseDown(prioritySelect);

    // Select 'high' priority
    const highOption = screen.getByText('High');
    fireEvent.click(highOption);

    await waitFor(() => {
      expect(screen.getByText('Security Alert')).toBeInTheDocument();
      expect(screen.queryByText('Low Battery')).not.toBeInTheDocument();
      expect(screen.queryByText('Device Connected')).not.toBeInTheDocument();
    });
  });

  it('filters notifications by read status', async () => {
    render(
      <TestWrapper>
        <NotificationCenter {...defaultProps} />
      </TestWrapper>
    );

    // Open status filter
    const statusSelect = screen.getByLabelText('Status');
    fireEvent.mouseDown(statusSelect);

    // Select 'Unread' status
    const unreadOption = screen.getByText('Unread');
    fireEvent.click(unreadOption);

    await waitFor(() => {
      expect(screen.getByText('Security Alert')).toBeInTheDocument();
      expect(screen.queryByText('Low Battery')).not.toBeInTheDocument();
      expect(screen.getByText('Device Connected')).toBeInTheDocument();
    });
  });

  it('displays empty state when no notifications match filters', async () => {
    render(
      <TestWrapper>
        <NotificationCenter {...defaultProps} />
      </TestWrapper>
    );

    // Filter by error type (none in mock data)
    const typeSelect = screen.getByLabelText('Type');
    fireEvent.mouseDown(typeSelect);
    const errorOption = screen.getByText('Error');
    fireEvent.click(errorOption);

    await waitFor(() => {
      expect(screen.getByText('No notifications match your filters')).toBeInTheDocument();
    });
  });

  it('shows correct notification icons', () => {
    render(
      <TestWrapper>
        <NotificationCenter {...defaultProps} />
      </TestWrapper>
    );

    // Check that different notification types have appropriate icons
    // This is a basic check - in a real test you might check for specific icon components
    const notifications = screen.getAllByRole('listitem');
    expect(notifications).toHaveLength(3);
  });

  it('displays priority chips correctly', () => {
    render(
      <TestWrapper>
        <NotificationCenter {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
    expect(screen.getByText('low')).toBeInTheDocument();
  });

  it('formats timestamps correctly', () => {
    render(
      <TestWrapper>
        <NotificationCenter {...defaultProps} />
      </TestWrapper>
    );

    // Check that timestamps are displayed (exact format may vary)
    expect(screen.getByText(/ago|Just now/)).toBeInTheDocument();
  });
});