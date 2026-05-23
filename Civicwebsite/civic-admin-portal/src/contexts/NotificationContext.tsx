import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useNotification } from '../hooks/useNotification';

const NotificationContext = createContext<ReturnType<typeof useNotification> | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const notification = useNotification();

  return (
    <NotificationContext.Provider value={notification}>
      {children}
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