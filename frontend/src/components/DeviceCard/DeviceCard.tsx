import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  IconButton,
  Switch,
  Slider,
} from '@mui/material';
import {
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
import { Device, DeviceType, DeviceStatus } from '../../../../shared/src/types/Device';

export interface DeviceCardProps {
  device: Device;
  onDeviceClick: (device: Device) => void;
  onControlChange: (deviceId: string, controlKey: string, value: any) => void;
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

const getStatusIcon = (status: DeviceStatus) => {
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

const getStatusColor = (status: DeviceStatus) => {
  switch (status) {
    case 'online':
      return 'success';
    case 'offline':
      return 'default';
    case 'error':
      return 'error';
    default:
      return 'default';
  }
};

const formatPropertyValue = (value: any, unit?: string) => {
  if (typeof value === 'number') {
    return `${value.toFixed(1)}${unit ? ` ${unit}` : ''}`;
  }
  return String(value);
};

const formatLastSeen = (lastSeen: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffMinutes < 1440) {
    const hours = Math.floor(diffMinutes / 60);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffMinutes / 1440);
    return `${days}d ago`;
  }
};

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  onDeviceClick,
  onControlChange,
}) => {
  const handleCardClick = () => {
    onDeviceClick(device);
  };

  const handleControlClick = (event: React.MouseEvent) => {
    // Prevent card click when interacting with controls
    event.stopPropagation();
  };

  const handleSwitchChange = (controlKey: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    onControlChange(device.id, controlKey, event.target.checked);
  };

  const handleSliderChange = (controlKey: string) => (_event: Event, value: number | number[]) => {
    onControlChange(device.id, controlKey, value);
  };

  const renderQuickControl = (control: any) => {
    if (device.status !== 'online') {
      return null;
    }

    switch (control.type) {
      case 'switch':
        const currentValue = device.properties.find(p => p.key === control.key)?.value || false;
        return (
          <Switch
            key={control.key}
            checked={Boolean(currentValue)}
            onChange={handleSwitchChange(control.key)}
            onClick={handleControlClick}
            size="small"
            color="primary"
          />
        );
      
      case 'slider':
        const sliderValue = device.properties.find(p => p.key === control.key)?.value || control.min || 0;
        return (
          <Box key={control.key} sx={{ width: 80, px: 1 }} onClick={handleControlClick}>
            <Slider
              value={Number(sliderValue)}
              min={control.min || 0}
              max={control.max || 100}
              onChange={handleSliderChange(control.key)}
              size="small"
              valueLabelDisplay="auto"
            />
          </Box>
        );
      
      default:
        return null;
    }
  };

  const primaryProperty = device.properties[0];
  const quickControls = device.controls.filter(control => 
    control.type === 'switch' || control.type === 'slider'
  ).slice(0, 2); // Limit to 2 quick controls for space

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3,
        },
        opacity: device.status === 'offline' ? 0.7 : 1,
      }}
      onClick={handleCardClick}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* Header with icon and status */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getDeviceIcon(device.type)}
            {getStatusIcon(device.status)}
          </Box>
          <Chip
            label={device.status}
            size="small"
            color={getStatusColor(device.status)}
            variant="outlined"
          />
        </Box>

        {/* Device name and room */}
        <Typography variant="h6" component="h3" noWrap sx={{ mb: 0.5 }}>
          {device.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1 }}>
          {device.room}
        </Typography>

        {/* Primary property value */}
        {primaryProperty && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="h5" component="div" color="primary">
              {formatPropertyValue(primaryProperty.value, primaryProperty.unit)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {primaryProperty.key}
            </Typography>
          </Box>
        )}

        {/* Last seen */}
        <Typography variant="caption" color="text.secondary">
          {formatLastSeen(device.lastSeen)}
        </Typography>
      </CardContent>

      {/* Quick controls */}
      {quickControls.length > 0 && (
        <CardActions sx={{ pt: 0, justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {quickControls.map(renderQuickControl)}
          </Box>
          <IconButton
            size="small"
            onClick={handleControlClick}
            sx={{ opacity: 0.7 }}
          >
            <Typography variant="caption">More</Typography>
          </IconButton>
        </CardActions>
      )}
    </Card>
  );
};