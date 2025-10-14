import { useState, useEffect, useCallback } from 'react';
import { Notification } from '../../../shared/src/types/Notification';
import { useAppContext } from '../context/AppContext';

/**
 * Hook for managing toast notifications
 */
export function useToastNotifications() {
  const { state } = useAppContext();
  const { notifications } = state;
  
  const [currentToast, setCurrentToast] = useState<Notification | null>(null);
  const [toastQueue, setToastQueue] = useState<Notification[]>([]);
  const [lastNotificationCount, setLastNotificationCount] = useState(0);

  // Check for new notifications and add them to toast queue
  useEffect(() => {
    if (notifications.length > lastNotificationCount) {
      // Get new notifications (assuming they're added to the beginning of the array)
      const newNotifications = notifications.slice(0, notifications.length - lastNotificationCount);
      
      // Filter notifications that should show as toasts
      const toastNotifications = newNotifications.filter(notification => {
        // Show toasts for high priority notifications or alerts/errors
        return notification.priority === 'high' || 
               notification.type === 'alert' || 
               notification.type === 'error';
      });

      if (toastNotifications.length > 0) {
        setToastQueue(prev => [...prev, ...toastNotifications]);
      }
    }
    setLastNotificationCount(notifications.length);
  }, [notifications, lastNotificationCount]);

  // Show next toast from queue
  useEffect(() => {
    if (!currentToast && toastQueue.length > 0) {
      const nextToast = toastQueue[0];
      setCurrentToast(nextToast);
      setToastQueue(prev => prev.slice(1));
    }
  }, [currentToast, toastQueue]);

  // Close current toast
  const closeToast = useCallback(() => {
    setCurrentToast(null);
  }, []);

  // Clear all toasts
  const clearAllToasts = useCallback(() => {
    setCurrentToast(null);
    setToastQueue([]);
  }, []);

  return {
    currentToast,
    closeToast,
    clearAllToasts,
    hasQueuedToasts: toastQueue.length > 0,
  };
}