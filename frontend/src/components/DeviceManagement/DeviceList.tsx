import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Grid,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Circle as StatusIcon,
  Sensors as SensorIcon,
  ToggleOn as SwitchIcon,
  Tune as DimmerIcon,
  Thermostat as ThermostatIcon,
  Videocam as CameraIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { Device, DeviceType } from '@shared/types/Device';

interface DeviceListProps {
  devices: Device[];
  onDeviceSettings: (device: Device) => void;
  onDeviceRemove: (device: Device) => void;
}

const getDeviceIcon = (type: DeviceType) => {
  switch (type) {
    case 'sensor':
      return <SensorIcon />;
    case 'switch':
      return <SwitchIcon />;
    case 'dimmer':
      return <DimmerIcon />;
    case 'thermostat':
      return <ThermostatIcon />;
    case 'camera':
      return <CameraIcon />;
    case 'lock':
      return <LockIcon />;
    default:
      return <SensorIcon />;
  }
};

const getStatusColor = (status: Device['status']) => {
  switch (status) {
    case 'online':
      return 'success';
    case 'offline':
      return 'error';
    case 'error':
      return 'warning';
    default:
      return 'default';
  }
};

const formatLastSeen = (lastSeen: Date) => {
  const now = new Date();
  const diff = now.getTime() - lastSeen.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

export function DeviceList({ devices, onDeviceSettings, onDeviceRemove }: DeviceListProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, device: Device) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedDevice(device);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDevice(null);
  };

  const handleSettings = () => {
    if (selectedDevice) {
      onDeviceSettings(selectedDevice);
    }
    handleMenuClose();
  };

  const handleRemove = () => {
    if (selectedDevice) {
      onDeviceRemove(selectedDevice);
    }
    handleMenuClose();
  };

  if (devices.length === 0) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 8,
          px: 2,
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No devices configured
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Use the "Add Device" button to set up your first smart home device.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        Your Devices ({devices.length})
      </Typography>

      <Grid container spacing={2}>
        {devices.map((device) => (
          <Grid item xs={12} sm={6} md={4} key={device.id}>
            <Card
              sx={{
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 2,
                },
              }}
              onClick={() => onDeviceSettings(device)}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar
                      sx={{
                        bgcolor: 'primary.main',
                        width: 40,
                        height: 40,
                      }}
                    >
                      {getDeviceIcon(device.type)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" component="h3" sx={{ fontSize: '1rem' }}>
                        {device.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {device.type.charAt(0).toUpperCase() + device.type.slice(1)}
                      </Typography>
                    </Box>
                  </Box>

                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, device)}
                    sx={{ mt: -1, mr: -1 }}
                    aria-label={`More options for ${device.name}`}
                  >
                    <MoreIcon />
                  </IconButton>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Chip
                    icon={<StatusIcon />}
                    label={device.status}
                    color={getStatusColor(device.status) as any}
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Room: {device.room}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Last seen: {formatLastSeen(device.lastSeen)}
                  </Typography>
                </Box>

                {device.properties.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Current readings:
                    </Typography>
                    {device.properties.slice(0, 2).map((prop) => (
                      <Typography
                        key={prop.key}
                        variant="body2"
                        sx={{ fontSize: '0.75rem' }}
                      >
                        {prop.key}: {prop.value}{prop.unit && ` ${prop.unit}`}
                      </Typography>
                    ))}
                    {device.properties.length > 2 && (
                      <Typography variant="caption" color="text.secondary">
                        +{device.properties.length - 2} more
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={handleSettings}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Device Settings</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleRemove} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Remove Device</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}