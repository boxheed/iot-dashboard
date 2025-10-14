import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';
import { DeviceSettingsDialog } from './DeviceSettingsDialog';
import { Device } from '@shared/types/Device';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

const mockDevice: Device = {
  id: 'device-1',
  name: 'Living Room Light',
  type: 'switch',
  room: 'Living Room',
  status: 'online',
  lastSeen: new Date('2023-01-01T12:00:00Z'),
  properties: [
    { key: 'power', value: true, timestamp: new Date() },
    { key: 'brightness', value: 80, unit: '%', timestamp: new Date() },
  ],
  controls: [
    { key: 'power', type: 'switch', label: 'Power' },
  ],
  thresholds: [
    { propertyKey: 'brightness', min: 10, max: 90, enabled: true },
  ],
};

describe('DeviceSettingsDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open with device', () => {
    renderWithTheme(
      <DeviceSettingsDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Device Settings')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Living Room Light')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Living Room')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithTheme(
      <DeviceSettingsDialog
        open={false}
        device={mockDevice}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.queryByText('Device Settings')).not.toBeInTheDocument();
  });

  it('does not render when device is null', () => {
    renderWithTheme(
      <DeviceSettingsDialog
        open={true}
        device={null}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.queryByText('Device Settings')).not.toBeInTheDocument();
  });

  it('displays device information correctly', () => {
    renderWithTheme(
      <DeviceSettingsDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Switch')).toBeInTheDocument();
    expect(screen.getByText('online')).toBeInTheDocument();
    expect(screen.getByText('device-1')).toBeInTheDocument();
  });

  it('shows current properties', () => {
    renderWithTheme(
      <DeviceSettingsDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Current Readings')).toBeInTheDocument();
    expect(screen.getByText('power')).toBeInTheDocument();
    expect(screen.getAllByText('brightness')[0]).toBeInTheDocument();
    expect(screen.getByText('true')).toBeInTheDocument();
    expect(screen.getByText('80 %')).toBeInTheDocument();
  });

  it('shows available controls', () => {
    renderWithTheme(
      <DeviceSettingsDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Available Controls')).toBeInTheDocument();
    expect(screen.getByText('Power')).toBeInTheDocument();
    expect(screen.getByText('Type: switch')).toBeInTheDocument();
  });

  it('shows threshold monitoring', () => {
    renderWithTheme(
      <DeviceSettingsDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Threshold Monitoring')).toBeInTheDocument();
    expect(screen.getAllByText('brightness')[0]).toBeInTheDocument();
    expect(screen.getByText('Range: 10 - 90')).toBeInTheDocument();
  });

  it('allows editing device name', async () => {
    renderWithTheme(
      <DeviceSettingsDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const nameInput = screen.getByDisplayValue('Living Room Light');
    fireEvent.change(nameInput, { target: { value: 'New Device Name' } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('New Device Name')).toBeInTheDocument();
    });

    // Should show unsaved changes alert
    expect(screen.getByText(/You have unsaved changes/)).toBeInTheDocument();
  });

  it('allows editing device room', async () => {
    renderWithTheme(
      <DeviceSettingsDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const roomInput = screen.getByDisplayValue('Living Room');
    fireEvent.change(roomInput, { target: { value: 'Kitchen' } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Kitchen')).toBeInTheDocument();
    });

    // Should show unsaved changes alert
    expect(screen.getByText(/You have unsaved changes/)).toBeInTheDocument();
  });

  it('enables save button when changes are made', async () => {
    renderWithTheme(
      <DeviceSettingsDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).toBeDisabled();

    const nameInput = screen.getByDisplayValue('Living Room Light');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('calls onSave with correct updates when save is clicked', async () => {
    renderWithTheme(
      <DeviceSettingsDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const nameInput = screen.getByDisplayValue('Living Room Light');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    const roomInput = screen.getByDisplayValue('Living Room');
    fireEvent.change(roomInput, { target: { value: 'Kitchen' } });

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).not.toBeDisabled();
      fireEvent.click(saveButton);
    });

    expect(mockOnSave).toHaveBeenCalledWith('device-1', {
      name: 'New Name',
      room: 'Kitchen',
    });
  });

  it('calls onClose when cancel is clicked', () => {
    renderWithTheme(
      <DeviceSettingsDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close icon is clicked', () => {
    renderWithTheme(
      <DeviceSettingsDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const closeButton = screen.getByLabelText('close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('resets form when closed and reopened', async () => {
    const { rerender } = renderWithTheme(
      <DeviceSettingsDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Make changes
    const nameInput = screen.getByDisplayValue('Living Room Light');
    fireEvent.change(nameInput, { target: { value: 'Changed Name' } });

    // Close dialog
    const closeButton = screen.getByLabelText('close');
    fireEvent.click(closeButton);

    // Reopen dialog
    rerender(
      <ThemeProvider theme={theme}>
        <DeviceSettingsDialog
          open={true}
          device={mockDevice}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      </ThemeProvider>
    );

    // Should show original name
    expect(screen.getByDisplayValue('Living Room Light')).toBeInTheDocument();
    expect(screen.queryByText(/You have unsaved changes/)).not.toBeInTheDocument();
  });

  it('toggles threshold monitoring', async () => {
    renderWithTheme(
      <DeviceSettingsDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const thresholdSwitch = screen.getByRole('checkbox', { name: /enabled/i });
    expect(thresholdSwitch).toBeChecked();

    fireEvent.click(thresholdSwitch);

    await waitFor(() => {
      expect(thresholdSwitch).not.toBeChecked();
    });

    // Should show unsaved changes
    expect(screen.getByText(/You have unsaved changes/)).toBeInTheDocument();
  });
});
