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
    // Listen for 401s from the shared axios client (API calls that return "token expired").
    // Using a custom event decouples client.ts (non-React) from React state.
    const handleAuthExpired = () => {
      localStorage.removeItem('icos_token');
      localStorage.removeItem('icos_user');
      setUser(null);
    };
    window.addEventListener('icos:auth:expired', handleAuthExpired);

    const token = localStorage.getItem('icos_token');
    if (!token) {
      setIsLoading(false);
      return () => window.removeEventListener('icos:auth:expired', handleAuthExpired);
    }

    // Restore cached user immediately so ProtectedRoute doesn't flash the login redirect
    // while me() is in-flight (CORS / slow network would otherwise log the user out).
    const cached = localStorage.getItem('icos_user');
    if (cached) {
      try { setUser(JSON.parse(cached)); } catch { /* corrupt cache — me() will re-populate */ }
    }

    me()
      .then((u) => {
        setUser(u);
        localStorage.setItem('icos_user', JSON.stringify(u));
      })
      .catch((err) => {
        if (err?.response?.status === 401) {
          // Token is genuinely invalid — clear everything and log out.
          localStorage.removeItem('icos_token');
          localStorage.removeItem('icos_user');
          setUser(null);
        }
        // Any other failure (CORS, network down, 5xx) — keep the cached user.
        // The token is still valid; the backend is just temporarily unreachable.
      })
      .finally(() => setIsLoading(false));

    return () => window.removeEventListener('icos:auth:expired', handleAuthExpired);
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
    localStorage.setItem('icos_user', JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // ignore logout errors
    }
    localStorage.removeItem('icos_token');
    localStorage.removeItem('icos_user');
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
