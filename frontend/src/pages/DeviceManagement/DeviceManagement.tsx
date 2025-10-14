
import { Typography, Box, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAppContext } from '../../context/AppContext';
import { ResponsiveContainer } from '../../components';

/**
 * Device management page component
 * Handles device setup, configuration, and removal
 */
export function DeviceManagement() {
  const { state } = useAppContext();

  const handleAddDevice = () => {
    // Placeholder for add device functionality - will be implemented in later tasks
    console.log('Add device clicked');
  };

  return (
    <ResponsiveContainer>
      <Box 
        mb={3} 
        display="flex" 
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        gap={2}
      >
        <Box>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}
          >
            Device Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Add, configure, and manage your smart home devices
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddDevice}
          size="large"
          fullWidth
          sx={{ minWidth: { sm: 'auto' } }}
        >
          Add Device
        </Button>
      </Box>

      {/* Device list placeholder */}
      <Box
        sx={{
          border: '2px dashed',
          borderColor: 'grey.300',
          borderRadius: 2,
          p: { xs: 2, sm: 4 },
          textAlign: 'center',
          minHeight: { xs: 200, sm: 300 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box>
          <Typography 
            variant="h6" 
            gutterBottom
            sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}
          >
            {state.devices.length === 0 ? 'No devices configured' : `${state.devices.length} devices configured`}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Device management interface will be implemented in later tasks
          </Typography>
        </Box>
      </Box>
    </ResponsiveContainer>
  );
}