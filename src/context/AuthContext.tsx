import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, Branch, UserRole } from '../types';
import { api, setAuthToken, getAuthToken } from '../api';
import {
  INACTIVITY_TIMEOUT_MS,
  recordUserActivity,
  touchActivityNow,
  getRemainingInactivityMs,
  isSessionExpiredByInactivity,
  saveSessionSnapshot,
  markAutoTimedOut,
  clearSessionSnapshot,
  clearAutoTimeoutNotice,
  clearStoredPosCart,
  getSessionSnapshot,
  SessionSnapshot,
} from '../utils/sessionManager';

interface AuthContextType {
  user: User | null;
  branches: Branch[];
  activeBranchId: string;
  activeBranchName: string;
  isLoading: boolean;
  inactivitySecondsLeft: number;
  extendSession: () => void;
  restoredSessionSnapshot: SessionSnapshot | null;
  consumeRestoredNotice: () => void;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  loginAsAdmin: () => Promise<void>;
  loginWithGoogle: (googleData: { email: string; name?: string; role?: string; idToken?: string }) => Promise<void>;
  loginWithPin: (credentials: { userId: string; pin: string }) => Promise<void>;
  logout: (isAutoInactivity?: boolean) => Promise<void>;
  switchBranch: (branchId: string) => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  canAccessFinancials: boolean;
  canAccessSettings: boolean;
  canAccessAdmin: boolean;
  isSuperAdmin: boolean;
  isStaff: boolean;
  refreshBranches: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [inactivitySecondsLeft, setInactivitySecondsLeft] = useState<number>(120);
  const [restoredSessionSnapshot, setRestoredSessionSnapshot] = useState<SessionSnapshot | null>(null);

  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const activeBranchIdRef = useRef<string>(activeBranchId);
  activeBranchIdRef.current = activeBranchId;

