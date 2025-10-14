import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MobileNavigation } from './MobileNavigation';

const theme = createTheme();

function renderWithProviders(component: React.ReactElement) {
  return render(
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </ThemeProvider>
  );
}

// Mock useMediaQuery to simulate mobile
const mockUseMediaQuery = vi.fn();
vi.mock('@mui/material', async () => {
  const actual = await vi.importActual('@mui/material');
  return {
    ...actual,
    useMediaQuery: () => mockUseMediaQuery(),
  };
});

describe('MobileNavigation', () => {
  beforeEach(() => {
    mockUseMediaQuery.mockReturnValue(true); // Simulate mobile
  });

  it('renders navigation items on mobile', () => {
    renderWithProviders(<MobileNavigation />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Devices')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('does not render on desktop', () => {
    mockUseMediaQuery.mockReturnValue(false); // Simulate desktop
    
    const { container } = renderWithProviders(<MobileNavigation />);
    
    expect(container.firstChild).toBeNull();
  });
});