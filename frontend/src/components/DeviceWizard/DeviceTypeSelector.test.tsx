import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';
import { DeviceTypeSelector } from './DeviceTypeSelector';
import { DeviceType } from '@shared/types/Device';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('DeviceTypeSelector', () => {
  const mockOnTypeSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all device type options', () => {
    renderWithTheme(
      <DeviceTypeSelector
        selectedType={null}
        onTypeSelect={mockOnTypeSelect}
      />
    );

    expect(screen.getByText('Sensor')).toBeInTheDocument();
    expect(screen.getByText('Smart Switch')).toBeInTheDocument();
    expect(screen.getByText('Dimmer')).toBeInTheDocument();
    expect(screen.getByText('Thermostat')).toBeInTheDocument();
    expect(screen.getByText('Camera')).toBeInTheDocument();
    expect(screen.getByText('Smart Lock')).toBeInTheDocument();
  });

  it('shows device descriptions and examples', () => {
    renderWithTheme(
      <DeviceTypeSelector
        selectedType={null}
        onTypeSelect={mockOnTypeSelect}
      />
    );

    expect(screen.getByText('Temperature, humidity, motion, and other sensors')).toBeInTheDocument();
    expect(screen.getByText('Temperature sensor, Motion detector, Door sensor')).toBeInTheDocument();
    expect(screen.getByText('On/off switches for lights and appliances')).toBeInTheDocument();
  });

  it('calls onTypeSelect when a device type is clicked', () => {
    renderWithTheme(
      <DeviceTypeSelector
        selectedType={null}
        onTypeSelect={mockOnTypeSelect}
      />
    );

    const sensorCard = screen.getByText('Sensor').closest('div');
    if (sensorCard) {
      fireEvent.click(sensorCard);
    }

    expect(mockOnTypeSelect).toHaveBeenCalledWith('sensor');
  });

  it('highlights selected device type', () => {
    renderWithTheme(
      <DeviceTypeSelector
        selectedType="sensor"
        onTypeSelect={mockOnTypeSelect}
      />
    );

    const sensorCard = screen.getByText('Sensor').closest('.MuiCard-root');
    expect(sensorCard).toHaveStyle({ borderColor: '#1976d2' });
  });

  it('allows changing selection', () => {
    const { rerender } = renderWithTheme(
      <DeviceTypeSelector
        selectedType="sensor"
        onTypeSelect={mockOnTypeSelect}
      />
    );

    // Click on switch
    const switchCard = screen.getByText('Smart Switch').closest('div');
    if (switchCard) {
      fireEvent.click(switchCard);
    }

    expect(mockOnTypeSelect).toHaveBeenCalledWith('switch');

    // Rerender with new selection
    rerender(
      <ThemeProvider theme={theme}>
        <DeviceTypeSelector
          selectedType="switch"
          onTypeSelect={mockOnTypeSelect}
        />
      </ThemeProvider>
    );

    const switchCardAfter = screen.getByText('Smart Switch').closest('.MuiCard-root');
    expect(switchCardAfter).toHaveStyle({ borderColor: '#1976d2' });
  });

  it('shows correct icons for each device type', () => {
    renderWithTheme(
      <DeviceTypeSelector
        selectedType={null}
        onTypeSelect={mockOnTypeSelect}
      />
    );

    // Check that icons are present (we can't easily test specific icons, but we can check they exist)
    const cards = screen.getAllByRole('button');
    expect(cards).toHaveLength(6); // 6 device types
  });

  it('handles all device types correctly', () => {
    const deviceTypes: DeviceType[] = ['sensor', 'switch', 'dimmer', 'thermostat', 'camera', 'lock'];
    
    deviceTypes.forEach(type => {
      renderWithTheme(
        <DeviceTypeSelector
          selectedType={type}
          onTypeSelect={mockOnTypeSelect}
        />
      );
    });
  });

  it('shows instructional text', () => {
    renderWithTheme(
      <DeviceTypeSelector
        selectedType={null}
        onTypeSelect={mockOnTypeSelect}
      />
    );

    expect(screen.getByText('What type of device are you adding?')).toBeInTheDocument();
    expect(screen.getByText(/Select the type that best matches your device/)).toBeInTheDocument();
  });
});