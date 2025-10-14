
import { Typography, Box } from '@mui/material';
import { useAppContext } from '../../context/AppContext';
import { ResponsiveContainer, ResponsiveGrid } from '../../components';

/**
 * Main dashboard page component
 * Displays device overview and real-time status
 */
export function Dashboard() {
  const { state } = useAppContext();

  return (
    <ResponsiveContainer>
      <Box mb={3}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}
        >
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor and control your smart home devices
        </Typography>
      </Box>

      {/* Connection status indicator */}
      <Box mb={3}>
        <Typography
          variant="body2"
          color={state.isConnected ? 'success.main' : 'error.main'}
          sx={{ fontWeight: 'medium' }}
        >
          {state.isConnected ? '● Connected' : '● Disconnected'}
        </Typography>
      </Box>

      {/* Device count summary */}
      <Box mb={3}>
        <Typography 
          variant="h6"
          sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}
        >
          {state.devices.length} {state.devices.length === 1 ? 'Device' : 'Devices'} Connected
        </Typography>
      </Box>

      {/* Responsive device grid placeholder */}
      <ResponsiveGrid spacing={2}>
        <Box
          sx={{
            border: '2px dashed',
            borderColor: 'grey.300',
            borderRadius: 2,
            p: { xs: 2, sm: 4 },
            textAlign: 'center',
            minHeight: { xs: 150, sm: 200 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="body1" color="text.secondary">
            Device grid will be implemented in the next task
          </Typography>
        </Box>
      </ResponsiveGrid>
    </ResponsiveContainer>
  );
}