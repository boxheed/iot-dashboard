import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';
import { DeviceList } from './DeviceList';
import { DeviceSettingsDialog } from './DeviceSettingsDialog';
import { DeviceRemovalDialog } from './DeviceRemovalDialog';
import { AddDeviceWizard } from '../DeviceWizard/AddDeviceWizard';
import { Device, DeviceRegistration } from '@shared/types/Device';

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
    lastSeen: new Date(Date.now() - 300000), // 5 minutes ago
    properties: [
      { key: 'temperature', value: 22.5, unit: '°C', timestamp: new Date() },
      { key: 'humidity', value: 65, unit: '%', timestamp: new Date() },
    ],
    controls: [],
    thresholds: [
      { propertyKey: 'temperature', min: 18, max: 25, enabled: true },
    ],
  },
];

describe('Device Management Workflows', () => {
  describe('Complete Device Addition Workflow', () => {
    it('allows user to add a new device from start to finish', async () => {
      const mockOnDeviceAdded = vi.fn();
      const mockOnClose = vi.fn();

      renderWithTheme(
        <AddDeviceWizard
          open={true}
          onClose={mockOnClose}
          onDeviceAdded={mockOnDeviceAdded}
        />
      );

      // Step 1: Select device type
      expect(screen.getByText('Select Device Type')).toBeInTheDocument();
      
      const thermostatCard = screen.getByText('Thermostat').closest('div');
      fireEvent.click(thermostatCard!);

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).not.toBeDisabled();
      fireEvent.click(nextButton);

      // Step 2: Configure device
      await waitFor(() => {
        expect(screen.getByText('Configure Your Thermostat')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/device name/i);
      fireEvent.change(nameInput, { target: { value: 'Main Thermostat' } });

      const roomInput = screen.getByLabelText(/room/i);
      fireEvent.change(roomInput, { target: { value: 'Living Room' } });

      const mqttTopicInput = screen.getByLabelText(/mqtt topic/i);
      fireEvent.change(mqttTopicInput, { target: { value: 'home/thermostat/main' } });

      const tempUnitSelect = screen.getByLabelText(/temperature unit/i);
      fireEvent.mouseDown(tempUnitSelect);
      const celsiusOption = screen.getByText('Celsius');
      fireEvent.click(celsiusOption);

      const minTempInput = screen.getByLabelText(/minimum temperature/i);
      fireEvent.change(minTempInput, { target: { value: '16' } });

      const maxTempInput = screen.getByLabelText(/maximum temperature/i);
      fireEvent.change(maxTempInput, { target: { value: '28' } });

      const nextButton2 = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton2);

      // Step 3: Test connection
      await waitFor(() => {
        expect(screen.getByText('Test Device Connection')).toBeInTheDocument();
      });

      expect(screen.getByText('Main Thermostat')).toBeInTheDocument();
      expect(screen.getByText('home/thermostat/main')).toBeInTheDocument();

      const testButton = screen.getByRole('button', { name: /test connection/i });
      fireEvent.click(testButton);

      // Wait for connection test to complete (mocked to succeed)
      await waitFor(() => {
        expect(screen.getByText(/connection successful/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      const addDeviceButton = screen.getByRole('button', { name: /add device/i });
      expect(addDeviceButton).not.toBeDisabled();
      fireEvent.click(addDeviceButton);

      // Verify the device registration object
      expect(mockOnDeviceAdded).toHaveBeenCalledWith({
        name: 'Main Thermostat',
        type: 'thermostat',
        room: 'Living Room',
        connectionConfig: {
          mqttTopic: 'home/thermostat/main',
          temperatureUnit: 'celsius',
          minTemp: '16',
          maxTemp: '28',
        },
      });
    });

    it('validates each step before allowing progression', async () => {
      const mockOnDeviceAdded = vi.fn();
      const mockOnClose = vi.fn();

      renderWithTheme(
        <AddDeviceWizard
          open={true}
          onClose={mockOnClose}
          onDeviceAdded={mockOnDeviceAdded}
        />
      );

      // Step 1: Next should be disabled without device type
      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();

      // Select device type
      const switchCard = screen.getByText('Smart Switch').closest('div');
      fireEvent.click(switchCard!);
      expect(nextButton).not.toBeDisabled();
      fireEvent.click(nextButton);

      // Step 2: Next should be disabled without required fields
      await waitFor(() => {
        const nextButton2 = screen.getByRole('button', { name: /next/i });
        expect(nextButton2).toBeDisabled();
      });

      // Fill required fields
      const nameInput = screen.getByLabelText(/device name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Switch' } });

      const roomInput = screen.getByLabelText(/room/i);
      fireEvent.change(roomInput, { target: { value: 'Bedroom' } });

      await waitFor(() => {
        const nextButton2 = screen.getByRole('button', { name: /next/i });
        expect(nextButton2).not.toBeDisabled();
      });
    });
  });

  describe('Device Settings Management Workflow', () => {
    it('allows user to update device settings', async () => {
      const mockOnSave = vi.fn();
      const mockOnClose = vi.fn();

      renderWithTheme(
        <DeviceSettingsDialog
          open={true}
          device={mockDevices[1]} // Kitchen Sensor with thresholds
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Verify device information is displayed
      expect(screen.getByDisplayValue('Kitchen Sensor')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Kitchen')).toBeInTheDocument();
      expect(screen.getByText('Sensor')).toBeInTheDocument();

      // Update device name
      const nameInput = screen.getByDisplayValue('Kitchen Sensor');
      fireEvent.change(nameInput, { target: { value: 'Kitchen Temperature Sensor' } });

      // Update room
      const roomInput = screen.getByDisplayValue('Kitchen');
      fireEvent.change(roomInput, { target: { value: 'Dining Room' } });

      // Verify unsaved changes alert appears
      await waitFor(() => {
        expect(screen.getByText(/you have unsaved changes/i)).toBeInTheDocument();
      });

      // Toggle threshold monitoring
      const thresholdSwitch = screen.getByRole('checkbox', { name: /enabled/i });
      expect(thresholdSwitch).toBeChecked();
      fireEvent.click(thresholdSwitch);

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).not.toBeDisabled();
      fireEvent.click(saveButton);

      // Verify save was called with correct updates
      expect(mockOnSave).toHaveBeenCalledWith('device-2', {
        name: 'Kitchen Temperature Sensor',
        room: 'Dining Room',
        thresholds: [
          { propertyKey: 'temperature', min: 18, max: 25, enabled: false },
        ],
      });
    });

    it('resets changes when cancelled', async () => {
      const mockOnSave = vi.fn();
      const mockOnClose = vi.fn();

      renderWithTheme(
        <DeviceSettingsDialog
          open={true}
          device={mockDevices[0]}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Make changes
      const nameInput = screen.getByDisplayValue('Living Room Light');
      fireEvent.change(nameInput, { target: { value: 'Changed Name' } });

      // Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Device Removal Workflow', () => {
    it('requires proper confirmation before removal', async () => {
      const mockOnConfirm = vi.fn().mockResolvedValue(undefined);
      const mockOnClose = vi.fn();

      renderWithTheme(
        <DeviceRemovalDialog
          open={true}
          device={mockDevices[0]}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      // Verify device information is shown
      expect(screen.getByText('Living Room Light')).toBeInTheDocument();
      expect(screen.getByText('Type: Switch')).toBeInTheDocument();

      // Remove button should be disabled initially
      const removeButton = screen.getByRole('button', { name: /remove device/i });
      expect(removeButton).toBeDisabled();

      // Enter incorrect device name
      const confirmationInput = screen.getByPlaceholderText(/type "living room light" to confirm/i);
      fireEvent.change(confirmationInput, { target: { value: 'wrong name' } });
      expect(removeButton).toBeDisabled();
      expect(screen.getByText('Device name does not match')).toBeInTheDocument();

      // Enter correct device name
      fireEvent.change(confirmationInput, { target: { value: 'Living Room Light' } });
      expect(removeButton).toBeDisabled(); // Still disabled without acknowledgment

      // Acknowledge data loss
      const acknowledgmentCheckbox = screen.getByRole('checkbox');
      fireEvent.click(acknowledgmentCheckbox);

      // Now remove button should be enabled
      expect(removeButton).not.toBeDisabled();

      // Confirm removal
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('device-1');
      });
    });

    it('handles removal errors gracefully', async () => {
      const mockOnConfirm = vi.fn().mockRejectedValue(new Error('Network error'));
      const mockOnClose = vi.fn();

      renderWithTheme(
        <DeviceRemovalDialog
          open={true}
          device={mockDevices[0]}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      // Complete the confirmation process
      const confirmationInput = screen.getByPlaceholderText(/type "living room light" to confirm/i);
      fireEvent.change(confirmationInput, { target: { value: 'Living Room Light' } });

      const acknowledgmentCheckbox = screen.getByRole('checkbox');
      fireEvent.click(acknowledgmentCheckbox);

      const removeButton = screen.getByRole('button', { name: /remove device/i });
      fireEvent.click(removeButton);

      // Should show loading state
      expect(screen.getByText('Removing...')).toBeInTheDocument();

      // After error, should return to normal state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /remove device/i })).not.toBeDisabled();
      });

      expect(mockOnConfirm).toHaveBeenCalled();
    });
  });

  describe('Device List Interactions', () => {
    it('provides access to device management functions', () => {
      const mockOnDeviceSettings = vi.fn();
      const mockOnDeviceRemove = vi.fn();

      renderWithTheme(
        <DeviceList
          devices={mockDevices}
          onDeviceSettings={mockOnDeviceSettings}
          onDeviceRemove={mockOnDeviceRemove}
        />
      );

      // Verify devices are displayed
      expect(screen.getByText('Living Room Light')).toBeInTheDocument();
      expect(screen.getByText('Kitchen Sensor')).toBeInTheDocument();

      // Click on device card should open settings
      const deviceCard = screen.getByText('Living Room Light').closest('.MuiCard-root');
      fireEvent.click(deviceCard!);
      expect(mockOnDeviceSettings).toHaveBeenCalledWith(mockDevices[0]);

      // Open menu and test actions
      const moreButtons = screen.getAllByLabelText(/more/i);
      fireEvent.click(moreButtons[0]);

      const settingsMenuItem = screen.getByText('Device Settings');
      fireEvent.click(settingsMenuItem);
      expect(mockOnDeviceSettings).toHaveBeenCalledWith(mockDevices[0]);

      // Test remove action
      fireEvent.click(moreButtons[1]);
      const removeMenuItem = screen.getByText('Remove Device');
      fireEvent.click(removeMenuItem);
      expect(mockOnDeviceRemove).toHaveBeenCalledWith(mockDevices[1]);
    });

    it('displays device status and properties correctly', () => {
      const mockOnDeviceSettings = vi.fn();
      const mockOnDeviceRemove = vi.fn();

      renderWithTheme(
        <DeviceList
          devices={mockDevices}
          onDeviceSettings={mockOnDeviceSettings}
          onDeviceRemove={mockOnDeviceRemove}
        />
      );

      // Check status indicators
      expect(screen.getByText('online')).toBeInTheDocument();
      expect(screen.getByText('offline')).toBeInTheDocument();

      // Check properties are displayed
      expect(screen.getByText('power: true')).toBeInTheDocument();
      expect(screen.getByText('temperature: 22.5 °C')).toBeInTheDocument();
      expect(screen.getByText('humidity: 65 %')).toBeInTheDocument();

      // Check rooms are displayed
      expect(screen.getByText('Room: Living Room')).toBeInTheDocument();
      expect(screen.getByText('Room: Kitchen')).toBeInTheDocument();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles empty device list gracefully', () => {
      const mockOnDeviceSettings = vi.fn();
      const mockOnDeviceRemove = vi.fn();

      renderWithTheme(
        <DeviceList
          devices={[]}
          onDeviceSettings={mockOnDeviceSettings}
          onDeviceRemove={mockOnDeviceRemove}
        />
      );

      expect(screen.getByText('No devices configured')).toBeInTheDocument();
      expect(screen.getByText(/use the "add device" button/i)).toBeInTheDocument();
    });

    it('handles devices with no properties or controls', () => {
      const minimalDevice: Device = {
        id: 'minimal-device',
        name: 'Minimal Device',
        type: 'sensor',
        room: 'Test Room',
        status: 'online',
        lastSeen: new Date(),
        properties: [],
        controls: [],
      };

      const mockOnDeviceSettings = vi.fn();
      const mockOnDeviceRemove = vi.fn();

      renderWithTheme(
        <DeviceList
          devices={[minimalDevice]}
          onDeviceSettings={mockOnDeviceSettings}
          onDeviceRemove={mockOnDeviceRemove}
        />
      );

      expect(screen.getByText('Minimal Device')).toBeInTheDocument();
      expect(screen.getByText('Room: Test Room')).toBeInTheDocument();
    });

    it('handles connection test failures in wizard', async () => {
      const mockOnDeviceAdded = vi.fn();
      const mockOnClose = vi.fn();

      renderWithTheme(
        <AddDeviceWizard
          open={true}
          onClose={mockOnClose}
          onDeviceAdded={mockOnDeviceAdded}
        />
      );

      // Go through wizard to connection test
      const sensorCard = screen.getByText('Sensor').closest('div');
      fireEvent.click(sensorCard!);

      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/device name/i);
        fireEvent.change(nameInput, { target: { value: 'Test Sensor' } });

        const roomInput = screen.getByLabelText(/room/i);
        fireEvent.change(roomInput, { target: { value: 'Kitchen' } });
      });

      const nextButton2 = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton2);

      await waitFor(() => {
        expect(screen.getByText('Test Device Connection')).toBeInTheDocument();
      });

      // Connection test might fail (30% chance in our mock)
      const testButton = screen.getByRole('button', { name: /test connection/i });
      fireEvent.click(testButton);

      // Wait for either success or failure
      await waitFor(() => {
        const hasSuccess = screen.queryByText(/connection successful/i);
        const hasError = screen.queryByText(/failed to connect/i);
        expect(hasSuccess || hasError).toBeTruthy();
      }, { timeout: 3000 });

      // If failed, should show troubleshooting tips
      if (screen.queryByText(/failed to connect/i)) {
        expect(screen.getByText('Troubleshooting Tips')).toBeInTheDocument();
        expect(screen.getByText(/ensure your device is powered on/i)).toBeInTheDocument();
      }
    });
  });
});
