
import { Typography, Box, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAppContext } from '../../context/AppContext';
import { ResponsiveContainer } from '../../components';
import { AddDeviceWizard } from '../../components/DeviceWizard';
import { DeviceList, DeviceSettingsDialog, DeviceRemovalDialog } from '../../components/DeviceManagement';
import { Device, DeviceRegistration } from '@shared/types/Device';
import { deviceApi } from '../../services/api.service';
import { useState } from 'react';

/**
 * Device management page component
 * Handles device setup, configuration, and removal
 */
export function DeviceManagement() {
  const { state, dispatch } = useAppContext();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRemovalOpen, setIsRemovalOpen] = useState(false);

  const handleAddDevice = () => {
    setIsWizardOpen(true);
  };

  const handleWizardClose = () => {
    setIsWizardOpen(false);
  };

  const handleDeviceAdded = async (registration: DeviceRegistration) => {
    try {
      const newDevice = await deviceApi.addDevice(registration);
      dispatch({ type: 'ADD_DEVICE', payload: newDevice });
      setIsWizardOpen(false);
    } catch (error) {
      console.error('Failed to add device:', error);
      // TODO: Show error notification
    }
  };

  const handleDeviceSettings = (device: Device) => {
    setSelectedDevice(device);
    setIsSettingsOpen(true);
  };

  const handleDeviceRemove = (device: Device) => {
    setSelectedDevice(device);
    setIsRemovalOpen(true);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
    setSelectedDevice(null);
  };

  const handleRemovalClose = () => {
    setIsRemovalOpen(false);
    setSelectedDevice(null);
  };

  const handleSettingsSave = async (deviceId: string, updates: Partial<Device>) => {
    try {
      const updatedDevice = await deviceApi.updateDevice(deviceId, updates);
      dispatch({ type: 'UPDATE_DEVICE', payload: updatedDevice });
    } catch (error) {
      console.error('Failed to update device:', error);
      // TODO: Show error notification
    }
  };

  const handleRemovalConfirm = async (deviceId: string) => {
    try {
      await deviceApi.removeDevice(deviceId);
      dispatch({ type: 'REMOVE_DEVICE', payload: deviceId });
    } catch (error) {
      console.error('Failed to remove device:', error);
      // TODO: Show error notification
      throw error; // Re-throw to let dialog handle the error state
    }
  };

  return (
    <ResponsiveContainer>
      <Box 
        mb={3} 
        display="flex" 
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        gap={2}
      >
        <Box>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}
          >
            Device Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Add, configure, and manage your smart home devices
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddDevice}
          size="large"
          fullWidth
          sx={{ minWidth: { sm: 'auto' } }}
        >
          Add Device
        </Button>
      </Box>

      {/* Device list */}
      <DeviceList
        devices={state.devices}
        onDeviceSettings={handleDeviceSettings}
        onDeviceRemove={handleDeviceRemove}
      />

      <AddDeviceWizard
        open={isWizardOpen}
        onClose={handleWizardClose}
        onDeviceAdded={handleDeviceAdded}
      />

      <DeviceSettingsDialog
        open={isSettingsOpen}
        device={selectedDevice}
        onClose={handleSettingsClose}
        onSave={handleSettingsSave}
      />

      <DeviceRemovalDialog
        open={isRemovalOpen}
        device={selectedDevice}
        onClose={handleRemovalClose}
        onConfirm={handleRemovalConfirm}
      />
    </ResponsiveContainer>
  );
}