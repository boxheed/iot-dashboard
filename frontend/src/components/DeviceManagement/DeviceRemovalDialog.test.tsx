import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';
import { DeviceRemovalDialog } from './DeviceRemovalDialog';
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
  lastSeen: new Date(),
  properties: [],
  controls: [],
};

describe('DeviceRemovalDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnConfirm.mockResolvedValue(undefined);
  });

  it('renders when open with device', () => {
    renderWithTheme(
      <DeviceRemovalDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone!')).toBeInTheDocument();
    expect(screen.getAllByText('Living Room Light')[0]).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithTheme(
      <DeviceRemovalDialog
        open={false}
        device={mockDevice}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.queryByText('Remove Device')).not.toBeInTheDocument();
  });

  it('does not render when device is null', () => {
    renderWithTheme(
      <DeviceRemovalDialog
        open={true}
        device={null}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.queryByText('Remove Device')).not.toBeInTheDocument();
  });

  it('displays device information correctly', () => {
    renderWithTheme(
      <DeviceRemovalDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getAllByText('Living Room Light')[0]).toBeInTheDocument();
    expect(screen.getByText('Type: Switch')).toBeInTheDocument();
    expect(screen.getByText('Room: Living Room')).toBeInTheDocument();
    expect(screen.getByText('Status: online')).toBeInTheDocument();
  });

  it('shows what will be deleted', () => {
    renderWithTheme(
      <DeviceRemovalDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText('What will be deleted:')).toBeInTheDocument();
    expect(screen.getByText('Historical Data')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
  });

  it('requires device name confirmation', () => {
    renderWithTheme(
      <DeviceRemovalDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const removeButton = screen.getByRole('button', { name: /remove device/i });
    expect(removeButton).toBeDisabled();

    const confirmationInput = screen.getByPlaceholderText(/Type "Living Room Light" to confirm/);
    fireEvent.change(confirmationInput, { target: { value: 'wrong name' } });

    expect(removeButton).toBeDisabled();
    expect(screen.getByText('Device name does not match')).toBeInTheDocument();
  });

  it('requires data loss acknowledgment', () => {
    renderWithTheme(
      <DeviceRemovalDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const confirmationInput = screen.getByPlaceholderText(/Type "Living Room Light" to confirm/);
    fireEvent.change(confirmationInput, { target: { value: 'Living Room Light' } });

    const removeButton = screen.getByRole('button', { name: /remove device/i });
    expect(removeButton).toBeDisabled();

    const acknowledgmentCheckbox = screen.getByRole('checkbox');
    fireEvent.click(acknowledgmentCheckbox);

    expect(removeButton).not.toBeDisabled();
  });

  it('enables remove button when all conditions are met', async () => {
    renderWithTheme(
      <DeviceRemovalDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const confirmationInput = screen.getByPlaceholderText(/Type "Living Room Light" to confirm/);
    fireEvent.change(confirmationInput, { target: { value: 'Living Room Light' } });

    const acknowledgmentCheckbox = screen.getByRole('checkbox');
    fireEvent.click(acknowledgmentCheckbox);

    await waitFor(() => {
      const removeButton = screen.getByRole('button', { name: /remove device/i });
      expect(removeButton).not.toBeDisabled();
    });
  });

  it('calls onConfirm when remove button is clicked', async () => {
    renderWithTheme(
      <DeviceRemovalDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const confirmationInput = screen.getByPlaceholderText(/Type "Living Room Light" to confirm/);
    fireEvent.change(confirmationInput, { target: { value: 'Living Room Light' } });

    const acknowledgmentCheckbox = screen.getByRole('checkbox');
    fireEvent.click(acknowledgmentCheckbox);

    const removeButton = screen.getByRole('button', { name: /remove device/i });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith('device-1');
    });
  });

  it('calls onClose when cancel button is clicked', () => {
    renderWithTheme(
      <DeviceRemovalDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows loading state during removal', async () => {
    // Mock a delayed promise
    mockOnConfirm.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderWithTheme(
      <DeviceRemovalDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const confirmationInput = screen.getByPlaceholderText(/Type "Living Room Light" to confirm/);
    fireEvent.change(confirmationInput, { target: { value: 'Living Room Light' } });

    const acknowledgmentCheckbox = screen.getByRole('checkbox');
    fireEvent.click(acknowledgmentCheckbox);

    const removeButton = screen.getByRole('button', { name: /remove device/i });
    fireEvent.click(removeButton);

    expect(screen.getByText('Removing...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith('device-1');
    });
  });

  it('handles removal errors gracefully', async () => {
    mockOnConfirm.mockRejectedValue(new Error('Network error'));

    renderWithTheme(
      <DeviceRemovalDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const confirmationInput = screen.getByPlaceholderText(/Type "Living Room Light" to confirm/);
    fireEvent.change(confirmationInput, { target: { value: 'Living Room Light' } });

    const acknowledgmentCheckbox = screen.getByRole('checkbox');
    fireEvent.click(acknowledgmentCheckbox);

    const removeButton = screen.getByRole('button', { name: /remove device/i });
    fireEvent.click(removeButton);

    await waitFor(() => {
      // Should return to normal state after error
      expect(screen.getByRole('button', { name: /remove device/i })).not.toBeDisabled();
    });
  });

  it('resets form when closed and reopened', () => {
    const { rerender } = renderWithTheme(
      <DeviceRemovalDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Fill form
    const confirmationInput = screen.getByPlaceholderText(/Type "Living Room Light" to confirm/);
    fireEvent.change(confirmationInput, { target: { value: 'Living Room Light' } });

    const acknowledgmentCheckbox = screen.getByRole('checkbox');
    fireEvent.click(acknowledgmentCheckbox);

    // Close dialog
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Reopen dialog
    rerender(
      <ThemeProvider theme={theme}>
        <DeviceRemovalDialog
          open={true}
          device={mockDevice}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      </ThemeProvider>
    );

    // Form should be reset
    const newConfirmationInput = screen.getByPlaceholderText(/Type "Living Room Light" to confirm/);
    expect(newConfirmationInput).toHaveValue('');

    const newAcknowledgmentCheckbox = screen.getByRole('checkbox');
    expect(newAcknowledgmentCheckbox).not.toBeChecked();

    const removeButton = screen.getByRole('button', { name: /remove device/i });
    expect(removeButton).toBeDisabled();
  });

  it('is case insensitive for device name confirmation', async () => {
    renderWithTheme(
      <DeviceRemovalDialog
        open={true}
        device={mockDevice}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const confirmationInput = screen.getByPlaceholderText(/Type "Living Room Light" to confirm/);
    fireEvent.change(confirmationInput, { target: { value: 'living room light' } });

    const acknowledgmentCheckbox = screen.getByRole('checkbox');
    fireEvent.click(acknowledgmentCheckbox);

    await waitFor(() => {
      const removeButton = screen.getByRole('button', { name: /remove device/i });
      expect(removeButton).not.toBeDisabled();
    });
  });
});
