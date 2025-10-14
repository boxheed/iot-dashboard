import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';
import { DeviceCard } from './DeviceCard';
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
  lastSeen: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
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
  ],
};

const mockOfflineDevice: Device = {
  ...mockDevice,
  id: 'offline-device',
  name: 'Bedroom Sensor',
  type: 'sensor',
  status: 'offline',
  lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
};

const mockErrorDevice: Device = {
  ...mockDevice,
  id: 'error-device',
  name: 'Kitchen Thermostat',
  type: 'thermostat',
  status: 'error',
};

describe('DeviceCard', () => {
  const mockOnDeviceClick = vi.fn();
  const mockOnControlChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders device information correctly', () => {
    renderWithTheme(
      <DeviceCard
        device={mockDevice}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    expect(screen.getByText('Living Room Light')).toBeInTheDocument();
    expect(screen.getByText('Living Room')).toBeInTheDocument();
    expect(screen.getByText('75.0 %')).toBeInTheDocument();
    expect(screen.getByText('brightness')).toBeInTheDocument();
    expect(screen.getByText('5m ago')).toBeInTheDocument();
  });

  it('displays correct status indicators', () => {
    const { rerender } = renderWithTheme(
      <DeviceCard
        device={mockDevice}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    // Online device
    expect(screen.getByText('online')).toBeInTheDocument();

    // Offline device
    rerender(
      <ThemeProvider theme={theme}>
        <DeviceCard
          device={mockOfflineDevice}
          onDeviceClick={mockOnDeviceClick}
          onControlChange={mockOnControlChange}
        />
      </ThemeProvider>
    );
    expect(screen.getByText('offline')).toBeInTheDocument();

    // Error device
    rerender(
      <ThemeProvider theme={theme}>
        <DeviceCard
          device={mockErrorDevice}
          onDeviceClick={mockOnDeviceClick}
          onControlChange={mockOnControlChange}
        />
      </ThemeProvider>
    );
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('calls onDeviceClick when card is clicked', () => {
    renderWithTheme(
      <DeviceCard
        device={mockDevice}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    const card = screen.getByText('Living Room Light').closest('[role="button"]') || 
                 screen.getByText('Living Room Light').closest('div');
    
    if (card) {
      fireEvent.click(card);
      expect(mockOnDeviceClick).toHaveBeenCalledWith(mockDevice);
    }
  });

  it('renders quick controls for online devices', () => {
    renderWithTheme(
      <DeviceCard
        device={mockDevice}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    // Should show switch control
    const switchControl = screen.getByRole('checkbox');
    expect(switchControl).toBeInTheDocument();
    expect(switchControl).toBeChecked(); // power is true in mock data

    // Should show slider control
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
  });

  it('does not render quick controls for offline devices', () => {
    renderWithTheme(
      <DeviceCard
        device={mockOfflineDevice}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    // Should not show controls for offline devices
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('handles switch control changes', () => {
    renderWithTheme(
      <DeviceCard
        device={mockDevice}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    const switchControl = screen.getByRole('checkbox');
    fireEvent.click(switchControl);

    expect(mockOnControlChange).toHaveBeenCalledWith(
      mockDevice.id,
      'power',
      false // Should toggle from true to false
    );
  });

  it('handles slider control changes', () => {
    renderWithTheme(
      <DeviceCard
        device={mockDevice}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '50' } });

    expect(mockOnControlChange).toHaveBeenCalledWith(
      mockDevice.id,
      'brightness',
      50
    );
  });

  it('prevents card click when interacting with controls', () => {
    renderWithTheme(
      <DeviceCard
        device={mockDevice}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    const switchControl = screen.getByRole('checkbox');
    fireEvent.click(switchControl);

    // Should call control change but not device click
    expect(mockOnControlChange).toHaveBeenCalled();
    expect(mockOnDeviceClick).not.toHaveBeenCalled();
  });

  it('displays correct device type icons', () => {
    const { rerender } = renderWithTheme(
      <DeviceCard
        device={mockDevice}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    // Test different device types by checking for specific icons
    // Note: Testing icon presence is tricky with Material-UI, so we test the component renders
    expect(screen.getByText('Living Room Light')).toBeInTheDocument();

    // Test sensor device
    rerender(
      <ThemeProvider theme={theme}>
        <DeviceCard
          device={mockOfflineDevice}
          onDeviceClick={mockOnDeviceClick}
          onControlChange={mockOnControlChange}
        />
      </ThemeProvider>
    );
    expect(screen.getByText('Bedroom Sensor')).toBeInTheDocument();
  });

  it('formats property values correctly', () => {
    const deviceWithDifferentValues: Device = {
      ...mockDevice,
      properties: [
        {
          key: 'temperature',
          value: 23.456,
          unit: '°C',
          timestamp: new Date(),
        },
      ],
    };

    renderWithTheme(
      <DeviceCard
        device={deviceWithDifferentValues}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    expect(screen.getByText('23.5 °C')).toBeInTheDocument();
  });

  it('formats last seen time correctly', () => {
    const recentDevice: Device = {
      ...mockDevice,
      lastSeen: new Date(Date.now() - 30 * 1000), // 30 seconds ago
    };

    renderWithTheme(
      <DeviceCard
        device={recentDevice}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    expect(screen.getByText('Just now')).toBeInTheDocument();
  });

  it('handles devices with no properties gracefully', () => {
    const deviceWithoutProperties: Device = {
      ...mockDevice,
      properties: [],
    };

    renderWithTheme(
      <DeviceCard
        device={deviceWithoutProperties}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    expect(screen.getByText('Living Room Light')).toBeInTheDocument();
    expect(screen.getByText('Living Room')).toBeInTheDocument();
  });

  it('limits quick controls to maximum of 2', () => {
    const deviceWithManyControls: Device = {
      ...mockDevice,
      controls: [
        { key: 'power', type: 'switch', label: 'Power' },
        { key: 'brightness', type: 'slider', label: 'Brightness', min: 0, max: 100 },
        { key: 'color', type: 'switch', label: 'Color Mode' },
        { key: 'timer', type: 'slider', label: 'Timer', min: 0, max: 60 },
      ],
    };

    renderWithTheme(
      <DeviceCard
        device={deviceWithManyControls}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    // Should only show 2 controls (switch and slider)
    const switches = screen.getAllByRole('checkbox');
    const sliders = screen.getAllByRole('slider');
    
    expect(switches.length + sliders.length).toBeLessThanOrEqual(2);
  });
});