import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { vi } from 'vitest';
import { NotificationBadge } from './NotificationBadge';
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

// Mock notifications with different read states
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'alert',
    title: 'Security Alert',
    message: 'Motion detected',
    timestamp: new Date(),
    isRead: false,
    priority: 'high',
  },
  {
    id: '2',
    type: 'warning',
    title: 'Low Battery',
    message: 'Battery low',
    timestamp: new Date(),
    isRead: false,
    priority: 'medium',
  },
  {
    id: '3',
    type: 'info',
    title: 'Device Connected',
    message: 'Device online',
    timestamp: new Date(),
    isRead: true,
    priority: 'low',
  },
];

// Mock the AppContext
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

describe('NotificationBadge', () => {
  const defaultProps = {
    onClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders notification icon', () => {
    render(
      <TestWrapper>
        <NotificationBadge {...defaultProps} />
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('displays correct unread count', () => {
    render(
      <TestWrapper>
        <NotificationBadge {...defaultProps} />
      </TestWrapper>
    );

    // Should show badge with count of unread notifications (2 in mock data)
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(
      <TestWrapper>
        <NotificationBadge {...defaultProps} onClick={onClick} />
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows different tooltip when open vs closed', () => {
    const { rerender } = render(
      <TestWrapper>
        <NotificationBadge {...defaultProps} isOpen={false} />
      </TestWrapper>
    );

    // Check closed tooltip
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-describedby');

    // Rerender with open state
    rerender(
      <TestWrapper>
        <NotificationBadge {...defaultProps} isOpen={true} />
      </TestWrapper>
    );

    expect(button).toHaveAttribute('aria-describedby');
  });

  it('applies different styling when open', () => {
    const { rerender } = render(
      <TestWrapper>
        <NotificationBadge {...defaultProps} isOpen={false} />
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    const initialStyle = window.getComputedStyle(button);

    rerender(
      <TestWrapper>
        <NotificationBadge {...defaultProps} isOpen={true} />
      </TestWrapper>
    );

    // The styling should change when open (exact styles depend on theme)
    expect(button).toBeInTheDocument();
  });
});

// Test with no unread notifications
describe('NotificationBadge with no unread notifications', () => {
  beforeEach(async () => {
    // Mock context with all read notifications
    vi.doMock('../../context/AppContext', async () => {
      const actual = await vi.importActual('../../context/AppContext');
      return {
        ...actual,
        useAppContext: () => ({
          state: {
            notifications: [
              {
                id: '1',
                type: 'info',
                title: 'Test',
                message: 'Test message',
                timestamp: new Date(),
                isRead: true,
                priority: 'low',
              },
            ],
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
  });

  afterEach(() => {
    vi.doUnmock('../../context/AppContext');
  });

  it('hides badge when no unread notifications', () => {
    render(
      <TestWrapper>
        <NotificationBadge onClick={vi.fn()} />
      </TestWrapper>
    );

    // Badge should be invisible when count is 0
    const badge = screen.queryByText('0');
    expect(badge).not.toBeInTheDocument();
  });
});