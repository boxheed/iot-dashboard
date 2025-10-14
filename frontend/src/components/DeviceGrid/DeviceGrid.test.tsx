import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';
import { DeviceGrid } from './DeviceGrid';
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
const mockDevices: Device[] = [
  {
    id: 'device-1',
    name: 'Living Room Light',
    type: 'dimmer',
    room: 'Living Room',
    status: 'online',
    lastSeen: new Date('2023-01-01T12:00:00Z'),
    properties: [
      { key: 'brightness', value: 75, unit: '%', timestamp: new Date() },
    ],
    controls: [
      { key: 'brightness', type: 'slider', label: 'Brightness', min: 0, max: 100 },
    ],
  },
  {
    id: 'device-2',
    name: 'Kitchen Sensor',
    type: 'sensor',
    room: 'Kitchen',
    status: 'offline',
    lastSeen: new Date('2023-01-01T10:00:00Z'),
    properties: [
      { key: 'temperature', value: 23.5, unit: '°C', timestamp: new Date() },
    ],
    controls: [],
  },
  {
    id: 'device-3',
    name: 'Bedroom Switch',
    type: 'switch',
    room: 'Bedroom',
    status: 'online',
    lastSeen: new Date('2023-01-01T14:00:00Z'),
    properties: [
      { key: 'power', value: true, timestamp: new Date() },
    ],
    controls: [
      { key: 'power', type: 'switch', label: 'Power' },
    ],
  },
  {
    id: 'device-4',
    name: 'Living Room Thermostat',
    type: 'thermostat',
    room: 'Living Room',
    status: 'error',
    lastSeen: new Date('2023-01-01T08:00:00Z'),
    properties: [
      { key: 'temperature', value: 22.0, unit: '°C', timestamp: new Date() },
    ],
    controls: [
      { key: 'temperature', type: 'slider', label: 'Target Temperature', min: 10, max: 30 },
    ],
  },
];

