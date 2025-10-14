// Simple verification that all notification components can be imported
import { NotificationCenter } from './NotificationCenter';
import { NotificationBadge } from './NotificationBadge';
import { ToastNotification } from './ToastNotification';

// Verify exports exist
console.log('NotificationCenter:', typeof NotificationCenter);
console.log('NotificationBadge:', typeof NotificationBadge);
console.log('ToastNotification:', typeof ToastNotification);

export { NotificationCenter, NotificationBadge, ToastNotification };