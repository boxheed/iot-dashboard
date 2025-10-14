import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Security as AlertIcon,
  Close as CloseIcon,
  MarkEmailRead as MarkReadIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { NotificationType, NotificationPriority } from '../../../../shared/src/types/Notification';
import { useAppContext } from '../../context/AppContext';

/**
 * Props for the NotificationCenter component
 */
interface NotificationCenterProps {
  /** Whether the notification center is open */
  isOpen: boolean;
  /** Callback when the notification center should be closed */
  onClose: () => void;
  /** Maximum height of the notification center */
  maxHeight?: number;
}

/**
 * Filter options for notifications
 */
interface NotificationFilters {
  type: NotificationType | 'all';
  priority: NotificationPriority | 'all';
  isRead: 'true' | 'false' | 'all';
}

/**
 * Get icon for notification type
 */
const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'alert':
      return <AlertIcon color="error" />;
    case 'error':
      return <ErrorIcon color="error" />;
    case 'warning':
      return <WarningIcon color="warning" />;
    case 'info':
      return <InfoIcon color="info" />;
    default:
      return <NotificationsIcon />;
  }
};

/**
 * Get color for notification priority
 */
const getPriorityColor = (priority: NotificationPriority) => {
  switch (priority) {
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'info';
    default:
      return 'default';
  }
};

/**
 * Format timestamp for display
 */
const formatTimestamp = (timestamp: Date) => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return timestamp.toLocaleDateString();
};

/**
 * NotificationCenter component for displaying and managing notifications
 */
export function NotificationCenter({ isOpen, onClose, maxHeight = 600 }: NotificationCenterProps) {
  const { state, dispatch } = useAppContext();
  const { notifications } = state;

  // Filter state
  const [filters, setFilters] = useState<NotificationFilters>({
    type: 'all',
    priority: 'all',
    isRead: 'all',
  });

  // Filter notifications based on current filters
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      if (filters.type !== 'all' && notification.type !== filters.type) return false;
      if (filters.priority !== 'all' && notification.priority !== filters.priority) return false;
      if (filters.isRead !== 'all') {
        const isReadFilter = filters.isRead === 'true';
        if (notification.isRead !== isReadFilter) return false;
      }
      return true;
    });
  }, [notifications, filters]);

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.isRead).length;

  /**
   * Mark a notification as read
   */
  const handleMarkAsRead = (notificationId: string) => {
    dispatch({
      type: 'UPDATE_NOTIFICATION',
      payload: {
        id: notificationId,
        updates: { isRead: true },
      },
    });
  };

  /**
   * Mark all notifications as read
   */
  const handleMarkAllAsRead = () => {
    notifications.forEach(notification => {
      if (!notification.isRead) {
        dispatch({
          type: 'UPDATE_NOTIFICATION',
          payload: {
            id: notification.id,
            updates: { isRead: true },
          },
        });
      }
    });
  };

  /**
   * Handle filter changes
   */
  const handleFilterChange = (filterType: keyof NotificationFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value,
    }));
  };

  if (!isOpen) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        top: 64, // Below app bar
        right: 16,
        width: 400,
        maxWidth: 'calc(100vw - 32px)',
        maxHeight,
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotificationsIcon />
          <Typography variant="h6">
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Badge badgeContent={unreadCount} color="error" />
          )}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Filters */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
          <FilterIcon fontSize="small" />
          <Typography variant="body2" color="text.secondary">
            Filters
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={filters.type}
              label="Type"
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="alert">Alert</MenuItem>
              <MenuItem value="error">Error</MenuItem>
              <MenuItem value="warning">Warning</MenuItem>
              <MenuItem value="info">Info</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={filters.priority}
              label="Priority"
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.isRead}
              label="Status"
              onChange={(e) => handleFilterChange('isRead', e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="false">Unread</MenuItem>
              <MenuItem value="true">Read</MenuItem>
            </Select>
          </FormControl>
        </Box>
        {unreadCount > 0 && (
          <Box sx={{ mt: 1 }}>
            <Button
              size="small"
              startIcon={<MarkReadIcon />}
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </Button>
          </Box>
        )}
      </Box>

      {/* Notification List */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {filteredNotifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {notifications.length === 0 ? 'No notifications yet' : 'No notifications match your filters'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {filteredNotifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  sx={{
                    alignItems: 'flex-start',
                    backgroundColor: notification.isRead ? 'transparent' : 'action.hover',
                    '&:hover': {
                      backgroundColor: 'action.selected',
                    },
                  }}
                >
                  <ListItemIcon sx={{ mt: 1 }}>
                    {getNotificationIcon(notification.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ flex: 1 }}>
                          {notification.title}
                        </Typography>
                        <Chip
                          label={notification.priority}
                          size="small"
                          color={getPriorityColor(notification.priority) as any}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {formatTimestamp(notification.timestamp)}
                        </Typography>
                      </Box>
                    }
                  />
                  {!notification.isRead && (
                    <Tooltip title="Mark as read">
                      <IconButton
                        size="small"
                        onClick={() => handleMarkAsRead(notification.id)}
                        sx={{ mt: 1 }}
                      >
                        <MarkReadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </ListItem>
                {index < filteredNotifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Box>
    </Paper>
  );
}