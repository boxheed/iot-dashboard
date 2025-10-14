import React, { useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Devices as DevicesIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { MobileNavigation } from './MobileNavigation';
import { NotificationCenter, NotificationBadge, ToastNotification } from '../NotificationCenter';
import { useToastNotifications } from '../../hooks/useToastNotifications';

const drawerWidth = 240;

/**
 * Navigation item interface
 */
interface NavItem {
  text: string;
  icon: React.ReactElement;
  path: string;
}

/**
 * Navigation items configuration
 */
const navItems: NavItem[] = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Device Management', icon: <DevicesIcon />, path: '/devices' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

/**
 * App layout props
 */
interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Main application layout component with responsive navigation
 */
export function AppLayout({ children }: AppLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useAppContext();

  // Toast notifications
  const { currentToast, closeToast } = useToastNotifications();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleNotificationToggle = () => {
    setNotificationCenterOpen(!notificationCenterOpen);
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          IoT Dashboard
        </Typography>
      </Toolbar>
      <List>
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Smart Home Dashboard
          </Typography>

          {/* Connection status */}
          <Box sx={{ mr: 2 }}>
            <Typography
              variant="body2"
              sx={{
                color: state.isConnected ? 'success.light' : 'error.light',
                fontSize: '0.875rem',
              }}
            >
              {state.isConnected ? '● Connected' : '● Disconnected'}
            </Typography>
          </Box>

          {/* Notifications badge */}
          <NotificationBadge
            onClick={handleNotificationToggle}
            isOpen={notificationCenterOpen}
          />
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          pb: { xs: 7, md: 0 }, // Add bottom padding on mobile for bottom navigation
        }}
      >
        <Toolbar />
        {children}
      </Box>

      {/* Mobile bottom navigation */}
      <MobileNavigation />

      {/* Notification Center */}
      <NotificationCenter
        isOpen={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
      />

      {/* Toast Notifications */}
      <ToastNotification
        notification={currentToast}
        onClose={closeToast}
      />
    </Box>
  );
}