describe('DeviceGrid', () => {
  const mockOnDeviceClick = vi.fn();
  const mockOnControlChange = vi.fn();
  const mockOnAddDevice = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnControlChange.mockResolvedValue(undefined);
  });

  it('renders all devices in grid layout', () => {
    renderWithTheme(
      <DeviceGrid
        devices={mockDevices}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
        onAddDevice={mockOnAddDevice}
      />
    );

    expect(screen.getByText('Living Room Light')).toBeInTheDocument();
    expect(screen.getByText('Kitchen Sensor')).toBeInTheDocument();
    expect(screen.getByText('Bedroom Switch')).toBeInTheDocument();
    expect(screen.getByText('Living Room Thermostat')).toBeInTheDocument();
  });

  it('displays empty state when no devices', () => {
    renderWithTheme(
      <DeviceGrid
        devices={[]}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
        onAddDevice={mockOnAddDevice}
      />
    );

    expect(screen.getByText('No devices connected')).toBeInTheDocument();
    expect(screen.getByText('Get started by adding your first smart home device to the dashboard.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add device/i })).toBeInTheDocument();
  });

  it('does not show add device button when onAddDevice is not provided', () => {
    renderWithTheme(
      <DeviceGrid
        devices={[]}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    expect(screen.getByText('No devices connected')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add device/i })).not.toBeInTheDocument();
  });

  it('filters devices by search term', () => {
    renderWithTheme(
      <DeviceGrid
        devices={mockDevices}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search devices...');
    fireEvent.change(searchInput, { target: { value: 'Kitchen' } });

    expect(screen.getByText('Kitchen Sensor')).toBeInTheDocument();
    expect(screen.queryByText('Living Room Light')).not.toBeInTheDocument();
    expect(screen.queryByText('Bedroom Switch')).not.toBeInTheDocument();
  });

  it('filters devices by status', () => {
    renderWithTheme(
      <DeviceGrid
        devices={mockDevices}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    const statusSelect = screen.getByLabelText('Status');
    fireEvent.mouseDown(statusSelect);
    fireEvent.click(screen.getByText('Online'));

    expect(screen.getByText('Living Room Light')).toBeInTheDocument();
    expect(screen.getByText('Bedroom Switch')).toBeInTheDocument();
    expect(screen.queryByText('Kitchen Sensor')).not.toBeInTheDocument();
    expect(screen.queryByText('Living Room Thermostat')).not.toBeInTheDocument();
  });

  it('filters devices by room', () => {
    renderWithTheme(
      <DeviceGrid
        devices={mockDevices}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    const roomSelect = screen.getByLabelText('Room');
    fireEvent.mouseDown(roomSelect);
    fireEvent.click(screen.getByText('Living Room'));

    expect(screen.getByText('Living Room Light')).toBeInTheDocument();
    expect(screen.getByText('Living Room Thermostat')).toBeInTheDocument();
    expect(screen.queryByText('Kitchen Sensor')).not.toBeInTheDocument();
    expect(screen.queryByText('Bedroom Switch')).not.toBeInTheDocument();
  });

  it('filters devices by type', () => {
    renderWithTheme(
      <DeviceGrid
        devices={mockDevices}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    const typeSelect = screen.getByLabelText('Type');
    fireEvent.mouseDown(typeSelect);
    fireEvent.click(screen.getByText('Sensor'));

    expect(screen.getByText('Kitchen Sensor')).toBeInTheDocument();
    expect(screen.queryByText('Living Room Light')).not.toBeInTheDocument();
    expect(screen.queryByText('Bedroom Switch')).not.toBeInTheDocument();
  });

  it('sorts devices by name', () => {
    renderWithTheme(
      <DeviceGrid
        devices={mockDevices}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    const sortSelect = screen.getByLabelText('Sort by');
    fireEvent.mouseDown(sortSelect);
    fireEvent.click(screen.getByText('Name'));

    // Check that devices are sorted alphabetically by name
    const deviceNames = screen.getAllByText(/Room|Kitchen|Bedroom/).map(el => el.textContent);
    expect(deviceNames[0]).toContain('Bedroom');
    expect(deviceNames[1]).toContain('Kitchen');
  });

  it('sorts devices by status', () => {
    renderWithTheme(
      <DeviceGrid
        devices={mockDevices}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    const sortSelect = screen.getByLabelText('Sort by');
    fireEvent.mouseDown(sortSelect);
    fireEvent.click(screen.getByText('Status'));

    // Devices should be sorted by status (error, offline, online)
    const statusChips = screen.getAllByText(/online|offline|error/);
    expect(statusChips[0]).toHaveTextContent('error');
  });

  it('clears all filters when clear filters button is clicked', () => {
    renderWithTheme(
      <DeviceGrid
        devices={mockDevices}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    // Apply some filters
    const searchInput = screen.getByPlaceholderText('Search devices...');
    fireEvent.change(searchInput, { target: { value: 'Kitchen' } });

    const statusSelect = screen.getByLabelText('Status');
    fireEvent.mouseDown(statusSelect);
    fireEvent.click(screen.getByText('Offline'));

    // Clear filters
    const clearButton = screen.getByRole('button', { name: /clear filters/i });
    fireEvent.click(clearButton);

    // All devices should be visible again
    expect(screen.getByText('Living Room Light')).toBeInTheDocument();
    expect(screen.getByText('Kitchen Sensor')).toBeInTheDocument();
    expect(screen.getByText('Bedroom Switch')).toBeInTheDocument();
  });

  it('displays active filter chips', () => {
    renderWithTheme(
      <DeviceGrid
        devices={mockDevices}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    // Apply search filter
    const searchInput = screen.getByPlaceholderText('Search devices...');
    fireEvent.change(searchInput, { target: { value: 'Kitchen' } });

    // Should show search filter chip
    expect(screen.getByText('Search: Kitchen')).toBeInTheDocument();
  });

  it('removes individual filter chips when clicked', () => {
    renderWithTheme(
      <DeviceGrid
        devices={mockDevices}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    // Apply search filter
    const searchInput = screen.getByPlaceholderText('Search devices...');
    fireEvent.change(searchInput, { target: { value: 'Kitchen' } });

    // Remove search filter by clicking chip
    const searchChip = screen.getByText('Search: Kitchen');
    const deleteButton = searchChip.parentElement?.querySelector('[data-testid="CancelIcon"]');
    if (deleteButton) {
      fireEvent.click(deleteButton);
    }

    // All devices should be visible again
    expect(screen.getByText('Living Room Light')).toBeInTheDocument();
    expect(screen.getByText('Bedroom Switch')).toBeInTheDocument();
  });

  it('displays no results message when filters match no devices', () => {
    renderWithTheme(
      <DeviceGrid
        devices={mockDevices}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    // Apply filter that matches no devices
    const searchInput = screen.getByPlaceholderText('Search devices...');
    fireEvent.change(searchInput, { target: { value: 'NonexistentDevice' } });

    expect(screen.getByText('No devices match your filters')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search terms or filters to find devices.')).toBeInTheDocument();
  });

  it('displays device count', () => {
    renderWithTheme(
      <DeviceGrid
        devices={mockDevices}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    expect(screen.getByText('Showing 4 of 4 devices')).toBeInTheDocument();
  });

  it('updates device count when filters are applied', () => {
    renderWithTheme(
      <DeviceGrid
        devices={mockDevices}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    // Apply filter
    const statusSelect = screen.getByLabelText('Status');
    fireEvent.mouseDown(statusSelect);
    fireEvent.click(screen.getByText('Online'));

    expect(screen.getByText('Showing 2 of 4 devices')).toBeInTheDocument();
  });

  it('opens device control panel when device is clicked', async () => {
    renderWithTheme(
      <DeviceGrid
        devices={mockDevices}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    const deviceCard = screen.getByText('Living Room Light');
    fireEvent.click(deviceCard);

    // Should open control panel
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    expect(mockOnDeviceClick).toHaveBeenCalledWith(mockDevices[0]);
  });

  it('calls onAddDevice when add device button is clicked', () => {
    renderWithTheme(
      <DeviceGrid
        devices={mockDevices}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
        onAddDevice={mockOnAddDevice}
      />
    );

    const addButton = screen.getByRole('button', { name: /add device/i });
    fireEvent.click(addButton);

    expect(mockOnAddDevice).toHaveBeenCalledTimes(1);
  });

  it('handles responsive grid layout', () => {
    renderWithTheme(
      <DeviceGrid
        devices={mockDevices}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    // Check that grid items have responsive classes
    const gridItems = screen.getAllByText(/Room|Kitchen|Bedroom/).map(el => 
      el.closest('[class*="MuiGrid-item"]')
    );

    expect(gridItems.length).toBeGreaterThan(0);
    gridItems.forEach(item => {
      expect(item).toHaveClass('MuiGrid-item');
    });
  });

  it('passes control changes to onControlChange prop', async () => {
    renderWithTheme(
      <DeviceGrid
        devices={mockDevices}
        onDeviceClick={mockOnDeviceClick}
        onControlChange={mockOnControlChange}
      />
    );

    // Find and interact with a device control
    const switchControl = screen.getAllByRole('checkbox')[0];
    fireEvent.click(switchControl);

    await waitFor(() => {
      expect(mockOnControlChange).toHaveBeenCalled();
    });
  });
});