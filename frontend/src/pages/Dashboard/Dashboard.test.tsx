import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AppProvider } from '../../context/AppContext';
import { Dashboard } from './Dashboard';

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

describe('Dashboard', () => {
  it('renders dashboard title and description', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/monitor and control your smart home devices/i)).toBeInTheDocument();
  });

  it('displays connection status', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
  });

  it('displays device count', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText(/0 devices connected/i)).toBeInTheDocument();
  });

  it('shows placeholder for device grid', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText(/device grid will be implemented/i)).toBeInTheDocument();
  });
});