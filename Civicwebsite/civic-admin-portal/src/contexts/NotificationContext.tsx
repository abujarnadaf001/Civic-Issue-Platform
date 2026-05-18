import { createContext, useContext, ReactNode } from 'react';
import { useNotification } from '../hooks/useNotification';
import { NotificationContainer } from '../components/NotificationContainer';

const NotificationContext = createContext<ReturnType<typeof useNotification> | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const notification = useNotification();

  return (
    <NotificationContext.Provider value={notification}>
      {children}
      <NotificationContainer 
        notifications={notification.notifications} 
        onRemove={notification.removeNotification} 
      />
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}