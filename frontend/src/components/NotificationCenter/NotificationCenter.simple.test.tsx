import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { NotificationCenter } from './NotificationCenter';
import { AppProvider } from '../../context/AppContext';

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

describe('NotificationCenter - Basic Functionality', () => {
  const defaultProps = {
    isOpen: true,
    onClose: () => {},
  };

  it('renders when open', () => {
    render(
      <TestWrapper>
        <NotificationCenter {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <TestWrapper>
        <NotificationCenter {...defaultProps} isOpen={false} />
      </TestWrapper>
    );

    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
  });

  it('shows empty state when no notifications', () => {
    render(
      <TestWrapper>
        <NotificationCenter {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });

  it('renders filter controls', () => {
    render(
      <TestWrapper>
        <NotificationCenter {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByLabelText('Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Priority')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
  });
});