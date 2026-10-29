import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
  Sparkles
} from 'lucide-react';

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

interface ToastItemProps {
  notification: ToastNotification;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ notification, onClose }) => {
  const { id, type, title, message, duration = 4000 } = notification;
  const [isClosing, setIsClosing] = useState(false);
  const [progress, setProgress] = useState(100);
  const animFrameRef = useRef<any>(null);
  const [isPaused, setIsPaused] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose(id);
    }, 250);
  }, [id, onClose]);

  // Handle countdown progress bar & auto-dismiss
  useEffect(() => {
    if (duration <= 0) return;

    let start = Date.now();

    const updateProgress = () => {
      if (!isPaused) {
        const elapsed = Date.now() - start;
        const pct = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(pct);

        if (elapsed >= duration) {
          handleDismiss();
          return;
        }
      }
      animFrameRef.current = requestAnimationFrame(updateProgress);
    };

    animFrameRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [duration, handleDismiss, isPaused]);

  // Stick strictly to brand colors: #030A91 (Deep Blue) and #FACB00 (Gold)
  const theme = {
    SUCCESS: {
      border: 'border-[#030A91]/30',
      bg: 'bg-gradient-to-br from-blue-50/90 via-white to-white text-slate-900',
      iconBg: 'bg-[#030A91] text-[#FACB00] shadow-blue-900/30 ring-4 ring-blue-100',
      progressBar: 'bg-gradient-to-r from-[#030A91] to-blue-700',
      shadow: 'shadow-[0_20px_50px_rgba(3,10,145,0.2)]',
      icon: <CheckCircle2 className="w-9 h-9 sm:w-10 sm:h-10 text-[#FACB00] animate-bounce" />,
    },
    ERROR: {
      border: 'border-[#030A91]/30',
      bg: 'bg-gradient-to-br from-blue-50/90 via-white to-white text-slate-900',
      iconBg: 'bg-[#030A91] text-rose-400 shadow-blue-900/30 ring-4 ring-blue-100',
      progressBar: 'bg-gradient-to-r from-[#030A91] to-blue-700',
      shadow: 'shadow-[0_20px_50px_rgba(3,10,145,0.2)]',
      icon: <XCircle className="w-9 h-9 sm:w-10 sm:h-10 text-rose-400 animate-pulse" />,
    },
    WARNING: {
      border: 'border-[#030A91]/30',
      bg: 'bg-gradient-to-br from-blue-50/90 via-white to-white text-slate-900',
      iconBg: 'bg-[#030A91] text-[#FACB00] shadow-blue-900/30 ring-4 ring-blue-100',
      progressBar: 'bg-gradient-to-r from-[#030A91] to-blue-700',
      shadow: 'shadow-[0_20px_50px_rgba(3,10,145,0.2)]',
      icon: <AlertTriangle className="w-9 h-9 sm:w-10 sm:h-10 text-[#FACB00] animate-bounce" />,
    },
    INFO: {
      border: 'border-[#030A91]/30',
      bg: 'bg-gradient-to-br from-blue-50/90 via-white to-white text-slate-900',
      iconBg: 'bg-[#030A91] text-[#FACB00] shadow-blue-900/30 ring-4 ring-blue-100',
      progressBar: 'bg-gradient-to-r from-[#030A91] to-blue-700',
      shadow: 'shadow-[0_20px_50px_rgba(3,10,145,0.2)]',
      icon: <Info className="w-9 h-9 sm:w-10 sm:h-10 text-[#FACB00] animate-pulse" />,
    },
  }[type];

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto relative overflow-hidden rounded-3xl border-2 w-full max-w-lg ${theme.border} ${theme.bg} ${theme.shadow} backdrop-blur-xl p-5 sm:p-6 transition-all duration-300 select-none ${
        isClosing
          ? 'opacity-0 scale-90 -translate-y-6 duration-200'
          : 'animate-in fade-in zoom-in-95 duration-200'
      }`}
    >
      <div className="flex items-center space-x-4 sm:space-x-5">
        {/* Big Animated Icon Badge in Brand Colors */}
        <div
          className={`shrink-0 w-16 h-16 sm:w-18 sm:h-18 rounded-2xl ${theme.iconBg} flex items-center justify-center shadow-xl transition-transform hover:scale-105`}
        >
          {theme.icon}
        </div>

        {/* Text Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm sm:text-base font-black tracking-tight text-[#030A91]">
              {title}
            </h3>
            {type === 'SUCCESS' && (
              <Sparkles className="w-4 h-4 text-[#FACB00] animate-spin" />
            )}
          </div>
          <p className="text-xs sm:text-sm mt-1 leading-relaxed text-slate-700 font-medium break-words">
            {message}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="shrink-0 p-2 rounded-xl text-slate-400 hover:text-[#030A91] hover:bg-slate-200/80 transition-all active:scale-90 cursor-pointer"
          aria-label="Dismiss notification"
        >
          <X className="w-5 h-5 hover:rotate-90 transition-transform duration-200" />
        </button>
      </div>

      {/* Animated Progress Countdown Bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-200/60 overflow-hidden">
          <div
            className={`h-full ${theme.progressBar} transition-all duration-75 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastNotification, 'id'>) => {
      const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newNotif: ToastNotification = { id, type, title, message, duration };
      setNotifications((prev) => [newNotif, ...prev.slice(0, 3)]);
    },
    []
  );

  return (
    <NotificationContext.Provider value={{ notifications, notify, removeNotification }}>
      {children}
      {/* Toast Notification Container Centered in the Middle of the Page */}
      <div
        aria-live="assertive"
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3.5 max-w-lg w-full mx-auto px-4 pointer-events-none select-none"
      >
        {notifications.map((n) => (
          <ToastItem key={n.id} notification={n} onClose={removeNotification} />
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
