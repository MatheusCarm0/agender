'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { api } from './api';
import { setAuthCookie, removeAuthCookie } from './auth-cookie';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  professionalId?: string | null;
  onboardedAt?: string | null;
  business: {
    id: string;
    slug: string;
    name: string;
    timezone: string;
    plan?: string;
    planStatus?: string;
    trialEndsAt?: string;
    onboardingStep?: number;
    onboardingCompletedAt?: string | null;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerStart: (email: string) => Promise<{ devCode?: string }>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  businessName: string;
  ownerName: string;
  email: string;
  password: string;
  code: string;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAccessToken = useCallback(async () => {
    const rt = localStorage.getItem('refresh_token');
    if (!rt) return null;
    try {
      const res = await api<{ accessToken: string; refreshToken: string }>(
        '/auth/refresh',
        { method: 'POST', body: JSON.stringify({ refreshToken: rt }) },
      );
      localStorage.setItem('auth_token', res.accessToken);
      localStorage.setItem('refresh_token', res.refreshToken);
      setAuthCookie(res.accessToken);
      return res.accessToken;
    } catch {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      removeAuthCookie();
      return null;
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('auth_token');
    if (saved) {
      setToken(saved);
      setAuthCookie(saved);
      api<User>('/auth/me', { token: saved })
        .then(setUser)
        .catch(async () => {
          const newToken = await refreshAccessToken();
          if (newToken) {
            setToken(newToken);
            api<User>('/auth/me', { token: newToken })
              .then(setUser)
              .catch(() => {
                setToken(null);
                localStorage.removeItem('auth_token');
                localStorage.removeItem('refresh_token');
                removeAuthCookie();
              });
          } else {
            setToken(null);
            removeAuthCookie();
          }
        })
        .finally(() => setLoading(false));
    } else {
      removeAuthCookie();
      setLoading(false);
    }
  }, [refreshAccessToken]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{
      accessToken: string;
      refreshToken: string;
      user: User;
      business: User['business'];
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('auth_token', res.accessToken);
    localStorage.setItem('refresh_token', res.refreshToken);
    setAuthCookie(res.accessToken);
    setToken(res.accessToken);
    setUser({ ...res.user, business: res.business });
  }, []);

  const registerStart = useCallback(async (email: string) => {
    return api<{ devCode?: string }>('/auth/register/start', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const res = await api<{
      accessToken: string;
      refreshToken: string;
      user: User;
      business: User['business'];
    }>('/auth/register-business', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    localStorage.setItem('auth_token', res.accessToken);
    localStorage.setItem('refresh_token', res.refreshToken);
    setAuthCookie(res.accessToken);
    setToken(res.accessToken);
    setUser({ ...res.user, business: res.business });
  }, []);

  const refreshUser = useCallback(async () => {
    const t = localStorage.getItem('auth_token');
    if (!t) return;
    try {
      const me = await api<User>('/auth/me', { token: t });
      setUser(me);
    } catch {
      // ignore
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    removeAuthCookie();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, registerStart, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
