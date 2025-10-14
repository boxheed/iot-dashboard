import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  IconButton,
  Box,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { Notification, NotificationType } from '../../../../shared/src/types/Notification';

/**
 * Props for the ToastNotification component
 */
interface ToastNotificationProps {
  /** The notification to display */
  notification: Notification | null;
  /** Callback when the toast is dismissed */
  onClose: () => void;
  /** Auto-hide duration in milliseconds (0 to disable auto-hide) */
  autoHideDuration?: number;
}

/**
 * Map notification type to MUI Alert severity
 */
const getAlertSeverity = (type: NotificationType) => {
  switch (type) {
    case 'alert':
      return 'error';
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
      return 'info';
    default:
      return 'info';
  }
};

/**
 * Get auto-hide duration based on notification priority and type
 */
const getAutoHideDuration = (notification: Notification) => {
  // High priority alerts and errors should stay longer
  if (notification.priority === 'high' || notification.type === 'alert' || notification.type === 'error') {
    return 8000; // 8 seconds
  }
  // Medium priority notifications
  if (notification.priority === 'medium') {
    return 6000; // 6 seconds
  }
  // Low priority notifications
  return 4000; // 4 seconds
};

/**
 * ToastNotification component for displaying immediate alerts
 */
export function ToastNotification({
  notification,
  onClose,
  autoHideDuration,
}: ToastNotificationProps) {
  const [open, setOpen] = useState(false);

  // Show toast when notification changes
  useEffect(() => {
    if (notification) {
      setOpen(true);
    }
  }, [notification]);

  // Handle close
  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
    onClose();
  };

  if (!notification) {
    return null;
  }

  const severity = getAlertSeverity(notification.type);
  const duration = autoHideDuration ?? getAutoHideDuration(notification);

  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{
        mt: 8, // Below app bar
      }}
    >
      <Alert
        severity={severity}
        variant="filled"
        onClose={handleClose}
        sx={{
          minWidth: 300,
          maxWidth: 500,
        }}
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={handleClose}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        <AlertTitle>{notification.title}</AlertTitle>
        <Typography variant="body2">
          {notification.message}
        </Typography>
        {notification.priority === 'high' && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
              High Priority
            </Typography>
          </Box>
        )}
      </Alert>
    </Snackbar>
  );
}