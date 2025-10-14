import React from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Wifi as ConnectionIcon,
  Settings as ConfigIcon,
  DeviceHub as DeviceIcon,
} from '@mui/icons-material';
import { DeviceType } from '@shared/types/Device';

interface ConnectionTestStepProps {
  deviceType: DeviceType;
  deviceName: string;
  connectionConfig: Record<string, any>;
  isConnecting: boolean;
  connectionResult: 'idle' | 'testing' | 'success' | 'error';
  errorMessage: string;
  onTest: () => void;
}

export function ConnectionTestStep({
  deviceType,
  deviceName,
  connectionConfig,
  isConnecting,
  connectionResult,
  errorMessage,
  onTest,
}: ConnectionTestStepProps) {
  const getStatusIcon = () => {
    switch (connectionResult) {
      case 'success':
        return <SuccessIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'testing':
        return <CircularProgress size={24} />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getStatusMessage = () => {
    switch (connectionResult) {
      case 'success':
        return 'Connection successful! Your device is ready to be added.';
      case 'error':
        return errorMessage || 'Connection failed. Please check your configuration.';
      case 'testing':
        return 'Testing connection to your device...';
      default:
        return 'Ready to test connection to your device.';
    }
  };

  const getStatusColor = () => {
    switch (connectionResult) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'testing':
        return 'info';
      default:
        return 'info';
    }
  };

  const getTroubleshootingTips = () => {
    const tips = [
      'Ensure your device is powered on and connected to the same network',
      'Check that the MQTT topic matches your device configuration',
      'Verify your device is publishing data to the specified topic',
    ];

    switch (deviceType) {
      case 'sensor':
        tips.push('Make sure the sensor is actively sending readings');
        break;
      case 'switch':
      case 'dimmer':
        tips.push('Test that the device responds to manual commands');
        break;
      case 'thermostat':
        tips.push('Confirm the thermostat is in network mode');
        break;
      case 'camera':
        tips.push('Check that the camera stream URLs are accessible');
        break;
      case 'lock':
        tips.push('Ensure the lock is in pairing or network mode');
        break;
    }

    return tips;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Test Device Connection
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        We'll test the connection to ensure your device is properly configured and communicating.
      </Typography>

      {/* Device Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
            Device Summary
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <DeviceIcon />
              </ListItemIcon>
              <ListItemText
                primary="Device Name"
                secondary={deviceName}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <ConfigIcon />
              </ListItemIcon>
              <ListItemText
                primary="Device Type"
                secondary={deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <ConnectionIcon />
              </ListItemIcon>
              <ListItemText
                primary="MQTT Topic"
                secondary={connectionConfig.mqttTopic || 'Not configured'}
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Connection Status */}
      <Alert
        severity={getStatusColor() as any}
        icon={getStatusIcon()}
        sx={{ mb: 3 }}
      >
        {getStatusMessage()}
      </Alert>

      {/* Test Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <Button
          variant="contained"
          size="large"
          onClick={onTest}
          disabled={isConnecting || connectionResult === 'success'}
          startIcon={isConnecting ? <CircularProgress size={20} /> : <ConnectionIcon />}
          sx={{ minWidth: 200 }}
        >
          {isConnecting ? 'Testing...' : connectionResult === 'success' ? 'Connection Verified' : 'Test Connection'}
        </Button>
      </Box>

      {/* Troubleshooting Tips */}
      {connectionResult === 'error' && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Troubleshooting Tips
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              If the connection test failed, try these steps:
            </Typography>
            <List dense>
              {getTroubleshootingTips().map((tip, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemIcon>
                      <InfoIcon color="info" />
                    </ListItemIcon>
                    <ListItemText primary={tip} />
                  </ListItem>
                  {index < getTroubleshootingTips().length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                onClick={onTest}
                disabled={isConnecting}
                startIcon={<ConnectionIcon />}
              >
                Try Again
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Success Next Steps */}
      {connectionResult === 'success' && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'success.main' }}>
              Connection Successful!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your device is properly configured and ready to be added to your dashboard. 
              Click "Add Device" to complete the setup process.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}