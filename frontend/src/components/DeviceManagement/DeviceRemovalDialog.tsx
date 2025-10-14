import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  TextField,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  History as HistoryIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { Device } from '@shared/types/Device';

interface DeviceRemovalDialogProps {
  open: boolean;
  device: Device | null;
  onClose: () => void;
  onConfirm: (deviceId: string) => void;
}

export function DeviceRemovalDialog({ open, device, onClose, onConfirm }: DeviceRemovalDialogProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [acknowledgeDataLoss, setAcknowledgeDataLoss] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleClose = () => {
    setConfirmationText('');
    setAcknowledgeDataLoss(false);
    setIsRemoving(false);
    onClose();
  };

  const handleConfirm = async () => {
    if (!device) return;

    setIsRemoving(true);
    try {
      await onConfirm(device.id);
      handleClose();
    } catch (error) {
      setIsRemoving(false);
      // Error handling would be done by parent component
    }
  };

  const isConfirmationValid = () => {
    return (
      device &&
      confirmationText.toLowerCase() === device.name.toLowerCase() &&
      acknowledgeDataLoss
    );
  };

  if (!device) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { minHeight: 400 },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: 'error.main',
        }}
      >
        <WarningIcon />
        Remove Device
      </DialogTitle>

      <DialogContent>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            This action cannot be undone!
          </Typography>
          <Typography variant="body2">
            Removing this device will permanently delete all associated data and settings.
          </Typography>
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Device to be removed:
          </Typography>
          <Box
            sx={{
              p: 2,
              border: 1,
              borderColor: 'grey.300',
              borderRadius: 1,
              backgroundColor: 'grey.50',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {device.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Type: {device.type.charAt(0).toUpperCase() + device.type.slice(1)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Room: {device.room}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Status: {device.status}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
            What will be deleted:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <HistoryIcon color="error" />
              </ListItemIcon>
              <ListItemText
                primary="Historical Data"
                secondary="All sensor readings and device history"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <NotificationsIcon color="error" />
              </ListItemIcon>
              <ListItemText
                primary="Notifications"
                secondary="All alerts and notifications related to this device"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <InfoIcon color="error" />
              </ListItemIcon>
              <ListItemText
                primary="Configuration"
                secondary="Device settings, thresholds, and connection details"
              />
            </ListItem>
          </List>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            To confirm removal, type the device name exactly as shown:
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            <strong>{device.name}</strong>
          </Typography>
          <TextField
            fullWidth
            placeholder={`Type "${device.name}" to confirm`}
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            error={confirmationText.length > 0 && confirmationText.toLowerCase() !== device.name.toLowerCase()}
            helperText={
              confirmationText.length > 0 && confirmationText.toLowerCase() !== device.name.toLowerCase()
                ? 'Device name does not match'
                : ''
            }
          />
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={acknowledgeDataLoss}
              onChange={(e) => setAcknowledgeDataLoss(e.target.checked)}
              color="error"
            />
          }
          label={
            <Typography variant="body2">
              I understand that all data associated with this device will be permanently deleted
            </Typography>
          }
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={isRemoving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleConfirm}
          disabled={!isConfirmationValid() || isRemoving}
          startIcon={<DeleteIcon />}
        >
          {isRemoving ? 'Removing...' : 'Remove Device'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}