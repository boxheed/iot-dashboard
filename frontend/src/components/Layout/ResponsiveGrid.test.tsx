import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ResponsiveGrid } from './ResponsiveGrid';

const theme = createTheme();

function renderWithTheme(component: React.ReactElement) {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
}

describe('ResponsiveGrid', () => {
  it('renders children in grid layout', () => {
    renderWithTheme(
      <ResponsiveGrid>
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </ResponsiveGrid>
    );
    
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('handles empty children', () => {
    renderWithTheme(
      <ResponsiveGrid>
        {null}
      </ResponsiveGrid>
    );
    
    // Should not crash with empty children
    expect(screen.queryByText('Item')).not.toBeInTheDocument();
  });
});