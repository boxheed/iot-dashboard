import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';
import { AddDeviceWizard } from './AddDeviceWizard';


const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('AddDeviceWizard', () => {
  const mockOnClose = vi.fn();
  const mockOnDeviceAdded = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the wizard when open', () => {
    renderWithTheme(
      <AddDeviceWizard
        open={true}
        onClose={mockOnClose}
        onDeviceAdded={mockOnDeviceAdded}
      />
    );

    expect(screen.getByText('Add New Device')).toBeInTheDocument();
    expect(screen.getByText('Select Device Type')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithTheme(
      <AddDeviceWizard
        open={false}
        onClose={mockOnClose}
        onDeviceAdded={mockOnDeviceAdded}
      />
    );

    expect(screen.queryByText('Add New Device')).not.toBeInTheDocument();
  });

  it('shows all wizard steps', () => {
    renderWithTheme(
      <AddDeviceWizard
        open={true}
        onClose={mockOnClose}
        onDeviceAdded={mockOnDeviceAdded}
      />
    );

    expect(screen.getByText('Select Device Type')).toBeInTheDocument();
    expect(screen.getByText('Configure Device')).toBeInTheDocument();
    expect(screen.getByText('Test Connection')).toBeInTheDocument();
  });

  it('disables Next button when no device type is selected', () => {
    renderWithTheme(
      <AddDeviceWizard
        open={true}
        onClose={mockOnClose}
        onDeviceAdded={mockOnDeviceAdded}
      />
    );

    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeDisabled();
  });

  it('enables Next button when device type is selected', async () => {
    renderWithTheme(
      <AddDeviceWizard
        open={true}
        onClose={mockOnClose}
        onDeviceAdded={mockOnDeviceAdded}
      />
    );

    // Click on sensor device type
    const sensorCard = screen.getByText('Sensor').closest('[role="button"]') || screen.getByText('Sensor').closest('div');
    if (sensorCard) {
      fireEvent.click(sensorCard);
    }

    await waitFor(() => {
      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).not.toBeDisabled();
    });
  });

  it('progresses through wizard steps', async () => {
    renderWithTheme(
      <AddDeviceWizard
        open={true}
        onClose={mockOnClose}
        onDeviceAdded={mockOnDeviceAdded}
      />
    );

    // Step 1: Select device type
    const sensorCard = screen.getByText('Sensor').closest('[role="button"]') || screen.getByText('Sensor').closest('div');
    if (sensorCard) {
      fireEvent.click(sensorCard);
    }

    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    // Step 2: Should show configuration form
    await waitFor(() => {
      expect(screen.getByText('Configure Your Sensor')).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel button is clicked', () => {
    renderWithTheme(
      <AddDeviceWizard
        open={true}
        onClose={mockOnClose}
        onDeviceAdded={mockOnDeviceAdded}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close icon is clicked', () => {
    renderWithTheme(
      <AddDeviceWizard
        open={true}
        onClose={mockOnClose}
        onDeviceAdded={mockOnDeviceAdded}
      />
    );

    const closeButton = screen.getByLabelText('close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows back button on subsequent steps', async () => {
    renderWithTheme(
      <AddDeviceWizard
        open={true}
        onClose={mockOnClose}
        onDeviceAdded={mockOnDeviceAdded}
      />
    );

    // Select device type and go to next step
    const sensorCard = screen.getByText('Sensor').closest('[role="button"]') || screen.getByText('Sensor').closest('div');
    if (sensorCard) {
      fireEvent.click(sensorCard);
    }

    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });
  });

  it('goes back to previous step when back button is clicked', async () => {
    renderWithTheme(
      <AddDeviceWizard
        open={true}
        onClose={mockOnClose}
        onDeviceAdded={mockOnDeviceAdded}
      />
    );

    // Go to step 2
    const sensorCard = screen.getByText('Sensor').closest('[role="button"]') || screen.getByText('Sensor').closest('div');
    if (sensorCard) {
      fireEvent.click(sensorCard);
    }

    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Configure Your Sensor')).toBeInTheDocument();
    });

    // Go back to step 1
    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.getByText('What type of device are you adding?')).toBeInTheDocument();
    });
  });

  it('resets wizard state when closed and reopened', async () => {
    const { rerender } = renderWithTheme(
      <AddDeviceWizard
        open={true}
        onClose={mockOnClose}
        onDeviceAdded={mockOnDeviceAdded}
      />
    );

    // Select device type
    const sensorCard = screen.getByText('Sensor').closest('[role="button"]') || screen.getByText('Sensor').closest('div');
    if (sensorCard) {
      fireEvent.click(sensorCard);
    }

    // Close wizard
    const closeButton = screen.getByLabelText('close');
    fireEvent.click(closeButton);

    // Reopen wizard
    rerender(
      <ThemeProvider theme={theme}>
        <AddDeviceWizard
          open={true}
          onClose={mockOnClose}
          onDeviceAdded={mockOnDeviceAdded}
        />
      </ThemeProvider>
    );

    // Should be back to step 1 with no selection
    expect(screen.getByText('What type of device are you adding?')).toBeInTheDocument();
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeDisabled();
  });
});