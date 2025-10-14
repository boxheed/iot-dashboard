import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  alpha,
} from '@mui/material';
import {
  Sensors as SensorIcon,
  ToggleOn as SwitchIcon,
  Tune as DimmerIcon,
  Thermostat as ThermostatIcon,
  Videocam as CameraIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { DeviceType } from '@shared/types/Device';

interface DeviceTypeOption {
  type: DeviceType;
  label: string;
  description: string;
  icon: React.ReactNode;
  examples: string[];
}

const deviceTypes: DeviceTypeOption[] = [
  {
    type: 'sensor',
    label: 'Sensor',
    description: 'Temperature, humidity, motion, and other sensors',
    icon: <SensorIcon sx={{ fontSize: 40 }} />,
    examples: ['Temperature sensor', 'Motion detector', 'Door sensor'],
  },
  {
    type: 'switch',
    label: 'Smart Switch',
    description: 'On/off switches for lights and appliances',
    icon: <SwitchIcon sx={{ fontSize: 40 }} />,
    examples: ['Light switch', 'Power outlet', 'Fan switch'],
  },
  {
    type: 'dimmer',
    label: 'Dimmer',
    description: 'Dimmable lights and variable controls',
    icon: <DimmerIcon sx={{ fontSize: 40 }} />,
    examples: ['Dimmable lights', 'Variable fan speed', 'Brightness control'],
  },
  {
    type: 'thermostat',
    label: 'Thermostat',
    description: 'Climate control and HVAC systems',
    icon: <ThermostatIcon sx={{ fontSize: 40 }} />,
    examples: ['Smart thermostat', 'AC controller', 'Heating system'],
  },
  {
    type: 'camera',
    label: 'Camera',
    description: 'Security cameras and monitoring devices',
    icon: <CameraIcon sx={{ fontSize: 40 }} />,
    examples: ['Security camera', 'Doorbell camera', 'Baby monitor'],
  },
  {
    type: 'lock',
    label: 'Smart Lock',
    description: 'Electronic locks and access control',
    icon: <LockIcon sx={{ fontSize: 40 }} />,
    examples: ['Door lock', 'Garage door', 'Gate controller'],
  },
];

interface DeviceTypeSelectorProps {
  selectedType: DeviceType | null;
  onTypeSelect: (type: DeviceType) => void;
}

export function DeviceTypeSelector({ selectedType, onTypeSelect }: DeviceTypeSelectorProps) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        What type of device are you adding?
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Select the type that best matches your device. This helps us configure the right controls and display options.
      </Typography>

      <Grid container spacing={2}>
        {deviceTypes.map((deviceType) => (
          <Grid item xs={12} sm={6} md={4} key={deviceType.type}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                border: 2,
                borderColor: selectedType === deviceType.type ? 'primary.main' : 'transparent',
                backgroundColor: selectedType === deviceType.type 
                  ? alpha('#1976d2', 0.08) 
                  : 'background.paper',
                '&:hover': {
                  borderColor: selectedType === deviceType.type ? 'primary.main' : 'primary.light',
                  backgroundColor: selectedType === deviceType.type 
                    ? alpha('#1976d2', 0.12) 
                    : alpha('#1976d2', 0.04),
                  transform: 'translateY(-2px)',
                  boxShadow: 2,
                },
              }}
              onClick={() => onTypeSelect(deviceType.type)}
            >
              <CardContent sx={{ textAlign: 'center', p: 2 }}>
                <Box
                  sx={{
                    color: selectedType === deviceType.type ? 'primary.main' : 'text.secondary',
                    mb: 1,
                  }}
                >
                  {deviceType.icon}
                </Box>
                <Typography 
                  variant="h6" 
                  component="h3" 
                  gutterBottom
                  sx={{ 
                    fontSize: '1rem',
                    fontWeight: selectedType === deviceType.type ? 600 : 500,
                  }}
                >
                  {deviceType.label}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ mb: 1, minHeight: 40 }}
                >
                  {deviceType.description}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Examples:
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ fontStyle: 'italic' }}>
                    {deviceType.examples.join(', ')}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}