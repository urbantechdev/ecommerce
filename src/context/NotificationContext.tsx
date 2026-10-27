import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  AlertOctagon,
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
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);
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

    let remaining = duration;
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

  // Theme styling based on notification type
  const theme = {
    SUCCESS: {
      border: 'border-emerald-500/40',
      bg: 'bg-gradient-to-r from-emerald-50/98 via-white to-emerald-50/90 text-emerald-950',
      iconBg: 'bg-emerald-500 text-white shadow-emerald-500/30',
      progressBar: 'bg-gradient-to-r from-emerald-400 to-emerald-600',
      shadow: 'shadow-[0_10px_30px_-5px_rgba(16,185,129,0.25)]',
      icon: <CheckCircle2 className="w-5 h-5 animate-icon-success" />,
      accentGlow: 'before:absolute before:inset-0 before:rounded-2xl before:ring-1 before:ring-emerald-400/30',
    },
    ERROR: {
      border: 'border-rose-500/50',
      bg: 'bg-gradient-to-r from-rose-50/98 via-white to-rose-50/90 text-rose-950',
      iconBg: 'bg-rose-600 text-white shadow-rose-600/35',
      progressBar: 'bg-gradient-to-r from-rose-400 to-rose-600',
      shadow: 'shadow-[0_10px_30px_-5px_rgba(244,63,94,0.3)]',
      icon: <AlertOctagon className="w-5 h-5 animate-icon-error" />,
      accentGlow: 'before:absolute before:inset-0 before:rounded-2xl before:ring-1 before:ring-rose-400/30',
    },
    WARNING: {
      border: 'border-amber-500/40',
      bg: 'bg-gradient-to-r from-amber-50/98 via-white to-amber-50/90 text-amber-950',
      iconBg: 'bg-amber-500 text-slate-950 shadow-amber-500/30',
      progressBar: 'bg-gradient-to-r from-amber-400 to-[#FACB00]',
      shadow: 'shadow-[0_10px_30px_-5px_rgba(245,158,11,0.25)]',
      icon: <AlertTriangle className="w-5 h-5 animate-icon-pop" />,
      accentGlow: 'before:absolute before:inset-0 before:rounded-2xl before:ring-1 before:ring-amber-400/30',
    },
    INFO: {
      border: 'border-[#030A91]/30',
      bg: 'bg-gradient-to-r from-blue-50/98 via-white to-blue-50/90 text-slate-900',
      iconBg: 'bg-[#030A91] text-[#FACB00] shadow-[#030A91]/30',
      progressBar: 'bg-gradient-to-r from-[#030A91] to-blue-500',
      shadow: 'shadow-[0_10px_30px_-5px_rgba(3,10,145,0.2)]',
      icon: <Info className="w-5 h-5 animate-icon-pop" />,
      accentGlow: 'before:absolute before:inset-0 before:rounded-2xl before:ring-1 before:ring-blue-400/30',
    },
  }[type];

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border ${theme.border} ${theme.bg} ${theme.shadow} backdrop-blur-md p-4 transition-all duration-200 select-none ${
        isClosing
          ? 'opacity-0 translate-x-12 scale-95 duration-200'
          : 'animate-toast-in'
      }`}
    >
      <div className="flex items-start space-x-3.5">
        {/* Animated Icon Avatar Badge */}
        <div
          className={`shrink-0 w-9 h-9 rounded-xl ${theme.iconBg} flex items-center justify-center shadow-md animate-icon-pop`}
        >
          {theme.icon}
        </div>

        {/* Text Body */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center space-x-1.5">
            <h4 className="text-xs font-black tracking-tight leading-snug">
              {title}
            </h4>
            {type === 'SUCCESS' && (
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            )}
          </div>
          <p className="text-[11.5px] mt-0.5 leading-relaxed opacity-90 break-words font-medium">
            {message}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-transform active:scale-90 cursor-pointer"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4 hover:rotate-90 transition-transform duration-150" />
        </button>
      </div>

      {/* Animated Progress Countdown Bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200/50 overflow-hidden">
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
      setNotifications((prev) => [newNotif, ...prev.slice(0, 4)]);
    },
    []
  );

  return (
    <NotificationContext.Provider value={{ notifications, notify, removeNotification }}>
      {children}
      {/* Toast Notification Container with High Z-Index & Clean Positioning */}
      <div
        aria-live="assertive"
        className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
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
