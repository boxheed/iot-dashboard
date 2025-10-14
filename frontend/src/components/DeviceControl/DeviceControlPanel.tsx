import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Switch,
  Slider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Sensors,
  PowerSettingsNew,
  Lightbulb,
  Thermostat,
  Videocam,
  Lock,
  WifiOff,
  Error as ErrorIcon,
  CheckCircle,
} from '@mui/icons-material';
import { Device, DeviceType, DeviceControl } from '../../../../shared/src/types/Device';

export interface DeviceControlPanelProps {
  device: Device | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (deviceId: string, controlKey: string, value: any) => Promise<void>;
}

const getDeviceIcon = (type: DeviceType) => {
  const iconProps = { fontSize: 'large' as const };
  
  switch (type) {
    case 'sensor':
      return <Sensors {...iconProps} />;
    case 'switch':
      return <PowerSettingsNew {...iconProps} />;
    case 'dimmer':
      return <Lightbulb {...iconProps} />;
    case 'thermostat':
      return <Thermostat {...iconProps} />;
    case 'camera':
      return <Videocam {...iconProps} />;
    case 'lock':
      return <Lock {...iconProps} />;
    default:
      return <Sensors {...iconProps} />;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'online':
      return <CheckCircle color="success" fontSize="small" />;
    case 'offline':
      return <WifiOff color="disabled" fontSize="small" />;
    case 'error':
      return <ErrorIcon color="error" fontSize="small" />;
    default:
      return <WifiOff color="disabled" fontSize="small" />;
  }
};

const formatPropertyValue = (value: any, unit?: string) => {
  if (typeof value === 'number') {
    return `${value.toFixed(1)}${unit ? ` ${unit}` : ''}`;
  }
  return String(value);
};

export const DeviceControlPanel: React.FC<DeviceControlPanelProps> = ({
  device,
  open,
  onClose,
  onUpdate,
}) => {
  const [controlValues, setControlValues] = useState<Record<string, any>>({});
  const [loadingControls, setLoadingControls] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Initialize control values when device changes
  useEffect(() => {
    if (device) {
      const initialValues: Record<string, any> = {};
      device.controls.forEach(control => {
        const property = device.properties.find(p => p.key === control.key);
        initialValues[control.key] = property?.value ?? getDefaultValue(control);
      });
      setControlValues(initialValues);
      setError(null);
    }
  }, [device]);

  const getDefaultValue = (control: DeviceControl) => {
    switch (control.type) {
      case 'switch':
        return false;
      case 'slider':
        return control.min ?? 0;
      case 'select':
        return control.options?.[0] ?? '';
      case 'input':
        return '';
      default:
        return '';
    }
  };

  const handleControlChange = async (controlKey: string, value: any) => {
    if (!device || device.status !== 'online') return;

    setControlValues(prev => ({ ...prev, [controlKey]: value }));
    setLoadingControls(prev => new Set(prev).add(controlKey));
    setError(null);

    try {
      await onUpdate(device.id, controlKey, value);
    } catch (err) {
      setError(`Failed to update ${controlKey}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Revert the value on error
      const property = device.properties.find(p => p.key === controlKey);
      if (property) {
        setControlValues(prev => ({ ...prev, [controlKey]: property.value }));
      }
    } finally {
      setLoadingControls(prev => {
        const newSet = new Set(prev);
        newSet.delete(controlKey);
        return newSet;
      });
    }
  };

  const renderControl = (control: DeviceControl) => {
    const isLoading = loadingControls.has(control.key);
    const currentValue = controlValues[control.key];
    const isDisabled = device?.status !== 'online' || isLoading;

    switch (control.type) {
      case 'switch':
        return (
          <Box key={control.key} sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(currentValue)}
                  onChange={(e) => handleControlChange(control.key, e.target.checked)}
                  disabled={isDisabled}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>{control.label}</Typography>
                  {isLoading && <CircularProgress size={16} />}
                </Box>
              }
            />
          </Box>
        );

      case 'slider':
        return (
          <Box key={control.key} sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {control.label}
              </Typography>
              {isLoading && <CircularProgress size={16} />}
            </Box>
            <Slider
              value={Number(currentValue) || 0}
              min={control.min ?? 0}
              max={control.max ?? 100}
              onChange={(_event, value) => handleControlChange(control.key, value)}
              disabled={isDisabled}
              valueLabelDisplay="auto"
              marks={[
                { value: control.min ?? 0, label: String(control.min ?? 0) },
                { value: control.max ?? 100, label: String(control.max ?? 100) },
              ]}
            />
          </Box>
        );

      case 'select':
        return (
          <Box key={control.key} sx={{ mb: 3 }}>
            <FormControl fullWidth disabled={isDisabled}>
              <InputLabel>{control.label}</InputLabel>
              <Select
                value={currentValue || ''}
                label={control.label}
                onChange={(e) => handleControlChange(control.key, e.target.value)}
                endAdornment={isLoading ? <CircularProgress size={20} /> : null}
              >
                {control.options?.map(option => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        );

      case 'input':
        return (
          <Box key={control.key} sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label={control.label}
              value={currentValue || ''}
              onChange={(e) => setControlValues(prev => ({ ...prev, [control.key]: e.target.value }))}
              onBlur={() => handleControlChange(control.key, currentValue)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleControlChange(control.key, currentValue);
                }
              }}
              disabled={isDisabled}
              InputProps={{
                endAdornment: isLoading ? <CircularProgress size={20} /> : null,
              }}
            />
          </Box>
        );

      default:
        return null;
    }
  };

  if (!device) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { minHeight: '400px' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {getDeviceIcon(device.type)}
            <Box>
              <Typography variant="h6">{device.name}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getStatusIcon(device.status)}
                <Typography variant="body2" color="text.secondary">
                  {device.room}
                </Typography>
                <Chip
                  label={device.status}
                  size="small"
                  color={device.status === 'online' ? 'success' : device.status === 'error' ? 'error' : 'default'}
                  variant="outlined"
                />
              </Box>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {device.status !== 'online' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Device is {device.status}. Controls are disabled.
          </Alert>
        )}

        {/* Device Properties */}
        {device.properties.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Current Status
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {device.properties.map(property => (
                <Chip
                  key={property.key}
                  label={`${property.key}: ${formatPropertyValue(property.value, property.unit)}`}
                  variant="outlined"
                  size="small"
                />
              ))}
            </Box>
            <Divider />
          </Box>
        )}

        {/* Device Controls */}
        {device.controls.length > 0 ? (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Controls
            </Typography>
            {device.controls.map(renderControl)}
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              This device has no available controls.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};