import React from 'react';
import { Typography, Box, Paper, List, ListItem, ListItemText, Switch, FormControlLabel } from '@mui/material';
import { ResponsiveContainer } from '../../components';

/**
 * Settings page component
 * Application preferences and configuration
 */
export function Settings() {
  const [darkMode, setDarkMode] = React.useState(false);
  const [notifications, setNotifications] = React.useState(true);
  const [autoRefresh, setAutoRefresh] = React.useState(true);

  return (
    <ResponsiveContainer>
      <Box mb={3}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}
        >
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure your dashboard preferences
        </Typography>
      </Box>

      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography 
          variant="h6" 
          gutterBottom
          sx={{ fontSize: { xs: '1.125rem', sm: '1.25rem' } }}
        >
          General Settings
        </Typography>
        
        <List>
          <ListItem sx={{ px: { xs: 0, sm: 2 } }}>
            <ListItemText
              primary="Dark Mode"
              secondary="Switch between light and dark themes"
              primaryTypographyProps={{
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
              secondaryTypographyProps={{
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                />
              }
              label=""
            />
          </ListItem>

          <ListItem sx={{ px: { xs: 0, sm: 2 } }}>
            <ListItemText
              primary="Enable Notifications"
              secondary="Receive alerts for device events and system updates"
              primaryTypographyProps={{
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
              secondaryTypographyProps={{
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                />
              }
              label=""
            />
          </ListItem>

          <ListItem sx={{ px: { xs: 0, sm: 2 } }}>
            <ListItemText
              primary="Auto Refresh"
              secondary="Automatically update device status every 10 seconds"
              primaryTypographyProps={{
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
              secondaryTypographyProps={{
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
              }
              label=""
            />
          </ListItem>
        </List>
      </Paper>
    </ResponsiveContainer>
  );
}