  const fetchBranches = async () => {
    try {
      const data = await api.getBranches();
      setBranches(data);
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const logout = useCallback(async (isAutoInactivity = false) => {
    const currentUser = userRef.current;
    if (isAutoInactivity) {
      // 2-Minute Inactivity rule triggered: preserve workspace and state
      if (currentUser) {
        saveSessionSnapshot({
          reason: 'inactivity_timeout',
          userName: currentUser.name,
          userRole: currentUser.role,
          userEmail: currentUser.email,
          activeBranchId: activeBranchIdRef.current,
          view: localStorage.getItem('nais_active_view') || 'pos',
        });
        markAutoTimedOut({
          view: localStorage.getItem('nais_active_view') || 'pos',
          userName: currentUser.name,
        });
      }
    } else {
      // Conscious manual logout: clean up state snapshots
      clearSessionSnapshot();
      clearStoredPosCart();
      clearAutoTimeoutNotice();
      setRestoredSessionSnapshot(null);
    }

    try {
      await api.logout();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setAuthToken(null);
      setUser(null);
      setActiveBranchId('all');
    }
  }, []);

  const extendSession = useCallback(() => {
    touchActivityNow();
    setInactivitySecondsLeft(120);
  }, []);

  const consumeRestoredNotice = useCallback(() => {
    setRestoredSessionSnapshot(null);
  }, []);

  // Initialize Auth & Check 2-Minute Inactivity Rule
  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Check 2-Minute Inactivity Rule on Startup / Refresh
      if (isSessionExpiredByInactivity()) {
        // User was away or inactive for 2 minutes or more:
        // Automatically log them out and save snapshot for restoration upon re-login
        saveSessionSnapshot({
          reason: 'inactivity_timeout',
          view: localStorage.getItem('nais_active_view') || 'pos',
          activeBranchId: 'all',
        });
        markAutoTimedOut({
          view: localStorage.getItem('nais_active_view') || 'pos',
        });
        setAuthToken(null);
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Within 2-minute rule: DO NOT log them out, even on page refresh!
      // Touch activity now so that the refresh acts as an active action and gives a fresh 2-minute window
      touchActivityNow();

      try {
        const { user: currentUser } = await api.getCurrentUser();
        setUser(currentUser);
        
        // Restore branch if snapshot exists, otherwise use user's default branch
        const snapshot = getSessionSnapshot();
        if (snapshot?.activeBranchId && currentUser.role !== 'STAFF') {
          setActiveBranchId(snapshot.activeBranchId);
        } else {
          setActiveBranchId(currentUser.branchId || 'all');
        }

        await fetchBranches();
      } catch {
        // Stale or invalid token from server
        setAuthToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Active Inactivity Monitoring (while user is logged in)
  useEffect(() => {
    if (!user) {
      setInactivitySecondsLeft(120);
      return;
    }

    // Attach user activity listeners
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'];
    const handleUserInteraction = () => {
      recordUserActivity();
    };

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserInteraction, { passive: true });
    });

    // Check inactivity every 1 second
    const interval = setInterval(() => {
      const remainingMs = getRemainingInactivityMs();
      const secondsLeft = Math.ceil(remainingMs / 1000);
      setInactivitySecondsLeft(secondsLeft);

      if (remainingMs <= 0) {
        // 2 minutes expired! Log out automatically
        console.warn('[Naisiae Session] 2-minute inactivity reached. Automatically logging out.');
        logout(true);
      }
    }, 1000);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserInteraction);
      });
      clearInterval(interval);
    };
  }, [user, logout]);

  const onSuccessfulLogin = () => {
    touchActivityNow();
    setInactivitySecondsLeft(120);
    clearAutoTimeoutNotice();

    // Check for saved session snapshot to restore
    const snapshot = getSessionSnapshot();
    if (snapshot && snapshot.reason === 'inactivity_timeout') {
      setRestoredSessionSnapshot(snapshot);
      if (snapshot.view) {
        localStorage.setItem('nais_active_view', snapshot.view);
      }
      if (snapshot.activeBranchId) {
        setActiveBranchId(snapshot.activeBranchId);
      }
    }
  };

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const { token, user: loggedInUser } = await api.login(credentials);
      setAuthToken(token);
      setUser(loggedInUser);
      setActiveBranchId(loggedInUser.branchId || 'all');
      onSuccessfulLogin();
      fetchBranches();
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsAdmin = async () => {
    throw new Error('Direct 1-click admin login has been disabled for system security. Please enter your administrator credentials or authenticate via Google.');
  };

  const loginWithGoogle = async (googleData: { email: string; name?: string; role?: string; idToken?: string }) => {
    if (!googleData?.email) {
      throw new Error('Google account email is required');
    }
    setIsLoading(true);
    try {
      const { token, user: loggedInUser } = await api.googleLogin(googleData);
      setAuthToken(token);
      setUser(loggedInUser);
      setActiveBranchId(loggedInUser.branchId || 'all');
      onSuccessfulLogin();
      fetchBranches();
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithPin = async (credentials: { userId: string; pin: string }) => {
    setIsLoading(true);
    try {
      const { token, user: loggedInUser } = await api.pinLogin(credentials);
      setAuthToken(token);
      setUser(loggedInUser);
      setActiveBranchId(loggedInUser.branchId || 'all');
      onSuccessfulLogin();
      await fetchBranches();
    } finally {
      setIsLoading(false);
    }
  };

  const switchBranch = async (branchId: string) => {
    if (!user) return;
    if (user.role === 'STAFF' && user.branchId !== 'all') {
      return;
    }

    try {
      await api.switchBranch(branchId);
      setActiveBranchId(branchId);
      // Update snapshot if present
      saveSessionSnapshot({ activeBranchId: branchId });
    } catch (err) {
      console.error('Branch switch failed:', err);
    }
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'ADMIN' || isSuperAdmin;

  const hasRole = (...roles: UserRole[]) => {
    if (!user) return false;
    // SUPER_ADMIN has access to everything
    if (user.role === 'SUPER_ADMIN') return true;
    // ADMIN has access to any role check except strict SUPER_ADMIN
    if (user.role === 'ADMIN' && (roles.includes('ADMIN') || !roles.includes('SUPER_ADMIN'))) return true;
    return roles.includes(user.role);
  };

  const activeBranch = branches.find((b) => b.id === activeBranchId);
  const activeBranchName = activeBranch ? activeBranch.name : 'Consolidated (All Branches)';

  const canAccessAdmin = isAdmin;
  const canAccessFinancials = isAdmin || user?.role === 'ACCOUNTANT';
  const canAccessSettings = isAdmin;
  const isStaff = user?.role === 'STAFF';

  return (
    <AuthContext.Provider
      value={{
        user,
        branches,
        activeBranchId,
        activeBranchName,
        isLoading,
        inactivitySecondsLeft,
        extendSession,
        restoredSessionSnapshot,
        consumeRestoredNotice,
        login,
        loginAsAdmin,
        loginWithGoogle,
        loginWithPin,
        logout,
        switchBranch,
        hasRole,
        canAccessFinancials,
        canAccessSettings,
        canAccessAdmin,
        isSuperAdmin,
        isStaff,
        refreshBranches: fetchBranches,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
