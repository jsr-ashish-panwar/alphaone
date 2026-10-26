import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../services/api.js';
import { User, Flat, MembershipInfo } from '../types/index.js';
import { useToast } from './ToastContext.js';

interface AuthContextType {
  user: User | null;
  flat: Flat | null;
  membership: MembershipInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, pin: string, flatCode?: string) => Promise<boolean>;
  register: (payload: any) => Promise<boolean>;
  logout: () => Promise<void>;
  quickSwitchUser: (username: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [flat, setFlat] = useState<Flat | null>(null);
  const [membership, setMembership] = useState<MembershipInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { success, error } = useToast();

  const refreshAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setFlat(null);
      setMembership(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      if (data.success) {
        setUser(data.user);
        setFlat(data.flat);
        setMembership(data.membership);
      }
    } catch {
      localStorage.removeItem('token');
      setUser(null);
      setFlat(null);
      setMembership(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = async (username: string, pin: string, flatCode?: string): Promise<boolean> => {
    try {
      const res = await api.login({ username, pin, flatCode });
      if (res.success) {
        localStorage.setItem('token', res.token);
        setUser(res.user);
        setFlat(res.flat);
        setMembership(res.membership);
        success(`Welcome back, ${res.user.name}!`);
        return true;
      }
      return false;
    } catch (err: any) {
      error(err.message || 'Login failed');
      return false;
    }
  };

  const register = async (payload: any): Promise<boolean> => {
    try {
      const res = await api.register(payload);
      if (res.success) {
        localStorage.setItem('token', res.token);
        setUser(res.user);
        setFlat(res.flat);
        setMembership(res.membership);
        success('Flat created successfully!', `Flat code is ${res.flat.code}`);
        return true;
      }
      return false;
    } catch (err: any) {
      error(err.message || 'Registration failed');
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      setFlat(null);
      setMembership(null);
      success('Logged out successfully');
    }
  };

  const quickSwitchUser = async (username: string) => {
    setIsLoading(true);
    try {
      const pinMap: Record<string, string> = {
        ashish: '1111',
        hitesh: '2222',
        govind: '3333',
        pd: '4444',
      };
      const pin = pinMap[username] || '1111';
      const ok = await login(username, pin);
      if (!ok) {
        error('Failed to switch user');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        flat,
        membership,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        quickSwitchUser,
        refreshAuth,
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
