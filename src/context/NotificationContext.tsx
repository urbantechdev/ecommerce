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

  // Theme styling based on notification type (White with a touch of blue brand identity)
  const theme = {
    SUCCESS: {
      border: 'border-[#030A91]/30',
      bg: 'bg-gradient-to-r from-blue-50/90 via-white to-white text-slate-900',
      iconBg: 'bg-[#030A91] text-[#FACB00] shadow-[#030A91]/30',
      progressBar: 'bg-gradient-to-r from-[#030A91] to-blue-600',
      shadow: 'shadow-[0_15px_35px_-5px_rgba(3,10,145,0.2)]',
      icon: <CheckCircle2 className="w-5 h-5 animate-icon-success text-[#FACB00]" />,
      accentGlow: 'before:absolute before:inset-0 before:rounded-2xl before:ring-1 before:ring-blue-400/30',
    },
    ERROR: {
      border: 'border-rose-500/30',
      bg: 'bg-gradient-to-r from-rose-50/90 via-white to-white text-slate-900',
      iconBg: 'bg-rose-600 text-white shadow-rose-600/30',
      progressBar: 'bg-gradient-to-r from-rose-500 to-rose-700',
      shadow: 'shadow-[0_15px_35px_-5px_rgba(244,63,94,0.2)]',
      icon: <AlertOctagon className="w-5 h-5 animate-icon-error" />,
      accentGlow: 'before:absolute before:inset-0 before:rounded-2xl before:ring-1 before:ring-rose-400/30',
    },
    WARNING: {
      border: 'border-amber-500/30',
      bg: 'bg-gradient-to-r from-amber-50/90 via-white to-white text-slate-900',
      iconBg: 'bg-[#030A91] text-[#FACB00] shadow-[#030A91]/30',
      progressBar: 'bg-gradient-to-r from-amber-500 to-[#FACB00]',
      shadow: 'shadow-[0_15px_35px_-5px_rgba(3,10,145,0.2)]',
      icon: <AlertTriangle className="w-5 h-5 animate-icon-pop text-[#FACB00]" />,
      accentGlow: 'before:absolute before:inset-0 before:rounded-2xl before:ring-1 before:ring-amber-400/30',
    },
    INFO: {
      border: 'border-[#030A91]/30',
      bg: 'bg-gradient-to-r from-blue-50/90 via-white to-white text-slate-900',
      iconBg: 'bg-[#030A91] text-[#FACB00] shadow-[#030A91]/30',
      progressBar: 'bg-gradient-to-r from-[#030A91] to-blue-500',
      shadow: 'shadow-[0_15px_35px_-5px_rgba(3,10,145,0.2)]',
      icon: <Info className="w-5 h-5 animate-icon-pop text-[#FACB00]" />,
      accentGlow: 'before:absolute before:inset-0 before:rounded-2xl before:ring-1 before:ring-blue-400/30',
    },
  }[type];

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border w-full max-w-md ${theme.border} ${theme.bg} ${theme.shadow} backdrop-blur-md p-4 transition-all duration-200 select-none ${
        isClosing
          ? 'opacity-0 -translate-y-4 scale-95 duration-200'
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
      {/* Toast Notification Container Centered in the Middle of the Page */}
      <div
        aria-live="assertive"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 max-w-md w-full mx-auto px-4 pointer-events-none select-none"
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
