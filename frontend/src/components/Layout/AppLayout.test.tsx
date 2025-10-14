import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AppProvider } from '../../context/AppContext';
import { AppLayout } from './AppLayout';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { expect } from 'vitest';
import { it } from 'vitest';
import { describe } from 'vitest';

const theme = createTheme();

function renderWithProviders(component: React.ReactElement) {
  return render(
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <AppProvider>
          {component}
        </AppProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

describe('AppLayout', () => {
  it('renders app title and navigation items', () => {
    renderWithProviders(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );
    
    expect(screen.getByText('Smart Home Dashboard')).toBeInTheDocument();
    expect(screen.getAllByText('Dashboard')).toHaveLength(2); // One in drawer, one in mobile
    expect(screen.getAllByText('Device Management')).toHaveLength(2); // One in drawer, one in mobile
    expect(screen.getAllByText('Settings')).toHaveLength(2); // One in drawer, one in mobile
  });

  it('renders children content', () => {
    renderWithProviders(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('displays connection status', () => {
    renderWithProviders(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );
    
    expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
  });

  it('shows notifications badge', () => {
    renderWithProviders(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );
    
    // Should have notifications icon (even if no notifications)
    expect(screen.getByTestId('NotificationsIcon')).toBeInTheDocument();
  });
});