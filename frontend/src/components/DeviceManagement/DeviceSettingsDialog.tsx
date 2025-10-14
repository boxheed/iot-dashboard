import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Grid,
  Autocomplete,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { Device } from '@shared/types/Device';

interface DeviceSettingsDialogProps {
  open: boolean;
  device: Device | null;
  onClose: () => void;
  onSave: (deviceId: string, updates: Partial<Device>) => void;
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

export function DeviceSettingsDialog({ open, device, onClose, onSave }: DeviceSettingsDialogProps) {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [thresholds, setThresholds] = useState<Device['thresholds']>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (device) {
      setName(device.name);
      setRoom(device.room);
      setThresholds(device.thresholds || []);
      setHasChanges(false);
    }
  }, [device]);

  useEffect(() => {
    if (device) {
      const nameChanged = name !== device.name;
      const roomChanged = room !== device.room;
      const thresholdsChanged = JSON.stringify(thresholds) !== JSON.stringify(device.thresholds || []);
      setHasChanges(nameChanged || roomChanged || thresholdsChanged);
    }
  }, [name, room, thresholds, device]);

  const handleSave = () => {
    if (!device) return;

    const updates: Partial<Device> = {};
    
    if (name !== device.name) {
      updates.name = name;
    }
    
    if (room !== device.room) {
      updates.room = room;
    }
    
    if (JSON.stringify(thresholds) !== JSON.stringify(device.thresholds || [])) {
      updates.thresholds = thresholds;
    }

    onSave(device.id, updates);
    onClose();
  };

  const handleClose = () => {
    if (device) {
      setName(device.name);
      setRoom(device.room);
      setThresholds(device.thresholds || []);
      setHasChanges(false);
    }
    onClose();
  };

  const handleThresholdToggle = (propertyKey: string) => {
    setThresholds(prev => 
      prev?.map(threshold => 
        threshold.propertyKey === propertyKey 
          ? { ...threshold, enabled: !threshold.enabled }
          : threshold
      ) || []
    );
  };

  const formatLastSeen = (lastSeen: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(lastSeen);
  };

  if (!device) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: 500 },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Typography variant="h6" component="div">
          Device Settings
        </Typography>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{ color: 'grey.500' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 1 }}>
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Basic Information
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Device Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              helperText="A friendly name to identify this device"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Autocomplete
              freeSolo
              options={commonRooms}
              value={room}
              onChange={(_, newValue) => setRoom(newValue || '')}
              onInputChange={(_, newInputValue) => setRoom(newInputValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Room"
                  helperText="Where is this device located?"
                />
              )}
            />
          </Grid>

          {/* Device Status */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Device Status
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <Chip
                label={device.status}
                color={device.status === 'online' ? 'success' : device.status === 'offline' ? 'error' : 'warning'}
                sx={{ mt: 0.5 }}
              />
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Last Seen
              </Typography>
              <Typography variant="body1">
                {formatLastSeen(device.lastSeen)}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Device Type
              </Typography>
              <Typography variant="body1">
                {device.type.charAt(0).toUpperCase() + device.type.slice(1)}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Device ID
              </Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                {device.id}
              </Typography>
            </Box>
          </Grid>

          {/* Current Properties */}
          {device.properties.length > 0 && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Current Readings
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <List dense>
                  {device.properties.map((prop) => (
                    <ListItem key={prop.key}>
                      <ListItemText
                        primary={prop.key}
                        secondary={`${prop.value}${prop.unit ? ` ${prop.unit}` : ''}`}
                      />
                      <ListItemSecondaryAction>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(prop.timestamp).toLocaleTimeString()}
                        </Typography>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Grid>
            </>
          )}

          {/* Threshold Monitoring */}
          {thresholds && thresholds.length > 0 && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Threshold Monitoring
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Configure alerts when device values go outside normal ranges.
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <List>
                  {thresholds.map((threshold) => (
                    <ListItem key={threshold.propertyKey}>
                      <ListItemText
                        primary={threshold.propertyKey}
                        secondary={
                          threshold.min !== undefined || threshold.max !== undefined
                            ? `Range: ${threshold.min ?? '∞'} - ${threshold.max ?? '∞'}`
                            : 'No range configured'
                        }
                      />
                      <ListItemSecondaryAction>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={threshold.enabled}
                              onChange={() => handleThresholdToggle(threshold.propertyKey)}
                            />
                          }
                          label="Enabled"
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Grid>
            </>
          )}

          {/* Available Controls */}
          {device.controls.length > 0 && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Available Controls
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <List dense>
                  {device.controls.map((control) => (
                    <ListItem key={control.key}>
                      <ListItemText
                        primary={control.label}
                        secondary={`Type: ${control.type}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            </>
          )}
        </Grid>

        {hasChanges && (
          <Alert severity="info" sx={{ mt: 2 }}>
            You have unsaved changes. Click "Save Changes" to apply them.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!hasChanges}
          startIcon={<SaveIcon />}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}