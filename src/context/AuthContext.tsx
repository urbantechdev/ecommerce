import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Branch, UserRole } from '../types';
import { api, setAuthToken, getAuthToken } from '../api';

interface AuthContextType {
  user: User | null;
  branches: Branch[];
  activeBranchId: string;
  activeBranchName: string;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  loginAsAdmin: () => Promise<void>;
  loginWithGoogle: (googleData?: { email?: string; name?: string }) => Promise<void>;
  loginWithPin: (credentials: { userId: string; pin: string }) => Promise<void>;
  logout: () => Promise<void>;
  switchBranch: (branchId: string) => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  canAccessFinancials: boolean;
  canAccessSettings: boolean;
  canAccessAdmin: boolean;
  isStaff: boolean;
  refreshBranches: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchBranches = async () => {
    try {
      const data = await api.getBranches();
      setBranches(data);
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const { user: currentUser } = await api.getCurrentUser();
        setUser(currentUser);
        setActiveBranchId(currentUser.branchId || 'all');
        await fetchBranches();
      } catch {
        // Stale or expired token from previous session; clear it cleanly so user can sign in
        setAuthToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const { token, user: loggedInUser } = await api.login(credentials);
      setAuthToken(token);
      setUser(loggedInUser);
      setActiveBranchId(loggedInUser.branchId || 'all');
      await fetchBranches();
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsAdmin = async () => {
    setIsLoading(true);
    try {
      const { token, user: loggedInUser } = await api.googleLogin({
        email: 'optimumengineeringke@gmail.com',
        name: 'Optimum Engineering',
      });
      setAuthToken(token);
      setUser(loggedInUser);
      setActiveBranchId(loggedInUser.branchId || 'all');
      await fetchBranches();
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (googleData?: { email?: string; name?: string }) => {
    setIsLoading(true);
    try {
      const { token, user: loggedInUser } = await api.googleLogin(googleData || {
        email: 'optimumengineeringke@gmail.com',
        name: 'Optimum Engineering',
      });
      setAuthToken(token);
      setUser(loggedInUser);
      setActiveBranchId(loggedInUser.branchId || 'all');
      await fetchBranches();
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
      await fetchBranches();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setAuthToken(null);
      setUser(null);
      setActiveBranchId('all');
    }
  };

  const switchBranch = async (branchId: string) => {
    if (!user) return;
    if (user.role === 'STAFF' && user.branchId !== 'all') {
      // Staff cannot change their physical station
      return;
    }

    try {
      await api.switchBranch(branchId);
      setActiveBranchId(branchId);
    } catch (err) {
      console.error('Branch switch failed:', err);
    }
  };

  const hasRole = (...roles: UserRole[]) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true; // Admin has no rule restrictions
    return roles.includes(user.role);
  };

  const activeBranch = branches.find((b) => b.id === activeBranchId);
  const activeBranchName = activeBranch ? activeBranch.name : 'Consolidated (All Branches)';

  const canAccessAdmin = user?.role === 'ADMIN';
  const canAccessFinancials = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';
  const canAccessSettings = user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF';

  return (
    <AuthContext.Provider
      value={{
        user,
        branches,
        activeBranchId,
        activeBranchName,
        isLoading,
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
