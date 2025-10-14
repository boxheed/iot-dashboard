import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AppProvider, useAppContext } from '../../context/AppContext';
import { NotificationCenter } from './NotificationCenter';
import { NotificationBadge } from './NotificationBadge';
import { ToastNotification } from './ToastNotification';
import { useToastNotifications } from '../../hooks/useToastNotifications';
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

// Test component that adds notifications to context
const NotificationTester: React.FC = () => {
  const { dispatch } = useAppContext();

  const addTestNotification = (type: 'alert' | 'warning' | 'info' | 'error', priority: 'high' | 'medium' | 'low') => {
    const notification: Notification = {
      id: `test-${Date.now()}`,
      type,
      title: `Test ${type}`,
      message: `This is a test ${type} notification`,
      timestamp: new Date(),
      isRead: false,
      priority,
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
  };

  return (
    <div>
      <button onClick={() => addTestNotification('alert', 'high')}>
        Add Alert
      </button>
      <button onClick={() => addTestNotification('warning', 'medium')}>
        Add Warning
      </button>
      <button onClick={() => addTestNotification('info', 'low')}>
        Add Info
      </button>
    </div>
  );
};

// Component to test toast notifications
const ToastTester: React.FC = () => {
  const { currentToast, closeToast } = useToastNotifications();

  return (
    <div>
      <ToastNotification notification={currentToast} onClose={closeToast} />
      <div data-testid="current-toast">
        {currentToast ? currentToast.title : 'No toast'}
      </div>
    </div>
  );
};

describe('Notification System Integration', () => {
  it('displays notification count in badge', async () => {
    render(
      <TestWrapper>
        <NotificationTester />
        <NotificationBadge onClick={() => {}} />
      </TestWrapper>
    );

    // Initially no notifications
    expect(screen.queryByText('1')).not.toBeInTheDocument();

    // Add a notification
    const addButton = screen.getByText('Add Alert');
    act(() => {
      fireEvent.click(addButton);
    });

    // Should show badge with count
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows notifications in notification center', async () => {
    render(
      <TestWrapper>
        <NotificationTester />
        <NotificationCenter isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    // Initially shows empty state
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();

    // Add notifications
    const alertButton = screen.getByText('Add Alert');
    const warningButton = screen.getByText('Add Warning');

    act(() => {
      fireEvent.click(alertButton);
      fireEvent.click(warningButton);
    });

    // Should show notifications
    expect(screen.getByText('Test alert')).toBeInTheDocument();
    expect(screen.getByText('Test warning')).toBeInTheDocument();
    expect(screen.queryByText('No notifications yet')).not.toBeInTheDocument();
  });

  it('filters notifications correctly', async () => {
    render(
      <TestWrapper>
        <NotificationTester />
        <NotificationCenter isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    // Add different types of notifications
    const alertButton = screen.getByText('Add Alert');
    const infoButton = screen.getByText('Add Info');

    act(() => {
      fireEvent.click(alertButton);
      fireEvent.click(infoButton);
    });

    // Both should be visible initially
    expect(screen.getByText('Test alert')).toBeInTheDocument();
    expect(screen.getByText('Test info')).toBeInTheDocument();

    // Filter by alert type
    const typeSelect = screen.getByLabelText('Type');
    act(() => {
      fireEvent.mouseDown(typeSelect);
    });

    const alertOption = screen.getByText('Alert');
    act(() => {
      fireEvent.click(alertOption);
    });

    // Should only show alert notification
    expect(screen.getByText('Test alert')).toBeInTheDocument();
    expect(screen.queryByText('Test info')).not.toBeInTheDocument();
  });

  it('shows toast for high priority notifications', async () => {
    render(
      <TestWrapper>
        <NotificationTester />
        <ToastTester />
      </TestWrapper>
    );

    // Initially no toast
    expect(screen.getByTestId('current-toast')).toHaveTextContent('No toast');

    // Add high priority notification
    const alertButton = screen.getByText('Add Alert');
    act(() => {
      fireEvent.click(alertButton);
    });

    // Should show toast
    expect(screen.getByTestId('current-toast')).toHaveTextContent('Test alert');
  });

  it('does not show toast for low priority notifications', async () => {
    render(
      <TestWrapper>
        <NotificationTester />
        <ToastTester />
      </TestWrapper>
    );

    // Add low priority notification
    const infoButton = screen.getByText('Add Info');
    act(() => {
      fireEvent.click(infoButton);
    });

    // Should not show toast
    expect(screen.getByTestId('current-toast')).toHaveTextContent('No toast');
  });

  it('marks notifications as read', async () => {
    render(
      <TestWrapper>
        <NotificationTester />
        <NotificationCenter isOpen={true} onClose={() => {}} />
      </TestWrapper>
    );

    // Add a notification
    const alertButton = screen.getByText('Add Alert');
    act(() => {
      fireEvent.click(alertButton);
    });

    // Should show unread count
    expect(screen.getByText('1')).toBeInTheDocument(); // Badge count

    // Mark as read
    const markReadButton = screen.getByTitle('Mark as read');
    act(() => {
      fireEvent.click(markReadButton);
    });

    // Badge count should be gone (notification is read)
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });
});