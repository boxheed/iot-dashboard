import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Autocomplete,
} from '@mui/material';
import { DeviceType } from '@shared/types/Device';

interface DeviceConfigurationFormProps {
  deviceType: DeviceType;
  name: string;
  room: string;
  connectionConfig: Record<string, any>;
  onChange: (config: {
    name: string;
    room: string;
    connectionConfig: Record<string, any>;
  }) => void;
}

// Common room suggestions
const commonRooms = [
  'Living Room',
  'Kitchen',
  'Bedroom',
  'Bathroom',
  'Garage',
  'Office',
  'Basement',
  'Attic',
  'Dining Room',
  'Hallway',
  'Laundry Room',
  'Guest Room',
  'Master Bedroom',
  'Kids Room',
  'Patio',
  'Garden',
];

// Device-specific configuration fields
const getConfigurationFields = (deviceType: DeviceType) => {
  const baseFields = [
    {
      key: 'mqttTopic',
      label: 'MQTT Topic',
      type: 'text',
      required: true,
      placeholder: 'e.g., home/livingroom/light1',
      helperText: 'The MQTT topic this device publishes to and subscribes from',
    },
  ];

  switch (deviceType) {
    case 'sensor':
      return [
        ...baseFields,
        {
          key: 'sensorType',
          label: 'Sensor Type',
          type: 'select',
          required: true,
          options: ['temperature', 'humidity', 'motion', 'door', 'window', 'smoke', 'co2'],
          helperText: 'Type of sensor for proper data interpretation',
        },
        {
          key: 'unit',
          label: 'Unit of Measurement',
          type: 'text',
          required: false,
          placeholder: 'e.g., °C, %, lux',
          helperText: 'Unit for sensor readings (optional)',
        },
      ];

    case 'switch':
      return [
        ...baseFields,
        {
          key: 'onCommand',
          label: 'On Command',
          type: 'text',
          required: true,
          placeholder: 'ON',
          helperText: 'Command to send to turn the device on',
        },
        {
          key: 'offCommand',
          label: 'Off Command',
          type: 'text',
          required: true,
          placeholder: 'OFF',
          helperText: 'Command to send to turn the device off',
        },
      ];

    case 'dimmer':
      return [
        ...baseFields,
        {
          key: 'minValue',
          label: 'Minimum Value',
          type: 'number',
          required: true,
          placeholder: '0',
          helperText: 'Minimum dimmer value',
        },
        {
          key: 'maxValue',
          label: 'Maximum Value',
          type: 'number',
          required: true,
          placeholder: '100',
          helperText: 'Maximum dimmer value',
        },
      ];

    case 'thermostat':
      return [
        ...baseFields,
        {
          key: 'temperatureUnit',
          label: 'Temperature Unit',
          type: 'select',
          required: true,
          options: ['celsius', 'fahrenheit'],
          helperText: 'Temperature unit for display and control',
        },
        {
          key: 'minTemp',
          label: 'Minimum Temperature',
          type: 'number',
          required: true,
          placeholder: '10',
          helperText: 'Minimum settable temperature',
        },
        {
          key: 'maxTemp',
          label: 'Maximum Temperature',
          type: 'number',
          required: true,
          placeholder: '30',
          helperText: 'Maximum settable temperature',
        },
      ];

    case 'camera':
      return [
        ...baseFields,
        {
          key: 'streamUrl',
          label: 'Stream URL',
          type: 'text',
          required: false,
          placeholder: 'rtsp://192.168.1.100:554/stream',
          helperText: 'Video stream URL (optional)',
        },
        {
          key: 'snapshotUrl',
          label: 'Snapshot URL',
          type: 'text',
          required: false,
          placeholder: 'http://192.168.1.100/snapshot.jpg',
          helperText: 'Still image URL (optional)',
        },
      ];

    case 'lock':
      return [
        ...baseFields,
        {
          key: 'lockCommand',
          label: 'Lock Command',
          type: 'text',
          required: true,
          placeholder: 'LOCK',
          helperText: 'Command to lock the device',
        },
        {
          key: 'unlockCommand',
          label: 'Unlock Command',
          type: 'text',
          required: true,
          placeholder: 'UNLOCK',
          helperText: 'Command to unlock the device',
        },
      ];

    default:
      return baseFields;
  }
};

export function DeviceConfigurationForm({
  deviceType,
  name,
  room,
  connectionConfig,
  onChange,
}: DeviceConfigurationFormProps) {
  const [localName, setLocalName] = useState(name);
  const [localRoom, setLocalRoom] = useState(room);
  const [localConfig, setLocalConfig] = useState(connectionConfig);

  const configFields = getConfigurationFields(deviceType);

  // Update parent when local state changes
  useEffect(() => {
    onChange({
      name: localName,
      room: localRoom,
      connectionConfig: localConfig,
    });
  }, [localName, localRoom, localConfig, onChange]);

  const handleConfigChange = (key: string, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const renderConfigField = (field: any) => {
    const value = localConfig[field.key] || '';

    if (field.type === 'select') {
      return (
        <FormControl fullWidth key={field.key}>
          <InputLabel>{field.label}</InputLabel>
          <Select
            value={value}
            label={field.label}
            onChange={(e) => handleConfigChange(field.key, e.target.value)}
          >
            {field.options.map((option: string) => (
              <MenuItem key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    return (
      <TextField
        key={field.key}
        fullWidth
        label={field.label}
        type={field.type}
        value={value}
        onChange={(e) => handleConfigChange(field.key, e.target.value)}
        placeholder={field.placeholder}
        helperText={field.helperText}
        required={field.required}
      />
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Configure Your {deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Provide the basic information and connection details for your device.
      </Typography>

      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
            Basic Information
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Device Name"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            placeholder="e.g., Living Room Light"
            helperText="A friendly name to identify this device"
            required
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Autocomplete
            freeSolo
            options={commonRooms}
            value={localRoom}
            onChange={(_, newValue) => setLocalRoom(newValue || '')}
            onInputChange={(_, newInputValue) => setLocalRoom(newInputValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Room"
                placeholder="e.g., Living Room"
                helperText="Where is this device located?"
                required
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option}
                  {...getTagProps({ index })}
                  key={option}
                />
              ))
            }
          />
        </Grid>

        {/* Connection Configuration */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
            Connection Settings
          </Typography>
        </Grid>

        {configFields.map((field) => (
          <Grid item xs={12} sm={6} key={field.key}>
            {renderConfigField(field)}
          </Grid>
        ))}

        {/* Configuration Preview */}
        <Grid item xs={12}>
          <Box
            sx={{
              mt: 2,
              p: 2,
              backgroundColor: 'grey.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'grey.200',
            }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Configuration Preview
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Name:</strong> {localName || 'Not set'}<br />
              <strong>Room:</strong> {localRoom || 'Not set'}<br />
              <strong>Type:</strong> {deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}
            </Typography>
            {Object.keys(localConfig).length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Connection Config: {JSON.stringify(localConfig, null, 2)}
                </Typography>
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}