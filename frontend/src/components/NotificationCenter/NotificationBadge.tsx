import { IconButton, Badge, Tooltip } from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { useAppContext } from '../../context/AppContext';

/**
 * Props for the NotificationBadge component
 */
interface NotificationBadgeProps {
  /** Callback when the notification badge is clicked */
  onClick: () => void;
  /** Whether the notification center is currently open */
  isOpen?: boolean;
}

/**
 * NotificationBadge component for displaying notification count in navigation
 */
export function NotificationBadge({ onClick, isOpen = false }: NotificationBadgeProps) {
  const { state } = useAppContext();
  const { notifications } = state;

  // Count unread notifications
  const unreadCount = notifications.filter(notification => !notification.isRead).length;

  return (
    <Tooltip title={isOpen ? 'Close notifications' : 'View notifications'}>
      <IconButton
        color="inherit"
        onClick={onClick}
        sx={{
          color: isOpen ? 'primary.main' : 'inherit',
        }}
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          max={99}
          invisible={unreadCount === 0}
        >
          <NotificationsIcon />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}