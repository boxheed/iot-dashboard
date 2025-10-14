import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';
import { DeviceControlPanel } from './DeviceControlPanel';
import { Device } from '../../../../shared/src/types/Device';

const theme = createTheme();

function renderWithTheme(component: React.ReactElement) {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
}

// Mock device data for testing
const mockDevice: Device = {
  id: 'test-device-1',
  name: 'Living Room Light',
  type: 'dimmer',
  room: 'Living Room',
  status: 'online',
  lastSeen: new Date(),
  properties: [
    {
      key: 'brightness',
      value: 75,
      unit: '%',
      timestamp: new Date(),
    },
    {
      key: 'power',
      value: true,
      timestamp: new Date(),
    },
  ],
  controls: [
    {
      key: 'power',
      type: 'switch',
      label: 'Power',
    },
    {
      key: 'brightness',
      type: 'slider',
      label: 'Brightness',
      min: 0,
      max: 100,
    },
    {
      key: 'mode',
      type: 'select',
      label: 'Mode',
      options: ['Normal', 'Eco', 'Bright'],
    },
    {
      key: 'name',
      type: 'input',
      label: 'Device Name',
    },
  ],
};

const mockOfflineDevice: Device = {
  ...mockDevice,
  id: 'offline-device',
  name: 'Bedroom Sensor',
  type: 'sensor',
  status: 'offline',
  controls: [
    {
      key: 'sensitivity',
      type: 'slider',
      label: 'Sensitivity',
      min: 1,
      max: 10,
    },
  ],
};

const mockDeviceWithoutControls: Device = {
  ...mockDevice,
  id: 'sensor-device',
  name: 'Temperature Sensor',
  type: 'sensor',
  controls: [],
  properties: [
    {
      key: 'temperature',
      value: 23.5,
      unit: '°C',
      timestamp: new Date(),
    },
  ],
};

describe('DeviceControlPanel', () => {
  const mockOnClose = vi.fn();
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnUpdate.mockResolvedValue(undefined);
  });

  it('renders device information correctly', () => {
    renderWithTheme(
      <DeviceControlPanel
        device={mockDevice}
        open={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText('Living Room Light')).toBeInTheDocument();
    expect(screen.getByText('Living Room')).toBeInTheDocument();
    expect(screen.getByText('online')).toBeInTheDocument();
  });

  it('does not render when device is null', () => {
    renderWithTheme(
      <DeviceControlPanel
        device={null}
        open={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.queryByText('Living Room Light')).not.toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    renderWithTheme(
      <DeviceControlPanel
        device={mockDevice}
        open={false}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.queryByText('Living Room Light')).not.toBeInTheDocument();
  });

  it('displays device properties', () => {
    renderWithTheme(
      <DeviceControlPanel
        device={mockDevice}
        open={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText(/brightness: 75.0 %/)).toBeInTheDocument();
    expect(screen.getByText(/power: true/)).toBeInTheDocument();
  });

  it('renders all control types correctly', () => {
    renderWithTheme(
      <DeviceControlPanel
        device={mockDevice}
        open={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    // Switch control
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByLabelText('Power')).toBeInTheDocument();

    // Slider control
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByText('Brightness')).toBeInTheDocument();

    // Select control
    expect(screen.getByLabelText('Mode')).toBeInTheDocument();

    // Input control
    expect(screen.getByLabelText('Device Name')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    renderWithTheme(
      <DeviceControlPanel
        device={mockDevice}
        open={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onUpdate when switch control is changed', async () => {
    renderWithTheme(
      <DeviceControlPanel
        device={mockDevice}
        open={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const switchControl = screen.getByRole('checkbox');
    fireEvent.click(switchControl);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(mockDevice.id, 'power', false);
    });
  });

  it('calls onUpdate when slider control is changed', async () => {
    renderWithTheme(
      <DeviceControlPanel
        device={mockDevice}
        open={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '50' } });

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(mockDevice.id, 'brightness', 50);
    });
  });

  it('calls onUpdate when select control is changed', async () => {
    renderWithTheme(
      <DeviceControlPanel
        device={mockDevice}
        open={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const selectControl = screen.getByLabelText('Mode');
    fireEvent.mouseDown(selectControl);
    
    const ecoOption = screen.getByText('Eco');
    fireEvent.click(ecoOption);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(mockDevice.id, 'mode', 'Eco');
    });
  });

  it('calls onUpdate when input control loses focus', async () => {
    renderWithTheme(
      <DeviceControlPanel
        device={mockDevice}
        open={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const inputControl = screen.getByLabelText('Device Name');
    fireEvent.change(inputControl, { target: { value: 'New Name' } });
    fireEvent.blur(inputControl);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(mockDevice.id, 'name', 'New Name');
    });
  });

  it('calls onUpdate when Enter is pressed in input control', async () => {
    renderWithTheme(
      <DeviceControlPanel
        device={mockDevice}
        open={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const inputControl = screen.getByLabelText('Device Name');
    fireEvent.change(inputControl, { target: { value: 'New Name' } });
    fireEvent.keyPress(inputControl, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(mockDevice.id, 'name', 'New Name');
    });
  });

  it('disables controls for offline devices', () => {
    renderWithTheme(
      <DeviceControlPanel
        device={mockOfflineDevice}
        open={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText(/Device is offline/)).toBeInTheDocument();
    
    const slider = screen.getByRole('slider');
    expect(slider).toBeDisabled();
  });

  it('shows loading state during control updates', async () => {
    // Mock a delayed update
    mockOnUpdate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderWithTheme(
      <DeviceControlPanel
        device={mockDevice}
        open={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const switchControl = screen.getByRole('checkbox');
    fireEvent.click(switchControl);

    // Should show loading indicator
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Wait for update to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('displays error message when update fails', async () => {
    mockOnUpdate.mockRejectedValue(new Error('Network error'));

    renderWithTheme(
      <DeviceControlPanel
        device={mockDevice}
        open={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const switchControl = screen.getByRole('checkbox');
    fireEvent.click(switchControl);

    await waitFor(() => {
      expect(screen.getByText(/Failed to update power: Network error/)).toBeInTheDocument();
    });
  });

  it('reverts control value when update fails', async () => {
    mockOnUpdate.mockRejectedValue(new Error('Network error'));

    renderWithTheme(
      <DeviceControlPanel
        device={mockDevice}
        open={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const switchControl = screen.getByRole('checkbox');
    expect(switchControl).toBeChecked(); // Initial value is true

    fireEvent.click(switchControl);

    await waitFor(() => {
      expect(switchControl).toBeChecked(); // Should revert to original value
    });
  });

  it('displays message when device has no controls', () => {
    renderWithTheme(
      <DeviceControlPanel
        device={mockDeviceWithoutControls}
        open={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText('This device has no available controls.')).toBeInTheDocument();
  });

  it('initializes control values from device properties', () => {
    renderWithTheme(
      <DeviceControlPanel
        device={mockDevice}
        open={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const switchControl = screen.getByRole('checkbox');
    expect(switchControl).toBeChecked(); // power property is true

    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue('75'); // brightness property is 75
  });

  it('uses default values for controls without corresponding properties', () => {
    const deviceWithMissingProperties: Device = {
      ...mockDevice,
      properties: [], // No properties
    };

    renderWithTheme(
      <DeviceControlPanel
        device={deviceWithMissingProperties}
        open={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const switchControl = screen.getByRole('checkbox');
    expect(switchControl).not.toBeChecked(); // Default is false

    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue('0'); // Default is min value (0)
  });
});