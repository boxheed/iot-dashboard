import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';
import { DeviceList } from './DeviceList';
import { Device } from '@shared/types/Device';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

const mockDevices: Device[] = [
  {
    id: 'device-1',
    name: 'Living Room Light',
    type: 'switch',
    room: 'Living Room',
    status: 'online',
    lastSeen: new Date(),
    properties: [
      { key: 'power', value: true, timestamp: new Date() },
      { key: 'brightness', value: 80, unit: '%', timestamp: new Date() },
    ],
    controls: [
      { key: 'power', type: 'switch', label: 'Power' },
    ],
  },
  {
    id: 'device-2',
    name: 'Kitchen Sensor',
    type: 'sensor',
    room: 'Kitchen',
    status: 'offline',
    lastSeen: new Date(Date.now() - 60000), // 1 minute ago
    properties: [
      { key: 'temperature', value: 22.5, unit: '°C', timestamp: new Date() },
    ],
    controls: [],
  },
];

describe('DeviceList', () => {
  const mockOnDeviceSettings = vi.fn();
  const mockOnDeviceRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no devices', () => {
    renderWithTheme(
      <DeviceList
        devices={[]}
        onDeviceSettings={mockOnDeviceSettings}
        onDeviceRemove={mockOnDeviceRemove}
      />
    );

    expect(screen.getByText('No devices configured')).toBeInTheDocument();
    expect(screen.getByText(/Use the "Add Device" button/)).toBeInTheDocument();
  });

  it('renders device list with devices', () => {
    renderWithTheme(
      <DeviceList
        devices={mockDevices}
        onDeviceSettings={mockOnDeviceSettings}
        onDeviceRemove={mockOnDeviceRemove}
      />
    );

    expect(screen.getByText('Your Devices (2)')).toBeInTheDocument();
    expect(screen.getByText('Living Room Light')).toBeInTheDocument();
    expect(screen.getByText('Kitchen Sensor')).toBeInTheDocument();
  });

  it('displays device information correctly', () => {
    renderWithTheme(
      <DeviceList
        devices={mockDevices}
        onDeviceSettings={mockOnDeviceSettings}
        onDeviceRemove={mockOnDeviceRemove}
      />
    );

    // Check device names and types
    expect(screen.getByText('Living Room Light')).toBeInTheDocument();
    expect(screen.getByText('Switch')).toBeInTheDocument();
    expect(screen.getByText('Kitchen Sensor')).toBeInTheDocument();
    expect(screen.getByText('Sensor')).toBeInTheDocument();

    // Check rooms
    expect(screen.getByText('Room: Living Room')).toBeInTheDocument();
    expect(screen.getByText('Room: Kitchen')).toBeInTheDocument();

    // Check status
    expect(screen.getByText('online')).toBeInTheDocument();
    expect(screen.getByText('offline')).toBeInTheDocument();
  });

  it('displays device properties', () => {
    renderWithTheme(
      <DeviceList
        devices={mockDevices}
        onDeviceSettings={mockOnDeviceSettings}
        onDeviceRemove={mockOnDeviceRemove}
      />
    );

    expect(screen.getByText(/power:/)).toBeInTheDocument();
    expect(screen.getByText(/brightness:/)).toBeInTheDocument();
    expect(screen.getByText(/temperature:/)).toBeInTheDocument();
  });

  it('calls onDeviceSettings when device card is clicked', () => {
    renderWithTheme(
      <DeviceList
        devices={mockDevices}
        onDeviceSettings={mockOnDeviceSettings}
        onDeviceRemove={mockOnDeviceRemove}
      />
    );

    const deviceCard = screen.getByText('Living Room Light').closest('.MuiCard-root');
    if (deviceCard) {
      fireEvent.click(deviceCard);
    }

    expect(mockOnDeviceSettings).toHaveBeenCalledWith(mockDevices[0]);
  });

  it('opens menu when more button is clicked', () => {
    renderWithTheme(
      <DeviceList
        devices={mockDevices}
        onDeviceSettings={mockOnDeviceSettings}
        onDeviceRemove={mockOnDeviceRemove}
      />
    );

    const moreButtons = screen.getAllByLabelText(/more options for/i);
    fireEvent.click(moreButtons[0]);

    expect(screen.getByText('Device Settings')).toBeInTheDocument();
    expect(screen.getByText('Remove Device')).toBeInTheDocument();
  });

  it('calls onDeviceSettings when settings menu item is clicked', () => {
    renderWithTheme(
      <DeviceList
        devices={mockDevices}
        onDeviceSettings={mockOnDeviceSettings}
        onDeviceRemove={mockOnDeviceRemove}
      />
    );

    const moreButtons = screen.getAllByLabelText(/more options for/i);
    fireEvent.click(moreButtons[0]);

    const settingsMenuItem = screen.getByText('Device Settings');
    fireEvent.click(settingsMenuItem);

    expect(mockOnDeviceSettings).toHaveBeenCalledWith(mockDevices[0]);
  });

  it('calls onDeviceRemove when remove menu item is clicked', () => {
    renderWithTheme(
      <DeviceList
        devices={mockDevices}
        onDeviceSettings={mockOnDeviceSettings}
        onDeviceRemove={mockOnDeviceRemove}
      />
    );

    const moreButtons = screen.getAllByLabelText(/more options for/i);
    fireEvent.click(moreButtons[0]);

    const removeMenuItem = screen.getByText('Remove Device');
    fireEvent.click(removeMenuItem);

    expect(mockOnDeviceRemove).toHaveBeenCalledWith(mockDevices[0]);
  });

  it('shows correct status colors', () => {
    renderWithTheme(
      <DeviceList
        devices={mockDevices}
        onDeviceSettings={mockOnDeviceSettings}
        onDeviceRemove={mockOnDeviceRemove}
      />
    );

    const onlineChip = screen.getByText('online').closest('.MuiChip-root');
    const offlineChip = screen.getByText('offline').closest('.MuiChip-root');

    expect(onlineChip).toHaveClass('MuiChip-colorSuccess');
    expect(offlineChip).toHaveClass('MuiChip-colorError');
  });

  it('limits displayed properties to 2 and shows more indicator', () => {
    const deviceWithManyProps: Device = {
      ...mockDevices[0],
      properties: [
        { key: 'prop1', value: 'value1', timestamp: new Date() },
        { key: 'prop2', value: 'value2', timestamp: new Date() },
        { key: 'prop3', value: 'value3', timestamp: new Date() },
        { key: 'prop4', value: 'value4', timestamp: new Date() },
      ],
    };

    renderWithTheme(
      <DeviceList
        devices={[deviceWithManyProps]}
        onDeviceSettings={mockOnDeviceSettings}
        onDeviceRemove={mockOnDeviceRemove}
      />
    );

    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });
});
