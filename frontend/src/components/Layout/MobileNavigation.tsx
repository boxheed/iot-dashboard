import React from 'react';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Devices as DevicesIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Mobile navigation item interface
 */
interface MobileNavItem {
  label: string;
  icon: React.ReactElement;
  path: string;
}

/**
 * Mobile navigation items
 */
const mobileNavItems: MobileNavItem[] = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { label: 'Devices', icon: <DevicesIcon />, path: '/devices' },
  { label: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

/**
 * Mobile bottom navigation component
 * Only visible on mobile devices
 */
export function MobileNavigation() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  // Find current navigation index
  const currentIndex = mobileNavItems.findIndex(item => item.path === location.pathname);

  const handleNavigation = (_event: React.SyntheticEvent, newValue: number) => {
    const selectedItem = mobileNavItems[newValue];
    if (selectedItem) {
      navigate(selectedItem.path);
    }
  };

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.appBar,
      }}
      elevation={3}
    >
      <BottomNavigation
        value={currentIndex >= 0 ? currentIndex : 0}
        onChange={handleNavigation}
        showLabels
      >
        {mobileNavItems.map((item) => (
          <BottomNavigationAction
            key={item.path}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}