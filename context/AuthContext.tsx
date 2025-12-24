import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getMe } from '../lib/api';
import { AuthUser, clearAuthStorage, getStoredToken, getStoredUser, setStoredToken, setStoredUser } from '../lib/authStorage';

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  const setAuth = (newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
    setStoredToken(newToken);
    setStoredUser(newUser);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    clearAuthStorage();
  };

  const refresh = async () => {
    const t = getStoredToken();
    if (!t) {
      setLoading(false);
      return;
    }

    try {
      const me = await getMe();
      setUser(me.user as AuthUser);
      setStoredUser(me.user as AuthUser);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo<AuthState>(() => ({ token, user, loading, setAuth, logout, refresh }), [token, user, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}
