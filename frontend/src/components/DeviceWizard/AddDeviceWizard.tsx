import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { DeviceType, DeviceRegistration } from '@shared/types/Device';
import { DeviceTypeSelector } from './DeviceTypeSelector';
import { DeviceConfigurationForm } from './DeviceConfigurationForm';
import { ConnectionTestStep } from './ConnectionTestStep';

interface AddDeviceWizardProps {
  open: boolean;
  onClose: () => void;
  onDeviceAdded: (device: DeviceRegistration) => void;
}

interface WizardState {
  activeStep: number;
  deviceType: DeviceType | null;
  deviceName: string;
  deviceRoom: string;
  connectionConfig: Record<string, any>;
  isConnecting: boolean;
  connectionResult: 'idle' | 'testing' | 'success' | 'error';
  errorMessage: string;
}

const steps = ['Select Device Type', 'Configure Device', 'Test Connection'];

export function AddDeviceWizard({ open, onClose, onDeviceAdded }: AddDeviceWizardProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [state, setState] = useState<WizardState>({
    activeStep: 0,
    deviceType: null,
    deviceName: '',
    deviceRoom: '',
    connectionConfig: {},
    isConnecting: false,
    connectionResult: 'idle',
    errorMessage: '',
  });

  const handleNext = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeStep: prev.activeStep + 1,
    }));
  }, []);

  const handleBack = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeStep: prev.activeStep - 1,
    }));
  }, []);

  const handleReset = useCallback(() => {
    setState({
      activeStep: 0,
      deviceType: null,
      deviceName: '',
      deviceRoom: '',
      connectionConfig: {},
      isConnecting: false,
      connectionResult: 'idle',
      errorMessage: '',
    });
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  const handleDeviceTypeSelect = useCallback((type: DeviceType) => {
    setState(prev => ({
      ...prev,
      deviceType: type,
    }));
  }, []);

  const handleConfigurationChange = useCallback((config: {
    name: string;
    room: string;
    connectionConfig: Record<string, any>;
  }) => {
    setState(prev => ({
      ...prev,
      deviceName: config.name,
      deviceRoom: config.room,
      connectionConfig: config.connectionConfig,
    }));
  }, []);

  const handleConnectionTest = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, connectionResult: 'testing' }));

    try {
      // Simulate connection test - in real implementation, this would test MQTT connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo purposes, always succeed in tests, randomly in production
      const success = process.env.NODE_ENV === 'test' ? true : Math.random() > 0.3;
      
      if (success) {
        setState(prev => ({ ...prev, connectionResult: 'success', isConnecting: false }));
      } else {
        setState(prev => ({
          ...prev,
          connectionResult: 'error',
          isConnecting: false,
          errorMessage: 'Failed to connect to device. Please check your configuration.',
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        connectionResult: 'error',
        isConnecting: false,
        errorMessage: 'Connection test failed. Please try again.',
      }));
    }
  }, []);

  const handleFinish = useCallback(() => {
    if (!state.deviceType || !state.deviceName || !state.deviceRoom) {
      return;
    }

    const registration: DeviceRegistration = {
      name: state.deviceName,
      type: state.deviceType,
      room: state.deviceRoom,
      connectionConfig: state.connectionConfig,
    };

    onDeviceAdded(registration);
    handleClose();
  }, [state, onDeviceAdded, handleClose]);

  const canProceedToNext = () => {
    switch (state.activeStep) {
      case 0:
        return state.deviceType !== null;
      case 1:
        return state.deviceName.trim() !== '' && state.deviceRoom.trim() !== '';
      case 2:
        return state.connectionResult === 'success';
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (state.activeStep) {
      case 0:
        return (
          <DeviceTypeSelector
            selectedType={state.deviceType}
            onTypeSelect={handleDeviceTypeSelect}
          />
        );
      case 1:
        return (
          <DeviceConfigurationForm
            deviceType={state.deviceType!}
            name={state.deviceName}
            room={state.deviceRoom}
            connectionConfig={state.connectionConfig}
            onChange={handleConfigurationChange}
          />
        );
      case 2:
        return (
          <ConnectionTestStep
            deviceType={state.deviceType!}
            deviceName={state.deviceName}
            connectionConfig={state.connectionConfig}
            isConnecting={state.isConnecting}
            connectionResult={state.connectionResult}
            errorMessage={state.errorMessage}
            onTest={handleConnectionTest}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          minHeight: isMobile ? '100vh' : 600,
        },
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
          Add New Device
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
        <Box sx={{ mb: 3 }}>
          <Stepper 
            activeStep={state.activeStep} 
            orientation={isMobile ? 'vertical' : 'horizontal'}
            sx={{ mb: 3 }}
          >
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <Box sx={{ minHeight: 300 }}>
          {renderStepContent()}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          color="inherit"
        >
          Cancel
        </Button>
        
        <Box sx={{ flex: 1 }} />
        
        {state.activeStep > 0 && (
          <Button
            onClick={handleBack}
            sx={{ mr: 1 }}
          >
            Back
          </Button>
        )}
        
        {state.activeStep < steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!canProceedToNext()}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleFinish}
            disabled={!canProceedToNext()}
          >
            Add Device
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}