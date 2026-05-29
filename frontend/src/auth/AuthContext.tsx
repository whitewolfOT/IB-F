import React, { createContext, useCallback, useEffect, useState } from 'react';
import { login as apiLogin, logout as apiLogout, me } from '../api/auth';
import type { AuthUser, LoginPayload } from '../api/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  viewAsRole: string | null;
  setViewAsRole: (role: string | null) => void;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  viewAsRole: null,
  setViewAsRole: () => {},
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewAsRole, setViewAsRoleState] = useState<string | null>(() =>
    localStorage.getItem('icos_view_as') ?? null
  );

  useEffect(() => {
    const token = localStorage.getItem('icos_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    me()
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem('icos_token');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const setViewAsRole = useCallback((role: string | null) => {
    setViewAsRoleState(role);
    if (role) {
      localStorage.setItem('icos_view_as', role);
    } else {
      localStorage.removeItem('icos_view_as');
    }
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const data = await apiLogin(payload);
    localStorage.setItem('icos_token', data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // ignore logout errors
    }
    localStorage.removeItem('icos_token');
    localStorage.removeItem('icos_view_as');
    setViewAsRoleState(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, viewAsRole, setViewAsRole, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
