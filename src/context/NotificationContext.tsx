import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ToastNotification {
  id: string;
  type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING';
  title: string;
  message: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: ToastNotification[];
  notify: (notification: Omit<ToastNotification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastNotification, 'id'>) => {
      const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newNotif: ToastNotification = { id, type, title, message, duration };

      setNotifications((prev) => [newNotif, ...prev.slice(0, 4)]);

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    [removeNotification]
  );

  return (
    <NotificationContext.Provider value={{ notifications, notify, removeNotification }}>
      {children}
      {/* Toast Render Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-start p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
              n.type === 'SUCCESS'
                ? 'bg-emerald-50/95 border-emerald-300 text-emerald-950'
                : n.type === 'ERROR'
                ? 'bg-rose-50/95 border-rose-300 text-rose-950'
                : n.type === 'WARNING'
                ? 'bg-amber-50/95 border-amber-300 text-amber-950'
                : 'bg-blue-50/95 border-blue-300 text-blue-950'
            }`}
          >
            <div className="flex-1">
              <h4 className="text-sm font-bold tracking-tight">{n.title}</h4>
              <p className="text-xs mt-0.5 opacity-90 leading-relaxed">{n.message}</p>
            </div>
            <button
              onClick={() => removeNotification(n.id)}
              className="ml-3 text-xs opacity-60 hover:opacity-100 font-bold p-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
